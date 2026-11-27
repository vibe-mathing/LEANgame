// Browser checker ↔ Lean: run the same proofs through geo.js and through the Lean checking
// service, and report every row where the two disagree.
//
//   node tests/parity.mjs [service-url]        (default http://localhost:8790)
//
// Exit code 1 if any row or the solved row disagrees. The naming cases at the end exist
// because one angle has many correct names (∢ABD = ∢ABC = ∢DBA = ∢CBA when D is on BC):
// Lean must accept every one of them wherever an angle appears.

import { PROBLEMS, STAGES } from '../assets/js/data.js';
import * as geo from '../assets/js/geo.js';

const URL_ = (process.argv[2] || 'http://localhost:8790').replace(/\/+$/, '');
for (const s of STAGES) for (const p of PROBLEMS[s.id] || []) geo.prepareProblem(p, s.id);

// The request lean-service.js sends.
function request(p, rows, results) {
  const reasonFor = (row, r) => {
    if (!row.reason || !r || !r.parsed.ok) return row.reason || null;
    const key = geo.claimKey(r.parsed.claim);
    const restated = p.givens.some((g, i) => (g.also || []).includes(row.reason) && geo.claimKey(p.givensParsed[i]) === key);
    return restated ? 'given' : row.reason;
  };
  return {
    points: p.points,
    config: p.config.map(({ type, a, o, b }) => ({ type, a, o, b })),
    givens: p.givensParsed,
    goal: p.goalParsed,
    allowed: p.allowed,
    rows: rows.map((row, i) => ({ claim: results[i].parsed.ok ? results[i].parsed.claim : null, reason: reasonFor(row, results[i]), refs: row.refs || [] })),
  };
}

// Test-only questions: triangle ABC with D on BC, so angles at B and C have several names.
const triangleWithD = (givens, goal) => geo.prepareProblem({
  n: 90, title: {}, intro: {},
  points: { A: [0, 4], B: [-3, 0], C: [3, 0], D: [0, 0] },
  segments: ['AB', 'AC', 'BC', 'AD'],
  config: [{ type: 'between', a: 'B', o: 'D', b: 'C', lean: 'Sbtw ℝ B D C', text: {} }],
  givens: givens.map((claim) => ({ claim })), goal, marks: [], hints: [],
}, 'L02');
const T1 = triangleWithD(['∢ABC = ∢ACB', '∢BAD = ∢CAD'], 'BD = CD');
const T2 = triangleWithD(['AB = AC', '∢BAD = ∢CAD'], '∢ABD = ∢ACD');

const [V1, A2] = PROBLEMS.L01;
const [P1, P2, P3] = PROBLEMS.L02;
const R = (text, reason, refs = []) => ({ text, reason, refs });

