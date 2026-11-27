// Tests for the Lean ↔ question converter (assets/js/leanconv.js). Run: node tests/leanconv.mjs [--lean]
//
// 1. Every built-in problem → Lean → back to words and a drawing → the editor's reader and review:
//    the same givens, goal and "from the diagram" facts, the same wording reasons, a clean review.
// 2. Lean written by hand: Mathlib spellings, renamed points, ∧ and →, ∀, "חשבו", errors.
// 3. --lean: every exported statement compiles in the Lean project (WSL, ~/LeanGame), and so does
//    the statement the player's Lean panel shows (geo.js leanTheorem).

import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { PROBLEMS } from '../assets/js/data.js';
import { parseClaim, claimKey, prepareProblem, leanTheorem } from '../assets/js/geo.js';
import { buildReview, reviewReport, buildProblem, claimContext, solveDrawing } from '../assets/js/qparse.js';
import { problemToLean, leanToQuestion, readLean } from '../assets/js/leanconv.js';

let failed = 0;
let passed = 0;
const check = (name, cond, info = '') => {
  if (cond) { passed++; return; }
  failed++;
  console.log(`✗ ${name}${info ? `\n    ${info}` : ''}`);
};

const keys = (claims, ctx) => claims.map((c) => { const r = parseClaim(c, ctx); return r.ok ? claimKey(r.claim) : `BAD:${c}`; }).sort();
const betweenSet = (config, ctx) => config.filter((c) => c.type === 'between').map((c) => `${c.o}:${[ctx.rays[c.o][c.a], ctx.rays[c.o][c.b]].sort().join('')}`).sort();
const circleSet = (config) => config.filter((c) => c.type === 'circle').map((c) => `${c.o}:${[...c.on].sort().join('')}`).sort();
const tangentSet = (config) => config.filter((c) => c.type === 'tangent').map((c) => `${c.p}${c.t}${c.o}`).sort();
const alsoSet = (givens) => givens.flatMap((g) => g.also || []).sort();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------------------------------------------------------------- 1. built-in problems, there and back

const statements = [];
const player = []; // geo.js leanTheorem: the player's Lean panel
const withSides = [];
let n = 0;
for (const [stage, list] of Object.entries(PROBLEMS)) {
  for (const p0 of list) {
    const p = { ...JSON.parse(JSON.stringify(p0)), stage };
    const id = `${stage}/${p.n}`;
    n++;
    let out;
    try { out = problemToLean(p); } catch (e) { check(`${id}: export`, false, e.message); continue; }
    check(`${id}: export has no warnings`, !out.warnings.length, JSON.stringify(out.warnings));
    if (out.sides.length || out.triangles.length) withSides.push(`${id} (${[...out.triangles.map((T) => `△${T.join('')}`), ...out.sides.map((s) => `${s.a}${s.b}${s.same ? '|' : '/'}${s.p}${s.q}`)].join(' ')})`);
    statements.push({ id, name: out.name, lean: out.body });
    player.push(`${leanTheorem(prepareProblem(JSON.parse(JSON.stringify(p0)), stage))}\n`);
    const q = leanToQuestion(out.lean);
    if (!q.ok) { check(`${id}: import`, false, JSON.stringify(q.errors)); continue; }
    check(`${id}: goal holds in the new drawing`, q.goalHolds !== false);
    check(`${id}: no notes`, !q.notes.length, JSON.stringify(q.notes));
    const rv = buildReview(q.drawing, q.text);
    const rep = reviewReport(rv, q.drawing);
    check(`${id}: review is clean`, !rep.errors.length, `${JSON.stringify(rep.errors)}\n    ${q.text.replace(/\n/g, ' | ')}`);
    if (rep.errors.length) continue;
    const p2 = buildProblem(rv, q.drawing);
    const c1 = claimContext(p.points);
    const c2 = claimContext(p2.points);
    check(`${id}: givens`, same(keys(p.givens.map((g) => g.claim), c1), keys(p2.givens.map((g) => g.claim), c2)),
      `${p.givens.map((g) => g.claim).join(', ')}  →  ${p2.givens.map((g) => g.claim).join(', ')}`);
    check(`${id}: goal`, same(keys([p.goal], c1), keys([p2.goal], c2)), `${p.goal} → ${p2.goal}`);
    check(`${id}: between facts`, same(betweenSet(p.config, c1), betweenSet(p2.config, c2)), `${betweenSet(p.config, c1)} → ${betweenSet(p2.config, c2)}`);
    check(`${id}: circles`, same(circleSet(p.config), circleSet(p2.config)), `${circleSet(p.config)} → ${circleSet(p2.config)}`);
    check(`${id}: tangents`, same(tangentSet(p.config), tangentSet(p2.config)), `${tangentSet(p.config)} → ${tangentSet(p2.config)}`);
    // the reader may find a reason the words give that the built-in data left out, never lose one
    const kept = alsoSet(p2.givens);
    check(`${id}: wording reasons (also)`, alsoSet(p.givens).every((r) => { const i = kept.indexOf(r); if (i < 0) return false; kept.splice(i, 1); return true; }), `${alsoSet(p.givens)} → ${alsoSet(p2.givens)}`);
    // and once more to Lean: the same statement, up to the drawing's names for things
    const again = readLean(problemToLean({ ...p2, stage, n: p.n }).lean);
    const first = readLean(out.lean);
    const facts = (r) => [r.between.length, r.circles.length, r.tangents.length, r.givens.length].join('/');
    check(`${id}: Lean again`, again.ok && facts(again) === facts(first), `${facts(first)} → ${again.ok ? facts(again) : JSON.stringify(again.errors)}`);
  }
}
console.log(`built-in problems: ${n}; side-of-line facts the picture adds: ${withSides.length ? withSides.join(', ') : 'none'}`);

