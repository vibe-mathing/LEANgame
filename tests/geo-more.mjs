// Tests for the reasons and claim types in assets/js/geo-more.js (added for the bagrut questions).
// Run: node tests/geo-more.mjs
//
// Each case is a small problem and proof rows. A case says which rows must pass, and that the goal is
// reached or not. Wrong rows (missing a cited row, a wrong value) must be refused.

import { prepareProblem, checkProof, parseClaim, fmtClaim, claimKey, liveFormat, leanTheorem } from '../assets/js/geo.js';
import { leanOfClaim, problemToLean } from '../assets/js/leanconv.js';
import { REASONS } from '../assets/js/data.js';
import { buildReview } from '../assets/js/qparse.js';

let passed = 0;
let failed = 0;
const check = (name, cond, info = '') => {
  if (cond) { passed++; return; }
  failed++;
  console.log(`✗ ${name}${info ? `\n    ${info}` : ''}`);
};

function problem({ points, segments, config = [], givens = [], goal, names, mixedUnits }) {
  const p = prepareProblem({ n: 1, title: {}, intro: {}, points, segments, config, givens: givens.map((claim) => ({ claim })), goal, marks: [], hints: [], ...(names ? { names } : {}), ...(mixedUnits ? { mixedUnits } : {}) }, 'L11');
  p.allowed = Object.keys(REASONS);
  return p;
}
const R = (text, reason, refs = []) => ({ text, reason, refs });
function proof(name, p, rows, want) {
  const res = checkProof(p, rows);
  const oks = res.results.map((r) => r.ok);
  check(`${name}: rows`, JSON.stringify(oks) === JSON.stringify(want.rows), `got ${JSON.stringify(oks)} ${JSON.stringify(res.results.filter((r) => !r.ok).map((r) => r.msg))}`);
  if ('solved' in want) check(`${name}: solved`, (res.solvedAt >= 0) === want.solved, `solvedAt ${res.solvedAt}`);
}

// ---- two circles (035571 summer 2025 Q4, r = 2, R = 3)
const A = [7 / 3, (4 * Math.SQRT2) / 3];
const E = [A[0] * 5 / 9, A[1] * 5 / 9];
const circ = problem({
  points: { O: [3, 0], A, E, K: [-3, 0], M: [0, 0] },
  segments: ['OA', 'OE', 'AM', 'AK', 'OK'],
  config: [{ type: 'circle', o: 'O', on: ['A', 'E'] }, { type: 'tangent', p: 'K', t: 'A', o: 'O' }, { type: 'between', a: 'A', o: 'E', b: 'M' }, { type: 'between', a: 'O', o: 'M', b: 'K' }],
  givens: ['MO = MK', 'MO = 1.5OA', '△MOA ∼ △OEA'],
  goal: 'S△OKA = 3.6S',
  names: { S: 'S△MEO' },
});
proof('tangent–chord, central angle', circ, [R('2∢KAE = ∢AOE', 'tangent_chord')], { rows: [true] });
proof('tangent–chord, wrong angle refused', circ, [R('∢KAE = ∢AOE', 'tangent_chord')], { rows: [false] });
proof('areas with a parameter', circ, [
  R('△MOA ∼ △OEA', 'given'), R('MO = 1.5OA', 'given'), R('OA = OE', 'radii'),
  R('S△MOA = 2.25S△OEA', 'sim_area', [1, 2, 3]), R('S△MOA = S + S△OEA', 'area_split'), R('S△OEA = 0.8S', 'algebra', [4, 5]),
  R('OM + MK = OK', 'segment_add'), R('MO = MK', 'given'), R('S△OKA = 2S△MOA', 'same_height', [7, 8]), R('S△OKA = 3.6S', 'algebra', [4, 6, 9]),
], { rows: Array(10).fill(true), solved: true });
proof('sim_area without the ratio refused', circ, [R('△MOA ∼ △OEA', 'given'), R('S△MOA = 2.25S△OEA', 'sim_area', [1])], { rows: [true, false] });

