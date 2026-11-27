// The demo checker. In the real game every row is compiled by Lean; here the same
// catalog rules run in the browser so the site can be played without a server.
// It parses school notation (including sums like ∢AOC + ∢COB = 180°), normalizes it
// (AB = BA, ∢ABC = ∢CBA, letter order in congruences), checks each row against only
// the rows it cites, spots pure calculation steps, and emits the matching Lean.

import { REASONS, STAGES } from './data.js';

const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const others = (k) => [0, 1, 2].filter((x) => x !== k);
const EPS = 1e-9;

const ok = (claim) => ({ ok: true, claim });
const fail = (key, vars) => ({ ok: false, error: { key, vars } });

// While typing: < or > where a term starts (at the beginning, or after =, +, −, ≅)
// means an angle, so it becomes ∢; Latin letters become capitals. Same length, so the
// caret stays put.
export function liveFormat(s) {
  return String(s)
    .replace(/(^|[=+\-−*≅]\s*|\d)[<>]/g, '$1∢')
    .replace(/[a-z]/g, (c) => c.toUpperCase());
}

export function normalizeInput(s) {
  return String(s)
    .replace(/\s+/g, '')
    .replace(/_\|_|⟂/g, '⊥')
    .replace(/[∠∡]/g, '∢')
    .replace(/(^|[=+\-−*≅~\d])[<>]/g, '$1∢')
    .replace(/[Δ∆▵▲]/g, '△')
    .replace(/~=|=~|≡|≃|≌/g, '≅')
    .replace(/[º˚]/g, '°')
    .replace(/[−–]/g, '-')
    .replace(/[·×]/g, '*')
    .toUpperCase();
}

const safe = (s) => s.replace(/[^A-Z0-9°∢△≅=.,+\-*]/g, '');

// ---------- keys ----------

export const segKey = (a, b) => 's:' + [a, b].sort().join('');

// An angle is named by its vertex and one point on each arm. Points on the same ray
// from the vertex name the same arm (∢ABD = ∢ABC when D lies on BC), so each arm is
// replaced by a fixed representative point of its ray before building the key.
export function angKey(a, v, b, rays) {
  const ra = (rays && rays[v] && rays[v][a]) || a;
  const rb = (rays && rays[v] && rays[v][b]) || b;
  return 'a:' + v + ':' + [ra, rb].sort().join('');
}

export function termKey(t) {
  if (t.key) return t.key;
  if (t.kind === 'seg') return segKey(...t.p);
  if (t.kind === 'ang') return angKey(...t.p);
  return 'n:' + t.type + ':' + t.v;
}

// For each vertex V and point X, the representative of the ray V→X: the first point
// (alphabetically) that lies on that ray in the diagram.
function computeRays(points) {
  const names = Object.keys(points);
  const rays = {};
  for (const V of names) {
    rays[V] = {};
    for (const X of names) {
      if (X === V) continue;
      const vx = [points[X][0] - points[V][0], points[X][1] - points[V][1]];
      let rep = X;
      for (const Y of names) {
        if (Y === V || Y === X) continue;
        const vy = [points[Y][0] - points[V][0], points[Y][1] - points[V][1]];
        const cross = vx[0] * vy[1] - vx[1] * vy[0];
        const dot = vx[0] * vy[0] + vx[1] * vy[1];
        if (Math.abs(cross) < 1e-6 * Math.hypot(...vx) * Math.hypot(...vy) && dot > 0 && Y < rep) rep = Y;
      }
      rays[V][X] = rep;
    }
  }
  return rays;
}

// ---------- parsing ----------

function parseAtom(body, points, rays) {
  let m;
  if ((m = body.match(/^∢([A-Z])([A-Z])([A-Z])$/))) {
    const pts = [m[1], m[2], m[3]];
    const bad = pts.find((x) => !points.includes(x));
    if (bad) return fail('unknownPoint', { p: `$${bad}$` });
    if (new Set(pts).size < 3) return fail('repeatPoint');
    return { ok: true, term: { kind: 'ang', p: pts, key: angKey(pts[0], pts[1], pts[2], rays) } };
  }
  if (/^∢[A-Z]{1,2}$/.test(body)) return fail('angle3');
  if ((m = body.match(/^([A-Z])([A-Z])$/))) {
    const pts = [m[1], m[2]];
    const bad = pts.find((x) => !points.includes(x));
    if (bad) return fail('unknownPoint', { p: `$${bad}$` });
    if (pts[0] === pts[1]) return fail('repeatPoint');
    return { ok: true, term: { kind: 'seg', p: pts } };
  }
  if (/△/.test(body)) return fail('triangleNeedsCong');
  const shown = safe(body);
  return fail('unknownTerm', { t: shown ? `$${shown}$` : '…' });
}

