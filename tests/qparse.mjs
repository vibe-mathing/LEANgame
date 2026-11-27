// Tests for the teacher question reader (assets/js/qparse.js). Run: node tests/qparse.mjs
//
// 1. Built-in problems, written out in words the way a teacher would, with their drawing: the reader
//    must find the same givens, goal and "from the diagram" facts, and the review must be clean.
// 2. Phrasings one by one.
// 3. The drawing as a witness, and straightening a hand-drawn figure.
// 4. Teacher text is escaped before the player sees it.

import { PROBLEMS } from '../assets/js/data.js';
import { parseClaim, claimKey } from '../assets/js/geo.js';
import {
  buildReview, reviewReport, buildProblem, parseText, claimContext, solveDrawing, straighten, holds, playable, validateProblem,
} from '../assets/js/qparse.js';

let failed = 0;
let passed = 0;
const check = (name, cond, info = '') => {
  if (cond) { passed++; return; }
  failed++;
  console.log(`✗ ${name}${info ? `\n    ${info}` : ''}`);
};

const drawingOf = (p) => ({
  pts: Object.entries(p.points).map(([id, [x, y]]) => ({ id, x, y, c: null })),
  segs: p.segments.map((s) => s.split('')),
  circs: (p.config || []).filter((c) => c.type === 'circle').map((c) => ({ o: c.o, r: c.on[0] })),
});

const find = (stage, pred) => PROBLEMS[stage].find(pred);
const keys = (claims, ctx) => claims.map((c) => { const r = parseClaim(c, ctx); return r.ok ? claimKey(r.claim) : `BAD:${c}`; }).sort();

// Between facts compared the way the checker reads them: the middle point and the two rays from it.
function betweenSet(config, ctx) {
  return config.filter((c) => c.type === 'between')
    .map((c) => `${c.o}:${[ctx.rays[c.o][c.a], ctx.rays[c.o][c.b]].sort().join('')}`).sort();
}
const circleSet = (config) => config.filter((c) => c.type === 'circle').map((c) => `${c.o}:${[...c.on].sort().join('')}`).sort();
const tangentSet = (config) => config.filter((c) => c.type === 'tangent').map((c) => `${c.p}${c.t}${c.o}`).sort();

const CASES = [
  ['L01', (p) => p.n === 1, 'הישרים AB ו-CD נחתכים בנקודה O. נתון: זווית AOC = 40 מעלות. הוכיחו: ∢BOD = 40°.'],
  ['L01', (p) => p.n === 2, 'הנקודה O נמצאת על הישר AB, והקרן OC יוצאת ממנה. נתון: ∢AOC = 130°. הוכיחו ש-∢COB = 50°.'],
  ['L02', (p) => p.n === 1, 'במשולש ABC הנקודה D נמצאת על הצלע BC. נתון: AB = AC, AD חוצה את זווית BAC. הוכיחו: BD = CD.'],
  ['L02', (p) => p.n === 2, 'במרובע ABCD העבירו את האלכסון AC. נתון: AB = AD ו-CB = CD. צ"ל: ∢BAC = ∢DAC'],
  ['L02', (p) => p.n === 3, 'במרובע ABCD האלכסון AC חוצה את ∢BAD ואת ∢BCD. הוכיחו: AB = AD.'],
  ['L03', (p) => p.n === 1, 'במשולש ABC הנקודה D על BC. נתון: AB = AC, D אמצע BC. הוכיחו: AD ⊥ BC.'],
  ['L03', (p) => p.n === 2, 'במשולש ABC הנקודות D ו-E נמצאות על הצלע BC. נתון: AB = AC, BD = CE. הוכיחו: AD = AE.'],
  ['L04', (p) => p.n === 1, 'הישרים AB ו-CD מקבילים, והישר EF חותך אותם בנקודות G ו-H. נתון: זווית AGH = 60 מעלות. הוכיחו: ∢GHD = 60°.'],
  ['L04', (p) => p.n === 3, 'במשולש ABC הנקודה D נמצאת על ההמשך של BC מעבר ל-C. נתון: ∢BAC = 50°, ∢ABC = 60°. הוכיחו: ∢ACD = 110°.'],
  ['L06', (p) => p.goal === 'AB + BC + CD + DA = 22', 'ABCD מקבילית. נתון: AB = 7, BC = 4. הוכיחו: AB + BC + CD + DA = 22.'],
  ['L06', (p) => p.goal === '△AOB ≅ △COD', 'ABCD מקבילית, והאלכסונים שלה נחתכים בנקודה O. הוכיחו: △AOB ≅ △COD.'],
  ['L07', (p) => p.goal === 'DE = 6', 'במשולש ABC הנקודה D אמצע AB, והנקודה E אמצע AC. נתון: BC = 12. הוכיחו: DE = 6.'],
  ['L09', (p) => p.goal === 'BD = 4', 'במשולש ABC הנקודה D על BC. AD חוצה את זווית BAC. נתון: AB = 6, AC = 9, BC = 10. הוכיחו: BD = 4.'],
  ['L10', (p) => p.n === 1, 'הנקודות A, B ו-C על מעגל שמרכזו O. נתון: ∢AOB = 106°. הוכיחו: ∢ACB = 53°.'],
  ['L10', (p) => p.n === 2, 'AB קוטר במעגל שמרכזו O, והנקודה C על המעגל. נתון: ∢CBA = 37°. הוכיחו: ∢CAB = 53°.'],
  ['L10', (p) => p.n === 3, 'PA משיק בנקודה A למעגל שמרכזו O. נתון: ∢AOP = 50°. הוכיחו: ∢APO = 40°.'],
  ['L10', (p) => p.n === 6, 'PA ו-PB משיקים למעגל שמרכזו O בנקודות A ו-B. נתון: ∢APB = 60°. הוכיחו: ∢PAB = 60°.'],
];