// ---- a nonlinear calculation: solving for α (035571 summer 2025 Q5 ב, α = 30°, r = 5)
{
  const r = 5; const cd = r / Math.tan(Math.PI / 6); const a = cd * Math.tan(Math.PI / 3);
  const Cc = [cd, 0]; const Ap = [0, a];
  const u = [Cc[0] - Ap[0], Cc[1] - Ap[1]]; const L = Math.hypot(...u); const e = [u[0] / L, u[1] / L];
  const s = -Ap[0] * e[0] + (r - Ap[1]) * e[1]; const Y = [Ap[0] + s * e[0], Ap[1] + s * e[1]];
  const p = problem({
    points: { B: [-cd, 0], C: Cc, A: Ap, X: [0, 0], O: [0, r], Y, Z: [-Y[0], Y[1]] },
    segments: ['AB', 'BC', 'CA', 'AX', 'OB', 'OC', 'OY'],
    config: [{ type: 'circle', o: 'O', on: ['X', 'Y', 'Z'] }, { type: 'tangent', p: 'C', t: 'X', o: 'O' }, { type: 'tangent', p: 'C', t: 'Y', o: 'O' }, { type: 'between', a: 'B', o: 'X', b: 'C' }, { type: 'between', a: 'A', o: 'O', b: 'X' }, { type: 'between', a: 'A', o: 'Y', b: 'C' }],
    givens: ['AC = √3CO'], goal: 'α = 30°', names: { r: 'OX', α: '∢OCX' },
  });
  check('names expand', parseClaim('CO = r/sinα', p).ok && fmtClaim(parseClaim('CO = r/sinα', p).claim).includes('OX'));
  proof('solving for α', p, [
    R('AC = √3CO', 'given'), R('∢OXC = 90°', 'tangent_radius'), R('sinα = r/CO', 'sin_def', [2]), R('tanα = r/CX', 'tan_def', [2]),
    R('∢AXC = 90°', 'tangent_radius'), R('cos∢ACB = CX/AC', 'cos_def', [5]), R('∢OCX = ∢OCY', 'tangents_center'), R('∢XCO + ∢OCY = ∢XCY', 'angle_add'),
    R('α = 30°', 'algebra', [1, 3, 4, 6, 7, 8]),
  ], { rows: Array(9).fill(true), solved: true });
  proof('too few rows for α refused', p, [R('AC = √3CO', 'given'), R('∢OXC = 90°', 'tangent_radius'), R('sinα = r/CO', 'sin_def', [2]), R('α = 30°', 'algebra', [1, 3])], { rows: [true, true, true, false] });
  // a rounded answer (min 2 decimals): CX = 5/tan30° = 8.660…; 8.66 is right, 8.6 is too coarse, 8.68 too far
  const q = problem({ points: p.points, segments: p.segments, config: p.config.map(({ text, lean, ...f }) => f), givens: ['OX = 5', '∢OCX = 30°'], goal: 'CX = 8.66' });
  q.rounding = { min: 2 };
  const base = [R('∢OXC = 90°', 'tangent_radius'), R('OX = 5', 'given'), R('∢OCX = 30°', 'given'), R('tan∢OCX = OX/CX', 'tan_def', [1])];
  proof('rounded answer', q, [...base, R('CX = 8.66', 'algebra', [2, 3, 4])], { rows: [true, true, true, true, true], solved: true });
  proof('too few decimals refused', q, [...base, R('CX = 8.6', 'algebra', [2, 3, 4])], { rows: [true, true, true, true, false] });
  proof('too far refused', q, [...base, R('CX = 8.68', 'algebra', [2, 3, 4])], { rows: [true, true, true, true, false] });
}