// One side of an equation: a sum of (coefficient × segment/angle) plus a constant.
function parseSide(src, points, rays) {
  if (!src) return fail('noRelation');
  const tokens = src.match(/[+-]?[^+-]+/g);
  if (!tokens || tokens.join('') !== src) return fail('unknownTerm', { t: `$${safe(src)}$` });
  const terms = [];
  let k = 0;
  let deg = false;
  for (const tok of tokens) {
    const sign = tok[0] === '-' ? -1 : 1;
    const body = tok.replace(/^[+-]/, '');
    let m;
    if ((m = body.match(/^(\d+(?:[.,]\d+)?)(°)?$/))) {
      k += sign * parseFloat(m[1].replace(',', '.'));
      if (m[2]) deg = true;
      continue;
    }
    m = body.match(/^(\d+(?:[.,]\d+)?)?\*?(.+)$/);
    const coef = m && m[1] ? parseFloat(m[1].replace(',', '.')) : 1;
    const r = parseAtom(m ? m[2] : body, points, rays);
    if (!r.ok) return r;
    const key = termKey(r.term);
    const same = terms.find((x) => termKey(x.t) === key);
    if (same) same.c += sign * coef; else terms.push({ c: sign * coef, t: r.term });
  }
  return { ok: true, side: { terms: terms.filter((x) => Math.abs(x.c) > EPS), k, deg } };
}

const kindType = (t) => (t.kind === 'seg' ? 'len' : 'ang');

function simpleTerm(side, of) {
  if (side.terms.length === 1 && Math.abs(side.terms[0].c - 1) < EPS && Math.abs(side.k) < EPS) return side.terms[0].t;
  if (side.terms.length === 0) return { kind: 'num', v: side.k, type: of };
  return null;
}

// ctx is a prepared problem (or just a list of point names).
export function parseClaim(input, ctx) {
  const points = Array.isArray(ctx) ? ctx : ctx.pointNames;
  const rays = Array.isArray(ctx) ? null : ctx.rays;
  const s = normalizeInput(input);
  if (!s) return fail('empty');
  if (s.includes('≅')) {
    const parts = s.split('≅');
    if (parts.length !== 2) return fail('badCong');
    const tri = parts.map((x) => x.replace(/^△/, ''));
    if (!tri.every((x) => /^[A-Z]{3}$/.test(x))) return fail('badCong');
    const P = [...tri[0]];
    const Q = [...tri[1]];
    const bad = [...P, ...Q].find((x) => !points.includes(x));
    if (bad) return fail('unknownPoint', { p: `$${bad}$` });
    if (new Set(P).size < 3 || new Set(Q).size < 3) return fail('repeatPoint');
    return ok({ type: 'cong', P, Q });
  }
  if (s.includes('⊥')) {
    const parts = s.split('⊥');
    if (parts.length !== 2 || !parts.every((x) => /^[A-Z]{2}$/.test(x))) return fail('badPerp');
    const [a, b] = parts.map((x) => [...x]);
    const bad = [...a, ...b].find((x) => !points.includes(x));
    if (bad) return fail('unknownPoint', { p: `$${bad}$` });
    if (a[0] === a[1] || b[0] === b[1]) return fail('repeatPoint');
    const coords = Array.isArray(ctx) ? null : ctx.points;
    return ok({ type: 'perp', a, b, la: lineKey(coords, a[0], a[1]), lb: lineKey(coords, b[0], b[1]) });
  }
  const parts = s.split('=');
  if (parts.length > 2) return fail('oneRelation');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return fail('noRelation');
  const sides = [];
  for (const part of parts) {
    const r = parseSide(part, points, rays);
    if (!r.ok) return r;
    sides.push(r.side);
  }
  const [L, R] = sides;
  const all = [...L.terms, ...R.terms];
  if (!all.length) return fail('onlyNumbers');
  const types = new Set(all.map((x) => kindType(x.t)));
  if (L.deg || R.deg) types.add('ang');
  if (types.size > 1) return fail('mixedTypes');
  const of = [...types][0];
  return ok({ type: 'eq', L, R, of, left: simpleTerm(L, of), right: simpleTerm(R, of) });
}

// ---------- linear algebra over the cited rows ----------

function addTo(m, k, v) {
  const nv = (m.get(k) || 0) + v;
  if (Math.abs(nv) < EPS) m.delete(k); else m.set(k, nv);
}

// The equation as a vector: (left − right) = 0, keyed by segment/angle, '1' for the constant.
export function eqVec(c) {
  const m = new Map();
  for (const { c: co, t } of c.L.terms) addTo(m, termKey(t), co);
  if (c.L.k) addTo(m, '1', c.L.k);
  for (const { c: co, t } of c.R.terms) addTo(m, termKey(t), -co);
  if (c.R.k) addTo(m, '1', -c.R.k);
  return m;
}

const diffVec = (k1, k2) => { const m = new Map(); addTo(m, k1, 1); addTo(m, k2, -1); return m; };

// Is `target` a linear combination of `vectors`? (What linarith does for equalities.)
export function inSpan(vectors, target) {
  const basis = [];
  const reduce = (vec) => {
    const r = new Map(vec);
    for (const b of basis) {
      const c = r.get(b.pivot);
      if (c) for (const [k, v] of b.vec) addTo(r, k, -c * v);
    }
    return r;
  };
  for (const v of vectors) {
    const r = reduce(v);
    if (!r.size) continue;
    let pivot = null; let best = 0;
    for (const [k, val] of r) if (Math.abs(val) > best) { best = Math.abs(val); pivot = k; }
    const pv = r.get(pivot);
    const norm = new Map();
    for (const [k, val] of r) norm.set(k, val / pv);
    for (const b of basis) {
      const c = b.vec.get(pivot);
      if (c) for (const [k, val] of norm) addTo(b.vec, k, -c * val);
    }
    basis.push({ pivot, vec: norm });
  }
  return reduce(target).size === 0;
}

