// The demo checker. In the real game every row is compiled by Lean; here the same
// catalog rules run in the browser so the site can be played without a server.
// It parses school notation (including sums like ∢AOC + ∢COB = 180°), normalizes it
// (AB = BA, ∢ABC = ∢CBA, letter order in congruences), checks each row against only
// the rows it cites, spots pure calculation steps, and emits the matching Lean.

import { REASONS, STAGES } from './data.js';
import { getLang } from './i18n.js';
import * as alg from './algebra.js';

const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const others = (k) => [0, 1, 2].filter((x) => x !== k);
const EPS = 1e-9;

const ok = (claim) => ({ ok: true, claim });
const fail = (key, vars) => ({ ok: false, error: { key, vars } });

// While typing: < or > where a term starts (at the beginning, after =, +, −, ≅, after a
// relation sign, or after sin/cos/tan) means an angle, so it becomes ∢; Latin letters
// become capitals. Same length, so the caret stays put. A lone < or > after a term is
// "less than" / "greater than".
export function liveFormat(s) {
  return String(s)
    .replace(/(^|[=+\-−*/≅<>∥⊥∼]\s*|\d|sin|cos|tan)[<>]/gi, '$1∢')
    .replace(/[a-z]/g, (c) => c.toUpperCase());
}

export function normalizeInput(s) {
  return String(s)
    .replace(/\s+/g, '')
    .replace(/_\|_|⟂/g, '⊥')
    .replace(/\|\||\/\//g, '∥')
    .replace(/[∠∡]/g, '∢')
    .replace(/(sin|cos|tan)[<>]/gi, '$1∢')
    .replace(/(^|[=+\-−*/≅~<>∥⊥∼\d])[<>]/g, '$1∢')
    .replace(/[Δ∆▵▲]/g, '△')
    .replace(/~=|=~|≡|≃|≌/g, '≅')
    .replace(/~/g, '∼')
    .replace(/[º˚]/g, '°')
    .replace(/\^2/g, '²')
    .replace(/[−–]/g, '-')
    .replace(/[·×]/g, '*')
    .replace(/[÷:]/g, '/')
    .toUpperCase();
}

const safe = (s) => s.replace(/[^A-Z0-9°∢△≅=<>∥∼².,+\-*/√]/g, '');

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

// The quadrilateral types a claim can state, as "ABCD מקבילית" or "parallelogram ABCD".
// `sym`: the vertex orders that name the same quadrilateral of that type. A parallelogram
// ABCD is also BCDA and DCBA; a kite ABCD (AB = AD, CB = CD, heads A and C) is also ADCB,
// CBAD and CDAB; a trapezoid ABCD (bases AB and DC) is also BADC, DCBA and CDAB.
const D4 = [[0, 1, 2, 3], [1, 2, 3, 0], [2, 3, 0, 1], [3, 0, 1, 2], [3, 2, 1, 0], [2, 1, 0, 3], [1, 0, 3, 2], [0, 3, 2, 1]];
const KITE = [[0, 1, 2, 3], [0, 3, 2, 1], [2, 1, 0, 3], [2, 3, 0, 1]];
const TRAP = [[0, 1, 2, 3], [1, 0, 3, 2], [3, 2, 1, 0], [2, 3, 0, 1]];
export const QUADS = {
  parallelogram: { he: 'מקבילית', en: 'parallelogram', lean: 'IsParallelogram', sym: D4 },
  rectangle: { he: 'מלבן', en: 'rectangle', lean: 'IsRectangle', sym: D4 },
  rhombus: { he: 'מעוין', en: 'rhombus', alt: ['מעויין'], lean: 'IsRhombus', sym: D4 },
  square: { he: 'ריבוע', en: 'square', lean: 'IsSquare', sym: D4 },
  kite: { he: 'דלתון', en: 'kite', lean: 'IsKite', sym: KITE },
  isoTrapezoid: { he: 'טרפז שווה שוקיים', en: 'isosceles trapezoid', alt: ['טרפז ש"ש', 'טרפז ש״ש'], lean: 'IsIsoTrapezoid', sym: TRAP },
  trapezoid: { he: 'טרפז', en: 'trapezoid', lean: 'IsTrapezoid', sym: TRAP },
};
const squashName = (s) => s.replace(/\s+/g, '').toUpperCase();

// "ABCD מקבילית", "מקבילית ABCD", "ABCD is a parallelogram". null when no type is named.
function parseQuad(s, points) {
  for (const [kind, q] of Object.entries(QUADS)) {
    for (const w of [q.he, q.en, ...(q.alt || [])].map(squashName)) {
      let rest = null;
      if (s.startsWith(w)) rest = s.slice(w.length);
      else if (s.endsWith(w)) rest = s.slice(0, -w.length).replace(/(הוא|היא|IS(AN?)?)$/, '');
      if (rest === null) continue;
      rest = rest.replace(/^(המרובע|QUADRILATERAL)/, '');
      if (!/^[A-Z]{4}$/.test(rest)) return fail('badQuad');
      const P = [...rest];
      const bad = P.find((x) => !points.includes(x));
      if (bad) return fail('unknownPoint', { p: `$${bad}$` });
      if (new Set(P).size < 4) return fail('repeatPoint');
      return ok({ type: 'quad', kind, P });
    }
  }
  return null;
}

// The problem parseClaim is reading (null for a bare list of point names): for ∢A, which needs the
// drawn segments. parseClaim is synchronous, so this is never stale.
let parseCtx = null;

// The arms of the drawing at V: one point per ray from V along a drawn segment (the ray's
// representative, as in angKey).
function drawnArms(problem, V) {
  const { rays, points } = problem;
  const arms = new Set();
  for (const sg of problem.segments || []) {
    const [P, Q] = sg.split('');
    if (!points[P] || !points[Q]) continue;
    if (V === P) arms.add(rays[V][Q]);
    else if (V === Q) arms.add(rays[V][P]);
    else if (strictlyBetween(points, P, V, Q)) { arms.add(rays[V][P]); arms.add(rays[V][Q]); }
  }
  return [...arms].sort();
}

function parseAtom(body, points, rays) {
  let m;
  // The area of a triangle: S△ABC (also S(ABC)). Any order of the letters is the same area.
  if ((m = body.match(/^S(?:△|\()([A-Z])([A-Z])([A-Z])\)?$/))) {
    const pts = [m[1], m[2], m[3]];
    const bad = pts.find((x) => !points.includes(x));
    if (bad) return fail('unknownPoint', { p: `$${bad}$` });
    if (new Set(pts).size < 3) return fail('repeatPoint');
    return { ok: true, term: { kind: 'area', p: pts, key: 'S:' + [...pts].sort().join('') } };
  }
  if (/^S(△|\()/.test(body)) return fail('badArea');
  if ((m = body.match(/^(SIN|COS|TAN)(∢.*)$/))) {
    const r = parseAtom(m[2], points, rays);
    if (!r.ok) return r;
    const fn = m[1].toLowerCase();
    return { ok: true, term: { kind: 'trig', fn, a: r.term, key: `t:${fn}(${r.term.key})` } };
  }
  if ((m = body.match(/^(SIN|COS|TAN)(\d+(?:[.,]\d+)?)°?$/))) {
    const v = alg.trigDeg(m[1].toLowerCase(), parseFloat(m[2].replace(',', '.')));
    return v == null ? fail('unknownTerm', { t: `$${safe(body)}$` }) : { ok: true, num: v };
  }
  if (/^(SIN|COS|TAN)/.test(body)) return fail('trigNeedsAngle');
  if ((m = body.match(/^∢([A-Z])([A-Z])([A-Z])$/))) {
    const pts = [m[1], m[2], m[3]];
    const bad = pts.find((x) => !points.includes(x));
    if (bad) return fail('unknownPoint', { p: `$${bad}$` });
    if (new Set(pts).size < 3) return fail('repeatPoint');
    return { ok: true, term: { kind: 'ang', p: pts, key: angKey(pts[0], pts[1], pts[2], rays) } };
  }
  // ∢A (typed <A): the angle at A, when exactly two drawn arms leave A and they are not a straight
  // line. With a third segment from A (a bisector AD), or with A in the middle of a line, ∢A
  // could be several angles, so the student writes three letters.
  if ((m = body.match(/^∢([A-Z])$/))) {
    const V = m[1];
    if (!points.includes(V)) return fail('unknownPoint', { p: `$${V}$` });
    const arms = parseCtx ? drawnArms(parseCtx, V) : [];
    if (arms.length !== 2 || strictlyBetween(parseCtx.points, arms[0], V, arms[1])) {
      return fail('angleAmbiguous', { v: `$∢${V}$` });
    }
    const [X, Y] = arms;
    return { ok: true, term: { kind: 'ang', p: [X, V, Y], key: angKey(X, V, Y, rays) } };
  }
  if (/^∢[A-Z]{2}$/.test(body)) return fail('angle3');
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

// One side of an equation: a sum of terms plus a constant. A term is a coefficient times a
// product of factors: segments, angles, sin/cos/tan of an angle and numbers (2, 0.5, √3),
// each to the first or second power (AB²), multiplied (AB·CD) or divided (AB/CD,
// BC/sin∢BAC). A single segment or angle stays a plain term, so linear claims look
// exactly as before; anything else is a monomial { kind: 'mono', f: [{ t, e }], key }.
function parseSide(src, points, rays) {
  if (!src) return fail('noRelation');
  const tokens = src.match(/[+-]?[^+-]+/g);
  if (!tokens || tokens.join('') !== src) return fail('unknownTerm', { t: `$${safe(src)}$` });
  const terms = [];
  let k = 0;
  let deg = false;
  for (const tok of tokens) {
    const sign = tok[0] === '-' ? -1 : 1;
    const r = parseProduct(tok.replace(/^[+-]/, ''), points, rays);
    if (!r.ok) return r;
    if (r.deg) deg = true;
    if (!r.t) { k += sign * r.c; continue; }
    const key = termKey(r.t);
    const same = terms.find((x) => termKey(x.t) === key);
    if (same) same.c += sign * r.c; else terms.push({ c: sign * r.c, t: r.t });
  }
  return { ok: true, side: { terms: terms.filter((x) => Math.abs(x.c) > EPS), k, deg } };
}

const NUM_RE = /^(\d+(?:[.,]\d+)?)?(?:√(\d+(?:[.,]\d+)?))?(°)?(.*)$/;
const num = (s) => parseFloat(s.replace(',', '.'));

function parseProduct(body, points, rays) {
  const pieces = body.split(/([*/])/);
  let c = 1;
  let deg = false;
  const f = new Map(); // key → { t, e }
  for (let i = 0; i < pieces.length; i += 2) {
    const piece = pieces[i];
    const sgn = pieces[i - 1] === '/' ? -1 : 1;
    const m = piece.match(NUM_RE);
    const hasNum = !!(m[1] || m[2]);
    if (hasNum) c *= ((m[1] ? num(m[1]) : 1) * (m[2] ? Math.sqrt(num(m[2])) : 1)) ** sgn;
    if (m[3]) deg = true;
    let rest = m[4];
    if (!rest) {
      if (!hasNum) return fail('unknownTerm', { t: `$${safe(body) || '…'}$` });
      continue;
    }
    let e = 1;
    if (rest.endsWith('²')) { e = 2; rest = rest.slice(0, -1); }
    const a = parseAtom(rest, points, rays);
    if (!a.ok) return a;
    if (a.num != null) { c *= (a.num ** e) ** sgn; continue; }
    const key = termKey(a.term);
    const cur = f.get(key) || { t: a.term, e: 0 };
    cur.e += e * sgn;
    f.set(key, cur);
  }
  if (!Number.isFinite(c)) return fail('unknownTerm', { t: `$${safe(body)}$` });
  const fs = [...f.values()].filter((x) => x.e !== 0);
  if (!fs.length) return { ok: true, c, deg };
  if (fs.some((x) => x.t.kind === 'ang') && (fs.length > 1 || fs[0].e !== 1)) return fail('angleProduct');
  if (fs.length === 1 && fs[0].e === 1) return { ok: true, c, t: fs[0].t, deg };
  return { ok: true, c, t: { kind: 'mono', f: fs, key: alg.keyOf(new Map(fs.map((x) => [termKey(x.t), x.e]))) }, deg };
}

// What a term measures: an angle ('ang'), or a length to some power ('L1' for AB, 'L2' for
// AB², 'L0' for a ratio or a sine). Only terms of one kind may be added or compared.
function dimOf(t) {
  if (t.kind === 'ang') return 'ang';
  if (t.kind === 'seg') return 'L1';
  if (t.kind === 'trig') return 'L0';
  if (t.kind === 'area') return 'L2';
  return 'L' + t.f.reduce((s, x) => s + (x.t.kind === 'seg' ? x.e : x.t.kind === 'area' ? 2 * x.e : 0), 0);
}
const kindType = (t) => (dimOf(t) === 'ang' ? 'ang' : dimOf(t));

function simpleTerm(side, of) {
  if (side.terms.length === 1 && Math.abs(side.terms[0].c - 1) < EPS && Math.abs(side.k) < EPS) return side.terms[0].t;
  if (side.terms.length === 0) return { kind: 'num', v: side.k, type: of };
  return null;
}

// ctx is a prepared problem (or just a list of point names).
export function parseClaim(input, ctx) {
  const points = Array.isArray(ctx) ? ctx : ctx.pointNames;
  const rays = Array.isArray(ctx) ? null : ctx.rays;
  parseCtx = Array.isArray(ctx) || !ctx.points || !ctx.rays ? null : ctx;
  const s = normalizeInput(input);
  if (!s) return fail('empty');
  // △ABC ≅ △DEF and △ABC ∼ △DEF: the letter order is the correspondence.
  for (const [sym, type, badKey] of [['≅', 'cong', 'badCong'], ['∼', 'sim', 'badSim']]) {
    if (!s.includes(sym)) continue;
    const parts = s.split(sym);
    if (parts.length !== 2) return fail(badKey);
    const tri = parts.map((x) => x.replace(/^△/, ''));
    if (!tri.every((x) => /^[A-Z]{3}$/.test(x))) return fail(badKey);
    const P = [...tri[0]];
    const Q = [...tri[1]];
    const bad = [...P, ...Q].find((x) => !points.includes(x));
    if (bad) return fail('unknownPoint', { p: `$${bad}$` });
    if (new Set(P).size < 3 || new Set(Q).size < 3) return fail('repeatPoint');
    return ok({ type, P, Q });
  }
  // AD ⊥ BC and DE ∥ BC: lines, keyed by every diagram point on them.
  for (const [sym, type, badKey] of [['⊥', 'perp', 'badPerp'], ['∥', 'par', 'badPar']]) {
    if (!s.includes(sym)) continue;
    const parts = s.split(sym);
    if (parts.length !== 2 || !parts.every((x) => /^[A-Z]{2}$/.test(x))) return fail(badKey);
    const [a, b] = parts.map((x) => [...x]);
    const bad = [...a, ...b].find((x) => !points.includes(x));
    if (bad) return fail('unknownPoint', { p: `$${bad}$` });
    if (a[0] === a[1] || b[0] === b[1]) return fail('repeatPoint');
    const coords = Array.isArray(ctx) ? null : ctx.points;
    return ok({ type, a, b, la: lineKey(coords, a[0], a[1]), lb: lineKey(coords, b[0], b[1]) });
  }
  const tri = parseTri(s, ctx);
  if (tri) return tri;
  if (!/[=<>]/.test(s)) {
    const q = parseQuad(s, points);
    if (q) return q;
  }
  // One relation: =, < or >.
  const rels = s.match(/[=<>]/g) || [];
  if (rels.length > 1) return fail('oneRelation');
  if (!rels.length) return fail('noRelation');
  const op = rels[0];
  const parts = s.split(op);
  if (!parts[0] || !parts[1]) return fail('noRelation');
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
  const of = [...types][0] === 'ang' ? 'ang' : 'len';
  if (op !== '=') return ok({ type: 'ineq', op, L, R, of });
  let left = simpleTerm(L, of);
  let right = simpleTerm(R, of);
  if (!left || !right) [left, right] = canonicalSides(L, R, of) || [left, right];
  return ok({ type: 'eq', L, R, of, left, right });
}

// "△ABC שווה שוקיים" / "△ABC is isosceles" and "△ABC שווה צלעות" / "△ABC is equilateral".
// An isosceles triangle is the equation of its legs, AB = AC, marked `tri` so that it is shown
// as written; every check, key and the Lean checker read the equation. The apex is the one
// written in brackets ("△ABC שווה שוקיים (AB = AC)", as fmtClaim shows it), else the vertex
// whose two sides are equal in the drawing, else the first letter. An equilateral triangle is
// { type: 'equi', P }: AB = BC, BC = CA and CA = AB (claimEqs).
const TRI_WORDS = { iso: ['שווהשוקיים', 'ש"ש', 'ש״ש', 'ISOSCELES'], equi: ['שווהצלעות', 'EQUILATERAL'] };
function parseTri(s0, ctx) {
  const points = Array.isArray(ctx) ? ctx : ctx.pointNames;
  const br = s0.match(/^(.*)\(([^()]*)\)$/);
  const s = (br ? br[1] : s0).replace(/(TRIANGLE)$/, '');
  for (const [kind, words] of Object.entries(TRI_WORDS)) {
    for (const w of words) {
      let rest = null;
      if (s.endsWith(w)) rest = s.slice(0, -w.length).replace(/(הוא|IS(AN?)?)$/, '');
      else if (s.startsWith(w)) rest = s.slice(w.length);
      if (rest === null) continue;
      rest = rest.replace(/^(המשולש|משולש|TRIANGLE)/, '').replace(/^△/, '');
      if (!/^[A-Z]{3}$/.test(rest)) return null; // a trapezoid, or no triangle named
      const P = [...rest];
      const bad = P.find((x) => !points.includes(x));
      if (bad) return fail('unknownPoint', { p: `$${bad}$` });
      if (new Set(P).size < 3) return fail('repeatPoint');
      if (kind === 'equi') return ok({ type: 'equi', P });
      let A = null;
      if (br) {
        const legs = parseClaim(br[2], ctx);
        const ap = legs.ok ? apexOf(legs.claim) : null;
        if (ap && [ap.A, ap.B, ap.C].every((x) => P.includes(x))) A = ap.A;
      }
      A = A || isoApex(ctx, P);
      const [B, C] = P.filter((x) => x !== A);
      const r = parseClaim(`${A}${B}=${A}${C}`, ctx);
      if (!r.ok) return r;
      r.claim.tri = { kind: 'iso', P };
      return r;
    }
  }
  return null;
}

// The apex of isosceles △P in the drawing: the vertex whose two sides are equal (the first
// letter when it is one of them, as in an equilateral drawing); the first letter otherwise.
function isoApex(ctx, P) {
  const pts = !Array.isArray(ctx) && ctx.points;
  if (!pts) return P[0];
  const d = (a, b) => Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]);
  const apex = P.filter((v) => {
    const [b, c] = P.filter((x) => x !== v);
    return Math.abs(d(v, b) - d(v, c)) <= 0.02 * Math.max(d(v, b), d(v, c));
  });
  return apex.includes(P[0]) ? P[0] : apex[0] || P[0];
}

// The equations a claim stands for: an equilateral triangle's three, else the claim itself.
export function claimEqs(c) {
  if (!c || c.type !== 'equi') return [c];
  const [A, B, C] = c.P;
  const seg = (p, q) => ({ kind: 'seg', p: [p, q] });
  const eq = (x, y) => ({ type: 'eq', of: 'len', L: { terms: [{ c: 1, t: x }], k: 0 }, R: { terms: [{ c: 1, t: y }], k: 0 }, left: x, right: y });
  return [eq(seg(A, B), seg(B, C)), eq(seg(B, C), seg(C, A)), eq(seg(C, A), seg(A, B))];
}

// Every arrangement of an equation is the same claim: "∢ABD − ∢ACD = 0°", "∢ABD = ∢ACD" and
// "−∢ACD = −∢ABD" all say one angle equals another. With everything moved to the left
// (left − right = 0, like claimKey), an equation that is "one term = another" or "one term = a
// number" gets those two sides, which the theorem checks read; the claim is still shown as
// written. Not multiplied through: "2∢A − 2∢B = 0" stays a sum, as in claimKey.
function canonicalSides(L, R, of) {
  const m = new Map();
  for (const [side, sg] of [[L, 1], [R, -1]]) {
    for (const { c, t } of side.terms) {
      const k = termKey(t);
      const cur = m.get(k) || { c: 0, t };
      cur.c += sg * c;
      m.set(k, cur);
    }
  }
  const terms = [...m.values()].filter((x) => Math.abs(x.c) > EPS);
  const k = L.k - R.k;
  if (terms.length === 2 && Math.abs(k) < EPS && Math.abs(Math.abs(terms[0].c) - 1) < EPS
      && Math.abs(terms[0].c + terms[1].c) < EPS) {
    const [pos, neg] = terms[0].c > 0 ? terms : [terms[1], terms[0]];
    return [pos.t, neg.t];
  }
  if (terms.length === 1 && Math.abs(Math.abs(terms[0].c) - 1) < EPS) {
    return [terms[0].t, { kind: 'num', v: -k / terms[0].c, type: of }];
  }
  return null;
}

// ---------- linear algebra over the cited rows ----------

const { addTo } = alg;

// The equation as a vector: (left − right) = 0, keyed by term (segment, angle or monomial),
// '1' for the constant. For an inequality, the side that is larger minus the smaller one.
export function eqVec(c) {
  const m = new Map();
  for (const { c: co, t } of c.L.terms) addTo(m, termKey(t), co);
  if (c.L.k) addTo(m, '1', c.L.k);
  for (const { c: co, t } of c.R.terms) addTo(m, termKey(t), -co);
  if (c.R.k) addTo(m, '1', -c.R.k);
  return c.type === 'ineq' && c.op === '<' ? alg.scale(m, -1) : m;
}

const diffVec = (k1, k2) => { const m = new Map(); addTo(m, k1, 1); addTo(m, k2, -1); return m; };

// Is `target` a linear combination of `vectors`? (What linarith does for equalities.)
export const inSpan = alg.inSpan;

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

// The name of quadrilateral P that comes first among the orders naming the same one.
const quadKey = (kind, P) => QUADS[kind].sym.map((o) => o.map((i) => P[i]).join('')).sort()[0];

export function claimKey(c) {
  if (!c) return '';
  if (c.type === 'perp' || c.type === 'par') return c.type + ':' + [c.la, c.lb].sort().join('|');
  if (c.type === 'drawn') return 'drawn:' + [...c.a].sort().join('');
  if (c.type === 'equi') return 'equi:' + [...c.P].sort().join('');
  if (c.type === 'quad') return `quad:${c.kind}:${quadKey(c.kind, c.P)}`;
  if (c.type === 'ineq') {
    // larger − smaller > 0, never rescaled: "2AB > 2CD" is not "AB > CD"
    const v = eqVec(c);
    return 'ineq:' + [...v.keys()].sort().map((k) => `${k}=${v.get(k).toFixed(6)}`).join('|');
  }
  if (c.type === 'sim') {
    const a = c.P.map((p, i) => p + c.Q[i]).sort().join(',');
    const b = c.Q.map((q, i) => q + c.P[i]).sort().join(',');
    return 'sim:' + (a < b ? a : b);
  }
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

// A number as a student would write it: 6√3 rather than 10.392.
const ROOTS = [2, 3, 5, 6, 7];
function numParts(v) {
  const r = Math.round(v * 1000) / 1000;
  if (Math.abs(v - r) < 1e-9) return { q: r, n: 1 };
  for (const n of ROOTS) {
    const q = v / Math.sqrt(n);
    const qr = Math.round(q * 1000) / 1000;
    if (qr !== 0 && Math.abs(q - qr) < 1e-9) return { q: qr, n };
  }
  return { q: r, n: 1 };
}
const fmtNum = (v) => {
  const { q, n } = numParts(v);
  return n === 1 ? String(q) : `${q === 1 ? '' : q}√${n}`;
};
const leanNum = (v) => {
  const { q, n } = numParts(v);
  return n === 1 ? String(q) : `${q === 1 ? '' : q + ' * '}Real.sqrt ${n}`;
};

const POW = { 2: '²', 3: '³' };
function atomStr(t) {
  if (t.kind === 'seg') return t.p.join('');
  if (t.kind === 'ang') return '∢' + t.p.join('');
  if (t.kind === 'trig') return t.fn + atomStr(t.a);
  if (t.kind === 'area') return 'S△' + t.p.join('');
  // a monomial: AB·CD, AB², BC/AB, BC/sin∢BAC (each denominator after its own /)
  const pw = (x) => atomStr(x.t) + (Math.abs(x.e) === 1 ? '' : POW[Math.abs(x.e)] || '^' + Math.abs(x.e));
  const top = t.f.filter((x) => x.e > 0).map(pw).join('·') || '1';
  return top + t.f.filter((x) => x.e < 0).map((x) => '/' + pw(x)).join('');
}

export function fmtTerm(t) {
  if (t.kind === 'num') return fmtNum(t.v) + (t.type === 'ang' ? '°' : '');
  return atomStr(t);
}

// One side, the number first: 180° − ∢BCA rather than −∢BCA + 180°.
function fmtSide(side, of) {
  const unit = of === 'ang' ? '°' : '';
  const parts = [];
  const hasK = Math.abs(side.k) > EPS || !side.terms.length;
  if (hasK) parts.push((side.k < 0 ? '−' : '') + fmtNum(Math.abs(side.k)) + unit);
  side.terms.forEach(({ c, t }, i) => {
    const a = Math.abs(c);
    const s = atomStr(t);
    const body = Math.abs(a - 1) < EPS ? s : fmtNum(a) + (s.startsWith('1/') ? s.slice(1) : s);
    const first = i === 0 && !hasK;
    parts.push(first ? (c < 0 ? '−' : '') + body : (c < 0 ? ' − ' : ' + ') + body);
  });
  return parts.join('');
}

export function quadName(kind) {
  const q = QUADS[kind];
  return getLang() === 'en' ? q.en : q.he;
}

export function fmtClaim(c) {
  if (!c) return '';
  if (c.type === 'cong') return `△${c.P.join('')} ≅ △${c.Q.join('')}`;
  if (c.type === 'sim') return `△${c.P.join('')} ∼ △${c.Q.join('')}`;
  if (c.type === 'drawn') return c.a.join('');
  if (c.type === 'equi') return getLang() === 'en' ? `△${c.P.join('')} is equilateral` : `△${c.P.join('')} שווה צלעות`;
  if (c.tri && c.tri.kind === 'iso') {
    const legs = `${fmtTerm(c.left)} = ${fmtTerm(c.right)}`;
    return getLang() === 'en' ? `△${c.tri.P.join('')} is isosceles (${legs})` : `△${c.tri.P.join('')} שווה שוקיים (${legs})`;
  }
  if (c.type === 'perp') return `${c.a.join('')} ⊥ ${c.b.join('')}`;
  if (c.type === 'par') return `${c.a.join('')} ∥ ${c.b.join('')}`;
  if (c.type === 'quad') {
    if (getLang() !== 'en') return `${c.P.join('')} ${QUADS[c.kind].he}`;
    return `${c.P.join('')} is ${/^[aeiou]/.test(QUADS[c.kind].en) ? 'an' : 'a'} ${QUADS[c.kind].en}`;
  }
  return `${fmtSide(c.L, c.of)} ${c.type === 'ineq' ? c.op : '='} ${fmtSide(c.R, c.of)}`;
}

function leanAtom(t) {
  if (t.kind === 'seg') return `len ${t.p[0]} ${t.p[1]}`;
  if (t.kind === 'ang') return `ang ${t.p.join(' ')}`;
  if (t.kind === 'trig') return `${t.fn}D (${leanAtom(t.a)})`;
  if (t.kind === 'area') return `area ${t.p.join(' ')}`;
  const pw = (x) => leanAtom(x.t) + (Math.abs(x.e) === 1 ? '' : ` ^ ${Math.abs(x.e)}`);
  const top = t.f.filter((x) => x.e > 0).map(pw).join(' * ') || '1';
  const den = t.f.filter((x) => x.e < 0).map(pw);
  return den.length ? `${top} / ${den.length > 1 ? `(${den.join(' * ')})` : den[0]}` : top;
}

function leanSide(side) {
  const parts = [];
  side.terms.forEach(({ c, t }, i) => {
    const a = Math.abs(c);
    const body = (Math.abs(a - 1) < EPS ? '' : `${leanNum(a)} * `) + leanAtom(t);
    parts.push(i === 0 ? (c < 0 ? '-' : '') + body : (c < 0 ? ' - ' : ' + ') + body);
  });
  if (!side.terms.length) parts.push(leanNum(side.k));
  else if (Math.abs(side.k) > EPS) parts.push((side.k < 0 ? ' - ' : ' + ') + leanNum(Math.abs(side.k)));
  return parts.join('');
}

export function leanClaim(c) {
  if (c.type === 'cong') return `Cong ${c.P.join(' ')} ${c.Q.join(' ')}`;
  if (c.type === 'sim') return `Sim ${c.P.join(' ')} ${c.Q.join(' ')}`;
  if (c.type === 'drawn') return 'True';
  if (c.type === 'equi') return claimEqs(c).map(leanClaim).join(' ∧ ');
  if (c.type === 'perp') return `Perp ${c.a.join(' ')} ${c.b.join(' ')}`;
  if (c.type === 'par') return `Par ${c.a.join(' ')} ${c.b.join(' ')}`;
  if (c.type === 'quad') return `${QUADS[c.kind].lean} ${c.P.join(' ')}`;
  return `${leanSide(c.L)} ${c.type === 'ineq' ? c.op : '='} ${leanSide(c.R)}`;
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
  // the diagram as the question gives it; construction rows add to it (withConstructions)
  p.base = { points: p.points, segments: p.segments || [], config: p.config };
  p.consSig = '';
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
  // A triangle whose three angles are equal is equilateral. The claim is two of its sides
  // (AB = AC); the rows cited give ∢A = ∢B = ∢C with calculation (∢A = ∢B and ∢B = ∢C, or
  // all three are 60°).
  equi_sides(claim, refRows, problem) {
    const proof = `equilateral_of_angles ${refNames(refRows)}`.trim();
    const legs = apexOf(claim);
    if (!legs) return { ok: false, msg: { key: 'equiNeedSides' }, proof };
    const { A, B, C } = legs;
    if (degenerate(problem, [A, B, C])) return { ok: false, msg: { key: 'degenerate', vars: { t: `$△${A}${B}${C}$` } }, proof };
    const need = [`∢${B}${A}${C} = ∢${A}${B}${C}`, `∢${A}${B}${C} = ∢${A}${C}${B}`].map((s) => parseClaim(s, problem).claim);
    if (need.every((c) => c && algebraFollows(c, refRows.map((r) => r.claim)))) return { ok: true, proof };
    return { ok: false, msg: { key: 'equiNeedAngles', vars: { t: `$△${A}${B}${C}$` } }, proof };
  },
  // Each angle of an equilateral triangle is 60°. The claim is ∢XYZ = 60°; the rows cited give
  // XY = YZ = ZX with calculation.
  equi_angles(claim, refRows, problem) {
    const proof = `equilateral_60 ${refNames(refRows)}`.trim();
    const P = claimPoints(claim);
    const want = P.length === 3 && parseClaim(`∢${P[0]}${P[1]}${P[2]} = 60°`, problem);
    if (!want || !want.ok || claimKey(want.claim) !== claimKey(claim)) return { ok: false, msg: { key: 'equiNeed60' }, proof };
    const [X, Y, Z] = P;
    if (degenerate(problem, [X, Y, Z])) return { ok: false, msg: { key: 'degenerate', vars: { t: `$△${X}${Y}${Z}$` } }, proof };
    const need = [`${X}${Y} = ${Y}${Z}`, `${Y}${Z} = ${Z}${X}`].map((s) => parseClaim(s, problem).claim);
    if (need.every((c) => c && algebraFollows(c, refRows.map((r) => r.claim)))) return { ok: true, proof };
    return { ok: false, msg: { key: 'equiNeedSidesEq', vars: { t: `$△${X}${Y}${Z}$` } }, proof };
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
  // Angles around a point: ∢XOY + ∢YOZ + ∢ZOX = 360° for three rays from O, when O is inside
  // the triangle XYZ (read off the diagram, as with angle addition). Lean: angles_around_point.
  around_point(claim, refRows, problem) {
    const proof = 'angles_around_point';
    const v = claim.type === 'eq' && claim.of === 'ang' ? eqVec(claim) : null;
    const angs = v ? [...v.keys()].filter((k) => k.startsWith('a:')) : [];
    const c1 = angs.length === 3 ? v.get(angs[0]) : 0;
    if (!c1 || v.size !== 4 || angs.some((k) => Math.abs(v.get(k) - c1) > 1e-9) || Math.abs((v.get('1') || 0) + 360 * c1) > 1e-6) {
      return { ok: false, msg: { key: 'aroundNeedSum' }, proof };
    }
    const terms = [...claim.L.terms, ...claim.R.terms].map((x) => x.t).filter((t) => t.kind === 'ang');
    const ts = angs.map((k) => terms.find((t) => termKey(t) === k));
    const O = ts[0].p[1];
    if (ts.some((t) => t.p[1] !== O)) return { ok: false, msg: { key: 'adjSameVertex' }, proof };
    const ray = (x) => problem.rays[O][x];
    const arms = ts.map((t) => [ray(t.p[0]), ray(t.p[2])]);
    const count = new Map();
    arms.flat().forEach((r) => count.set(r, (count.get(r) || 0) + 1));
    if (count.size !== 3 || [...count.values()].some((k) => k !== 2) || arms.some(([a, b]) => a === b)) {
      return { ok: false, msg: { key: 'aroundNeedThree' }, proof };
    }
    const ends = ts.flatMap((t) => [t.p[0], t.p[2]]);
    const [X, Y, Z] = [...count.keys()].map((r) => ends.find((x) => ray(x) === r));
    const P = problem.points;
    const o = P[O];
    const cr = (a, b) => (P[a][0] - o[0]) * (P[b][1] - o[1]) - (P[a][1] - o[1]) * (P[b][0] - o[0]);
    const s = [cr(X, Y), cr(Y, Z), cr(Z, X)];
    if (s.every((x) => x > 1e-9) || s.every((x) => x < -1e-9)) return { ok: true, proof };
    return { ok: false, msg: { key: 'aroundNotAround', vars: { o: `$${O}$` } }, proof };
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
  // Linear steps as before, and from stage 4 on also inequalities, squares and roots,
  // proportions and the values of sin/cos/tan (algebra.js).
  algebra(claim, refRows) {
    const names = refRows.map((r) => 's' + r.n).join(', ');
    const proof = refRows.length ? `by linarith [${names}]` : 'by ring';
    if (claim.type !== 'eq' && claim.type !== 'ineq') return { ok: false, msg: { key: 'algebraNeedEq' }, proof };
    const target = eqVec(claim);
    if (claim.type === 'eq' && !target.size) return { ok: true, proof: 'by ring' };
    if (!refRows.length && claim.type === 'eq') return { ok: false, msg: { key: 'needRefs' }, proof };
    const how = algebraFollows(claim, refRows.map((r) => r.claim));
    if (how) return { ok: true, proof: how === 'linear' ? proof : `by nlinarith [${names}]` };
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

// ---------- algebra over the cited rows ----------

// Does `claim` follow by calculation from `claims`? 'linear', 'nonlinear' or false.
function algebraFollows(claim, claims) {
  const eqs = claims.filter((c) => c.type === 'eq').map(eqVec);
  if (claim.type === 'eq') return alg.follows(eqs, eqVec(claim));
  if (claim.type !== 'ineq') return false;
  const gts = claims.filter((c) => c.type === 'ineq').map(eqVec);
  return alg.followsIneq(eqs, gts, eqVec(claim)) ? 'linear' : false;
}

// ---------- stages 4–11 ----------
// Each check works out, from the cited rows and the diagram, the claims the theorem gives,
// writes them in school notation, and compares the student's claim with them. Comparing
// goes through the same keys as everywhere else, so every name of an angle or a line
// counts; an equation also counts multiplied through (2DE = BC is DE = 0.5BC) and with its
// denominators cleared (AD/DB = AE/EC is AD·EC = AE·DB).

function normKey(c) {
  if (!c || c.type !== 'eq') return claimKey(c);
  const v = alg.clearDen(eqVec(c));
  const keys = [...v.keys()].sort();
  if (!keys.length) return 'eq:0';
  const d = v.get(keys[0]);
  return 'n:' + keys.map((k) => `${k}=${(v.get(k) / d).toFixed(6)}`).join('|');
}

// The candidates (school notation) that `claim` matches, or false.
function matches(problem, claim, strs) {
  const k = normKey(claim);
  return strs.some((s) => {
    const r = parseClaim(s, problem);
    return r.ok && normKey(r.claim) === k;
  });
}

const vsub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const vcross = (u, v) => u[0] * v[1] - u[1] * v[0];
const vdot = (u, v) => u[0] * v[0] + u[1] * v[1];
const vlen = (u) => Math.hypot(u[0], u[1]);
const xy = (problem, X) => problem.points[X];

// Which side of line PQ the point X is on: 1, −1, or 0 when X is on the line.
function sideOf(problem, P, Q, X) {
  const u = vsub(xy(problem, Q), xy(problem, P));
  const v = vsub(xy(problem, X), xy(problem, P));
  const c = vcross(u, v);
  return Math.abs(c) < 1e-6 * vlen(u) * Math.max(1, vlen(v)) ? 0 : Math.sign(c);
}
const between = (problem, P, V, Q) => strictlyBetween(problem.points, P, V, Q);
const onLine = (lk, X) => lk.slice(2).includes(X);
const sameRay = (problem, V, X, Y) => problem.rays[V][X] === problem.rays[V][Y];
const pointsOnRay = (problem, V, X) => problem.pointNames.filter((P) => P !== V && sameRay(problem, V, P, X));
const fail2 = (key, proof, vars) => ({ ok: false, msg: { key, vars }, proof });
const gives = (rid, ex, proof) => fail2('reasonGives', proof, { rid, ex: `$${ex.replace(/\s*([=<>+∥⊥])\s*/g, ' $1 ').replace(/\*/g, '·').replace(/(\d)-/g, '$1 − ')}$` });

// The terms of an equation or inequality, by key.
function atomsOf(c) {
  const m = new Map();
  for (const { t } of [...c.L.terms, ...c.R.terms]) m.set(termKey(t), t);
  return m;
}

// "∢1 = ∢2" → { ts: [t1, t2], sum: false }; "∢1 + ∢2 = 180°" → { ts, sum: true }.
function twoAngles(c) {
  if (!c || c.type !== 'eq' || c.of !== 'ang') return null;
  const v = eqVec(c);
  const keys = [...v.keys()].filter((k) => k !== '1');
  if (keys.length !== 2 || !keys.every((k) => k.startsWith('a:'))) return null;
  const [c1, c2] = keys.map((k) => v.get(k));
  const k0 = v.get('1') || 0;
  const at = atomsOf(c);
  const ts = keys.map((k) => at.get(k));
  if (Math.abs(c1 + c2) < EPS && Math.abs(k0) < 1e-6) return { ts, sum: false };
  if (Math.abs(c1 - c2) < EPS && Math.abs(k0 + 180 * c1) < 1e-6) return { ts, sum: true };
  return null;
}

// "M is the midpoint of AB", stated as AM = MB with M strictly between A and B.
function midOf(problem, c) {
  if (!isEqOf(c, 'seg')) return null;
  const [p, q] = c.left.p;
  const [r, s] = c.right.p;
  const common = [p, q].filter((x) => x === r || x === s);
  if (common.length !== 1) return null;
  const M = common[0];
  const A = p === M ? q : p;
  const B = r === M ? s : r;
  return A !== B && between(problem, A, M, B) ? { M, A, B } : null;
}

// Two angles on a transversal: t1 at V1 on one of the lines la, lb and t2 at V2 on the
// other, each with one arm along the transversal V1V2 and the other along its own line.
// 'corr' (corresponding), 'alt' (alternate), 'co' (co-interior), 'other', or null when the
// angles don't sit like that.
function transversal(problem, t1, t2, la, lb) {
  const V1 = t1.p[1];
  const V2 = t2.p[1];
  if (V1 === V2 || la === lb) return null;
  let l1; let l2;
  if (onLine(la, V1) && onLine(lb, V2)) [l1, l2] = [la, lb];
  else if (onLine(lb, V1) && onLine(la, V2)) [l1, l2] = [lb, la];
  else return null;
  const lt = lineKey(problem.points, V1, V2);
  if (lt === l1 || lt === l2) return null;
  const arms = (t, V, l) => {
    const [X, , Y] = t.p;
    const on = (Z, line) => lineKey(problem.points, V, Z) === line;
    if (on(X, lt) && on(Y, l)) return [X, Y];
    if (on(Y, lt) && on(X, l)) return [Y, X];
    return null;
  };
  const a1 = arms(t1, V1, l1);
  const a2 = arms(t2, V2, l2);
  if (!a1 || !a2) return null;
  const d = vsub(xy(problem, V2), xy(problem, V1));
  const tau1 = Math.sign(vdot(vsub(xy(problem, a1[0]), xy(problem, V1)), d));
  const tau2 = Math.sign(vdot(vsub(xy(problem, a2[0]), xy(problem, V2)), d));
  const s1 = sideOf(problem, V1, V2, a1[1]);
  const s2 = sideOf(problem, V1, V2, a2[1]);
  if (!tau1 || !tau2 || !s1 || !s2) return null;
  if (tau1 === tau2 && s1 === s2) return 'corr';
  if (tau1 !== tau2 && s1 !== s2) return 'alt';
  if (tau1 > 0 && tau2 < 0 && s1 === s2) return 'co';
  return 'other';
}

const PAR_LEAN = { alt: 'par_alt', corr: 'par_corr', co: 'par_coint' };
const PAR_MSG = { alt: 'parIsAlt', corr: 'parIsCorr', co: 'parIsCo' };

function parAngles(kind) {
  return (claim, refRows, problem) => {
    const proof = `${PAR_LEAN[kind]} ${refNames(refRows)}`.trim();
    const ref = refRows.length === 1 && refRows[0].claim.type === 'par' ? refRows[0] : null;
    if (!ref) return fail2('needParRef', proof);
    const two = twoAngles(claim);
    if (!two) return fail2(kind === 'co' ? 'cointNeedSum' : 'parNeedEqual', proof);
    const rel = transversal(problem, two.ts[0], two.ts[1], ref.claim.la, ref.claim.lb);
    if (!rel) return fail2('notTransversal', proof, { n: ref.n });
    if (rel === 'other') return fail2('parNoPair', proof);
    if (rel !== kind) return fail2(PAR_MSG[rel], proof);
    if (two.sum !== (kind === 'co')) return fail2(kind === 'co' ? 'cointNeedSum' : 'parNeedEqual', proof);
    return { ok: true, proof };
  };
}

// Three angles at the three vertices of one triangle, as keys.
function triAngleKeys(problem, T) {
  const r = problem.rays;
  return [angKey(T[1], T[0], T[2], r), angKey(T[0], T[1], T[2], r), angKey(T[0], T[2], T[1], r)];
}

// The two terms of an inequality between two atoms of one kind: { big, small }.
function ineqPair(c, kind) {
  if (!c || c.type !== 'ineq') return null;
  const v = eqVec(c);
  const keys = [...v.keys()];
  if (keys.length !== 2 || keys.includes('1')) return null;
  const at = atomsOf(c);
  const [a, b] = keys.map((k) => at.get(k));
  if (a.kind !== kind || b.kind !== kind || Math.abs(v.get(keys[0]) + v.get(keys[1])) > EPS) return null;
  return v.get(keys[0]) > 0 ? { big: a, small: b } : { big: b, small: a };
}

const third = (pair, T) => T.find((x) => !pair.includes(x));

// The quadrilateral of a cited row, if it is one of `kinds`.
const PG = ['parallelogram', 'rectangle', 'rhombus', 'square'];
function quadRef(refRows, kinds) {
  return refRows.find((r) => r.claim.type === 'quad' && kinds.includes(r.claim.kind)) || null;
}
// Where the diagonals AC and BD meet, if they do.
function diagMeet(problem, [A, B, C, D]) {
  return problem.pointNames.find((O) => between(problem, A, O, C) && between(problem, B, O, D)) || null;
}
function convexQuad(problem, P) {
  const s = [0, 1, 2, 3].map((i) => sideOf(problem, P[i], P[(i + 1) % 4], P[(i + 2) % 4]));
  return s.every((x) => x !== 0 && x === s[0]);
}

function quadCheck(rid, kinds, lean, candidates) {
  return (claim, refRows, problem) => {
    const proof = `${lean} ${refNames(refRows)}`.trim();
    const ref = quadRef(refRows, kinds);
    if (!ref) return fail2('needQuadRef', proof, { kinds: kinds.map((k) => quadName(k)).join(' / ') });
    const P = ref.claim.P;
    const strs = candidates(problem, P);
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return gives(rid, strs[0], proof);
  };
}

// The circles and tangents of the diagram.
const circles = (problem) => problem.config.filter((c) => c.type === 'circle');
const tangents = (problem) => problem.config.filter((c) => c.type === 'tangent');

function* triples(arr) {
  for (const a of arr) for (const b of arr) for (const c of arr) if (a !== b && b !== c && a !== c) yield [a, b, c];
}

// Points P on the ray C→X and Q on the ray C→Y of a right angle ∢XCY.
function legPairs(problem, t) {
  const [X, C, Y] = t.p;
  const out = [];
  for (const P of pointsOnRay(problem, C, X)) for (const Q of pointsOnRay(problem, C, Y)) out.push([P, C, Q]);
  return out;
}

const rightRefs = (refRows) => refRows.map((r) => ({ r, t: rightAngle(r.claim) })).filter((x) => x.t);

const STAGE_CHECKS = {
  // ---- basics: from the diagram
  segment_add(claim, refRows, problem) {
    const proof = 'seg_add';
    const strs = [];
    for (const [X, Y, Z] of triples(problem.pointNames)) if (X < Z && between(problem, X, Y, Z)) strs.push(`${X}${Y}+${Y}${Z}=${X}${Z}`);
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return fail2('segAddShape', proof);
  },
  angle_add(claim, refRows, problem) {
    const proof = 'ang_add';
    if (claim.type !== 'eq' || claim.of !== 'ang') return fail2('angAddShape', proof);
    const ts = [...atomsOf(claim).values()].filter((t) => t.kind === 'ang');
    const V = ts[0] && ts[0].p[1];
    if (!V || !ts.every((t) => t.p[1] === V)) return fail2('angAddShape', proof);
    const arms = [...new Set(ts.flatMap((t) => [t.p[0], t.p[2]]))];
    const strs = [];
    for (const [X, Y, Z] of triples(arms)) {
      if (X > Z) continue;
      const a = vsub(xy(problem, X), xy(problem, V));
      const b = vsub(xy(problem, Y), xy(problem, V));
      const c = vsub(xy(problem, Z), xy(problem, V));
      // Y strictly inside the angle XVZ, which is less than 180°
      const inside = Math.sign(vcross(a, b)) === Math.sign(vcross(b, c)) && Math.sign(vcross(a, b)) === Math.sign(vcross(a, c)) && vcross(a, c) !== 0;
      if (inside) strs.push(`∢${X}${V}${Y}+∢${Y}${V}${Z}=∢${X}${V}${Z}`);
    }
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return fail2('angAddNotInside', proof);
  },

  // ---- L04 parallel lines
  alt_angles: parAngles('alt'),
  corr_angles: parAngles('corr'),
  cointerior: parAngles('co'),
  par_converse(claim, refRows, problem) {
    const proof = `alt_par ${refNames(refRows)}`.trim();
    if (claim.type !== 'par') return fail2('parConvNeedPar', proof);
    const two = refRows.length === 1 ? twoAngles(refRows[0].claim) : null;
    if (!two) return fail2('parConvNeedAngles', proof);
    const rel = transversal(problem, two.ts[0], two.ts[1], claim.la, claim.lb);
    if (rel && (two.sum ? rel === 'co' : rel === 'alt' || rel === 'corr')) {
      return { ok: true, proof: `${{ alt: 'alt_par', corr: 'corr_par', co: 'coint_par' }[rel]} s${refRows[0].n}` };
    }
    if (!rel) return fail2('notTransversal', proof, { n: refRows[0].n });
    return fail2('parConvWrong', proof);
  },
  // The area of a triangle, two ways (Lean: area_sine, area_perp):
  // half of two sides times the sine of the angle between them, S△ABC = AB·AC·sin∢BAC/2 (no rows);
  // half a side times the height to it, S△ABC = BC·AH/2, citing the row AH ⊥ BC, with H on line BC
  // (H may be B or C: in a right triangle the height is a leg).
  tri_area(claim, refRows, problem) {
    const area = claim.type === 'eq' ? [...claim.L.terms, ...claim.R.terms].map((x) => x.t).find((t) => t.kind === 'area') : null;
    if (!area) return fail2('areaNeedArea', 'area_sine');
    const T = area.p;
    const name = `S△${T.join('')}`;
    if (degenerate(problem, T)) return fail2('degenerate', 'area_sine', { t: `$△${T.join('')}$` });
    for (let i = 0; i < 3; i++) {
      const [X, Y, Z] = [T[i], T[(i + 1) % 3], T[(i + 2) % 3]];
      if (matches(problem, claim, [`${name}=${X}${Y}*${X}${Z}*SIN∢${Y}${X}${Z}/2`])) return { ok: true, proof: 'area_sine' };
    }
    const proof = `area_perp ${refNames(refRows)}`.trim();
    const P = problem.points;
    let need = null;
    for (let i = 0; i < 3; i++) {
      const [Z, X, Y] = [T[i], T[(i + 1) % 3], T[(i + 2) % 3]];
      const u = vsub(P[Y], P[X]);
      for (const W of problem.pointNames) {
        if (W === Z) continue;
        const w = vsub(P[W], P[X]);
        if (Math.abs(vcross(u, w)) > 1e-6 * vlen(u) * Math.max(1, vlen(w))) continue; // W on line XY
        if (!matches(problem, claim, [`${name}=${X}${Y}*${Z}${W}/2`])) continue;
        const lh = lineKey(P, Z, W);
        const lb = lineKey(P, X, Y);
        if (refRows.some((r) => r.claim.type === 'perp' && ((r.claim.la === lh && r.claim.lb === lb) || (r.claim.la === lb && r.claim.lb === lh)))) return { ok: true, proof };
        need = need || { h: `$${Z}${W} ⊥ ${X}${Y}$` };
      }
    }
    if (need) return fail2('areaNeedPerp', proof, need);
    return fail2('areaNoForm', proof, { s: `$${name}$` });
  },
  tri_sum(claim, refRows, problem) {
    const proof = 'tri_angle_sum';
    const v = claim.type === 'eq' && claim.of === 'ang' ? eqVec(claim) : null;
    const keys = v ? [...v.keys()].filter((k) => k !== '1') : [];
    const c = keys.length ? v.get(keys[0]) : 0;
    if (keys.length !== 3 || !keys.every((k) => k.startsWith('a:') && Math.abs(v.get(k) - c) < EPS)
      || Math.abs((v.get('1') || 0) + 180 * c) > 1e-6) return fail2('triSumShape', proof);
    const at = atomsOf(claim);
    const T = keys.map((k) => at.get(k).p[1]);
    if (new Set(T).size < 3 || degenerate(problem, T)) return fail2('triSumNotTri', proof);
    if ([...keys].sort().join('|') !== triAngleKeys(problem, T).sort().join('|')) return fail2('triSumNotTri', proof);
    return { ok: true, proof: `tri_angle_sum (T := △${T.join('')})` };
  },
  ext_angle(claim, refRows, problem) {
    const proof = 'ext_angle';
    const v = claim.type === 'eq' && claim.of === 'ang' ? eqVec(claim) : null;
    const keys = v ? [...v.keys()] : [];
    if (keys.length !== 3 || !keys.every((k) => k.startsWith('a:'))) return fail2('extShape', proof);
    const pos = keys.filter((k) => v.get(k) > 0);
    const neg = keys.filter((k) => v.get(k) < 0);
    const [one, two] = pos.length === 1 ? [pos, neg] : [neg, pos];
    if (one.length !== 1 || two.length !== 2 || Math.abs(Math.abs(v.get(one[0])) - Math.abs(v.get(two[0]))) > EPS
      || Math.abs(v.get(two[0]) - v.get(two[1])) > EPS) return fail2('extShape', proof);
    const at = atomsOf(claim);
    const e = at.get(one[0]);
    const V = e.p[1];
    const [P, Q] = two.map((k) => at.get(k).p[1]);
    if (new Set([V, P, Q]).size < 3 || degenerate(problem, [V, P, Q])) return fail2('extNotTri', proof);
    const want = [angKey(V, P, Q, problem.rays), angKey(V, Q, P, problem.rays)].sort().join('|');
    if ([...two].sort().join('|') !== want) return fail2('extNotTri', proof);
    const [X, , Y] = e.p;
    for (const [A, B] of [[P, Q], [Q, P]]) {
      if ((sameRay(problem, V, X, A) && between(problem, B, V, Y)) || (sameRay(problem, V, Y, A) && between(problem, B, V, X))) return { ok: true, proof };
    }
    return fail2('extNotExterior', proof);
  },

  // ---- L05 inequalities in a triangle
  side_angle(claim, refRows, problem) {
    const proof = `side_angle_ineq ${refNames(refRows)}`.trim();
    const s = refRows.length === 1 ? ineqPair(refRows[0].claim, 'seg') : null;
    const T = s ? [...new Set([...s.big.p, ...s.small.p])] : [];
    if (T.length !== 3) return fail2('sideAngleNeedRef', proof);
    if (degenerate(problem, T)) return fail2('degenerate', proof, { t: `$△${T.join('')}$` });
    const oppAng = (seg) => { const W = third(seg.p, T); return `∢${seg.p[0]}${W}${seg.p[1]}`; };
    const ex = `${oppAng(s.small)} < ${oppAng(s.big)}`;
    if (matches(problem, claim, [ex])) return { ok: true, proof };
    return gives('side_angle', ex, proof);
  },
  angle_side(claim, refRows, problem) {
    const proof = `angle_side_ineq ${refNames(refRows)}`.trim();
    const a = refRows.length === 1 ? ineqPair(refRows[0].claim, 'ang') : null;
    if (!a) return fail2('angleSideNeedRef', proof);
    const V1 = a.big.p[1];
    const V2 = a.small.p[1];
    const W = problem.pointNames.find((x) => x !== V1 && x !== V2 && !degenerate(problem, [V1, V2, x])
      && termKey(a.big) === angKey(V2, V1, x, problem.rays) && termKey(a.small) === angKey(V1, V2, x, problem.rays));
    if (!W) return fail2('angleSideNeedRef', proof);
    const ex = `${V1}${W} < ${V2}${W}`;
    if (matches(problem, claim, [ex])) return { ok: true, proof };
    return gives('angle_side', ex, proof);
  },
  tri_ineq(claim, refRows, problem) {
    const proof = 'tri_ineq';
    const v = claim.type === 'ineq' ? eqVec(claim) : null;
    const keys = v ? [...v.keys()] : [];
    if (keys.length !== 3 || !keys.every((k) => k.startsWith('s:'))) return fail2('triIneqShape', proof);
    const T = [...new Set(keys.flatMap((k) => [...k.slice(2)]))];
    if (T.length !== 3 || degenerate(problem, T)) return fail2('triIneqShape', proof);
    const pos = keys.filter((k) => v.get(k) > 0);
    const c = Math.abs(v.get(keys[0]));
    if (pos.length !== 2 || !keys.every((k) => Math.abs(Math.abs(v.get(k)) - c) < EPS)) return fail2('triIneqShape', proof);
    return { ok: true, proof: `tri_ineq (T := △${T.join('')})` };
  },

  // ---- L06 quadrilaterals (ABCD in order; parallelogram: AB ∥ DC and AD ∥ BC)
  para_def(claim, refRows, problem) {
    const proof = `parallelogram_def ${refNames(refRows)}`.trim();
    if (claim.type === 'quad') {
      if (claim.kind !== 'parallelogram') return fail2('paraDefKind', proof);
      const [A, B, C, D] = claim.P;
      const need = [`${A}${B}∥${D}${C}`, `${A}${D}∥${B}${C}`];
      const have = need.filter((s) => refRows.some((r) => matches(problem, r.claim, [s])));
      if (have.length < 2) return fail2('critMissing1', proof, { rid: 'para_def', m: need.filter((s) => !have.includes(s)).map((s) => `$${s}$`).join(', ') });
      if (!convexQuad(problem, claim.P)) return fail2('notConvex', proof, { q: `$${claim.P.join('')}$` });
      return { ok: true, proof: `parallelogram_def.mpr ⟨${refNames(refRows)}⟩` };
    }
    const ref = quadRef(refRows, PG);
    if (!ref) return fail2('needQuadRef', proof, { kinds: quadName('parallelogram') });
    const [A, B, C, D] = ref.claim.P;
    const strs = [`${A}${B}∥${D}${C}`, `${A}${D}∥${B}${C}`];
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return gives('para_def', strs[0], proof);
  },
  para_sides: quadCheck('para_sides', PG, 'pg_opp_sides', (pr, [A, B, C, D]) => [`${A}${B}=${D}${C}`, `${A}${D}=${B}${C}`]),
  para_angles: quadCheck('para_angles', PG, 'pg_opp_angles', (pr, [A, B, C, D]) => [`∢${D}${A}${B}=∢${B}${C}${D}`, `∢${A}${B}${C}=∢${C}${D}${A}`]),
  para_diag(claim, refRows, problem) {
    const proof = `pg_diag ${refNames(refRows)}`.trim();
    const ref = quadRef(refRows, PG);
    if (!ref) return fail2('needQuadRef', proof, { kinds: quadName('parallelogram') });
    const [A, B, C, D] = ref.claim.P;
    const O = diagMeet(problem, ref.claim.P);
    if (!O) return fail2('diagNoMeet', proof);
    const strs = [`${A}${O}=${O}${C}`, `${B}${O}=${O}${D}`];
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return gives('para_diag', strs[0], proof);
  },
  para_test(claim, refRows, problem) {
    const proof = `opp_sides_pg ${refNames(refRows)}`.trim();
    if (claim.type !== 'quad' || claim.kind !== 'parallelogram') return fail2('paraTestShape', proof);
    const [A, B, C, D] = claim.P;
    const need = [`${A}${B}=${D}${C}`, `${A}${D}=${B}${C}`];
    const missing = need.filter((s) => !refRows.some((r) => matches(problem, r.claim, [s])));
    if (missing.length) return fail2(missing.length === 1 ? 'critMissing1' : 'critMissingN', proof, { rid: 'para_test', m: missing.map((s) => `$${s}$`).join(', ') });
    if (!convexQuad(problem, claim.P)) return fail2('notConvex', proof, { q: `$${claim.P.join('')}$` });
    return { ok: true, proof };
  },
  rect_diag: quadCheck('rect_diag', ['rectangle', 'square'], 'rect_diag', (pr, [A, B, C, D]) => [`${A}${C}=${B}${D}`]),
  rhombus_diag: quadCheck('rhombus_diag', ['rhombus', 'square'], 'rh_diag', (pr, P) => {
    const [A, B, C, D] = P;
    const O = diagMeet(pr, P);
    return [`${A}${C}⊥${B}${D}`, ...(O ? [`∢${A}${O}${B}=90`, `∢${B}${O}${C}=90`, `∢${C}${O}${D}=90`, `∢${D}${O}${A}=90`] : []),
      `∢${B}${A}${C}=∢${C}${A}${D}`, `∢${A}${B}${D}=∢${D}${B}${C}`, `∢${B}${C}${A}=∢${A}${C}${D}`, `∢${C}${D}${B}=∢${B}${D}${A}`];
  }),
  kite_diag: quadCheck('kite_diag', ['kite'], 'kite_main_diag', (pr, P) => {
    const [A, B, C, D] = P;
    const O = diagMeet(pr, P);
    return [`∢${B}${A}${C}=∢${C}${A}${D}`, `∢${B}${C}${A}=∢${A}${C}${D}`, `${A}${C}⊥${B}${D}`,
      ...(O ? [`${B}${O}=${O}${D}`, `∢${A}${O}${B}=90`, `∢${A}${O}${D}=90`, `∢${C}${O}${B}=90`, `∢${C}${O}${D}=90`] : [])];
  }),
  trap_iso: quadCheck('trap_iso', ['isoTrapezoid'], 'iso_trap_angles', (pr, [A, B, C, D]) => [`∢${D}${A}${B}=∢${A}${B}${C}`, `∢${A}${D}${C}=∢${B}${C}${D}`, `${A}${C}=${B}${D}`]),

  // ---- L07 midsegments and the right triangle
  midseg_tri(claim, refRows, problem) {
    const proof = `midseg_tri ${refNames(refRows)}`.trim();
    const mids = refRows.map((r) => midOf(problem, r.claim)).filter(Boolean);
    const strs = [];
    for (const m1 of mids) {
      for (const m2 of mids) {
        if (m1 === m2) continue;
        for (const A of [m1.A, m1.B]) {
          if (A !== m2.A && A !== m2.B) continue;
          const B = A === m1.A ? m1.B : m1.A;
          const C = A === m2.A ? m2.B : m2.A;
          if (B === C || degenerate(problem, [A, B, C])) continue;
          strs.push(`2${m1.M}${m2.M}=${B}${C}`, `${m1.M}${m2.M}∥${B}${C}`);
        }
      }
    }
    if (!strs.length) return fail2('needTwoMids', proof);
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return gives('midseg_tri', strs[0], proof);
  },
  midseg_trap(claim, refRows, problem) {
    const proof = `midseg_trap ${refNames(refRows)}`.trim();
    const mids = refRows.map((r) => midOf(problem, r.claim)).filter(Boolean);
    const q = quadRef(refRows, ['trapezoid', 'isoTrapezoid']);
    const parRow = refRows.find((r) => r.claim.type === 'par');
    let bases = null;
    if (q) {
      const [A, B, C, D] = q.claim.P;
      bases = [lineKey(problem.points, A, B), lineKey(problem.points, D, C)];
    } else if (parRow) bases = [parRow.claim.la, parRow.claim.lb];
    if (!bases) return fail2('trapNeedBases', proof);
    const strs = [];
    // each midpoint on a leg: one end on each base
    const ends = (m) => (onLine(bases[0], m.A) && onLine(bases[1], m.B) ? [m.A, m.B] : onLine(bases[0], m.B) && onLine(bases[1], m.A) ? [m.B, m.A] : null);
    for (const m1 of mids) {
      for (const m2 of mids) {
        if (m1 === m2) continue;
        const e1 = ends(m1);
        const e2 = ends(m2);
        if (!e1 || !e2 || e1[0] === e2[0] || e1[1] === e2[1]) continue;
        strs.push(`2${m1.M}${m2.M}=${e1[0]}${e2[0]}+${e1[1]}${e2[1]}`, `${m1.M}${m2.M}∥${e1[0]}${e2[0]}`, `${m1.M}${m2.M}∥${e1[1]}${e2[1]}`);
      }
    }
    if (!strs.length) return fail2('needTwoMids', proof);
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return gives('midseg_trap', strs[0], proof);
  },
  median_hyp(claim, refRows, problem) {
    const proof = `median_hyp ${refNames(refRows)}`.trim();
    const ras = rightRefs(refRows);
    if (!ras.length) return fail2('needRightRef', proof);
    const strs = [];
    for (const ra of ras) {
      for (const r of refRows) {
        const m = midOf(problem, r.claim);
        if (!m) continue;
        const C = ra.t.p[1];
        if (!legPairs(problem, ra.t).some(([P, , Q]) => (P === m.A && Q === m.B) || (P === m.B && Q === m.A))) continue;
        strs.push(`${C}${m.M}=${m.A}${m.M}`, `${C}${m.M}=${m.M}${m.B}`, `2${C}${m.M}=${m.A}${m.B}`);
      }
    }
    if (!strs.length) return fail2('needHypMid', proof);
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return gives('median_hyp', strs[0], proof);
  },
  tri_30(claim, refRows, problem) {
    const proof = `leg_30 ${refNames(refRows)}`.trim();
    const ras = rightRefs(refRows);
    if (!ras.length) return fail2('needRightRef', proof);
    const strs = [];
    for (const ra of ras) {
      for (const r of refRows) {
        if (r === ra.r || r.claim.type !== 'eq') continue;
        const v = eqVec(r.claim);
        const keys = [...v.keys()].filter((k) => k !== '1');
        if (keys.length !== 1 || !keys[0].startsWith('a:') || Math.abs((v.get('1') || 0) + 30 * v.get(keys[0])) > 1e-6) continue;
        const t = atomsOf(r.claim).get(keys[0]);
        for (const [P, C, Q] of legPairs(problem, ra.t)) {
          for (const [A, B] of [[P, Q], [Q, P]]) if (termKey(t) === angKey(C, A, B, problem.rays)) strs.push(`2${B}${C}=${A}${B}`);
        }
      }
    }
    if (!strs.length) return fail2('need30Ref', proof);
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return gives('tri_30', strs[0], proof);
  },

  // ---- L08 Pythagoras (right angle at C: CA² + CB² = AB²)
  pythagoras(claim, refRows, problem) {
    const proof = `pythagoras ${refNames(refRows)}`.trim();
    const ras = rightRefs(refRows);
    if (!ras.length) return fail2('needRightRef', proof);
    const strs = ras.flatMap((ra) => legPairs(problem, ra.t)).map(([P, C, Q]) => `${C}${P}²+${C}${Q}²=${P}${Q}²`);
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return gives('pythagoras', strs[0], proof);
  },
  pyth_conv(claim, refRows, problem) {
    const proof = `pythagoras_conv ${refNames(refRows)}`.trim();
    const t = rightAngle(claim);
    if (!t) return fail2('pythConvShape', proof);
    const strs = legPairs(problem, t).map(([P, C, Q]) => `${C}${P}²+${C}${Q}²=${P}${Q}²`);
    if (refRows.length === 1 && matches(problem, refRows[0].claim, strs)) return { ok: true, proof };
    return fail2('critMissing1', proof, { rid: 'pyth_conv', m: `$${strs[0]}$` });
  },

  // ---- L09 similarity
  sim_aa(claim, refRows, problem) {
    const proof = `sim_AA ${refNames(refRows)}`.trim();
    if (claim.type !== 'sim') return fail2('needSim', proof, { rid: 'sim_aa' });
    for (const T of [claim.P, claim.Q]) if (degenerate(problem, T)) return fail2('degenerate', proof, { t: `$△${T.join('')}$` });
    const V = refVectors(refRows);
    const count = (Q) => [0, 1, 2].filter((k) => angEq(claim.P, Q, V, k, problem.rays)).length;
    if (count(claim.Q) >= 2) return { ok: true, proof };
    for (const perm of PERMS.slice(1)) {
      const Q2 = perm.map((i) => claim.Q[i]);
      if (count(Q2) >= 2) return fail2('wrongOrder', proof, { s: `$△${claim.P.join('')} ∼ △${Q2.join('')}$` });
    }
    return fail2('simAANeed', proof);
  },
  sim_sas(claim, refRows, problem) {
    const proof = `sim_SAS ${refNames(refRows)}`.trim();
    if (claim.type !== 'sim') return fail2('needSim', proof, { rid: 'sim_sas' });
    const { P, Q } = claim;
    const V = refVectors(refRows);
    for (const k of [0, 1, 2]) {
      const [i, j] = others(k);
      if (!angEq(P, Q, V, k, problem.rays)) continue;
      const ratio = `${P[k]}${P[i]}/${Q[k]}${Q[i]}=${P[k]}${P[j]}/${Q[k]}${Q[j]}`;
      if (refRows.some((r) => matches(problem, r.claim, [ratio]))) return { ok: true, proof };
      return fail2('critMissing1', proof, { rid: 'sim_sas', m: `$${ratio}$` });
    }
    return fail2('simSASNeed', proof);
  },
  sim_sss(claim, refRows, problem) {
    const proof = `sim_SSS ${refNames(refRows)}`.trim();
    if (claim.type !== 'sim') return fail2('needSim', proof, { rid: 'sim_sss' });
    const { P, Q } = claim;
    const sides = [[0, 1], [1, 2], [0, 2]].map(([i, j]) => `${P[i]}${P[j]}/${Q[i]}${Q[j]}`);
    const links = [[0, 1], [1, 2], [0, 2]].filter(([a, b]) => refRows.some((r) => matches(problem, r.claim, [`${sides[a]}=${sides[b]}`])));
    if (links.length >= 2) return { ok: true, proof };
    return fail2('simSSSNeed', proof, { m: `$${sides[0]} = ${sides[1]} = ${sides[2]}$` });
  },
  sim_parts(claim, refRows, problem) {
    const proof = `sim_parts ${refNames(refRows)}`.trim();
    const ref = refRows.length === 1 && refRows[0].claim.type === 'sim' ? refRows[0] : null;
    if (!ref) return fail2('needSimRef', proof);
    const { P, Q } = ref.claim;
    const sides = [[0, 1], [1, 2], [0, 2]].map(([i, j]) => [`${P[i]}${P[j]}`, `${Q[i]}${Q[j]}`]);
    const strs = [];
    for (const [a, b] of [[0, 1], [1, 2], [0, 2]]) strs.push(`${sides[a][0]}/${sides[a][1]}=${sides[b][0]}/${sides[b][1]}`);
    for (const k of [0, 1, 2]) { const [i, j] = others(k); strs.push(`∢${P[i]}${P[k]}${P[j]}=∢${Q[i]}${Q[k]}${Q[j]}`); }
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return gives('sim_parts', strs[0], proof);
  },
  thales(claim, refRows, problem) {
    const proof = `thales ${refNames(refRows)}`.trim();
    const ref = refRows.length === 1 && refRows[0].claim.type === 'par' ? refRows[0] : null;
    if (!ref) return fail2('needParRef', proof);
    const { la, lb } = ref.claim;
    const on = (lk) => problem.pointNames.filter((X) => onLine(lk, X));
    const strs = [];
    for (const A of problem.pointNames.filter((X) => !onLine(la, X) && !onLine(lb, X))) {
      const arms = [];
      for (const B of on(la)) for (const D of on(lb)) if (sideOf(problem, A, B, D) === 0) arms.push([B, D]);
      for (const [B, D] of arms) {
        for (const [C, E] of arms) {
          if (B >= C || lineKey(problem.points, A, B) === lineKey(problem.points, A, C)) continue;
          strs.push(`${A}${B}/${A}${D}=${A}${C}/${A}${E}`, `${A}${B}/${B}${D}=${A}${C}/${C}${E}`, `${A}${D}/${B}${D}=${A}${E}/${C}${E}`);
        }
      }
    }
    if (!strs.length) return fail2('thalesNoAngle', proof);
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return gives('thales', strs[0], proof);
  },
  bis_ratio(claim, refRows, problem) {
    const proof = `bisector_thm ${refNames(refRows)}`.trim();
    const two = refRows.length === 1 ? twoAngles(refRows[0].claim) : null;
    if (!two || two.sum || two.ts[0].p[1] !== two.ts[1].p[1]) return fail2('bisNeedRef', proof);
    const A = two.ts[0].p[1];
    const [t1, t2] = two.ts;
    const arms1 = [t1.p[0], t1.p[2]];
    const arms2 = [t2.p[0], t2.p[2]];
    const shared = arms1.find((x) => arms2.some((y) => sameRay(problem, A, x, y)));
    if (!shared) return fail2('bisNeedRef', proof);
    const o1 = arms1.find((x) => !sameRay(problem, A, x, shared));
    const o2 = arms2.find((x) => !sameRay(problem, A, x, shared));
    const strs = [];
    for (const D of pointsOnRay(problem, A, shared)) {
      for (const B of pointsOnRay(problem, A, o1)) {
        for (const C of pointsOnRay(problem, A, o2)) if (between(problem, B, D, C)) strs.push(`${B}${D}/${D}${C}=${A}${B}/${A}${C}`);
      }
    }
    if (!strs.length) return fail2('bisNeedRef', proof);
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return gives('bis_ratio', strs[0], proof);
  },

  // ---- L10 circles
  radii(claim, refRows, problem) {
    const proof = 'radii_eq';
    const strs = [];
    for (const c of circles(problem)) for (const X of c.on) for (const Y of c.on) if (X < Y) strs.push(`${c.o}${X}=${c.o}${Y}`);
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return fail2('radiiWrong', proof);
  },
  inscribed_central(claim, refRows, problem) {
    const proof = 'inscribed_central';
    const strs = [];
    for (const c of circles(problem)) {
      for (const [A, B, C] of triples(c.on)) {
        if (A < B && sideOf(problem, A, B, C) * sideOf(problem, A, B, c.o) > 0) strs.push(`2∢${A}${C}${B}=∢${A}${c.o}${B}`);
      }
    }
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return fail2('inscribedWrong', proof);
  },
  inscribed_same(claim, refRows, problem) {
    const proof = 'inscribed_same_arc';
    const strs = [];
    for (const c of circles(problem)) {
      for (const [A, B, C] of triples(c.on)) {
        for (const D of c.on) {
          if (A < B && C < D && D !== A && D !== B && sideOf(problem, A, B, C) * sideOf(problem, A, B, D) > 0) strs.push(`∢${A}${C}${B}=∢${A}${D}${B}`);
        }
      }
    }
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return fail2('inscribedSameWrong', proof);
  },
  semicircle(claim, refRows, problem) {
    const proof = 'inscribed_diameter';
    const strs = [];
    for (const c of circles(problem)) {
      for (const [A, B, C] of triples(c.on)) if (A < B && between(problem, A, c.o, B)) strs.push(`∢${A}${C}${B}=90`);
    }
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return fail2('semicircleWrong', proof);
  },
  tangent_radius(claim, refRows, problem) {
    const proof = 'tangent_perp';
    const strs = [];
    for (const tg of tangents(problem)) {
      strs.push(`${tg.o}${tg.t}⊥${tg.t}${tg.p}`);
      for (const X of problem.pointNames) if (X !== tg.t && sideOf(problem, tg.t, tg.p, X) === 0) strs.push(`∢${tg.o}${tg.t}${X}=90`);
    }
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return fail2('tangentWrong', proof);
  },
  tangents_eq(claim, refRows, problem) {
    const proof = 'tangents_eq';
    const strs = [];
    for (const t1 of tangents(problem)) {
      for (const t2 of tangents(problem)) if (t1.t < t2.t && t1.p === t2.p && t1.o === t2.o) strs.push(`${t1.p}${t1.t}=${t2.p}${t2.t}`);
    }
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return fail2('tangentsEqWrong', proof);
  },
  cyclic_quad(claim, refRows, problem) {
    const proof = 'cyclic_quad';
    const strs = [];
    for (const c of circles(problem)) {
      for (const [B, A, D] of triples(c.on)) {
        for (const C of c.on) {
          if (B < D && A < C && C !== B && C !== D && sideOf(problem, B, D, A) * sideOf(problem, B, D, C) < 0) strs.push(`∢${B}${A}${D}+∢${B}${C}${D}=180`);
        }
      }
    }
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return fail2('cyclicWrong', proof);
  },

  // ---- L11 trigonometry in the triangle
  sin_def: trigDef('sin'),
  cos_def: trigDef('cos'),
  tan_def: trigDef('tan'),
  law_sines(claim, refRows, problem) {
    const proof = 'law_sines';
    const strs = [];
    for (const [X, Y, Z] of triples(problem.pointNames)) {
      if (Y < Z && !degenerate(problem, [X, Y, Z])) strs.push(`${X}${Y}/sin∢${X}${Z}${Y}=${X}${Z}/sin∢${X}${Y}${Z}`);
    }
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return fail2('lawSinesWrong', proof);
  },
  law_cosines(claim, refRows, problem) {
    const proof = 'law_cosines';
    const strs = [];
    for (const [X, Y, Z] of triples(problem.pointNames)) {
      if (Y < Z && !degenerate(problem, [X, Y, Z])) strs.push(`${Y}${Z}²=${X}${Y}²+${X}${Z}²-2${X}${Y}*${X}${Z}*cos∢${Y}${X}${Z}`);
    }
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return fail2('lawCosinesWrong', proof);
  },
};

// sin, cos and tan of an acute angle of a right triangle (right angle at C).
function trigDef(fn) {
  return (claim, refRows, problem) => {
    const proof = `${fn}_def ${refNames(refRows)}`.trim();
    const ras = rightRefs(refRows);
    if (!ras.length) return fail2('needRightRef', proof);
    const strs = [];
    for (const [P, C, Q] of ras.flatMap((ra) => legPairs(problem, ra.t))) {
      for (const [A, B] of [[P, Q], [Q, P]]) {
        // the angle at A: opposite leg CB, adjacent leg CA, hypotenuse AB
        const [opp, adj, hyp] = [`${C}${B}`, `${C}${A}`, `${A}${B}`];
        strs.push(`${fn}∢${C}${A}${B}=${fn === 'sin' ? opp : fn === 'cos' ? adj : opp}/${fn === 'tan' ? adj : hyp}`);
      }
    }
    if (matches(problem, claim, strs)) return { ok: true, proof };
    return gives(`${fn}_def`, strs[0], proof);
  };
}

Object.assign(CHECKS, STAGE_CHECKS);

// Two lines parallel to a third line are parallel to each other.
CHECKS.par_trans = (claim, refRows, problem) => {
  const proof = `par_trans ${refNames(refRows)}`.trim();
  if (claim.type !== 'par') return fail2('parConvNeedPar', proof);
  const pars = refRows.filter((r) => r.claim.type === 'par').map((r) => [r.claim.la, r.claim.lb]);
  if (pars.length !== 2) return fail2('needTwoPar', proof);
  const common = pars[0].find((l) => pars[1].includes(l));
  if (!common) return fail2('parTransNoCommon', proof);
  const ends = [pars[0].find((l) => l !== common), pars[1].find((l) => l !== common)];
  if (ends[0] && ends[1] && ends[0] !== ends[1] && [claim.la, claim.lb].sort().join() === ends.sort().join()) return { ok: true, proof };
  return fail2('parTransWrong', proof);
};

// ---------- constructions (auxiliary lines) ----------
// A construction row { cons: { kind, args, news }, reason: kind } adds points, dashed segments
// and position facts to the diagram, and states the fact it gives, which later rows cite.
// The browser places the new points from the coordinates; in Lean each construction is an
// existence theorem (obtain ⟨M, hM⟩ := …). Arguments, by kind:
//   cons_segment  [P, Q]     draw segment PQ
//   cons_extend   [P, Q]     extend PQ beyond Q to X:            PQ + QX = PX
//   cons_midpoint [P, Q]     mark the midpoint M of PQ:          PM = MQ
//   cons_median   [A, P, Q]  draw from A to the midpoint M of PQ: PM = MQ
//   cons_perp     [A, P, Q]  drop from A the perpendicular AH to line PQ: AH ⊥ PQ
//   cons_parallel [A, P, Q]  draw through A the line XY parallel to PQ:  XY ∥ PQ
//   cons_bisector [P, A, Q]  bisect ∢PAQ, meeting PQ at D:        ∢PAD = ∢DAQ

export const CONS_KINDS = {
  cons_segment: { args: 2, news: 0 },
  cons_extend: { args: 2, news: 1 },
  cons_midpoint: { args: 2, news: 1 },
  cons_median: { args: 3, news: 1 },
  cons_perp: { args: 3, news: 1 },
  cons_parallel: { args: 3, news: 2 },
  cons_bisector: { args: 3, news: 1 },
};
export const isConsReason = (rid) => !!CONS_KINDS[rid];

const consBetween = (a, o, b) => ({
  type: 'between', a, o, b, lean: `Sbtw ℝ ${a} ${o} ${b}`, cons: true,
  text: { he: `$${o}$ נמצאת על $${a}${b}$`, en: `$${o}$ lies on $${a}${b}$` },
});

// What a construction adds to `view` ({ points, segments }): { points, segments, config,
// claim (school notation, or null), drawn, lean }, or { error }.
export function buildConstruction(view, cons) {
  const err = (key, vars) => ({ error: { key, vars } });
  const spec = cons && CONS_KINDS[cons.kind];
  if (!spec) return err('consUseTool');
  const args = cons.args || [];
  const news = cons.news || [];
  if (args.length !== spec.args || news.length !== spec.news || args.some((x) => !x)) return err('consNeedPoints');
  const missing = args.find((x) => !view.points[x]);
  if (missing) return err('unknownPoint', { p: `$${missing}$` });
  if (new Set(args).size < args.length || new Set(news).size < news.length) return err('repeatPoint');
  for (const x of news) {
    if (!/^[A-Z]$/.test(x)) return err('consBadName');
    if (view.points[x]) return err('consNameTaken', { p: `$${x}$` });
  }
  const P = (x) => view.points[x];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const len = (u) => Math.hypot(u[0], u[1]);
  const flat = (a, v, b) => { const u = sub(P(b), P(a)); const w = sub(P(v), P(a)); return Math.abs(u[0] * w[1] - u[1] * w[0]) < 1e-6 * len(u) * Math.max(1, len(w)); };
  const out = { points: {}, segments: [], config: [], claim: null, drawn: null, lean: '' };
  const [a0, a1, a2] = args;
  const lean = (thm) => `obtain ⟨${news.join(', ')}, h${news.join('')}⟩ := ${thm} ${args.join(' ')}`;
  switch (cons.kind) {
    case 'cons_segment': {
      if ((view.segments || []).some((s) => s === a0 + a1 || s === a1 + a0)) return err('consAlready', { s: `$${a0}${a1}$` });
      out.segments.push(a0 + a1);
      out.drawn = [a0, a1];
      out.lean = `-- the segment ${a0}${a1} is drawn`;
      break;
    }
    case 'cons_extend': {
      const [X] = news;
      out.points[X] = lerp(P(a0), P(a1), 1.5);
      out.segments.push(a1 + X);
      out.config.push(consBetween(a0, a1, X));
      out.claim = `${a0}${a1}+${a1}${X}=${a0}${X}`;
      out.lean = lean('exists_extension');
      break;
    }
    case 'cons_midpoint':
    case 'cons_median': {
      const [Q, R] = cons.kind === 'cons_median' ? [a1, a2] : [a0, a1];
      if (cons.kind === 'cons_median' && flat(a1, a0, a2)) return err('consCollinear');
      const [M] = news;
      out.points[M] = lerp(P(Q), P(R), 0.5);
      out.config.push(consBetween(Q, M, R));
      if (cons.kind === 'cons_median') out.segments.push(a0 + M);
      out.claim = `${Q}${M}=${M}${R}`;
      out.lean = lean('exists_midpoint');
      break;
    }
    case 'cons_perp': {
      if (flat(a1, a0, a2)) return err('consOnLine', { p: `$${a0}$`, l: `$${a1}${a2}$` });
      const [H] = news;
      const u = sub(P(a2), P(a1));
      const t = ((P(a0)[0] - P(a1)[0]) * u[0] + (P(a0)[1] - P(a1)[1]) * u[1]) / (u[0] * u[0] + u[1] * u[1]);
      if (Math.abs(t) < 1e-9 || Math.abs(t - 1) < 1e-9) return err('consFootIsVertex', { p: `$${Math.abs(t) < 1e-9 ? a1 : a2}$` });
      out.points[H] = lerp(P(a1), P(a2), t);
      out.segments.push(a0 + H);
      if (t > 0 && t < 1) out.config.push(consBetween(a1, H, a2));
      else if (t > 1) { out.config.push(consBetween(a1, a2, H)); out.segments.push(a2 + H); }
      else { out.config.push(consBetween(H, a1, a2)); out.segments.push(H + a1); }
      out.claim = `${a0}${H}⊥${a1}${a2}`;
      out.lean = lean('exists_foot');
      break;
    }
    case 'cons_parallel': {
      if (flat(a1, a0, a2)) return err('consOnLine', { p: `$${a0}$`, l: `$${a1}${a2}$` });
      const [X, Y] = news;
      const u = sub(P(a2), P(a1));
      const k = 0.35;
      out.points[X] = [P(a0)[0] - u[0] * k, P(a0)[1] - u[1] * k];
      out.points[Y] = [P(a0)[0] + u[0] * k, P(a0)[1] + u[1] * k];
      out.config.push(consBetween(X, a0, Y));
      out.segments.push(X + Y);
      out.claim = `${X}${Y}∥${a1}${a2}`;
      out.lean = lean('exists_parallel');
      break;
    }
    case 'cons_bisector': {
      if (flat(a0, a1, a2)) return err('consCollinear');
      const [D] = news;
      const da = len(sub(P(a0), P(a1)));
      const db = len(sub(P(a2), P(a1)));
      out.points[D] = lerp(P(a0), P(a2), da / (da + db));
      out.config.push(consBetween(a0, D, a2));
      out.segments.push(a1 + D);
      out.claim = `∢${a0}${a1}${D}=∢${D}${a1}${a2}`;
      out.lean = lean('exists_bisector_foot');
      break;
    }
    default: return err('consUseTool');
  }
  for (const [x, c] of Object.entries(out.points)) {
    const same = Object.keys(view.points).find((q) => Math.hypot(view.points[q][0] - c[0], view.points[q][1] - c[1]) < 1e-6);
    if (same) return err('consOnPoint', { p: `$${same}$`, x: `$${x}$` });
  }
  return out;
}

const consSig = (rows) => JSON.stringify(rows.map((r, i) => (r.cons ? [i, r.cons] : null)).filter(Boolean));
const CONS_FIELDS = ['points', 'segments', 'config', 'pointNames', 'rays', 'givensParsed', 'goalParsed', 'goalKey', 'consSegments', 'consInfo', 'consBorn', 'consSig'];

// The problem as the proof's construction rows extend it: new points, dashed segments
// (consSegments), position facts, the givens and goal re-read with the new points (one angle may
// gain names), and per construction row its result (consInfo, by row index) and where each new
// point was born (consBorn). The problem itself is not changed.
export function withConstructions(problem, rows) {
  const sig = consSig(rows || []);
  if (!problem.base || sig === (problem.consSig || '')) return problem;
  const cache = problem.base.cache || (problem.base.cache = new Map());
  if (cache.has(sig)) return cache.get(sig);
  const b = problem.base;
  const points = { ...b.points };
  const segments = [...b.segments];
  const config = [...b.config];
  const consSegments = [];
  const consInfo = new Map();
  const consBorn = {};
  rows.forEach((r, i) => {
    if (!r.cons) return;
    const out = buildConstruction({ points, segments }, r.cons);
    consInfo.set(i, out);
    if (out.error) return;
    Object.assign(points, out.points);
    segments.push(...out.segments);
    consSegments.push(...out.segments);
    config.push(...out.config);
    for (const x of Object.keys(out.points)) consBorn[x] = i;
  });
  const d = Object.create(problem);
  Object.assign(d, { points, segments, config, consSegments, consInfo, consBorn, consSig: sig, pointNames: Object.keys(points), rays: computeRays(points) });
  d.givensParsed = problem.givens.map((g) => parseClaim(g.claim, d).claim);
  const goal = parseClaim(problem.goal, d);
  d.goalParsed = goal.claim;
  d.goalKey = claimKey(goal.claim);
  if (cache.size > 30) cache.delete(cache.keys().next().value);
  cache.set(sig, d);
  return d;
}

// Bring the page's problem object in line with its rows' constructions (the diagram, the claim
// preview and the Lean request all read it). Returns true when something changed.
export function syncConstructions(p, rows) {
  const d = withConstructions(p, rows);
  if (d === p) return false;
  for (const k of CONS_FIELDS) p[k] = d[k];
  return true;
}

// Every point a claim names.
function claimPoints(c) {
  const out = new Set();
  const term = (t) => {
    if (!t) return;
    if (t.kind === 'seg' || t.kind === 'ang' || t.kind === 'area') t.p.forEach((x) => out.add(x));
    else if (t.kind === 'trig') term(t.a);
    else if (t.kind === 'mono') t.f.forEach((x) => term(x.t));
  };
  if (c.L) for (const { t } of [...c.L.terms, ...c.R.terms]) term(t);
  for (const k of ['P', 'Q', 'a', 'b']) if (Array.isArray(c[k])) c[k].forEach((x) => out.add(x));
  return [...out];
}

function consResult(problem, row, n) {
  const info = row.cons ? problem.consInfo && problem.consInfo.get(n - 1) : { error: { key: 'consUseTool' } };
  if (!info || info.error) {
    const error = (info && info.error) || { key: 'consUseTool' };
    return { n, parsed: { ok: false, error }, ok: false, msg: error, lean: null, goal: false, cons: true };
  }
  const claim = info.claim ? parseClaim(info.claim, problem).claim : { type: 'drawn', a: info.drawn };
  return { n, parsed: { ok: true, claim }, ok: true, msg: null, lean: info.lean.replace(/⟩ :=/, `, s${n}⟩ :=`).replace(/, h\w+, s/, ', s'), goal: false, cons: true };
}

// Check every row. rows: [{ text, reason, refs: [rowNumbers] }]; a construction row also has
// `cons` (see buildConstruction).
export function checkProof(problem0, rows) {
  const problem = withConstructions(problem0, rows);
  const results = [];
  rows.forEach((row, i) => {
    const n = i + 1;
    if (row.cons || isConsReason(row.reason)) { results.push(consResult(problem, row, n)); return; }
    const parsed = parseClaim(row.text, problem);
    const res = { n, parsed, ok: false, msg: null, lean: null, goal: false };
    results.push(res);
    if (!parsed.ok) { res.msg = parsed.error; return; }
    const claim = parsed.claim;
    const key = claimKey(claim);
    res.goal = key === problem.goalKey;
    const head = `have s${n} : ${leanClaim(claim)} :=`;
    // a point a later construction row creates doesn't exist yet here
    const late = claimPoints(claim).find((x) => problem.consBorn && problem.consBorn[x] >= i);
    if (late) { res.msg = { key: 'notBuiltYet', vars: { p: `$${late}$`, n: problem.consBorn[late] + 1 } }; res.lean = `${head} sorry`; return; }
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
    // A cited equilateral triangle is its three equations (claimEqs): all of them (for
    // calculation), or one of them as the row cited (base angles need one AB = AC).
    const expand = (r) => claimEqs(results[r - 1].parsed.claim).map((c) => ({ n: r, claim: c }));
    const refRows = refs.flatMap(expand);
    const readings = [refRows];
    if (refs.some((r) => results[r - 1].parsed.claim.type === 'equi')) {
      let combos = [[]];
      for (const r of refs) combos = combos.flatMap((rr) => expand(r).map((x) => [...rr, x]));
      readings.push(...combos.slice(0, 27));
    }
    const check = CHECKS[rid];
    // an equilateral claim by a theorem or by calculation: each of its equations, same reason
    const parts = claim.type === 'equi' && rid !== 'given' ? claimEqs(claim) : [claim];
    let out = null;
    for (const part of parts) {
      let first = null;
      out = null;
      for (const rr of readings) {
        const o = check
          ? check(part, rr, problem)
          : { ok: false, msg: { key: 'reasonNoFit', vars: { rid } }, proof: `${REASONS[rid].lean} ${refNames(rr)}`.trim() };
        first = first || o;
        if (o.ok) { out = o; break; }
      }
      out = out || first;
      if (!out.ok) break;
    }
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
  if (claim.type !== 'eq' && claim.type !== 'ineq') return null;
  const target = eqVec(claim);
  if (claim.type === 'eq' && !target.size) {
    if (isEqOf(claim, 'seg')) return { reason: 'common_side', refs: [] };
    if (isEqOf(claim, 'ang')) return { reason: 'common_angle', refs: [] };
    return { reason: 'algebra', refs: [] };
  }
  // AB + BC = AC with B on AC, and ∢ABD + ∢DBC = ∢ABC with D inside the angle: read off the diagram.
  if (claim.type === 'eq' && target.size === 3 && !target.has('1')) {
    for (const rid of ['segment_add', 'angle_add']) {
      if (problem.allowed.includes(rid) && CHECKS[rid](claim, [], problem).ok) return { reason: rid, refs: [] };
    }
  }
  const pool = results.slice(0, upto).filter((r) => r.ok && r.parsed.ok && (r.parsed.claim.type === 'eq' || r.parsed.claim.type === 'ineq'));
  if (!pool.length) return null;
  const follows = (idx) => algebraFollows(claim, idx.map((i) => pool[i].parsed.claim));
  let keep = pool.map((_, i) => i);
  if (!follows(keep)) return null;
  for (const i of [...keep].reverse()) {
    const trial = keep.filter((x) => x !== i);
    if (follows(trial)) keep = trial;
  }
  return { reason: 'algebra', refs: keep.map((x) => pool[x].n) };
}

// "Ask for a reason": a reason the student may use, with the fewest earlier correct rows, that
// proves `text` as row upto+1. Calculation and givens first (autoReason), then every open theorem
// with no rows, one row, two, three. { reason, refs }, { error: 'noClaim' }, or null.
function* chooseRows(arr, k, from = 0, pick = []) {
  if (pick.length === k) { yield [...pick]; return; }
  for (let i = from; i < arr.length; i++) {
    pick.push(arr[i]);
    yield* chooseRows(arr, k, i + 1, pick);
    pick.pop();
  }
}
export function findReason(problem0, rows, upto, text, { ms = 2500 } = {}) {
  const before = rows.slice(0, upto);
  const problem = withConstructions(problem0, before);
  const parsed = parseClaim(text, problem);
  if (!parsed.ok) return { error: 'noClaim' };
  const claim = parsed.claim;
  if (claimPoints(claim).some((x) => problem.consBorn && problem.consBorn[x] >= upto)) return null;
  const { results } = checkProof(problem0, before);
  const auto = autoReason(problem, results, claim, upto);
  if (auto) return auto;
  const key = claimKey(claim);
  const gi = problem.givens.findIndex((g, j) => (g.also || []).some((rid) => problem.allowed.includes(rid)) && claimKey(problem.givensParsed[j]) === key);
  if (gi >= 0) return { reason: problem.givens[gi].also.find((rid) => problem.allowed.includes(rid)), refs: [] };
  const pool = results.filter((r) => r.ok && r.parsed.ok).map((r) => ({ n: r.n, claim: r.parsed.claim })).slice(-14);
  const rids = problem.allowed.filter((rid) => CHECKS[rid] && REASONS[rid] && !['given', 'algebra'].includes(rid) && !isConsReason(rid));
  const stop = Date.now() + ms;
  for (const k of [0, 1, 2, 3]) {
    const cands = rids.filter((rid) => { const need = REASONS[rid].refs || 0; return need === 'many' ? k >= 1 : need === k; });
    if (!cands.length || k > pool.length) continue;
    for (const refRows of chooseRows(pool, k)) {
      for (const rid of cands) {
        let out = null;
        try { out = CHECKS[rid](claim, refRows, problem); } catch { out = null; }
        if (out && out.ok) return { reason: rid, refs: refRows.map((r) => r.n) };
      }
      if (Date.now() > stop) return null;
    }
  }
  return null;
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
  // circle and tangent facts name the radius r (len O A = r, IsTangent P A O r): bind it
  const radius = problem.config.some((c) => /\br\b/.test(c.lean || '')) ? ' (r : ℝ)' : '';
  const lines = [`theorem ${name} (${problem.pointNames.join(' ')} : Point)${radius}`];
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
