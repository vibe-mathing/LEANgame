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
    config: p.config.map(({ text, lean, ...fact }) => fact),
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

  // stages 4–11: every problem as its hints solve it, then rows both must reject
  ...(() => {
    const Q = (s, n) => PROBLEMS[s][n - 1];
    return [
      ['L04-1', Q('L04', 1), [R('AB ∥ CD', 'given'), R('∢AGH = 60', 'given'), R('∢AGH = ∢GHD', 'alt_angles', [1]), R('∢GHD = 60', 'algebra', [2, 3])]],
      ['L04-2', Q('L04', 2), [R('AB ∥ CD', 'given'), R('∢EGB = 60', 'given'), R('∢EGB = ∢GHD', 'corr_angles', [1]), R('∢GHD = 60', 'algebra', [2, 3]), R('∢CHG + ∢GHD = 180', 'adj_angles'), R('∢CHG = 120', 'algebra', [4, 5])]],
      ['L04-3', Q('L04', 3), [R('∢BAC = 50', 'given'), R('∢ABC = 60', 'given'), R('∢ACD = ∢BAC + ∢ABC', 'ext_angle'), R('∢ACD = 110', 'algebra', [1, 2, 3])]],
      ['L04-3 by the angle sum', Q('L04', 3), [R('∢BAC = 50', 'given'), R('∢ABC = 60', 'given'), R('∢BAC + ∢ABC + ∢ACB = 180', 'tri_sum'), R('∢ACB + ∢ACD = 180', 'adj_angles'), R('∢ACD = 110', 'algebra', [1, 2, 3, 4])]],
      ['L04-4', Q('L04', 4), [R('∢AGE = 120', 'given'), R('∢GHD = 60', 'given'), R('∢AGE = ∢BGH', 'vert_angles'), R('∢BGH + ∢GHD = 180', 'algebra', [1, 2, 3]), R('AB ∥ CD', 'par_converse', [4])]],
      ['L05-1', Q('L05', 1), [R('AC = 9', 'given'), R('BC = 7', 'given'), R('AC > BC', 'algebra', [1, 2]), R('∢ABC > ∢BAC', 'side_angle', [3])]],
      ['L05-2', Q('L05', 2), [R('∢BAC = 70', 'given'), R('∢ABC = 50', 'given'), R('∢BAC + ∢ABC + ∢ACB = 180', 'tri_sum'), R('∢ACB = 60', 'algebra', [1, 2, 3]), R('∢BAC > ∢ACB', 'algebra', [1, 4]), R('BC > AB', 'angle_side', [5])]],
      ['L05-3', Q('L05', 3), [R('AB + AC > BC', 'tri_ineq'), R('AB = 4', 'given'), R('BC = 9', 'given'), R('AC > 5', 'algebra', [1, 2, 3])]],
      ['L06-1', Q('L06', 1), [R('ABCD מקבילית', 'given'), R('AB = DC', 'para_sides', [1]), R('AD = BC', 'para_sides', [1]), R('AB = 7', 'given'), R('BC = 4', 'given'), R('AB + BC + CD + DA = 22', 'algebra', [2, 3, 4, 5])]],
      ['L06-2', Q('L06', 2), [R('ABCD מקבילית', 'given'), R('∢DAB = 110', 'given'), R('AD ∥ BC', 'para_def', [1]), R('∢DAB + ∢ABC = 180', 'cointerior', [3]), R('∢ABC = 70', 'algebra', [2, 4])]],
      ['L06-3', Q('L06', 3), [R('ABCD מקבילית', 'given'), R('AO = OC', 'para_diag', [1]), R('BO = OD', 'para_diag', [1]), R('∢AOB = ∢COD', 'vert_angles'), R('AOB ≅ COD', 'SAS', [2, 3, 4])]],
      ['L06-4', Q('L06', 4), [R('ABCD מלבן', 'given'), R('AC = BD', 'rect_diag', [1]), R('AO = OC', 'para_diag', [1]), R('BO = OD', 'para_diag', [1]), R('AO + OC = AC', 'segment_add'), R('BO + OD = BD', 'segment_add'), R('AO = BO', 'algebra', [2, 3, 4, 5, 6]), R('∢OAB = ∢OBA', 'iso_base', [7])]],
      ['L06-5', Q('L06', 5), [R('AB = DC', 'given'), R('AD = BC', 'given'), R('ABCD מקבילית', 'para_test', [1, 2]), R('∢DAB = ∢BCD', 'para_angles', [3])]],
      ['L07-1', Q('L07', 1), [R('AD = DB', 'given'), R('AE = EC', 'given'), R('2DE = BC', 'midseg_tri', [1, 2]), R('BC = 12', 'given'), R('DE = 6', 'algebra', [3, 4])]],
      ['L07-2', Q('L07', 2), [R('AD = DB', 'given'), R('AE = EC', 'given'), R('DE ∥ BC', 'midseg_tri', [1, 2]), R('∢ADE = ∢ABC', 'corr_angles', [3])]],
      ['L07-3', Q('L07', 3), [R('∢ACB = 90', 'given'), R('AM = MB', 'given'), R('CM = AM', 'median_hyp', [1, 2]), R('∢MAC = ∢MCA', 'iso_base', [3]), R('∢BAC = 35', 'given'), R('∢MCA = 35', 'algebra', [4, 5])]],
      ['L07-4', Q('L07', 4), [R('∢ACB = 90', 'given'), R('∢BAC = 30', 'given'), R('2BC = AB', 'tri_30', [1, 2]), R('AB = 10', 'given'), R('BC = 5', 'algebra', [3, 4])]],
      ['L07-5', Q('L07', 5), [R('AB ∥ DC', 'given'), R('AE = ED', 'given'), R('BF = FC', 'given'), R('2EF = AB + DC', 'midseg_trap', [1, 2, 3]), R('AB = 10', 'given'), R('DC = 6', 'given'), R('EF = 8', 'algebra', [4, 5, 6])]],
      ['L08-1', Q('L08', 1), [R('∢ACB = 90', 'given'), R('AC² + BC² = AB²', 'pythagoras', [1]), R('AC = 8', 'given'), R('BC = 6', 'given'), R('AB = 10', 'algebra', [2, 3, 4])]],
      ['L08-2', Q('L08', 2), [R('AB = AC', 'given'), R('BD = DC', 'given'), R('∢ADB = 90', 'iso_median', [1, 2]), R('AD² + BD² = AB²', 'pythagoras', [3]), R('BC = 10', 'given'), R('BD + DC = BC', 'segment_add'), R('BD = 5', 'algebra', [2, 5, 6]), R('AB = 13', 'given'), R('AD = 12', 'algebra', [4, 7, 8])]],
      ['L08-3', Q('L08', 3), [R('AC = 12', 'given'), R('BC = 5', 'given'), R('AB = 13', 'given'), R('AC^2 + BC^2 = AB^2', 'algebra', [1, 2, 3]), R('∢ACB = 90', 'pyth_conv', [4])]],
      ['L09-1', Q('L09', 1), [R('DE ∥ BC', 'given'), R('AD/DB = AE/EC', 'thales', [1]), R('AD = 4', 'given'), R('DB = 2', 'given'), R('AE = 6', 'given'), R('EC = 3', 'algebra', [2, 3, 4, 5])]],
      ['L09-2', Q('L09', 2), [R('DE ∥ BC', 'given'), R('∢ADE = ∢ABC', 'corr_angles', [1]), R('∢AED = ∢ACB', 'corr_angles', [1]), R('ADE ~ ABC', 'sim_aa', [2, 3]), R('AD/AB = DE/BC', 'sim_parts', [4]),
        R('AD = 3', 'given'), R('AB = 9', 'given'), R('DE = 4', 'given'), R('BC = 12', 'algebra', [5, 6, 7, 8])]],
      ['L09-3', Q('L09', 3), [R('∢BAD = ∢DAC', 'given'), R('BD/DC = AB/AC', 'bis_ratio', [1]), R('AB = 6', 'given'), R('AC = 9', 'given'), R('BD + DC = BC', 'segment_add'), R('BC = 10', 'given'), R('BD = 4', 'algebra', [2, 3, 4, 5, 6])]],
      ['L09-4', Q('L09', 4), [R('AD = 2', 'given'), R('AB = 6', 'given'), R('AE = 3', 'given'), R('AC = 9', 'given'), R('AD/AB = AE/AC', 'algebra', [1, 2, 3, 4]), R('∢DAE = ∢BAC', 'common_angle'),
        R('ADE ~ ABC', 'sim_sas', [5, 6]), R('∢ADE = ∢ABC', 'sim_parts', [7]), R('DE ∥ BC', 'par_converse', [8])]],
      ['L10-1', Q('L10', 1), [R('∢AOB = 106', 'given'), R('2∢ACB = ∢AOB', 'inscribed_central'), R('∢ACB = 53', 'algebra', [1, 2])]],
      ['L10-2', Q('L10', 2), [R('∢ACB = 90', 'semicircle'), R('∢CBA = 37', 'given'), R('∢CAB + ∢ABC + ∢ACB = 180', 'tri_sum'), R('∢CAB = 53', 'algebra', [1, 2, 3])]],
      ['L10-3', Q('L10', 3), [R('∢OAP = 90', 'tangent_radius'), R('∢AOP = 50', 'given'), R('∢OAP + ∢AOP + ∢APO = 180', 'tri_sum'), R('∢APO = 40', 'algebra', [1, 2, 3])]],
      ['L10-4', Q('L10', 4), [R('∢DAB + ∢BCD = 180', 'cyclic_quad'), R('∢DAB = 72', 'given'), R('∢BCD = 108', 'algebra', [1, 2])]],
      ['L10-5', Q('L10', 5), [R('OA = OB', 'radii'), R('∢OAB = ∢OBA', 'iso_base', [1]), R('∢OAB = 37', 'given'), R('∢OAB + ∢OBA + ∢AOB = 180', 'tri_sum'), R('∢AOB = 106', 'algebra', [2, 3, 4])]],
      ['L10-6', Q('L10', 6), [R('PA = PB', 'tangents_eq'), R('∢PAB = ∢PBA', 'iso_base', [1]), R('∢APB = 60', 'given'), R('∢APB + ∢PAB + ∢PBA = 180', 'tri_sum'), R('∢PAB = 60', 'algebra', [2, 3, 4])]],
      ['L11-1', Q('L11', 1), [R('∢ACB = 90', 'given'), R('sin∢BAC = BC/AB', 'sin_def', [1]), R('∢BAC = 30', 'given'), R('AB = 12', 'given'), R('BC = 6', 'algebra', [2, 3, 4])]],
      ['L11-2', Q('L11', 2), [R('∢ACB = 90', 'given'), R('cos∢ABC = BC/AB', 'cos_def', [1]), R('∢ABC = 60', 'given'), R('BC = 5', 'given'), R('AB = 10', 'algebra', [2, 3, 4])]],
      ['L11-3', Q('L11', 3), [R('BC² = AB² + AC² − 2AB·AC·cos∢BAC', 'law_cosines'), R('AB = 5', 'given'), R('AC = 8', 'given'), R('∢BAC = 60', 'given'), R('BC = 7', 'algebra', [1, 2, 3, 4])]],
      ['L11-4', Q('L11', 4), [R('BC/sin∢BAC = AC/sin∢ABC', 'law_sines'), R('BC = 6', 'given'), R('∢BAC = 30', 'given'), R('sin∢ABC = 0.8', 'given'), R('AC = 9.6', 'algebra', [1, 2, 3, 4])]],
      ['L04–L11 wrong rows', Q('L04', 1), [R('AB ∥ CD', 'given'), R('∢AGH = ∢GHC', 'alt_angles', [1]), R('∢AGH = ∢GHD', 'corr_angles', [1]), R('∢AGH + ∢GHD = 180', 'cointerior', [1])]],
      ['L08 wrong rows', Q('L08', 1), [R('∢ACB = 90', 'given'), R('AB² + BC² = AC²', 'pythagoras', [1]), R('AC² + BC² = AB²', 'pythagoras', [1]), R('AC = 8', 'given'), R('BC = 6', 'given'), R('AB = 11', 'algebra', [3, 4, 5])]],
      ['L09 wrong rows', Q('L09', 1), [R('DE ∥ BC', 'given'), R('AD/AB = AE/EC', 'thales', [1]), R('AD/AB = AE/AC', 'thales', [1])]],
      ['L11 wrong rows', Q('L11', 1), [R('∢ACB = 90', 'given'), R('sin∢BAC = AC/AB', 'sin_def', [1]), R('cos∢BAC = AC/AB', 'cos_def', [1])]],
    ];
  })(),

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