const refVectors = (refRows) => refRows.filter((r) => r.claim.type === 'eq').map((r) => eqVec(r.claim));

// ---------- lines ----------
// A line can be named by any two of its points (BC, CB, BD, DC … when D is on BC), so a
// line is keyed by every point of the diagram that lies on it.

const collinear = (pts, P, Q, X) => {
  const u = [pts[Q][0] - pts[P][0], pts[Q][1] - pts[P][1]];
  const v = [pts[X][0] - pts[P][0], pts[X][1] - pts[P][1]];
  return Math.abs(u[0] * v[1] - u[1] * v[0]) < 1e-6 * Math.hypot(...u) * Math.max(1, Math.hypot(...v));
};

export function lineKey(pts, P, Q) {
  if (!pts) return 'l:' + [P, Q].sort().join('');
  return 'l:' + Object.keys(pts).filter((X) => X === P || X === Q || collinear(pts, P, Q, X)).sort().join('');
}

// ---------- canonical form ----------

export function claimKey(c) {
  if (!c) return '';
  if (c.type === 'perp') return 'perp:' + [c.la, c.lb].sort().join('|');
  if (c.type === 'eq') {
    const v = eqVec(c);
    if (!v.size) return 'eq:0';
    // Same claim up to swapping sides and reordering terms, but not multiplying through:
    // "2∢BOD = 80°" is not the goal "∢BOD = 40°" (Lean agrees).
    const keys = [...v.keys()].sort();
    const d = Math.sign(v.get(keys[0]));
    return 'eq:' + keys.map((k) => `${k}=${(v.get(k) * d).toFixed(6)}`).join('|');
  }
  const a = c.P.map((p, i) => p + c.Q[i]).sort().join(',');
  const b = c.Q.map((q, i) => q + c.P[i]).sort().join(',');
  return 'cong:' + (a < b ? a : b);
}

// ---------- formatting ----------

const fmtNum = (v) => String(Math.round(v * 1000) / 1000);
const atomStr = (t) => (t.kind === 'seg' ? t.p.join('') : '∢' + t.p.join(''));

export function fmtTerm(t) {
  if (t.kind === 'num') return fmtNum(t.v) + (t.type === 'ang' ? '°' : '');
  return atomStr(t);
}

function fmtSide(side, of) {
  const unit = of === 'ang' ? '°' : '';
  const parts = [];
  side.terms.forEach(({ c, t }, i) => {
    const a = Math.abs(c);
    const body = (Math.abs(a - 1) < EPS ? '' : fmtNum(a)) + atomStr(t);
    parts.push(i === 0 ? (c < 0 ? '−' : '') + body : (c < 0 ? ' − ' : ' + ') + body);
  });
  if (!side.terms.length) parts.push(fmtNum(side.k) + unit);
  else if (Math.abs(side.k) > EPS) parts.push((side.k < 0 ? ' − ' : ' + ') + fmtNum(Math.abs(side.k)) + unit);
  return parts.join('');
}

export function fmtClaim(c) {
  if (!c) return '';
  if (c.type === 'cong') return `△${c.P.join('')} ≅ △${c.Q.join('')}`;
  if (c.type === 'perp') return `${c.a.join('')} ⊥ ${c.b.join('')}`;
  return `${fmtSide(c.L, c.of)} = ${fmtSide(c.R, c.of)}`;
}

const leanAtom = (t) => (t.kind === 'seg' ? `len ${t.p[0]} ${t.p[1]}` : `ang ${t.p.join(' ')}`);

function leanSide(side) {
  const parts = [];
  side.terms.forEach(({ c, t }, i) => {
    const a = Math.abs(c);
    const body = (Math.abs(a - 1) < EPS ? '' : `${fmtNum(a)} * `) + leanAtom(t);
    parts.push(i === 0 ? (c < 0 ? '-' : '') + body : (c < 0 ? ' - ' : ' + ') + body);
  });
  if (!side.terms.length) parts.push(fmtNum(side.k));
  else if (Math.abs(side.k) > EPS) parts.push((side.k < 0 ? ' - ' : ' + ') + fmtNum(Math.abs(side.k)));
  return parts.join('');
}

export function leanClaim(c) {
  if (c.type === 'cong') return `Cong ${c.P.join(' ')} ${c.Q.join(' ')}`;
  if (c.type === 'perp') return `Perp ${c.a.join(' ')} ${c.b.join(' ')}`;
  return `${leanSide(c.L)} = ${leanSide(c.R)}`;
}

// ---------- problem preparation ----------

const stageIndex = (id) => STAGES.findIndex((s) => s.id === id);

// Every reason unlocked at a stage: the basics plus everything from this stage or earlier.
export function unlockedReasons(stageId) {
  const si = stageIndex(stageId);
  return Object.keys(REASONS).filter((id) => {
    const r = REASONS[id];
    return r.stage === null || stageIndex(r.stage) <= si;
  });
}

export function prepareProblem(p, stageId) {
  if (p.prepared) return p;
  p.stage = stageId;
  p.pointNames = Object.keys(p.points);
  p.rays = computeRays(p.points);
  p.allowed = p.allowed || unlockedReasons(stageId);
  p.givensParsed = p.givens.map((g) => {
    const r = parseClaim(g.claim, p);
    if (!r.ok) console.error('Bad given', g.claim, r.error);
    return r.claim;
  });
  const goal = parseClaim(p.goal, p);
  if (!goal.ok) console.error('Bad goal', p.goal, goal.error);
  p.goalParsed = goal.claim;
  p.goalKey = claimKey(goal.claim);
  p.prepared = true;
  return p;
}