for (const [stage, pred, text, skip] of CASES) {
  const p = find(stage, pred);
  const name = `${stage}: ${text.slice(0, 40)}…`;
  if (!p) { check(name, false, 'built-in problem not found'); continue; }
  if (skip) continue;
  const d = drawingOf(p);
  const review = buildReview(d, text);
  const rep = reviewReport(review, d);
  const ctx = claimContext(solveDrawing(d));
  const got = keys(review.givens.map((g) => g.claim), ctx);
  const want = keys(p.givens.map((g) => g.claim), ctx);
  check(`${name} givens`, JSON.stringify(got) === JSON.stringify(want), `got ${review.givens.map((g) => g.claim).join(' | ')}; want ${p.givens.map((g) => g.claim).join(' | ')}`);
  const goalClaim = review.goal && (review.goal.claim || '');
  check(`${name} goal`, keys([goalClaim], ctx)[0] === keys([p.goal], ctx)[0], `got ${goalClaim}; want ${p.goal}`);
  // `also` (definition of midpoint / bisector) travels with the given
  for (const g of p.givens.filter((x) => x.also)) {
    const k = keys([g.claim], ctx)[0];
    const mine = review.givens.find((x) => keys([x.claim], ctx)[0] === k);
    check(`${name} also ${g.claim}`, mine && JSON.stringify(mine.also) === JSON.stringify(g.also), mine ? JSON.stringify(mine.also) : 'missing');
  }
  check(`${name} between facts`, JSON.stringify(betweenSet(rep.config, ctx)) === JSON.stringify(betweenSet(p.config, ctx)),
    `got ${betweenSet(rep.config, ctx)}; want ${betweenSet(p.config, ctx)}`);
  check(`${name} circles`, JSON.stringify(circleSet(rep.config)) === JSON.stringify(circleSet(p.config)), `got ${circleSet(rep.config)}; want ${circleSet(p.config)}`);
  check(`${name} tangents`, JSON.stringify(tangentSet(rep.config)) === JSON.stringify(tangentSet(p.config)), `got ${tangentSet(rep.config)}; want ${tangentSet(p.config)}`);
  check(`${name} no errors`, rep.errors.length === 0, JSON.stringify(rep.errors));
  const prob = buildProblem(review, d);
  check(`${name} validates`, validateProblem(prob).length === 0, JSON.stringify(validateProblem(prob)));
}