// ---------------------------------------------------------------- 2. Lean written by hand

const P0001 = `module

public import LeanGame.HighSchool.Geometry.L02_Congruence

/-!
# geo-L02-0001

* Given: AB = AC, AD bisects ∠BAC, and D lies on BC. Prove: BD = CD.
-/

public section

namespace SchoolGeo

theorem geo_L02_0001 (A B C D : Point)
    (_cfg1 : Sbtw ℝ B D C) -- from the diagram: D is on BC
    (g1 : len A B = len A C) -- given
    (g2 : ang B A D = ang C A D) : -- given: AD bisects ∠BAC
    len B D = len C D := by -- to prove
  have s1 : len A B = len A C := g1 -- 1. given
  have s3 : len A D = len A D := common_side A D -- 3. common side
  exact s5

end SchoolGeo
`;

function imported(name, src, want) {
  const q = leanToQuestion(src);
  if (!q.ok) { check(`${name}: import`, false, JSON.stringify(q.errors)); return null; }
  const rv = buildReview(q.drawing, q.text);
  const rep = reviewReport(rv, q.drawing);
  check(`${name}: review is clean`, !rep.errors.length, `${JSON.stringify(rep.errors)}\n    ${q.text.replace(/\n/g, ' | ')}`);
  const ctx = claimContext(solveDrawing(q.drawing));
  if (want.givens) check(`${name}: givens`, same(keys(rv.givens.map((g) => g.claim), ctx), keys(want.givens, ctx)), `${rv.givens.map((g) => g.claim).join(', ')} | ${q.text.replace(/\n/g, ' | ')}`);
  if (want.goal) check(`${name}: goal`, rv.goal && same(keys([rv.goal.claim], ctx), keys([want.goal], ctx)), `${rv.goal && rv.goal.claim}`);
  if (want.ask) check(`${name}: ask`, rv.goal && rv.goal.ask === want.ask.term && rv.goal.value === want.ask.value, JSON.stringify(rv.goal));
  if (want.text) check(`${name}: text`, want.text.test(q.text), q.text);
  if (want.between) check(`${name}: between facts`, same(betweenSet(rep.config, ctx), want.between), `${betweenSet(rep.config, ctx)}`);
  if (want.notes != null) check(`${name}: notes`, q.notes.length === want.notes, JSON.stringify(q.notes));
  return q;
}

imported('P0001.lean', P0001, { givens: ['AB = AC', '∢BAD = ∢CAD'], goal: 'BD = CD', text: /AD חוצה את ∢BAC/, between: ['D:BC'], notes: 0 });

imported('Mathlib spelling', `theorem iso60 (A B C : EuclideanSpace ℝ (Fin 2)) (h : dist A B = dist A C) (h2 : ∠ B A C = π / 3) :
    dist B C = dist A B := by sorry`, { givens: ['AB = AC', '∢BAC = 60°'], goal: 'BC = AB' });

imported('renamed points', `theorem t (P₁ P₂ X : Point) (h : len P₁ X = len P₂ X) (h' : ang X P₁ P₂ = 40) : ang X P₂ P₁ = 40 := by sorry`,
  { givens: ['PX = AX', '∢XPA = 40°'], goal: '∢XAP = 40°', notes: 2 });