// ---- quadrilaterals
{
  const pg = problem({ points: { A: [0, 0], B: [5, 0], C: [8, 4], D: [3, 4] }, segments: ['AB', 'BC', 'CD', 'DA'], givens: ['ABCD מקבילית', 'AB = BC'], goal: 'ABCD מעוין' });
  proof('rhombus test', pg, [R('ABCD מקבילית', 'given'), R('AB = BC', 'given'), R('ABCD מעוין', 'quad_test', [1, 2])], { rows: [true, true, true], solved: true });
  proof('rhombus from a parallelogram alone refused', pg, [R('ABCD מקבילית', 'given'), R('ABCD מעוין', 'quad_test', [1])], { rows: [true, false] });
  const tr = problem({ points: { A: [0, 0], B: [10, 0], C: [7, 4], D: [3, 4] }, segments: ['AB', 'BC', 'CD', 'DA', 'AC', 'BD'], givens: ['AB ∥ DC', 'AD = BC', '∢DAB + ∢BCD = 180°'], goal: 'ABCD טרפז שווה שוקיים' });
  proof('isosceles trapezoid test', tr, [R('AB ∥ DC', 'given'), R('AD = BC', 'given'), R('ABCD טרפז שווה שוקיים', 'quad_test', [1, 2])], { rows: [true, true, true], solved: true });
  proof('cyclic test and props', tr, [R('∢DAB + ∢BCD = 180°', 'given'), R('ABCD בר חסימה', 'cyclic_test', [1]), R('∢ACB = ∢ADB', 'cyclic_props', [2])], { rows: [true, true, true] });
  const itr = problem({ points: { A: [0, 0], B: [10, 0], C: [7, 4], D: [3, 4] }, segments: ['AB', 'BC', 'CD', 'DA'], givens: ['ABCD טרפז שווה שוקיים'], goal: 'AD = BC' });
  proof('isosceles trapezoid legs, not bases', itr, [R('ABCD טרפז שווה שוקיים', 'given'), R('AD = BC', 'quad_props', [1]), R('AB = DC', 'quad_props', [1])], { rows: [true, true, false] });
  const rect = problem({ points: { A: [0, 0], B: [6, 0], C: [6, 4], D: [0, 4] }, segments: ['AB', 'BC', 'CD', 'DA'], givens: ['ABCD מלבן'], goal: '∢DAB = 90°' });
  proof('rectangle angle, not equal sides', rect, [R('ABCD מלבן', 'given'), R('∢DAB = 90°', 'quad_props', [1]), R('AB = BC', 'quad_props', [1])], { rows: [true, true, false] });
  const kite = problem({ points: { A: [0, 3], B: [-2, 0], C: [0, -5], D: [2, 0] }, segments: ['AB', 'BC', 'CD', 'DA'], givens: ['AB = AD', 'CB = CD'], goal: 'ABCD חוסם מעגל' });
  proof('kite, then tangential', kite, [R('AB = AD', 'given'), R('CB = CD', 'given'), R('ABCD דלתון', 'quad_test', [1, 2]), R('ABCD חוסם מעגל', 'tangential_test', [3])], { rows: [true, true, true, true], solved: true });
}

// ---- tangency claims
{
  const p = problem({ points: { O: [0, 0], C: [5, 0], L: [5, 4], E: [3, 4] }, segments: ['OC', 'CL', 'CE', 'OE'], config: [{ type: 'circle', o: 'O', on: ['C', 'E'] }], givens: ['∢OCL = 90°'], goal: 'CL משיק למעגל' });
  proof('tangent from a right angle', p, [R('∢OCL = 90°', 'given'), R('CL משיק למעגל', 'tangent_test', [1])], { rows: [true, true], solved: true });
  proof('tangent without the right angle refused', p, [R('CL משיק למעגל', 'tangent_test')], { rows: [false] });
}

