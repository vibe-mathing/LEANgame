// The arithmetic behind the "algebra" reason, for every stage.
//
// A claim such as AC² + BC² = AB² or BD/DC = AB/AC becomes a polynomial: a Map from
// monomial keys to coefficients, meaning (left − right) = 0. A monomial is a product of
// atoms (a segment, an angle, the sine of an angle, …) with integer exponents. A single
// atom to the first power keeps the atom's own key ('s:AB', 'a:B:AC'), so linear claims
// keep exactly the keys they always had. '1' is the constant.
//
// What may be concluded from the cited rows:
//   1. any linear combination of them (what linarith does with equalities);
//   2. after substituting every value the rows pin down: AB = 3 gives AB² = 9,
//      AB² = 25 gives AB = 5 (a length is positive), ∢A = 30° gives sin∢A = 0.5, and
//      proportions are cross-multiplied, so BD/DC = 2/3 and BD + DC = 10 give BD = 4;
//   3. for an inequality, a non-negative combination of the cited inequalities plus a
//      non-negative constant, on top of any combination of the cited equalities.
// No import: geo.js builds the polynomials, this file only reasons about them.

export const EPS = 1e-9;

export function addTo(m, k, v) {
  const nv = (m.get(k) || 0) + v;
  if (Math.abs(nv) < EPS) m.delete(k); else m.set(k, nv);
}

// ---------- monomials ----------

const atomCmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function factorsOf(key) {
  const f = new Map();
  if (key === '1') return f;
  for (const part of key.split('*')) {
    const i = part.lastIndexOf('^');
    const atom = i < 0 ? part : part.slice(0, i);
    const e = i < 0 ? 1 : Number(part.slice(i + 1));
    f.set(atom, (f.get(atom) || 0) + e);
  }
  return f;
}

export function keyOf(f) {
  const parts = [...f].filter(([, e]) => e !== 0).sort(([a], [b]) => atomCmp(a, b));
  if (!parts.length) return '1';
  if (parts.length === 1 && parts[0][1] === 1) return parts[0][0];
  return parts.map(([a, e]) => (e === 1 ? a : `${a}^${e}`)).join('*');
}

export function mulKeys(k1, k2) {
  const f = factorsOf(k1);
  for (const [a, e] of factorsOf(k2)) f.set(a, (f.get(a) || 0) + e);
  return keyOf(f);
}

export const isLinearKey = (k) => k === '1' || (!k.includes('*') && !k.includes('^'));
export const isLinear = (p) => [...p.keys()].every(isLinearKey);

// ---------- polynomials ----------

export function scale(p, c) {
  const out = new Map();
  for (const [k, v] of p) addTo(out, k, v * c);
  return out;
}

export function mulMono(p, key) {
  const out = new Map();
  for (const [k, v] of p) addTo(out, mulKeys(k, key), v);
  return out;
}

// Multiply through by every denominator: BD/DC − AB/AC = 0 becomes BD·AC − AB·DC = 0.
export function clearDen(p) {
  const low = new Map();
  for (const k of p.keys()) for (const [a, e] of factorsOf(k)) if (e < (low.get(a) || 0)) low.set(a, e);
  if (!low.size) return p;
  const f = new Map();
  for (const [a, e] of low) f.set(a, -e);
  return mulMono(p, keyOf(f));
}

// Replace every atom whose value is known by that value.
export function substitute(p, known) {
  if (!known.size) return p;
  const out = new Map();
  for (const [k, v] of p) {
    let c = v;
    const rest = new Map();
    for (const [a, e] of factorsOf(k)) {
      if (known.has(a)) c *= known.get(a) ** e;
      else rest.set(a, e);
    }
    addTo(out, keyOf(rest), c);
  }
  return out;
}

// ---------- linear algebra over monomials ----------

function reduceBy(basis, vec) {
  const r = new Map(vec);
  for (const b of basis) {
    const c = r.get(b.pivot);
    if (c) for (const [k, v] of b.vec) addTo(r, k, -c * v);
  }
  return r;
}

// Reduced row echelon form, built one vector at a time. With `noConst`, the constant is never
// a pivot, so every basis vector reads "pivot = −constant − (other monomials)".
function pushBasis(basis, vec, noConst) {
  const r = reduceBy(basis, vec);
  let pivot = null; let best = 0;
  for (const [k, val] of r) {
    if (noConst && k === '1') continue;
    if (Math.abs(val) > best) { best = Math.abs(val); pivot = k; }
  }
  if (pivot === null) return;
  const pv = r.get(pivot);
  const norm = new Map();
  for (const [k, val] of r) norm.set(k, val / pv);
  for (const b of basis) {
    const c = b.vec.get(pivot);
    if (c) for (const [k, val] of norm) addTo(b.vec, k, -c * val);
  }
  basis.push({ pivot, vec: norm });
}

// Is `target` a linear combination of `vectors`?
export function inSpan(vectors, target) {
  const basis = [];
  for (const v of vectors) pushBasis(basis, v, false);
  return reduceBy(basis, target).size === 0;
}