// ---------------------------------------------------------------- phrasings
const tri = { pts: [{ id: 'A', x: 0, y: 4, c: null }, { id: 'B', x: -3, y: 0, c: null }, { id: 'C', x: 3, y: 0, c: null }, { id: 'D', x: 0, y: 0, c: { k: 'seg', a: 'B', b: 'C', t: 0.5 } },
  { id: 'E', x: 1, y: 2, c: null }, { id: 'F', x: 2, y: 1, c: null }, { id: 'M', x: 0, y: 0, c: null }],
segs: [['A', 'B'], ['B', 'C'], ['C', 'A'], ['A', 'D']], circs: [] };
const pos = solveDrawing(tri);
const ctx = claimContext(pos);
const givensOf = (text) => parseText(text, { pos, segs: tri.segs });
const sameAs = (text, claims, name = text) => {
  const r = givensOf(text);
  const got = keys(r.givens.map((g) => g.claim), ctx);
  const want = keys(claims, ctx);
  check(`phrase: ${name}`, JSON.stringify(got) === JSON.stringify(want), `got ${r.givens.map((g) => g.claim).join(' | ')} unknown ${r.unknown.map((u) => u.src).join(' | ')}`);
  return r;
};
sameAs('משולש ABC שווה שוקיים (AB = AC).', ['AB = AC']);
sameAs('משולש ABC שווה שוקיים שבו הבסיס BC.', ['AB = AC']);
sameAs('המשולש ABC שווה שוקיים שבו הבסיס AB.', ['CA = CB']);
const iso = sameAs('משולש ABC שווה שוקיים.', ['AB = AC']);
check('phrase: isosceles without base is flagged', iso.givens[0] && iso.givens[0].note === 'isoAssumed');
sameAs('AB מקביל ל-CD', ['AB ∥ CD']);
sameAs('AB מקבילה לCD', ['AB ∥ CD']);
sameAs('AD מאונך ל BC', ['AD ⊥ BC']);
// phrasings found by writing the stage 1–11 problems out in words
sameAs('הקרן AD חוצה את הזווית ∢BAC', ['∢BAD = ∢DAC']);
sameAs('∢BAC גדולה פי 2 מ-∢ABC', ['∢BAC = 2∢ABC']);
sameAs('∢BAC גדולה פי שלוש מ-∢ABC', ['∢BAC = 3∢ABC']);
sameAs('∢BAC קטנה פי 2 מ-∢ABC', ['2∢BAC = ∢ABC']);
sameAs('∢BAC גדולה ב-20° מ-∢ABC', ['∢BAC - 20° = ∢ABC']);
sameAs('הנקודה D על BC, ו-AD ⊥ BC', ['AD ⊥ BC']);
sameAs('הקטעים BC ו-AD חוצים זה את זה בנקודה M', ['BM = MC', 'AM = MD']);
sameAs('E ו-F הן אמצעי הצלעות AB ו-AC', ['AE = EB', 'AF = FC']);
sameAs('דרך הקודקוד A של המשולש ABC עובר הישר EF, המקביל ל-BC', ['EF ∥ BC']);
sameAs('המרובע ABCD טרפז, והבסיסים שלו AB ו-CD', ['ABCD טרפז', 'AB ∥ CD']);
sameAs('AB = AC, והנקודה E ביניהם', ['AB = AC']);
{
  const r = parseText('במשולש ABC מתקיים AB = AC. הוכיחו שזוויות הבסיס שוות.', { pos, segs: tri.segs });
  check('phrase: base angles as the goal', r.goal && keys([r.goal.claim], ctx)[0] === keys(['∢ABC = ∢ACB'], ctx)[0], r.goal ? r.goal.claim : 'no goal');
}
sameAs('AD גובה לצלע BC', ['AD ⊥ BC']);
sameAs('AD תיכון לצלע BC', ['BD = DC']);
sameAs('AD תיכון במשולש ABC', ['BD = DC']);
sameAs('AD חוצה את הזווית A', ['∢BAD = ∢DAC'], 'bisector of a one-letter angle in a triangle');
sameAs('במשולש ABC, AD חוצה זווית A', ['∢BAD = ∢DAC']);
sameAs('המשולשים ABD ו-ACD חופפים', ['△ABD ≅ △ACD']);
sameAs('AB = BC = CA', ['AB = BC', 'BC = CA']);
sameAs('משולש ABC שווה צלעות', ['AB = BC', 'BC = CA']);
sameAs('הקטעים AB ו-AC שווים', ['AB = AC']);
sameAs('זווית ABC שווה ל-50 מעלות', ['∢ABC = 50°']);
sameAs('<ABC = 50', ['∢ABC = 50°'], 'angle typed with <');
sameAs('ab = ac', ['AB = AC'], 'lowercase letters');
sameAs('∢B + ∢C = 100°, AB > AC', ['∢ABC + ∢ACB = 100°', 'AB > AC'], 'one-letter angles in a sum, and an inequality');
sameAs('E אמצע הצלע AB ו-F אמצע AC', ['AE = EB', 'AF = FC']);
sameAs('משולש ABC ישר זווית ב-C', ['∢ACB = 90°']);
sameAs('זווית C ישרה', ['∢ACB = 90°']);
sameAs('ABCD מלבן', ['ABCD מלבן']);
sameAs('המרובע ABCD הוא טרפז שווה שוקיים', ['ABCD טרפז שווה שוקיים']);
{
  const r = parseText('נתון: AB = AC. חשבו את זווית BAC.', { pos, segs: tri.segs });
  check('phrase: "חשבו את" asks for a value', r.goal && r.goal.ask === '∢BAC', JSON.stringify(r.goal));
  const r2 = parseText('מצאו את אורך BC', { pos, segs: tri.segs });
  check('phrase: "מצאו את אורך" asks for a length', r2.goal && r2.goal.ask === 'BC', JSON.stringify(r2.goal));
  const r3 = parseText('נתון AB = AC. הוכיחו שהמשולש ABD חופף למשולש ACD.', { pos, segs: tri.segs });
  check('phrase: goal in words', r3.goal && keys([r3.goal.claim], ctx)[0] === keys(['△ABD ≅ △ACD'], ctx)[0], JSON.stringify(r3.goal));
  const r4 = parseText('נתון AB = AC ו-XY שבור לגמרי. הוכיחו: BD = DC', { pos, segs: tri.segs });
  check('phrase: nonsense is reported, not dropped', r4.unknown.length === 1, JSON.stringify(r4.unknown));
  const r5 = parseText('במשולש ABC נתון AB = AC.', { pos, segs: tri.segs });
  check('phrase: intro keeps the setup only', r5.intro === 'במשולש ABC', r5.intro);
}