// ---- analytic geometry (035471 winter 2026 Q4)
{
  const p = problem({
    points: { O: [0, 0], A: [0, 12], B: [9, 0], C: [45, 27], E: [45, 0], K: [54, 0], M: [22.5, 19.5] },
    segments: ['AB', 'BC', 'CA', 'CE', 'OK', 'CK', 'MC'],
    givens: ['A(0;12)', 'B(9;0)', 'C(45;27)', 'M(22.5;19.5)', 'MC ⊥ CK'],
    goal: 'S△BKC = 607.5',
  });
  check('a point claim reads', parseClaim('C(45; 27)', p).ok && fmtClaim(parseClaim('C(45; 27)', p).claim) === 'C(45, 27)');
  proof('slope, perpendicular, line, point, distance, area', p, [
    R('C(45;27)', 'given'), R('M(22.5;19.5)', 'given'), R('m_MC = 1/3', 'coord_slope', [1, 2]), R('MC ⊥ CK', 'given'),
    R('m_CK = −3', 'slope_perp', [3, 4]), R('CK: y = −3x + 162', 'line_eq', [5, 1]), R('K(54;0)', 'line_point', [6]),
    R('B(9;0)', 'given'), R('BK = 45', 'coord_calc', [7, 8]), R('S△BKC = 607.5', 'coord_calc', [1, 7, 8]),
  ], { rows: Array(10).fill(true), solved: true });
  proof('a wrong slope refused', p, [R('C(45;27)', 'given'), R('M(22.5;19.5)', 'given'), R('m_MC = 1/2', 'coord_slope', [1, 2])], { rows: [true, true, false] });
}

// ---- analytic: a point from a distance, a circle or a midpoint; vertical lines
{
  const p = problem({
    points: { O: [0, 0], M: [3, 5], E: [3, 0], B: [0, 1], C: [0, 9], D: [16, 0], A: [1, 9], F: [3, 7], G: [2, 8] },
    segments: ['OD', 'ME', 'BC', 'AF'],
    givens: ['O(0;0)', 'OD = 16', '(x − 3)² + (y − 5)² = 25', 'M(3;5)', 'ME ⊥ OD', 'A(1;9)', 'G(2;8)', 'AG = GF'],
    goal: 'D(16;0)',
  });
  proof('point from a distance on an axis', p, [R('O(0;0)', 'given'), R('OD = 16', 'given'), R('D(16;0)', 'line_point', [1, 2])], { rows: [true, true, true], solved: true });
  proof('the wrong branch refused', p, [R('O(0;0)', 'given'), R('OD = 16', 'given'), R('D(-16;0)', 'line_point', [1, 2])], { rows: [true, true, false] });
  proof('circle meets an axis', p, [R('(x − 3)² + (y − 5)² = 25', 'given'), R('B(0;1)', 'line_point', [1]), R('C(0;9)', 'line_point', [1])], { rows: [true, true, true] });
  proof('far end from the midpoint', p, [R('A(1;9)', 'given'), R('G(2;8)', 'given'), R('AG = GF', 'given'), R('F(3;7)', 'line_point', [1, 2, 3])], { rows: [true, true, true, true] });
  proof('vertical line through a point', p, [R('M(3;5)', 'given'), R('ME ⊥ OD', 'given'), R('ME: x = 3', 'line_eq', [1, 2])], { rows: [true, true, true] });
  proof('a vertical line without the ⊥ row refused', p, [R('M(3;5)', 'given'), R('ME: x = 3', 'line_eq', [1])], { rows: [true, false] });
}