imported('∧ and →', `theorem t (A B C D : Point) : Sbtw ℝ B D C ∧ len A B = len A C → ang B A D = ang C A D → len B D = len C D := by sorry`,
  { givens: ['AB = AC', '∢BAD = ∢CAD'], goal: 'BD = CD', between: ['D:BC'] });

imported('∀', `example : ∀ A B C M : Point, IsMidpoint M B C → len A B = len A C → Perp A M B C := by sorry`,
  { givens: ['BM = MC', 'AB = AC'], goal: 'AM ⊥ BC', text: /M אמצע BC/ });

imported('circle, חשבו', `theorem inscribed (A B C O : Point) (r : ℝ) (hA : len O A = r) (hB : len O B = r) (hC : len O C = r)
    (h : ang A O B = 106) : ang A C B = 53 := by -- חשבו
  sorry`, { givens: ['∢AOB = 106°'], ask: { term: '∢ACB', value: '53°' } });

imported('tangent', `theorem tan40 (P A O : Point) (r : ℝ) (h : IsTangent P A O r) (g : ang A O P = 50) : ang A P O = 40 := by sorry`,
  { givens: ['∢AOP = 50°'], goal: '∢APO = 40°', text: /PA משיק למעגל בנקודה A/ });

imported('parallelogram', `theorem pg (A B C D : Point) (h : IsParallelogram A B C D) (h1 : len A B = 7) (h2 : len B C = 4) :
    len A B + len B C + len C D + len D A = 22 := by sorry`, { givens: ['ABCD מקבילית', 'AB = 7', 'BC = 4'], goal: 'AB + BC + CD + DA = 22' });

imported('crossing lines', `theorem vert (A B C D O : Point) (h1 : Sbtw ℝ A O B) (h2 : Sbtw ℝ C O D) (h : ang A O C = 40) : ang B O D = 40 := by sorry`,
  { givens: ['∢AOC = 40°'], goal: '∢BOD = 40°', text: /הישרים AB ו-CD נחתכים בנקודה O/, between: ['O:AB', 'O:CD'] });

imported('roots and squares', `theorem pyth (A B C : Point) (h : ang A C B = 90) (h1 : len A C = 1) (h2 : len B C = Real.sqrt 3) :
    len A B ^ 2 = len A C ^ 2 + len B C ^ 2 := by sorry`, { givens: ['∢ACB = 90°', 'AC = 1', 'BC = √3'], goal: 'AB² = AC² + BC²' });

imported('triangle and sin', `theorem s (A B C : Point) (t : IsTriangle A B C) (h : ang A B C = 30) (h2 : ang B C A = 90) : sinD (ang A B C) = 0.5 := by sorry`,
  { givens: ['∢ABC = 30°', '∢BCA = 90°'], goal: 'sin∢ABC = 0.5', text: /משולש ABC/ });

imported('side of a line', `theorem zig (A B C D E : Point) (h : Par A B C D) (s1 : line[ℝ, A, B].SSameSide E C) (s2 : (line[ℝ, C, D]).SSameSide E A)
    (s3 : line[ℝ, B, D].SSameSide A C) (h1 : ang A B E = 44) (h2 : ang C D E = 30) : ang B E D = 74 := by sorry`,
  { givens: ['AB ∥ CD', '∢ABE = 44°', '∢CDE = 30°'], goal: '∢BED = 74°', text: /באותו צד של הישר AB/, notes: 0 });

// the area of a triangle (S△ABC in the site's notation, area A B C in Lean), once geo.js reads it
if (parseClaim('S△ABC = 1', ['A', 'B', 'C']).ok) {
  imported('area', `theorem tri_area (A B C : Point) (h1 : len A B = 4) (h2 : len A C = 6) (h3 : ang B A C = 30) :
      area A B C = 6 := by sorry`, { givens: ['AB = 4', 'AC = 6', '∢BAC = 30°'], goal: 'S△ABC = 6', notes: 0 });
  const r = readLean('theorem t (A B C D : Point) (h : Sbtw ℝ B D C) (g : area A B D * 2 = area A B C) : len B D = len D C := by sorry');
  check('area inside a product', r.ok && /S△ABD/.test(r.givens[0].claim), JSON.stringify(r.ok ? r.givens : r.errors));
}