const dist = (problem, a, b) => {
  const A = problem.points[a]; const B = problem.points[b];
  return Math.hypot(A[0] - B[0], A[1] - B[1]);
};

function degenerate(problem, T) {
  const [a, b, c] = T.map((x) => problem.points[x]);
  const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return Math.abs(cross) < 1e-6;
}

// ---------- congruence criteria ----------

const sideEq = (P, Q, V, i, j) => inSpan(V, diffVec(segKey(P[i], P[j]), segKey(Q[i], Q[j])));
const angEq = (P, Q, V, k, rays) => {
  const [i, j] = others(k);
  return inSpan(V, diffVec(angKey(P[i], P[k], P[j], rays), angKey(Q[i], Q[k], Q[j], rays)));
};
const sideStr = (P, Q, i, j) => `${P[i]}${P[j]} = ${Q[i]}${Q[j]}`;
const angStr = (P, Q, k) => {
  const [i, j] = others(k);
  return `∢${P[i]}${P[k]}${P[j]} = ∢${Q[i]}${Q[k]}${Q[j]}`;
};

function best(options) {
  let pick = options[0];
  for (const o of options) if (o.length < pick.length) pick = o;
  return { ok: pick.length === 0, missing: pick };
}

const CRITERIA = {
  SSS: (P, Q, V) => best([[[0, 1], [1, 2], [0, 2]].filter(([i, j]) => !sideEq(P, Q, V, i, j)).map(([i, j]) => sideStr(P, Q, i, j))]),
  SAS: (P, Q, V, pr) => best([0, 1, 2].map((k) => {
    const [i, j] = others(k);
    const miss = [];
    if (!sideEq(P, Q, V, k, i)) miss.push(sideStr(P, Q, k, i));
    if (!angEq(P, Q, V, k, pr.rays)) miss.push(angStr(P, Q, k));
    if (!sideEq(P, Q, V, k, j)) miss.push(sideStr(P, Q, k, j));
    return miss;
  })),
  ASA: (P, Q, V, pr) => best([0, 1, 2].map((k) => {
    const [i, j] = others(k);
    const miss = [];
    if (!angEq(P, Q, V, i, pr.rays)) miss.push(angStr(P, Q, i));
    if (!sideEq(P, Q, V, i, j)) miss.push(sideStr(P, Q, i, j));
    if (!angEq(P, Q, V, j, pr.rays)) miss.push(angStr(P, Q, j));
    return miss;
  })),
  // Two sides and the angle opposite the larger of them.
  SSA: (P, Q, V, problem) => {
    const opts = [];
    let sizeOnly = false;
    for (const k of [0, 1, 2]) {
      const [i, j] = others(k);
      for (const adj of [i, j]) {
        const miss = [];
        if (!angEq(P, Q, V, k, problem.rays)) miss.push(angStr(P, Q, k));
        if (!sideEq(P, Q, V, i, j)) miss.push(sideStr(P, Q, i, j));
        if (!sideEq(P, Q, V, k, adj)) miss.push(sideStr(P, Q, k, adj));
        const larger = dist(problem, P[i], P[j]) > dist(problem, P[k], P[adj]) + 1e-9;
        if (larger) opts.push(miss);
        else if (!miss.length) sizeOnly = true;
      }
    }
    const r = opts.length ? best(opts) : { ok: false, missing: [] };
    if (!r.ok && sizeOnly && !opts.some((o) => !o.length)) r.sizeOnly = true;
    return r;
  },
};

// ---------- per-reason checks ----------
// Each returns { ok, msg?, proof } where proof is the Lean term for the row.

const refNames = (refRows) => refRows.map((r) => 's' + r.n).join(' ');
const isEqOf = (c, kind) => c.type === 'eq' && c.left && c.right && c.left.kind === kind && c.right.kind === kind;

function congruenceCheck(rid) {
  return (claim, refRows, problem) => {
    const proof = `${REASONS[rid].lean} ${refNames(refRows)}`.trim();
    if (claim.type !== 'cong') return { ok: false, msg: { key: 'needCong', vars: { rid } }, proof };
    for (const T of [claim.P, claim.Q]) {
      if (degenerate(problem, T)) return { ok: false, msg: { key: 'degenerate', vars: { t: `$△${T.join('')}$` } }, proof };
    }
    if (refRows.length < 3) return { ok: false, msg: { key: 'needRefsN', vars: { rid, n: 3 } }, proof };
    const V = refVectors(refRows);
    const crit = CRITERIA[rid];
    const r0 = crit(claim.P, claim.Q, V, problem);
    if (r0.ok) return { ok: true, proof };
    for (const perm of PERMS.slice(1)) {
      const Q2 = perm.map((i) => claim.Q[i]);
      if (crit(claim.P, Q2, V, problem).ok) {
        return { ok: false, msg: { key: 'wrongOrder', vars: { s: `$△${claim.P.join('')} ≅ △${Q2.join('')}$` } }, proof };
      }
    }
    if (r0.sizeOnly) return { ok: false, msg: { key: 'ssaNotLarger' }, proof };
    const m = r0.missing.map((x) => `$${x}$`).join(', ');
    return { ok: false, msg: { key: r0.missing.length === 1 ? 'critMissing1' : 'critMissingN', vars: { rid, m } }, proof };
  };
}