// ---- a price question (mixedUnits): an area and a length added together
{
  const base = { points: { O: [0, 0], A: [-1, 0], B: [-1.5, 0], C: [0, 1.5] }, segments: ['OB', 'OC'], givens: ['OB = 1.5'], goal: 'OB = 1.5' };
  const plain = problem(base);
  const r0 = parseClaim('30π*OB² + 20π*OB = 97.5π', plain);
  check('lengths and areas do not mix in a plain question', !r0.ok && r0.error.key === 'mixedTypes', JSON.stringify(r0.error));
  const p = problem({ ...base, mixedUnits: true });
  check('they mix in a price question', parseClaim('30π*OB² + 20π*OB = 97.5π', p).ok);
  const ra = parseClaim('OB + ∢BOC = 91.5', p);
  check('angles still do not mix with lengths', !ra.ok && ra.error.key === 'mixedTypes', JSON.stringify(ra.error));
  proof('the price of cloth and ribbon', p, [R('OB = 1.5', 'given'), R('30π*OB² = 67.5π', 'algebra', [1]), R('10*2π*OB = 30π', 'algebra', [1]),
    R('30π*OB² + 10*2π*OB = 97.5π', 'algebra', [2, 3])], { rows: [true, true, true, true] });
  proof('a wrong price refused', p, [R('OB = 1.5', 'given'), R('30π*OB² + 20π*OB = 90π', 'algebra', [1])], { rows: [true, false] });
  // '<' after a number compares; before an angle name it is still the angle sign
  for (const s of ['OB/40 < 60', '300 > 2OB', 'OB/3 > OC/5']) check(`"${s}" is an inequality`, parseClaim(s, plain).ok && parseClaim(s, plain).claim.type === 'ineq');
  const ang = parseClaim('2<BOC = 180', plain);
  check('"2<BOC" is still an angle', ang.ok && ang.claim.of === 'ang', JSON.stringify(ang.error));
  // π in the editor text is kept
  const rv = buildReview({ pts: [{ id: 'O', x: 0, y: 0 }, { id: 'B', x: -1.5, y: 0 }], segs: [['O', 'B']], circs: [{ o: 'O', r: 'B' }] }, 'נתון: 2πOB = 3π.', {});
  check('π in a given is kept', JSON.stringify(rv.givens.map((g) => g.claim)) === '["2πOB = 3π"]', JSON.stringify(rv.givens.map((g) => g.claim)));
  // π is shown as π (not 306.305), in the game and in Lean, and the shown claim reads back the same
  const price = parseClaim('30π*OB² + 10*2π*OB = 97.5π', p).claim;
  check('a π claim is shown with π', fmtClaim(price) === '30πOB² + 20πOB = 97.5π', fmtClaim(price));
  check('the shown π claim reads back', claimKey(parseClaim(fmtClaim(price), p).claim) === claimKey(price));
  check('π in Lean is Real.pi', leanOfClaim(price) === '30 * Real.pi * len O B ^ 2 + 20 * Real.pi * len O B = 97.5 * Real.pi', leanOfClaim(price));
  check('plain numbers are not π', fmtClaim(parseClaim('OB = 3.14', p).claim) === 'OB = 3.14' && fmtClaim(parseClaim('OB = 1.5', p).claim) === 'OB = 1.5');
  // the input box: '<' after a number turns into ∢ only before a three-letter angle
  check('typing 2<ABC gives an angle', liveFormat('2<ABC') === '2∢ABC', liveFormat('2<ABC'));
  check('typing 60>OB or AB/40<60 keeps the comparison', liveFormat('60>OB') === '60>OB' && liveFormat('AB/40<60') === 'AB/40<60');
}

// ---- the Lean statement: one radius per circle, also for two circles around one centre
{
  const circle = (o, on) => ({ type: 'circle', o, on, lean: on.map((x) => `len ${o} ${x} = r`).join(' ∧ ') });
  const p = problem({
    points: { O: [0, 0], A: [-1, 0], B: [-1.5, 0], C: [0, 1] },
    segments: ['OB'],
    config: [circle('O', ['A']), circle('O', ['B']), circle('O', ['C'])],
    givens: ['OA = 1', 'OB = 1.5'],
    goal: 'OB = 1.5',
  });
  const th = leanTheorem(p);
  check('two circles around O get two radii', th.includes('(r1 r2 : ℝ)') && th.includes('len O A = r1') && th.includes('len O B = r2'), th);
  check('points of one circle share its radius', th.includes('len O C = r1'), th);
  const conv = problemToLean({ ...p, givens: p.givens, goal: p.goal }).lean;
  check('the converter gives two radii too', conv.includes('len O A = r1') && conv.includes('len O B = r2') && conv.includes('len O C = r1'), conv);
}