// ---------------------------------------------------------------- witness and straightening
{
  // a hand-drawn triangle that is not quite isosceles, D on BC not quite on the bisector
  const d = { pts: [{ id: 'A', x: 0.3, y: 4.2, c: null }, { id: 'B', x: -3, y: 0, c: null }, { id: 'C', x: 3.4, y: 0.3, c: null }, { id: 'D', x: 0, y: 0, c: { k: 'seg', a: 'B', b: 'C', t: 0.43 } }],
    segs: [['A', 'B'], ['B', 'C'], ['C', 'A'], ['A', 'D']], circs: [] };
  const text = 'במשולש ABC הנקודה D על BC. נתון: AB = AC, AD חוצה את זווית BAC. הוכיחו: BD = CD.';
  const review = buildReview(d, text);
  const before = reviewReport(review, d);
  check('witness: a rough drawing is refused', before.errors.some((e) => e.key === 'notWitness'), JSON.stringify(before.errors));
  const c = claimContext(solveDrawing(d));
  const claims = review.givens.map((g) => parseClaim(g.claim, c).claim);
  const s = straighten(d, claims);
  check('straighten: givens hold afterwards', s.ok);
  const after = reviewReport(review, s.drawing);
  check('straighten: review is clean afterwards', after.errors.length === 0, JSON.stringify(after.errors));
  check('straighten: the goal now holds in the drawing', after.goal && after.goal.holds === true);
  // a false goal is caught once the givens hold
  const wrong = buildReview(s.drawing, 'במשולש ABC הנקודה D על BC. נתון: AB = AC, AD חוצה את זווית BAC. הוכיחו: AB = BC.');
  check('witness: a false goal is caught', reviewReport(wrong, s.drawing).errors.some((e) => e.key === 'goalFalse'));
  // a wrong numeric answer is caught
  const ask = buildReview(s.drawing, 'במשולש ABC הנקודה D על BC. נתון: AB = AC, AD חוצה את זווית BAC. חשבו את זווית ADB.');
  ask.goal.value = '80°';
  check('witness: a wrong answer is caught', reviewReport(ask, s.drawing).errors.some((e) => e.key === 'answerWrong'));
  ask.goal.value = '90°';
  check('witness: the right answer passes', reviewReport(ask, s.drawing).errors.length === 0, JSON.stringify(reviewReport(ask, s.drawing).errors));
}
{
  // three given lengths need a to-scale triangle: straightening builds it
  const d = { pts: [{ id: 'A', x: 0, y: 3, c: null }, { id: 'B', x: -3, y: 0, c: null }, { id: 'C', x: 3, y: 0, c: null }], segs: [['A', 'B'], ['B', 'C'], ['C', 'A']], circs: [] };
  const review = buildReview(d, 'נתון: AB = 5, BC = 7, AC = 9. הוכיחו: ∢ABC > ∢BAC.');
  const c = claimContext(solveDrawing(d));
  const s = straighten(d, review.givens.map((g) => parseClaim(g.claim, c).claim));
  check('straighten: three lengths to scale', s.ok);
  check('straighten: then the inequality goal holds', reviewReport(review, s.drawing).errors.length === 0, JSON.stringify(reviewReport(review, s.drawing).errors));
}
{
  // a point dropped on a segment and an intersection stay exact
  const d = { pts: [{ id: 'A', x: -3, y: 1, c: null }, { id: 'B', x: 3, y: -1.2, c: null }, { id: 'C', x: -3, y: -1, c: null }, { id: 'D', x: 3, y: 1.4, c: null },
    { id: 'O', x: 0, y: 0, c: { k: 'x', a: 'A', b: 'B', c: 'C', d: 'D' } }], segs: [['A', 'B'], ['C', 'D']], circs: [] };
  const rep = reviewReport(buildReview(d, 'הישרים AB ו-CD נחתכים בנקודה O. נתון: ∢AOC = 40°. הוכיחו: ∢BOD = 40°.'), d);
  check('drawing: an intersection point gives two between facts', rep.config.filter((x) => x.type === 'between').length === 2);
}