function cpctCheck(kind) {
  const isSide = kind === 'side';
  return (claim, refRows, problem) => {
    const ref = refRows.length === 1 && refRows[0].claim.type === 'cong' ? refRows[0] : null;
    const fallback = `${isSide ? 'cong_side' : 'cong_angle'} ${refNames(refRows)}`.trim();
    if (!isEqOf(claim, isSide ? 'seg' : 'ang')) {
      return { ok: false, msg: { key: isSide ? 'cpctSideNeedSeg' : 'cpctAngleNeedAng' }, proof: fallback };
    }
    if (!ref) return { ok: false, msg: { key: 'cpctNeedCong' }, proof: fallback };
    const { P, Q } = ref.claim;
    const k1 = termKey(claim.left);
    const k2 = termKey(claim.right);
    const options = isSide
      ? [[0, 1, 'AB'], [1, 2, 'BC'], [0, 2, 'AC']].map(([i, j, name]) => [segKey(P[i], P[j]), segKey(Q[i], Q[j]), `cong_side_${name}`])
      : [0, 1, 2].map((k) => {
        const [i, j] = others(k);
        return [angKey(P[i], P[k], P[j], problem.rays), angKey(Q[i], Q[k], Q[j], problem.rays), `cong_angle_${'ABC'[k]}`];
      });
    for (const [a, b, name] of options) {
      if (k1 === a && k2 === b) return { ok: true, proof: `${name} s${ref.n}` };
      if (k1 === b && k2 === a) return { ok: true, proof: `(${name} s${ref.n}).symm` };
    }
    return { ok: false, msg: { key: isSide ? 'cpctSideNotCorr' : 'cpctAngleNotCorr', vars: { n: ref.n } }, proof: fallback };
  };
}

// Index of a "between" fact of the diagram: O strictly between p and q.
function betweenIdx(problem, p, o, q) {
  const r = (x) => problem.rays[o][x];
  return problem.config.findIndex((c) => c.type === 'between' && c.o === o
    && ((r(c.a) === r(p) && r(c.b) === r(q)) || (r(c.a) === r(q) && r(c.b) === r(p))));
}

// ---------- isosceles triangles and right angles (stage 3) ----------

// "AB = AC": apex A and base B, C, when the two segments share exactly one endpoint.
function apexOf(c) {
  if (!isEqOf(c, 'seg')) return null;
  const [p, q] = c.left.p;
  const [r, s] = c.right.p;
  const common = [p, q].filter((x) => x === r || x === s);
  if (common.length !== 1) return null;
  const A = common[0];
  const B = p === A ? q : p;
  const C = r === A ? s : r;
  return B === C ? null : { A, B, C };
}

const sameKeys = (c, keys) => [termKey(c.left), termKey(c.right)].sort().join('|') === [...keys].sort().join('|');

// The angle of a claim "∢XVY = 90°", or null.
function rightAngle(c) {
  if (c.type !== 'eq' || c.of !== 'ang') return null;
  const v = eqVec(c);
  const angs = [...v.keys()].filter((k) => k.startsWith('a:'));
  if (angs.length !== 1 || Math.abs((v.get('1') || 0) + 90 * v.get(angs[0])) > 1e-6) return null;
  return [...c.L.terms, ...c.R.terms].map((x) => x.t).find((t) => termKey(t) === angs[0]);
}

// Do the arms of angle t lie on the lines la and lb?
function armsAre(problem, t, la, lb) {
  const [X, V, Y] = t.p;
  const l1 = lineKey(problem.points, V, X);
  const l2 = lineKey(problem.points, V, Y);
  return (l1 === la && l2 === lb) || (l1 === lb && l2 === la);
}

// What a claim says about segment AD, for D on the base BC of isosceles △ABC:
// 'median' (BD = CD), 'bisector' (∢BAD = ∢CAD) or 'altitude' (AD ⊥ BC, or ∢ADB = 90°).
function saysAboutAD(problem, c, A, B, C, D) {
  const pts = problem.points;
  const lAD = lineKey(pts, A, D);
  const lBC = lineKey(pts, B, C);
  if (isEqOf(c, 'seg') && sameKeys(c, [segKey(B, D), segKey(C, D)])) return 'median';
  if (isEqOf(c, 'ang') && sameKeys(c, [angKey(B, A, D, problem.rays), angKey(C, A, D, problem.rays)])) return 'bisector';
  if (c.type === 'perp' && [c.la, c.lb].sort().join() === [lAD, lBC].sort().join()) return 'altitude';
  const t = rightAngle(c);
  if (t && t.p[1] === D && armsAre(problem, t, lAD, lBC)) return 'altitude';
  return null;
}