// ---- an inequality through a ratio of positive quantities (035581 winter 2019 Q4 ד)
{
  // △ABC with the bisector AD: BD/DC = AB/AC, and the areas of ABD and ADC are in the ratio BD/DC
  const p = problem({
    points: { A: [1, 4], B: [0, 0], C: [6, 0], D: [2.2, 0] },
    segments: ['AB', 'AC', 'BC', 'AD'],
    givens: ['BD/DC = AB/AC', 'S△ABD/S△ADC = BD/DC', 'AC > AB', 'cos∢ABC > cos∢ACB'],
    goal: 'S△ADC > S△ABD',
  });
  const G = [R('BD/DC = AB/AC', 'given'), R('S△ABD/S△ADC = BD/DC', 'given'), R('AC > AB', 'given')];
  proof('a/b = c/d and c > d give a > b', p, [...G, R('S△ADC > S△ABD', 'algebra', [1, 2, 3])], { rows: [true, true, true, true], solved: true });
  proof('written with <', p, [...G, R('S△ABD < S△ADC', 'algebra', [1, 2, 3])], { rows: [true, true, true, true] });
  proof('with a coefficient', p, [...G, R('2S△ADC > 2S△ABD', 'algebra', [1, 2, 3])], { rows: [true, true, true, true] });
  proof('the wrong direction refused', p, [...G, R('S△ABD > S△ADC', 'algebra', [1, 2, 3])], { rows: [true, true, true, false] });
  proof('without the ratio rows refused', p, [...G, R('S△ADC > S△ABD', 'algebra', [3])], { rows: [true, true, true, false] });
  proof('a cosine is not taken as positive', p, [R('cos∢ABC > cos∢ACB', 'given'), R('AC/AB = cos∢ABC/cos∢ACB', 'given'), R('AC > AB', 'algebra', [1, 2])], { rows: [true, false, false] });
}