// ---------------------------------------------------------------- escaping teacher text
{
  const p = find('L02', (x) => x.n === 1);
  const d = drawingOf(p);
  const review = buildReview(d, 'במשולש ABC הנקודה D נמצאת על הצלע BC. נתון: AB = AC, AD חוצה את זווית BAC. הוכיחו: BD = CD.');
  const evil = '<img src=x onerror=alert(1)>';
  review.title = evil;
  review.intro = evil + ' $ABC$';
  review.hints = [evil];
  review.givens[0].text = { he: evil, en: evil };
  const prob = buildProblem(review, d);
  prob.marks.push({ type: 'arc', ang: 'BAD', label: evil });
  prob.config.push({ type: 'between', a: 'B', o: 'D', b: 'C', text: { he: evil }, lean: evil });
  const out = playable({ data: JSON.stringify(prob) }, 'abc');
  const flat = JSON.stringify([out.title, out.intro, out.hints, out.givens, out.marks, out.config]);
  check('escape: no raw "<" reaches the player', !flat.includes('<'), flat.slice(0, 300));
  check('escape: math markers survive', out.intro.he.includes('$ABC$'));
  // math is left for rich() to escape once, so "<" in a claim shows as "<", not "&lt;"
  review.intro = 'נתון $AB < AC$ וגם <b>';
  const out2 = playable({ data: JSON.stringify(buildProblem(review, d)) }, 'abc');
  check('escape: math inside $…$ is escaped once, by rich()', out2.intro.he === 'נתון $AB < AC$ וגם &lt;b&gt;', out2.intro.he);
  check('escape: the raw title is kept for the tab title only', out.titleRaw === evil);
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