const CASES = [
  // the playable problems, as written in their hints
  ['L01-1 reference', V1, [R('∢AOC=40', 'given'), R('∢AOC=∢BOD', 'vert_angles'), R('∢BOD=40', 'algebra', [1, 2])]],
  ['L01-2 reference', A2, [R('∢AOC=130', 'given'), R('∢AOC+∢COB=180', 'adj_angles'), R('∢COB=50', 'algebra', [1, 2])]],
  ['L02-1 reference', P1, [R('AB=AC', 'given'), R('∢BAD=∢CAD', 'bisector_def'), R('AD=AD', 'common_side'), R('ABD≅ACD', 'SAS', [1, 2, 3]), R('BD=CD', 'cpct_side', [4])]],
  ['L02-2 reference', P2, [R('AB=AD', 'given'), R('CB=CD', 'given'), R('AC=AC', 'common_side'), R('ABC≅ADC', 'SSS', [1, 2, 3]), R('∢BAC=∢DAC', 'cpct_angle', [4])]],
  ['L02-3 reference', P3, [R('∢BAC=∢DAC', 'given'), R('∢BCA=∢DCA', 'bisector_def'), R('AC=AC', 'common_side'), R('ABC≅ADC', 'ASA', [1, 2, 3]), R('AB=AD', 'cpct_side', [4])]],

  // order of letters, order of sides, linear rearrangements
  ['letter and side order', P3, [R('∢CAB=∢CAD', 'given'), R('∢ACB=∢ACD', 'given'), R('CA=AC', 'common_side'), R('CBA≅CDA', 'ASA', [1, 2, 3]), R('BA=DA', 'cpct_side', [4])]],
  ['rearranged sums', A2, [R('130 = ∢COA', 'given'), R('∢BOC + ∢AOC = 180°', 'adj_angles'), R('180 − ∢COB = ∢AOC', 'adj_angles'), R('∢COB = 50', 'algebra', [1, 2])]],
  ['straight angle', A2, [R('∢AOB = 180', 'straight_angle'), R('∢AOC=130', 'given'), R('∢AOC + ∢COB = ∢AOB', 'algebra', [1, 2])]],

  // one angle, many names: in givens, identities, theorem premises, theorem conclusions, the goal
  ['names: common angle', P1, [R('∢ABD=∢ABC', 'common_angle'), R('∢DBA=∢CBA', 'common_angle'), R('∢ACD=∢BCA', 'common_angle'), R('∢ABD + ∢ACD = ∢ABC + ∢ACB', 'algebra')]],
  ['names: in a given', P1, [R('AC=AB', 'given'), R('∢DAB=∢DAC', 'given'), R('DA=AD', 'common_side'), R('ADB≅ADC', 'SAS', [1, 2, 3]), R('DB=DC', 'cpct_side', [4])]],
  ['names: theorem premise', T1, [R('∢ABC=∢ACB', 'given'), R('∢BAD=∢CAD', 'given'), R('AD=AD', 'common_side'), R('ABD≅ACD', 'ASA', [1, 2, 3]), R('BD=CD', 'cpct_side', [4])]],
  ['names: theorem conclusion', P1, [R('AB=AC', 'given'), R('∢BAD=∢CAD', 'given'), R('AD=AD', 'common_side'), R('ABD≅ACD', 'SAS', [1, 2, 3]),
    R('∢ABD=∢ACD', 'cpct_angle', [4]), R('∢ABC=∢ACB', 'cpct_angle', [4]), R('∢CBA=∢BCA', 'cpct_angle', [4]), R('∢ABC=∢ACB', 'algebra', [5])]],
  ['names: goal', T2, [R('AB=AC', 'given'), R('∢BAD=∢CAD', 'given'), R('AD=AD', 'common_side'), R('ABD≅ACD', 'SAS', [1, 2, 3]), R('∢ABC=∢ACB', 'cpct_angle', [4])]],

  // stage 3: perpendicular lines (any two points name a line) and the isosceles triangle
  ['L03-1 by the theorem', PROBLEMS.L03[0], [R('AB=AC', 'given'), R('BD=DC', 'given'), R('AD ⊥ BC', 'iso_median', [1, 2])]],
  ['L03-1 by congruence', PROBLEMS.L03[0], [R('AB=AC', 'given'), R('BD=DC', 'midpoint_def'), R('AD=AD', 'common_side'), R('ABD≅ACD', 'SSS', [1, 2, 3]),
    R('∢ADB=∢ADC', 'cpct_angle', [4]), R('∢ADB+∢ADC=180', 'adj_angles'), R('∢ADB = 90', 'algebra', [5, 6]), R('DA ⊥ DC', 'perp_def', [7])]],
  ['L03-1 other properties', PROBLEMS.L03[0], [R('AB=AC', 'given'), R('BD=DC', 'given'), R('∢BAD = ∢CAD', 'iso_median', [1, 2]), R('∢ADB = 90', 'iso_median', [1, 2]),
    R('AD ⊥ BD', 'perp_def', [4]), R('AD ⊥ BC', 'iso_median', [1])]],
  ['L03-2', PROBLEMS.L03[1], [R('AB=AC', 'given'), R('∢ABD=∢ACE', 'iso_base', [1]), R('BD=CE', 'given'), R('ABD≅ACE', 'SAS', [1, 2, 3]), R('AD=AE', 'cpct_side', [4])]],
  ['L03-3', PROBLEMS.L03[2], [R('AD=AE', 'given'), R('∢ADE=∢AED', 'iso_base', [1]), R('∢ADB+∢ADE=180', 'adj_angles'), R('∢AEC+∢AED=180', 'adj_angles'),
    R('∢ADB=∢AEC', 'algebra', [2, 3, 4]), R('BD=CE', 'given'), R('ADB≅AEC', 'SAS', [1, 5, 6]), R('AB=AC', 'cpct_side', [7])]],
  ['L03 converse and wrong rows', PROBLEMS.L03[2], [R('AD=AE', 'given'), R('∢ADE=∢AED', 'iso_base', [1]), R('AD=AE', 'iso_converse', [2]),
    R('AB=AE', 'iso_converse', [2]), R('∢ADB=∢AEC', 'iso_base', [1])]],

  // rows that must be rejected by both
  ['wrong rows', P1, [R('AB=AC', 'given'), R('∢BAD=∢CAD', 'given'), R('AD=AD', 'common_side'), R('ABD≅ADC', 'SAS', [1, 2, 3]),
    R('ABD≅ACD', 'SSS', [1, 2, 3]), R('ABD≅ACD', 'SSA', [1, 2, 3]), R('BD=CD', 'midpoint_def'), R('∢BAD=∢BAC', 'common_angle'), R('2∢BAD = ∢BAC', 'given')]],
];

let bad = 0;
for (const [label, p, rows] of CASES) {
  const local = geo.checkProof(p, rows);
  const t0 = Date.now();
  let res;
  try {
    const r = await fetch(URL_ + '/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request(p, rows, local.results)) });
    res = await r.json();
  } catch (e) {
    console.error(`Lean service not reachable at ${URL_}: ${e.message}`);
    process.exit(2);
  }
  const ms = Date.now() - t0;
  if (!res.ok) { console.log(`\n✗ ${label}: service error ${JSON.stringify(res).slice(0, 200)}`); bad++; continue; }
  const lines = [];
  local.results.forEach((r, i) => {
    const l = res.rows[i];
    if (r.ok === l.ok) return;
    bad++;
    lines.push(`    row ${i + 1}  ${rows[i].text}  (${rows[i].reason}${rows[i].refs.length ? ' ' + rows[i].refs.join(',') : ''}): browser ${r.ok ? 'accepts' : 'rejects'}, Lean ${l.ok ? 'accepts' : 'rejects'} ${l.ok ? '' : JSON.stringify(l.error)}`);
  });
  // Lean marks the goal on any correct row that says it; the site also needs every earlier row correct.
  const leanSolved = res.rows.findIndex((r) => r.ok && r.goal);
  const leanShown = leanSolved >= 0 && res.rows.slice(0, leanSolved).every((r) => r.ok) ? leanSolved : -1;
  if (leanShown !== local.solvedAt) {
    bad++;
    lines.push(`    solved at: browser ${local.solvedAt + 1 || '—'}, Lean ${leanShown + 1 || '—'}`);
  }
  console.log(`${lines.length ? '✗' : '✓'} ${label}  (${ms} ms)`);
  lines.forEach((x) => console.log(x));
}
console.log(bad ? `\n${bad} disagreement(s)` : '\nbrowser and Lean agree on every row');
process.exit(bad ? 1 : 0);