const CHECKS = {
  perp_def(claim, refRows, problem) {
    const base = 'perp_def';
    if (refRows.length !== 1) return { ok: false, msg: { key: 'needRefsN', vars: { rid: 'perp_def', n: 1 } }, proof: base };
    const ref = refRows[0];
    const [pc, ac] = claim.type === 'perp' ? [claim, ref.claim] : [ref.claim, claim];
    const t = pc.type === 'perp' ? rightAngle(ac) : null;
    const proof = `${base}.${claim.type === 'perp' ? 'mpr' : 'mp'} s${ref.n}`;
    if (!t) return { ok: false, msg: { key: 'perpDefShape' }, proof };
    if (!armsAre(problem, t, pc.la, pc.lb)) return { ok: false, msg: { key: 'perpDefNotSame' }, proof };
    return { ok: true, proof };
  },
  iso_base(claim, refRows, problem) {
    const proof = `iso_base_angles ${refNames(refRows)}`.trim();
    const legs = refRows.length === 1 ? apexOf(refRows[0].claim) : null;
    if (!legs) return { ok: false, msg: { key: 'isoNeedLegs' }, proof };
    const { A, B, C } = legs;
    if (degenerate(problem, [A, B, C])) return { ok: false, msg: { key: 'degenerate', vars: { t: `$△${A}${B}${C}$` } }, proof };
    if (!isEqOf(claim, 'ang')) return { ok: false, msg: { key: 'isoBaseNeedAngles' }, proof };
    if (sameKeys(claim, [angKey(A, B, C, problem.rays), angKey(A, C, B, problem.rays)])) return { ok: true, proof };
    return { ok: false, msg: { key: 'isoBaseWrong', vars: { t: `$△${A}${B}${C}$`, a: `$∢${A}${B}${C} = ∢${A}${C}${B}$` } }, proof };
  },
  iso_converse(claim, refRows, problem) {
    const proof = `iso_of_angles ${refNames(refRows)}`.trim();
    const legs = apexOf(claim);
    if (!legs) return { ok: false, msg: { key: 'isoConvNeedSides' }, proof };
    const { A, B, C } = legs;
    if (degenerate(problem, [A, B, C])) return { ok: false, msg: { key: 'degenerate', vars: { t: `$△${A}${B}${C}$` } }, proof };
    const ref = refRows.length === 1 && isEqOf(refRows[0].claim, 'ang') ? refRows[0] : null;
    if (!ref) return { ok: false, msg: { key: 'isoNeedBaseAngles' }, proof };
    if (sameKeys(ref.claim, [angKey(A, B, C, problem.rays), angKey(A, C, B, problem.rays)])) return { ok: true, proof };
    return { ok: false, msg: { key: 'isoConvWrong', vars: { s: `$${fmtClaim(claim)}$`, a: `$∢${A}${B}${C} = ∢${A}${C}${B}$` } }, proof };
  },
  // In an isosceles triangle the median to the base, the apex bisector and the altitude
  // to the base are the same segment: knowing one of them gives the other two.
  iso_median(claim, refRows, problem) {
    const proof = `iso_median ${refNames(refRows)}`.trim();
    let msg = null;
    for (const legsRow of refRows) {
      const legs = apexOf(legsRow.claim);
      if (!legs || degenerate(problem, [legs.A, legs.B, legs.C])) continue;
      const { A, B, C } = legs;
      for (const D of problem.pointNames.filter((x) => strictlyBetween(problem.points, B, x, C))) {
        if (!saysAboutAD(problem, claim, A, B, C, D)) continue;
        if (refRows.some((r) => r !== legsRow && saysAboutAD(problem, r.claim, A, B, C, D))) return { ok: true, proof };
        msg = msg || { key: 'isoMedianNeedOne', vars: { d: `$${A}${D}$` } };
      }
      msg = msg || { key: 'isoMedianShape' };
    }
    return { ok: false, msg: msg || { key: 'isoNeedLegs' }, proof };
  },
  given(claim, refRows, problem) {
    const gi = problem.givensParsed.findIndex((g) => claimKey(g) === claimKey(claim));
    if (gi < 0) return { ok: false, msg: { key: 'notGiven' }, proof: 'g?' };
    return { ok: true, proof: `g${gi + 1}` };
  },
  common_side(claim) {
    if (!isEqOf(claim, 'seg')) return { ok: false, msg: { key: 'commonSideNeedsSeg' }, proof: 'rfl' };
    if (termKey(claim.left) !== termKey(claim.right)) return { ok: false, msg: { key: 'notCommonSide' }, proof: 'rfl' };
    return { ok: true, proof: 'rfl' };
  },
  common_angle(claim) {
    if (!isEqOf(claim, 'ang')) return { ok: false, msg: { key: 'commonAngleNeedsAng' }, proof: 'rfl' };
    if (termKey(claim.left) !== termKey(claim.right)) return { ok: false, msg: { key: 'notCommonAngle' }, proof: 'rfl' };
    const same = angKey(...claim.left.p) === angKey(...claim.right.p);
    return { ok: true, proof: same ? 'rfl' : 'ang_same_rays (by from_diagram)' };
  },
  vert_angles(claim, refRows, problem) {
    const base = 'vert_angles_eq';
    if (!isEqOf(claim, 'ang')) return { ok: false, msg: { key: 'vertNeedAngles' }, proof: base };
    const [X, V, Y] = claim.left.p;
    const [Z, V2, W] = claim.right.p;
    if (V !== V2) return { ok: false, msg: { key: 'vertSameVertex' }, proof: base };
    for (const [a, b] of [[Z, W], [W, Z]]) {
      const c1 = betweenIdx(problem, X, V, a);
      const c2 = betweenIdx(problem, Y, V, b);
      if (c1 >= 0 && c2 >= 0) return { ok: true, proof: `${base} cfg${c1 + 1} cfg${c2 + 1}` };
    }
    return { ok: false, msg: { key: 'vertNotOpposite' }, proof: base };
  },
  adj_angles(claim, refRows, problem) {
    const base = 'adj_angles_sum';
    if (claim.type !== 'eq' || claim.of !== 'ang') return { ok: false, msg: { key: 'adjNeedSum' }, proof: base };
    const v = eqVec(claim);
    const angs = [...v.keys()].filter((k) => k.startsWith('a:'));
    const c1 = v.get(angs[0]);
    if (angs.length !== 2 || Math.abs(c1 - v.get(angs[1])) > 1e-9 || Math.abs((v.get('1') || 0) + 180 * c1) > 1e-6) {
      return { ok: false, msg: { key: 'adjNeedSum' }, proof: base };
    }
    const terms = [...claim.L.terms, ...claim.R.terms].map((x) => x.t).filter((t) => t.kind === 'ang');
    const [t1, t2] = angs.map((k) => terms.find((t) => termKey(t) === k));
    if (t1.p[1] !== t2.p[1]) return { ok: false, msg: { key: 'adjSameVertex' }, proof: base };
    const O = t1.p[1];
    const ray = (x) => problem.rays[O][x];
    const r1 = [t1.p[0], t1.p[2]];
    const r2 = [t2.p[0], t2.p[2]];
    const shared = r1.find((x) => r2.some((y) => ray(y) === ray(x)));
    if (shared) {
      const a = r1.find((x) => ray(x) !== ray(shared));
      const b = r2.find((x) => ray(x) !== ray(shared));
      const ci = betweenIdx(problem, a, O, b);
      if (ci >= 0) return { ok: true, proof: `${base} cfg${ci + 1}` };
    }
    return { ok: false, msg: { key: 'adjNotAdjacent' }, proof: base };
  },
  straight_angle(claim, refRows, problem) {
    const base = 'straight_angle';
    const v = claim.type === 'eq' && claim.of === 'ang' ? eqVec(claim) : null;
    const angs = v ? [...v.keys()].filter((k) => k.startsWith('a:')) : [];
    if (angs.length !== 1 || Math.abs((v.get('1') || 0) + 180 * v.get(angs[0])) > 1e-6) {
      return { ok: false, msg: { key: 'straightNeed' }, proof: base };
    }
    const t = [...claim.L.terms, ...claim.R.terms].map((x) => x.t).find((x) => termKey(x) === angs[0]);
    const ci = betweenIdx(problem, t.p[0], t.p[1], t.p[2]);
    if (ci < 0) return { ok: false, msg: { key: 'straightNotLine' }, proof: base };
    return { ok: true, proof: `${base} cfg${ci + 1}` };
  },
  algebra(claim, refRows) {
    const proof = refRows.length ? `by linarith [${refRows.map((r) => 's' + r.n).join(', ')}]` : 'by ring';
    if (claim.type !== 'eq') return { ok: false, msg: { key: 'algebraNeedEq' }, proof };
    const target = eqVec(claim);
    if (!target.size) return { ok: true, proof: 'by ring' };
    if (!refRows.length) return { ok: false, msg: { key: 'needRefs' }, proof };
    if (inSpan(refVectors(refRows), target)) return { ok: true, proof };
    return {
      ok: false,
      msg: { key: 'algebraFail', vars: { rows: refRows.map((r) => r.n).join(', '), claim: `$${fmtClaim(claim)}$` } },
      proof,
    };
  },
  SAS: congruenceCheck('SAS'),
  ASA: congruenceCheck('ASA'),
  SSS: congruenceCheck('SSS'),
  SSA: congruenceCheck('SSA'),
  cpct_side: cpctCheck('side'),
  cpct_angle: cpctCheck('angle'),
};