// a false theorem: a counterexample is found, and the drawing is one where the goal holds
{
  const q = leanToQuestion('theorem f (A B C : Point) (h : len A B = len A C) : ang A B C = 60 := by sorry');
  check('false theorem: still imported', q.ok, JSON.stringify(q.errors));
  check('false theorem: said so', q.goalHolds === true && q.notes.length === 1 && /לא נכון בכל שרטוט/.test(q.notes[0].he), JSON.stringify(q.notes));
}
// and the export of that question adds what the picture shows
{
  const p = { points: { A: [0, 3], B: [-2, 0], C: [2, 0] }, segments: ['AB', 'AC', 'BC'], config: [], givens: [{ claim: 'AB = AC' }, { claim: '∢BAC = 40°' }], goal: '∢ABC = 70°' };
  const out = problemToLean(p);
  check('true theorem: no side facts added', !out.sides.length && !out.warnings.length, JSON.stringify(out));
}
// givens that contradict each other
{
  const q = leanToQuestion('theorem f (A B C : Point) (h1 : len A B = 1) (h2 : len B C = 1) (h3 : len A C = 5) : len A B = len B C := by sorry');
  check('contradiction: no drawing', !q.ok && q.errors.length === 1, JSON.stringify(q));
}
// errors, with their lines
{
  const q = leanToQuestion('theorem f (A B C : Point)\n    (h1 : len A B ≤ 3)\n    (h2 : Collinear ℝ {A, B, C}) :\n    len A B = 2 := by sorry');
  check('errors: not ok', !q.ok);
  check('errors: one per hypothesis, with lines', q.errors.length === 2 && q.errors[0].line === 2 && q.errors[1].line === 3, JSON.stringify(q.errors));
  check('errors: ≤ explained', /≤/.test(q.errors[0].msg.he), q.errors[0].msg.he);
  const r = leanToQuestion('def x := 3');
  check('no theorem', !r.ok && /theorem/.test(r.errors[0].msg.he), JSON.stringify(r.errors));
  const s = leanToQuestion('theorem f (A B : Point) : len A B = := by sorry');
  check('syntax error has a line', !s.ok && s.errors[0].line === 1, JSON.stringify(s.errors));
  const u = leanToQuestion('theorem f (A B C : Point) (h : len A B = len A C) : Sbtw ℝ A B C := by sorry');
  check('a position fact as the goal', !u.ok && u.errors[0].goal, JSON.stringify(u.errors));
}
// exact numbers both ways
{
  const r = readLean('theorem f (A B C D : Point) (h : len A B = (1 / 3) * len C D) (h2 : 2 * ang A B C = 2 * 22.5) : len A C = 2 * √3 := by sorry');
  check('fractions read', r.ok && r.givens[0].claim === 'AB = CD/3' && r.goal.claim === 'AC = 2√3', JSON.stringify(r.givens.map((g) => g.claim).concat(r.goal && r.goal.claim)));
  const p = { points: { A: [0, 0], B: [3, 0], C: [0, 4], D: [9, 0] }, config: [], givens: [{ claim: 'AB = CD/3' }], goal: 'AC = 2√3' };
  const out = problemToLean(p);
  check('fractions written', /len A B = \(1 \/ 3\) \* len C D/.test(out.lean) && /len A C = 2 \* Real.sqrt 3/.test(out.lean), out.lean);
}

// ---------------------------------------------------------------- 3. compiling in Lean

if (process.argv.includes('--lean')) {
  const body = statements.map((s) => s.lean).join('\n');
  const file = `import LeanGame\n\nnamespace SchoolGeo.FromSite\n\n${body}\nend SchoolGeo.FromSite\n\nnamespace SchoolGeo.Player\n\n${player.join('\n')}\nend SchoolGeo.Player\n`;
  const total = statements.length + player.length;
  const path = join(tmpdir(), 'leanconv_all.lean');
  writeFileSync(path, file);
  const wsl = path.replace(/^([A-Za-z]):/, (m, d) => `/mnt/${d.toLowerCase()}`).replace(/\\/g, '/');
  console.log(`compiling ${statements.length} exported + ${player.length} player statements: ${path}`);
  let out = '';
  try {
    out = execFileSync('wsl.exe', ['-d', 'Ubuntu', '--', 'bash', '-lc', `cd ~/LeanGame && lake env lean '${wsl}' 2>&1`], { encoding: 'utf8', timeout: 900000, maxBuffer: 1 << 26 });
  } catch (e) { out = `${e.stdout || ''}${e.stderr || ''}${e.message}`; }
  const errors = out.split('\n').filter((l) => /: error/.test(l));
  const sorries = out.split('\n').filter((l) => /declaration uses 'sorry'|declaration uses `sorry`/.test(l)).length;
  check('Lean: no errors', !errors.length, errors.slice(0, 10).join('\n    '));
  check('Lean: every statement elaborated', sorries === total, `${sorries} of ${total}\n${out.slice(0, 2000)}`);
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