// ---------- values the rows pin down ----------

const DEG = Math.PI / 180;
const TRIG = { sin: Math.sin, cos: Math.cos, tan: Math.tan };

// sin, cos or tan of an angle in degrees. sin 30° is exactly ½ in Lean, so the floating
// point noise of the special angles is snapped away.
export function trigDeg(fn, deg) {
  if (fn === 'tan' && Math.abs(((deg % 180) + 180) % 180 - 90) < 1e-9) return null;
  const v = TRIG[fn](deg * DEG);
  const r = Math.round(v * 1e9) / 1e9;
  return Math.abs(v - r) < 1e-12 ? r : v;
}

// A trig atom is 't:sin(<angle key>)'. Its value is known once the angle's is.
function trigValue(atom, known) {
  const m = atom.match(/^t:(sin|cos|tan)\((.+)\)$/);
  if (!m || !known.has(m[2])) return null;
  return trigDeg(m[1], known.get(m[2]));
}

export function derive(polys) {
  const known = new Map();
  for (let it = 0; it < 16; it++) {
    let added = false;
    for (const p of polys) {
      for (const k of p.keys()) {
        for (const a of factorsOf(k).keys()) {
          if (known.has(a) || !a.startsWith('t:')) continue;
          const v = trigValue(a, known);
          if (v != null) { known.set(a, v); added = true; }
        }
      }
    }
    const basis = [];
    for (const p of polys) pushBasis(basis, clearDen(substitute(p, known)), true);
    for (const b of basis) {
      if ([...b.vec.keys()].some((k) => k !== '1' && k !== b.pivot)) continue;
      const f = factorsOf(b.pivot);
      if (f.size !== 1) continue;
      const [[atom, e]] = [...f];
      if (known.has(atom)) continue;
      const val = -(b.vec.get('1') || 0);
      let x = null;
      if (e === 1) x = val;
      else if (atom.startsWith('s:') && val > 0) x = val ** (1 / e); // lengths are positive
      if (x === null || !Number.isFinite(x)) continue;
      known.set(atom, x);
      added = true;
    }
    if (!added) break;
  }
  return known;
}

// Does target = 0 follow from polys = 0? Returns 'linear', 'nonlinear' or false.
export function follows(polys, target) {
  if (!target.size) return 'linear';
  if (inSpan(polys, target)) return 'linear';
  const pool = [...polys, ...polys.map(clearDen)];
  if (inSpan(pool, target) || inSpan(pool, clearDen(target))) return 'nonlinear';
  const known = derive(polys);
  if (!known.size) return false;
  const subs = [];
  for (const p of polys) { const s = substitute(p, known); subs.push(s, clearDen(s)); }
  const t = substitute(target, known);
  if (!t.size || inSpan(subs, t) || inSpan(subs, clearDen(t))) return 'nonlinear';
  return false;
}

// ---------- inequalities ----------

// Solve Σ x_j · cols[j] = target. Returns x (free variables set to 0) or null.
function solveCombo(cols, target) {
  const keys = [...new Set([...cols.flatMap((c) => [...c.keys()]), ...target.keys()])];
  const n = cols.length;
  const A = keys.map((k) => [...cols.map((c) => c.get(k) || 0), target.get(k) || 0]);
  const pivCol = [];
  let r = 0;
  for (let c = 0; c < n && r < A.length; c++) {
    let best = r;
    for (let i = r + 1; i < A.length; i++) if (Math.abs(A[i][c]) > Math.abs(A[best][c])) best = i;
    if (Math.abs(A[best][c]) < EPS) continue;
    [A[r], A[best]] = [A[best], A[r]];
    const pv = A[r][c];
    for (let j = c; j <= n; j++) A[r][j] /= pv;
    for (let i = 0; i < A.length; i++) {
      if (i === r || Math.abs(A[i][c]) < EPS) continue;
      const f = A[i][c];
      for (let j = c; j <= n; j++) A[i][j] -= f * A[r][j];
    }
    pivCol.push(c);
    r++;
  }
  for (let i = r; i < A.length; i++) if (Math.abs(A[i][n]) > 1e-7) return null;
  const x = new Array(n).fill(0);
  pivCol.forEach((c, i) => { x[c] = A[i][n]; });
  return x;
}

// Does target > 0 follow from eqs = 0 and gts > 0?
export function followsIneq(eqs, gts, target) {
  const known = derive(eqs);
  const E = [];
  for (const p of eqs) { const s = substitute(p, known); if (s.size) E.push(s, clearDen(s)); }
  const G = gts.map((p) => substitute(p, known)).filter((p) => p.size);
  const t = substitute(target, known);
  const ONE = new Map([['1', 1]]);
  const n = Math.min(G.length, 6);
  for (let mask = 0; mask < (1 << n); mask++) {
    const S = G.filter((_, i) => mask & (1 << i));
    const x = solveCombo([...E, ...S, ONE], t);
    if (!x) continue;
    const mu = x.slice(E.length);
    if (mu.every((v) => v > -1e-9) && mu.some((v) => v > 1e-9)) return true;
  }
  return false;
}