// Check every row. rows: [{ text, reason, refs: [rowNumbers] }].
export function checkProof(problem, rows) {
  const results = [];
  rows.forEach((row, i) => {
    const n = i + 1;
    const parsed = parseClaim(row.text, problem);
    const res = { n, parsed, ok: false, msg: null, lean: null, goal: false };
    results.push(res);
    if (!parsed.ok) { res.msg = parsed.error; return; }
    const claim = parsed.claim;
    const key = claimKey(claim);
    res.goal = key === problem.goalKey;
    const head = `have s${n} : ${leanClaim(claim)} :=`;
    const rid = row.reason;
    if (!rid) { res.msg = { key: 'noReason' }; res.lean = `${head} sorry`; return; }
    if (!problem.allowed.includes(rid)) { res.msg = { key: 'reasonNotAllowed' }; res.lean = `${head} sorry`; return; }
    const refs = [...(row.refs || [])].sort((a, b) => a - b);
    for (const r of refs) {
      if (r >= n || r < 1) { res.msg = { key: 'refFuture' }; res.lean = `${head} sorry`; return; }
      if (!results[r - 1].ok) { res.msg = { key: 'refBad', vars: { n: r } }; res.lean = `${head} sorry`; return; }
    }
    // A given stated in words ("AD bisects ∠BAC") may also be cited through its definition.
    const gi = problem.givens.findIndex((g, j) => (g.also || []).includes(rid) && claimKey(problem.givensParsed[j]) === key);
    if (gi >= 0) { res.ok = true; res.lean = `${head} ${REASONS[rid].lean} g${gi + 1}`; return; }
    const refRows = refs.map((r) => ({ n: r, claim: results[r - 1].parsed.claim }));
    const check = CHECKS[rid];
    const out = check
      ? check(claim, refRows, problem)
      : { ok: false, msg: { key: 'reasonNoFit', vars: { rid } }, proof: `${REASONS[rid].lean} ${refNames(refRows)}`.trim() };
    res.ok = out.ok;
    res.msg = out.msg || null;
    res.lean = `${head} ${out.proof}`;
  });
  const gi = results.findIndex((r) => r.ok && r.goal);
  let solvedAt = -1;
  let blocked = false;
  if (gi >= 0) {
    if (results.slice(0, gi).every((r) => r.ok)) solvedAt = gi;
    else blocked = true;
  }
  return { results, solvedAt, blocked };
}