// ---- arcs and circumferences: ⌒AB, ⌒ACB, P(O), P(OA), and the theorems arc_length and circumference
{
  const at = (deg, r = 5) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];
  const p = problem({
    // circle O radius 5 through A, B, C (C on the major arc AB), D, E (a diameter); F on a circle of radius 3
    points: { O: [0, 0], A: at(0), B: at(90), C: at(225), D: at(30), E: at(210), F: at(45, 3) },
    segments: ['OA', 'OB', 'DE', 'OF'],
    config: [{ type: 'circle', o: 'O', on: ['A', 'B', 'C', 'D', 'E'] }, { type: 'circle', o: 'O', on: ['F'] }],
    givens: ['OA = 5', '∢AOB = 90°'],
    goal: 'OA = 5',
  });
  const read = (s) => parseClaim(s, p);
  const shows = (s, want) => { const r = read(s); check(`"${s}" reads as ${want}`, r.ok && fmtClaim(r.claim) === want, r.ok ? fmtClaim(r.claim) : JSON.stringify(r.error)); };
  shows('⌒AB = 2.5π', '⌒AB = 2.5π');
  shows('קשת AB = 2.5π', '⌒AB = 2.5π');
  shows('⌒ACB = 7.5π', '⌒ACB = 7.5π');
  shows('P(OF) = 6π', 'P(OF) = 6π');
  check('a minor arc in Lean is π·r·∢/180', leanOfClaim(read('⌒AB = 2.5π').claim) === '(Real.pi * len O A * ang A O B / 180) = 2.5 * Real.pi', leanOfClaim(read('⌒AB = 2.5π').claim));
  check('a major arc in Lean uses 360 − ∢', leanOfClaim(read('⌒ACB = 7.5π').claim).includes('(360 - ang A O B)'));
  check('a half circle in Lean is π·r', leanOfClaim(read('⌒DE = 5π').claim) === '(Real.pi * len O A) = 5 * Real.pi');
  const errKey = (s) => { const r = read(s); return r.ok ? 'ok' : r.error.key; };
  check('P(O) with two circles around O asks for a point', errKey('P(O) = 10π') === 'circAmbiguous' && errKey('היקף המעגל שמרכזו O = 10π') === 'circAmbiguous');
  check('an arc off every circle is refused', errKey('⌒AF = 1') === 'arcNoCircle');
  check('an arc is a length, not an area', errKey('S△AOB + ⌒AB = 12.5') === 'mixedTypes');
  check('outside arc claims an angle still may not multiply a length', errKey('OA*∢AOB = 450') === 'angleProduct');
  const G = [R('OA = 5', 'given'), R('∢AOB = 90°', 'given')];
  proof('minor arc', p, [...G, R('⌒AB = π*OA*∢AOB/180', 'arc_length'), R('⌒AB = 2.5π', 'algebra', [1, 2, 3])], { rows: [true, true, true, true] });
  proof('major arc', p, [...G, R('⌒ACB = 2π*OA - π*OA*∢AOB/180', 'arc_length'), R('⌒ACB = 7.5π', 'algebra', [1, 2, 3])], { rows: [true, true, true, true] });
  proof('arc over circumference', p, [G[1], R('⌒AB = P(OA)*∢AOB/360', 'arc_length'), R('⌒AB/P(OA) = 0.25', 'algebra', [1, 2])], { rows: [true, true, true] });
  proof('circumference', p, [G[0], R('P(OA) = 2π*OA', 'circumference'), R('P(OA) = π*DE', 'circumference'), R('P(OA) = 10π', 'algebra', [1, 2])], { rows: [true, true, true, true] });
  proof('a wrong arc length refused', p, [...G, R('⌒AB = π*OA*∢AOB/90', 'arc_length')], { rows: [true, true, false] });
  proof('a radius of another circle refused', p, [R('P(OA) = 2π*OF', 'circumference')], { rows: [false] });
  // the teacher editor: arcs and circumferences in the text; "על היקף המעגל" is still a circle fact
  const drawing = { pts: [{ id: 'O', x: 0, y: 0 }, { id: 'A', x: 5, y: 0 }, { id: 'B', x: 0, y: 5 }], segs: [['O', 'A'], ['O', 'B']], circs: [{ o: 'O', r: 'A' }] };
  const rv = buildReview(drawing, 'הנקודות A ו-B נמצאות על היקף המעגל שמרכזו O. נתון: OA = 5, אורך הקשת AB הוא 2.5π. הוכיחו: היקף המעגל O = 10π.', {});
  check('the editor reads arcs and circumferences', JSON.stringify(rv.givens.map((g) => g.claim)) === '["OA = 5","⌒AB = 2.5π"]' && rv.goal && /^P/.test(rv.goal.claim) && !(rv.unknown || []).length,
    JSON.stringify({ g: rv.givens.map((g) => g.claim), goal: rv.goal, u: rv.unknown }));
  check('"על היקף המעגל שמרכזו O" is still a circle fact', (rv.facts || []).some((f) => f.fact === 'circle' && f.o === 'O'), JSON.stringify(rv.facts));
  // fractions are shown as fractions (and read back as the same claim); other numbers stay decimals
  for (const [s, want] of [['⌒AB = π*OA*∢AOB/180', '⌒AB = πOA·∢AOB/180'], ['OB/1.5 = 8.67', '2OB/3 = 8.67'], ['OA/OB = 5/3', 'OA/OB = 5/3'],
    ['OA = 0.667OB', 'OA = 0.667OB'], ['OD² = 1407 + 342√3', 'OD² = 1999.361'], ['OA = √52', 'OA = 2√13'], ['OA = 2π/3', 'OA = 2π/3']]) {
    const r = read(s);
    const shown = r.ok ? fmtClaim(r.claim) : JSON.stringify(r.error);
    const back = /\.\d{3}\b/.test(want) || claimKey(read(shown).claim) === claimKey(r.claim); // a rounded decimal can't read back
    check(`"${s}" is shown as "${want}"`, shown === want && back, shown);
  }
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