// If a claim is pure calculation from earlier correct rows (or an identity),
// return the reason and the fewest rows that give it; otherwise null.
export function autoReason(problem, results, claim, upto) {
  if (!claim) return null;
  if (problem.givensParsed.some((g) => claimKey(g) === claimKey(claim))) return { reason: 'given', refs: [] };
  if (claim.type !== 'eq') return null;
  const target = eqVec(claim);
  if (!target.size) {
    if (isEqOf(claim, 'seg')) return { reason: 'common_side', refs: [] };
    if (isEqOf(claim, 'ang')) return { reason: 'common_angle', refs: [] };
    return { reason: 'algebra', refs: [] };
  }
  const pool = results.slice(0, upto).filter((r) => r.ok && r.parsed.ok && r.parsed.claim.type === 'eq');
  if (!pool.length) return null;
  const vecs = pool.map((r) => eqVec(r.parsed.claim));
  if (!inSpan(vecs, target)) return null;
  let keep = pool.map((_, i) => i);
  for (const i of [...keep].reverse()) {
    const trial = keep.filter((x) => x !== i);
    if (inSpan(trial.map((x) => vecs[x]), target)) keep = trial;
  }
  return { reason: 'algebra', refs: keep.map((x) => pool[x].n) };
}

// ---------- one angle, many names ----------
// The Lean checker derives the same-name facts itself from the coordinates (it only trusts
// facts it can justify from the diagram), naming them ray1, ray2, …; reversed names
// (∢ABC = ∢CBA, AB = BA) are handled there by ang_comm and len_comm.

const strictlyBetween = (pts, P, V, Q) => {
  const a = [pts[P][0] - pts[V][0], pts[P][1] - pts[V][1]];
  const b = [pts[Q][0] - pts[V][0], pts[Q][1] - pts[V][1]];
  const cross = a[0] * b[1] - a[1] * b[0];
  return Math.abs(cross) < 1e-6 * Math.hypot(...a) * Math.hypot(...b) && a[0] * b[0] + a[1] * b[1] < 0;
};

// Angles that really have more than one name in the drawing (beyond reversing the
// letters), using only arms that lie along drawn segments: [[X, V, Y], [X2, V, Y2], ...].
export function renamedAngles(problem) {
  const { pointNames: pts, rays, points } = problem;
  const drawn = {};
  for (const V of pts) drawn[V] = new Set();
  for (const sg of problem.segments || []) {
    const [P, Q] = sg.split('');
    for (const V of pts) {
      if (V === P) drawn[V].add(rays[V][Q]);
      else if (V === Q) drawn[V].add(rays[V][P]);
      else if (strictlyBetween(points, P, V, Q)) { drawn[V].add(rays[V][P]); drawn[V].add(rays[V][Q]); }
    }
  }
  const out = [];
  for (const V of pts) {
    const groups = new Map();
    for (const X of pts) {
      for (const Y of pts) {
        if (X === V || Y === V || X >= Y || rays[V][X] === rays[V][Y]) continue;
        if (!drawn[V].has(rays[V][X]) || !drawn[V].has(rays[V][Y])) continue;
        const key = angKey(X, V, Y, rays);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push([X, V, Y]);
      }
    }
    for (const names of groups.values()) if (names.length > 1) out.push(names);
  }
  return out;
}

// The problem statement as a Lean theorem, with the student's rows if given.
// Other names of the same angle enter as facts from the diagram (ray1, ray2, …), as in
// the Lean checker.
export function leanTheorem(problem, results, upto) {
  const name = `geo_${problem.stage}_${String(problem.n).padStart(4, '0')}`;
  const renamed = renamedAngles(problem).flatMap((names) => names.slice(1).map((n) => `ang ${names[0].join(' ')} = ang ${n.join(' ')}`));
  const hyps = [
    ...problem.config.map((c, i) => `(cfg${i + 1} : ${c.lean})`),
    ...renamed.map((s, i) => `(ray${i + 1} : ${s})`),
    ...problem.givensParsed.map((g, i) => `(g${i + 1} : ${leanClaim(g)})`),
  ];
  const lines = [`theorem ${name} (${problem.pointNames.join(' ')} : Point)`];
  hyps.forEach((h, i) => lines.push(`    ${h}${i === hyps.length - 1 ? ' :' : ''}`));
  if (!hyps.length) lines[0] += ' :';
  lines.push(`    ${leanClaim(problem.goalParsed)} := by`);
  if (results && upto >= 0) {
    for (let i = 0; i <= upto; i++) lines.push(`  ${results[i].lean}`);
    lines.push(`  exact s${upto + 1}`);
  } else {
    lines.push('  sorry');
  }
  return lines.join('\n');
}
