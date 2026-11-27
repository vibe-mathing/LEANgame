// Lean ↔ question: the bridge between the site's problem format and a Lean theorem.
//
//   problemToLean(problem, opts) → the question as a Lean theorem with `sorry`, in the library's
//                                  vocabulary (Sbtw, len, ang, Cong, Par, IsParallelogram, …).
//                                  The Hebrew wording travels in comments, so it comes back intact.
//   leanToQuestion(src, opts)    → a Lean theorem read back: Hebrew wording that qparse.js reads,
//                                  and a drawing (qparse's drawing model) that witnesses the givens.
//   readLean(src)                → only the reading: points, position facts, givens, goal.
//
// Lean → question understands the library's vocabulary and a few Mathlib spellings (dist, ∠ in
// radians, Real.sqrt, π). Anything else is reported, line by line, never guessed.
// No DOM here, so tests/leanconv.mjs runs it in Node.

import { parseClaim, claimKey, QUADS } from './geo.js';
import * as Q from './qparse.js';

const H = (he, en) => ({ he, en });
const EPS = 1e-12;
const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

// ---------------------------------------------------------------- numbers

// p/q with q ≤ maxDen, when v is that fraction (to 1e-9).
function rational(v, maxDen = 1000) {
  if (!Number.isFinite(v)) return null;
  const s = v < 0 ? -1 : 1;
  const target = Math.abs(v);
  let x = target;
  let [p0, q0, p1, q1] = [0, 1, 1, 0];
  for (let i = 0; i < 32; i++) {
    const a = Math.floor(x);
    const p2 = a * p1 + p0; const q2 = a * q1 + q0;
    if (q2 > maxDen) break;
    [p0, q0, p1, q1] = [p1, q1, p2, q2];
    if (Math.abs(p1 / q1 - target) <= 1e-9 * Math.max(1, target)) return { p: s * p1, q: q1 };
    const f = x - a;
    if (f < 1e-12) break;
    x = 1 / f;
  }
  return null;
}

const SQFREE = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23, 26, 29, 30];
// v = (p/q)·√n, or null
function numParts(v) {
  const r = rational(v);
  if (r) return { p: r.p, q: r.q, n: 1 };
  for (const n of SQFREE) {
    const s = rational(v / Math.sqrt(n));
    if (s && s.p) return { p: s.p, q: s.q, n };
  }
  return null;
}
// a denominator whose fraction is a short decimal (1/2, 3/4, 1/8, 7/20)
const isDec = (q) => { let d = q; while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1 && q <= 1000; };
const decStr = (p, q) => String(+(p / q).toFixed(3));

// A number in Lean: 3, 2.5, (1 / 3), Real.sqrt 3, 2 * Real.sqrt 3, (1 / 2) * Real.sqrt 3.
function leanNum(v, warn) {
  const x = numParts(v);
  if (!x) { if (warn) warn(v); return String(+v.toPrecision(12)); }
  const { p, q, n } = x;
  const coef = q === 1 ? String(p) : isDec(q) ? decStr(p, q) : `(${p} / ${q})`;
  if (n === 1) return coef;
  return p === 1 && q === 1 ? `Real.sqrt ${n}` : `${coef} * Real.sqrt ${n}`;
}

// A term in school notation with its coefficient a > 0: AB, 2AB, 0.5AB, AB/3, 2AB/3, √3AB/2, 7/2.
function termStr(a, atom) {
  const x = numParts(a);
  if (!x) return `${+a.toPrecision(6)}${atom}`;
  const { p, q, n } = x;
  const root = n > 1 ? `√${n}` : '';
  if (q === 1 || isDec(q)) {
    const num = q === 1 ? String(p) : decStr(p, q);
    return `${num === '1' && (root || atom) ? '' : num}${root}${atom}`;
  }
  return `${p === 1 && (root || atom) ? '' : p}${root}${atom}/${q}`;
}

// ---------------------------------------------------------------- claims written out

function leanAtom(t) {
  if (t.kind === 'seg') return `len ${t.p[0]} ${t.p[1]}`;
  if (t.kind === 'area') return `area ${t.p.join(' ')}`;
  if (t.kind === 'ang') return `ang ${t.p.join(' ')}`;
  if (t.kind === 'trig') return `${t.fn}D (${leanAtom(t.a)})`;
  const pw = (x) => leanAtom(x.t) + (Math.abs(x.e) === 1 ? '' : ` ^ ${Math.abs(x.e)}`);
  const top = t.f.filter((x) => x.e > 0).map(pw);
  const den = t.f.filter((x) => x.e < 0).map(pw);
  const T = top.length ? top.join(' * ') : '1';
  if (!den.length) return T;
  return `${top.length > 1 ? `(${T})` : T} / ${den.length > 1 ? `(${den.join(' * ')})` : den[0]}`;
}

function leanSide(side, warn) {
  const parts = side.terms.map(({ c, t }) => {
    const a = Math.abs(c);
    let atom = leanAtom(t);
    if (Math.abs(a - 1) > 1e-9 && t.kind === 'mono' && t.f.some((x) => x.e < 0)) atom = `(${atom})`;
    return { neg: c < 0, body: Math.abs(a - 1) < 1e-9 ? atom : `${leanNum(a, warn)} * ${atom}` };
  });
  if (Math.abs(side.k) > EPS || !parts.length) parts.push({ neg: side.k < -EPS, body: leanNum(Math.abs(side.k), warn) });
  return parts.map((x, i) => (i === 0 ? (x.neg ? `-${x.body}` : x.body) : `${x.neg ? '-' : '+'} ${x.body}`)).join(' ');
}

// A parsed claim (geo.js's shape) in Lean, with exact numbers.
export function leanOfClaim(c, warn) {
  switch (c.type) {
    case 'cong': return `Cong ${c.P.join(' ')} ${c.Q.join(' ')}`;
    case 'sim': return `Sim ${c.P.join(' ')} ${c.Q.join(' ')}`;
    case 'par': return `Par ${c.a.join(' ')} ${c.b.join(' ')}`;
    case 'perp': return `Perp ${c.a.join(' ')} ${c.b.join(' ')}`;
    case 'quad': return `${QUADS[c.kind].lean} ${c.P.join(' ')}`;
    case 'eq': return `${leanSide(c.L, warn)} = ${leanSide(c.R, warn)}`;
    case 'ineq': return `${leanSide(c.L, warn)} ${c.op} ${leanSide(c.R, warn)}`;
    default: throw new Error(`no Lean form for claim type ${c.type}`);
  }
}

function schoolAtom(t) {
  if (t.kind === 'seg') return t.p.join('');
  if (t.kind === 'area') return 'S△' + t.p.join('');
  if (t.kind === 'ang') return '∢' + t.p.join('');
  if (t.kind === 'trig') return t.fn + schoolAtom(t.a);
  const pw = (x) => schoolAtom(x.t) + (Math.abs(x.e) === 1 ? '' : Math.abs(x.e) === 2 ? '²' : `^${Math.abs(x.e)}`);
  const top = t.f.filter((x) => x.e > 0).map(pw).join('*') || '1';
  return top + t.f.filter((x) => x.e < 0).map((x) => '/' + pw(x)).join('');
}

function schoolSide(side, of) {
  const out = side.terms.map(({ c, t }) => ({ neg: c < 0, s: termStr(Math.abs(c), schoolAtom(t)) }));
  if (Math.abs(side.k) > EPS || !out.length) out.push({ neg: side.k < -EPS, s: termStr(Math.abs(side.k), '') + (of === 'ang' ? '°' : '') });
  return out.map((x, i) => (i === 0 ? (x.neg ? '−' : '') + x.s : ` ${x.neg ? '−' : '+'} ${x.s}`)).join('');
}

// A claim in the site's notation, with exact numbers (AB/3 rather than 0.333AB).
export function schoolOfClaim(c) {
  switch (c.type) {
    case 'cong': return `△${c.P.join('')} ≅ △${c.Q.join('')}`;
    case 'sim': return `△${c.P.join('')} ∼ △${c.Q.join('')}`;
    case 'par': return `${c.a.join('')} ∥ ${c.b.join('')}`;
    case 'perp': return `${c.a.join('')} ⊥ ${c.b.join('')}`;
    case 'quad': return `${c.P.join('')} ${QUADS[c.kind].he}`;
    default: return `${schoolSide(c.L, c.of)} ${c.type === 'ineq' ? c.op : '='} ${schoolSide(c.R, c.of)}`;
  }
}

// ---------------------------------------------------------------- question → Lean

const he = (x) => (x == null ? '' : typeof x === 'string' ? x : x.he || '');
const plain = (s) => String(s || '').replace(/\$/g, '').replace(/\s+/g, ' ').trim();

// The question in words, from a problem object: intro, givens (their wording when they have one), goal.
export function describeProblem(problem, { ask = null } = {}) {
  const intro = plain(he(problem.intro));
  const givens = (problem.givens || []).map((g) => plain(he(g.text)) || g.claim);
  const parts = [];
  if (intro) parts.push(/[.!?]$/.test(intro) ? intro : `${intro}.`);
  if (givens.length) parts.push(`נתון: ${givens.join(', ')}.`);
  parts.push(ask ? `חשבו את ${ask}.` : `הוכיחו: ${problem.goal}.`);
  return parts.join('\n');
}

// opts: { name, title, text (the teacher's words), ask (the asked term, for "חשבו"), header }
export function problemToLean(problem, opts = {}) {
  const pos = problem.points;
  const names = Object.keys(pos);
  const ctx = Q.claimContext(pos);
  const warnings = [];
  const warn = (v) => warnings.push(H(`המספר ${v} עוגל`, `The number ${v} was rounded`));
  const parse = (s, what) => {
    const r = parseClaim(s, ctx);
    if (!r.ok) throw new Error(`${what} does not parse: ${s} (${r.error.key})`);
    return r.claim;
  };
  const radius = new Map();
  const rad = (o) => { if (!radius.has(o)) radius.set(o, `r${radius.size + 1}`); return radius.get(o); };
  const hyps = [];
  const cfg = (prop, note) => hyps.push({ prop, note: `מהשרטוט: ${note}`, kind: 'cfg' });
  for (const c of problem.config || []) {
    switch (c.type) {
      case 'between': cfg(`Sbtw ℝ ${c.a} ${c.o} ${c.b}`, plain(he(c.text)) || `${c.o} נמצאת בין ${c.a} ל-${c.b}`); break;
      case 'circle': for (const p of c.on) cfg(`len ${c.o} ${p} = ${rad(c.o)}`, `${p} על המעגל שמרכזו ${c.o}`); break;
      case 'tangent': cfg(`IsTangent ${c.p} ${c.t} ${c.o} ${rad(c.o)}`, `${c.p}${c.t} משיק למעגל בנקודה ${c.t}`); break;
      case 'par': cfg(`Par ${c.a.join(' ')} ${c.b.join(' ')}`, `${c.a.join('')} ∥ ${c.b.join('')}`); break;
      case 'midpoint': cfg(`IsMidpoint ${c.m} ${c.a[0]} ${c.a[1]}`, `${c.m} אמצע ${c.a.join('')}`); break;
      default: warnings.push(H(`עובדה מהשרטוט מסוג ${c.type} לא נכנסה`, `A diagram fact of type ${c.type} was left out`));
    }
  }
  const givensParsed = (problem.givens || []).map((g, i) => parse(g.claim, `given ${i + 1}`));
  const goal = parse(problem.goal, 'goal');
  // what only the picture shows (which side of a line a point is on), when the statement needs it
  let sides = [];
  let triangles = [];
  if (opts.sides !== false) {
    const need = sidesNeeded(problem, givensParsed, goal);
    sides = need.sides;
    triangles = need.triangles;
    for (const T of triangles) hyps.push({ prop: `IsTriangle ${T.join(' ')}`, note: `מהשרטוט: ${T.join('')} משולש`, kind: 'pic' });
    for (const s of sides) {
      hyps.push({ prop: `line[ℝ, ${s.p}, ${s.q}].${s.same ? 'SSameSide' : 'SOppSide'} ${s.a} ${s.b}`, note: `מהשרטוט: ${s.a} ו-${s.b} ${s.same ? 'באותו צד של' : 'משני צדי'} ${s.p}${s.q}`, kind: 'pic' });
    }
    if (need.open) warnings.push(H('בלי השרטוט המשפט אולי לא נכון: יש שרטוט שבו הנתונים מתקיימים והמסקנה לא.', 'Without the picture the theorem may be false: some drawing makes the givens true and the goal false.'));
  }
  (problem.givens || []).forEach((g, i) => {
    hyps.push({ prop: leanOfClaim(givensParsed[i], warn), note: `נתון: ${plain(he(g.text)) || g.claim}`, kind: 'g' });
  });
  const goalNote = opts.ask ? `חשבו את ${opts.ask}` : `הוכיחו: ${problem.goal}`;

  const stage = problem.stage || opts.stage || null;
  const name = String(opts.name || (stage && problem.n ? `geo_${stage}_${String(problem.n).padStart(4, '0')}` : 'question')).replace(/[^A-Za-z0-9_]/g, '_');
  const title = plain(opts.title != null ? opts.title : he(problem.title));
  const text = String(opts.text != null ? opts.text : describeProblem(problem, { ask: opts.ask })).replace(/-\//g, '- /').trim();

  const doc = [title ? `כותרת: ${title}` : '', `שאלה: ${text.replace(/\s*\n\s*/g, '\n')}`].filter(Boolean).join('\n');
  const lines = [`/-- ${doc} -/`];
  const binders = [`(${names.join(' ')} : Point)`];
  if (radius.size) binders.push(`(${[...radius.values()].join(' ')} : ℝ)`);
  lines.push(`theorem ${name} ${binders.join(' ')}${hyps.length ? '' : ' :'}`);
  const count = {};
  hyps.forEach((h, i) => {
    count[h.kind] = (count[h.kind] || 0) + 1;
    lines.push(`    (${h.kind}${count[h.kind]} : ${h.prop})${i === hyps.length - 1 ? ' :' : ''} -- ${h.note.replace(/\n/g, ' ')}`);
  });
  lines.push(`    ${leanOfClaim(goal, warn)} := by -- ${goalNote}`);
  lines.push('  sorry');
  const body = lines.join('\n') + '\n';
  // its own namespace, so a built-in problem's name doesn't clash with the library's copy
  const lean = `import LeanGame\n\nnamespace SchoolGeo.FromSite\n\n${body}\nend SchoolGeo.FromSite\n`;
  return { lean, body, name, warnings, sides, triangles };
}

// Side-of-line facts the statement needs: while some drawing makes the position facts and the
// givens true but the goal false, add the fact (as the question's own drawing has it) that rules
// that drawing out. { sides, open }: open when a counterexample is left.
function sidesNeeded(problem, givensParsed, goalParsed, { rounds = 6, seed = 11 } = {}) {
  const orig = problem.points;
  const names = Object.keys(orig);
  const cfg = problem.config || [];
  const circles = cfg.filter((c) => c.type === 'circle').map((c) => ({ o: c.o, on: [...c.on] }));
  const tangents = cfg.filter((c) => c.type === 'tangent').map((c) => ({ p: c.p, t: c.t, o: c.o }));
  for (const t of tangents) {
    let c = circles.find((x) => x.o === t.o);
    if (!c) { c = { o: t.o, on: [] }; circles.push(c); }
    if (!c.on.includes(t.t)) c.on.push(t.t);
  }
  const between = cfg.filter((c) => c.type === 'between').map(({ a, o, b }) => ({ a, o, b }));
  const extra = [];
  for (const c of cfg) {
    if (c.type === 'midpoint') { between.push({ a: c.a[0], o: c.m, b: c.a[1] }); extra.push(parseClaim(`${c.a[0]}${c.m} = ${c.m}${c.a[1]}`, names).claim); }
    if (c.type === 'par') extra.push(parseClaim(`${c.a.join('')} ∥ ${c.b.join('')}`, names).claim);
  }
  const model = {
    names, between, circles, tangents, triangles: [], sides: [],
    givens: [...givensParsed, ...extra].filter(Boolean).map((parsed) => ({ parsed })), goal: { parsed: goalParsed },
  };
  const diamOf = (pos) => Math.max(1e-9, ...names.flatMap((a) => names.map((b) => Math.hypot(...sub(pos[a], pos[b])))));
  const diam = diamOf(orig);
  const drawn = (problem.segments || []).map((s) => [...s]).filter((s) => s.length === 2 && orig[s[0]] && orig[s[1]]);
  const pairs = [...drawn, ...names.flatMap((a, i) => names.slice(i + 1).map((b) => [a, b]))];
  // the triangles the drawing shows: three points, not on one line, joined by drawn segments
  const onSeg = (X, [P, R]) => X === P || X === R || Math.abs(crs(sub(orig[R], orig[P]), sub(orig[X], orig[P]))) < 1e-6 * diam * diam;
  const joined = (a, b) => drawn.some((s) => onSeg(a, s) && onSeg(b, s));
  const sinAt = (pos, X, V, Y) => { const u = sub(pos[X], pos[V]); const v = sub(pos[Y], pos[V]); return Math.abs(crs(u, v)) / ((norm(u) * norm(v)) || 1e-9); };
  const flat = (pos, T) => Math.min(sinAt(pos, T[1], T[0], T[2]), sinAt(pos, T[0], T[1], T[2]), sinAt(pos, T[0], T[2], T[1]));
  const shown = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      for (let k = j + 1; k < names.length; k++) {
        const T = [names[i], names[j], names[k]];
        if (joined(T[0], T[1]) && joined(T[1], T[2]) && joined(T[0], T[2]) && flat(orig, T) > 0.05) shown.push(T);
      }
    }
  }
  const out = [];
  const tris = [];
  for (let round = 0; round <= rounds; round++) {
    const cx = counterexample(model, seed + round);
    if (!cx) return { sides: out, triangles: tris, open: false };
    if (round === rounds) break;
    // a triangle of the drawing that came out flat: say it is a triangle
    const T = shown.find((x) => flat(cx, x) < 0.02 && !tris.includes(x));
    if (T) { tris.push(T); model.triangles.push(T); continue; }
    const noise = 1e-3 * diamOf(cx);
    let pick = null;
    for (const [P, R] of pairs) {
      const u0 = sub(orig[R], orig[P]); const u1 = sub(cx[R], cx[P]);
      if (norm(u0) < 1e-9 || norm(u1) < 1e-9) continue;
      const s0 = (X) => crs(u0, sub(orig[X], orig[P])) / norm(u0);
      const s1 = (X) => { const v = crs(u1, sub(cx[X], cx[P])) / norm(u1); return Math.abs(v) < noise ? 0 : v; };
      const off = names.filter((X) => X !== P && X !== R && Math.abs(s0(X)) > 1e-6 * diam);
      for (let i = 0; i < off.length && !pick; i++) {
        for (let j = i + 1; j < off.length && !pick; j++) {
          const [a, b] = [off[i], off[j]];
          if (Math.sign(s0(a) * s0(b)) !== Math.sign(s1(a) * s1(b))) pick = { p: P, q: R, a, b, same: s0(a) * s0(b) > 0 };
        }
      }
      if (pick) break;
    }
    if (!pick) break;
    out.push(pick);
    model.sides.push(pick);
  }
  return { sides: out, triangles: tris, open: true };
}

// A drawing where the position facts and the givens hold and the goal doesn't, or null.
function counterexample(model, seed, restarts = 24) {
  const names = model.names;
  const sh = shapes(model, lineSets(model.between));
  const gp = model.givens.map((g) => g.parsed);
  const f = makeResiduals(model, sh, names);
  const rnd = rng(seed);
  for (let k = 0; k < restarts; k++) {
    const x0 = initial(model, names, rnd);
    const { scale } = Q.drawingScale(gp, toPos(x0, names));
    const res = lm(x0, (x) => f(x, scale));
    if (Math.max(0, ...res.r.map(Math.abs)) > 1e-6) continue;
    const pos = toPos(res.x, names);
    const sc = Q.drawingScale(gp, pos).scale;
    if (gp.some((c) => Q.holds(c, pos, sc) === false)) continue;
    if (Q.holds(model.goal.parsed, pos, sc) === false) return pos;
  }
  return null;
}

// ---------------------------------------------------------------- reading Lean: tokens

class LeanError extends Error {
  constructor(msg, line) { super(msg.en); this.info = { msg, line }; }
}

const DECL = new Set(['theorem', 'lemma', 'example']);
const DOC_STOP = new Set(['theorem', 'lemma', 'example', 'def', 'end', 'namespace', 'section', 'open', 'import', 'variable', 'module', 'abbrev', 'instance', 'structure']);
const SYMS = [':=', '->', '<=', '>=', '/\\', '≠', '≤', '≥', '→', '↔', '∧', '∨', '¬', '∠', '√', 'π', 'ℝ', '°', '(', ')', '{', '}', '[', ']', '⦃', '⦄',
  ':', ',', '+', '-', '*', '/', '^', '=', '<', '>', '∀', '∃', '⟨', '⟩', '|', '@', ';', '·', '•', '.', '!', '#', '$', '%', '&', '?', '~', '∈'];
const NOT_ID = new Set(['λ', 'Π', 'Σ', 'π', 'ℝ']);
const ID_START = /[A-Za-z_\p{L}]/u;
const ID_REST = /[A-Za-z0-9_'!?\p{L}₀-ₜᵢ-ᵪ]/u;
const isIdStart = (ch) => !!ch && ID_START.test(ch) && !NOT_ID.has(ch);
const isIdRest = (ch) => !!ch && ID_REST.test(ch) && !NOT_ID.has(ch);

function tokenize(src) {
  const toks = [];
  let i = 0;
  let line = 1;
  let before = null;
  const add = (t, v, s, e) => {
    const tok = { t, v, s, e, line };
    if (before) { tok.before = before; before = null; }
    toks.push(tok);
  };
  const comment = (text, l) => {
    if (!text) return;
    const last = toks[toks.length - 1];
    if (last && last.line === l && last.t !== 'doc') last.after = last.after ? `${last.after} ${text}` : text;
    else before = before ? `${before} ${text}` : text;
  };
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\n') { line++; i++; continue; }
    if (/\s/.test(ch)) { i++; continue; }
    if (src.startsWith('--', i)) {
      let j = src.indexOf('\n', i);
      if (j < 0) j = src.length;
      comment(src.slice(i + 2, j).trim(), line);
      i = j;
      continue;
    }
    if (src.startsWith('/-', i)) {
      const l0 = line;
      let depth = 0;
      let j = i;
      while (j < src.length) {
        if (src.startsWith('/-', j)) { depth++; j += 2; } else if (src.startsWith('-/', j)) { depth--; j += 2; if (!depth) break; } else { if (src[j] === '\n') line++; j++; }
      }
      const body = src.slice(i, j);
      const inner = body.replace(/-\/$/, '');
      if (body.startsWith('/--')) add('doc', inner.slice(3).trim(), i, j);
      else comment(inner.slice(2).replace(/^!/, '').trim(), l0);
      i = j;
      continue;
    }
    if (ch === '«') {
      const j = src.indexOf('»', i);
      const e = j < 0 ? src.length : j + 1;
      add('id', src.slice(i + 1, j < 0 ? e : j), i, e);
      i = e;
      continue;
    }
    const num = /^\d+(?:\.\d+)?/.exec(src.slice(i, i + 40));
    if (num) { add('num', num[0], i, i + num[0].length); i += num[0].length; continue; }
    if (isIdStart(ch)) {
      let j = i + 1;
      for (;;) {
        while (j < src.length && isIdRest(src[j])) j++;
        if (src[j] === '.' && isIdStart(src[j + 1])) { j++; continue; }
        break;
      }
      add('id', src.slice(i, j), i, j);
      i = j;
      continue;
    }
    const sym = SYMS.find((x) => src.startsWith(x, i)) || String.fromCodePoint(src.codePointAt(i));
    add('sym', sym, i, i + sym.length);
    i += sym.length;
  }
  return toks;
}

// ---------------------------------------------------------------- reading Lean: expressions

const INFIX = {
  '→': [25, 'R'], '->': [25, 'R'], '↔': [20, 'L'], '∨': [30, 'R'], '∧': [35, 'R'], '/\\': [35, 'R'],
  '=': [50, 'L'], '≠': [50, 'L'], '<': [50, 'L'], '>': [50, 'L'], '≤': [50, 'L'], '≥': [50, 'L'], '<=': [50, 'L'], '>=': [50, 'L'], '∈': [50, 'L'],
  '+': [65, 'L'], '-': [65, 'L'], '*': [70, 'L'], '/': [70, 'L'], '•': [73, 'R'], '^': [75, 'R'],
};
const CANON = { '->': '→', '/\\': '∧', '<=': '≤', '>=': '≥' };
const KEYWORDS = new Set(['by', 'at', 'with', 'then', 'else', 'from', 'fun', 'where', 'in', 'do', 'if', 'have', 'show', 'calc', 'let', 'match']);
const CLOSE = { '(': ')', '{': '}', '[': ']', '⦃': '⦄' };

class Parser {
  constructor(toks) { this.toks = toks; this.i = 0; }
  peek(k = 0) { return this.toks[this.i + k]; }
  isSym(v, k = 0) { const t = this.toks[this.i + k]; return !!t && t.t === 'sym' && t.v === v; }
  next() { return this.toks[this.i++]; }
  fail(msg, tok) {
    const t = tok || this.peek() || this.toks[this.toks.length - 1];
    throw new LeanError(msg, t ? t.line : null);
  }
  expect(v) {
    if (!this.isSym(v)) { const t = this.peek(); this.fail(H(`חסר "${v}"${t ? ` לפני "${t.v}"` : ''}`, `Expected "${v}"${t ? ` before "${t.v}"` : ''}`)); }
    return this.next();
  }
  span(node, start) { node.s = this.toks[start].s; node.e = this.toks[this.i - 1].e; return node; }
  expr(min = 0) {
    const start = this.i;
    let left = this.prefix();
    for (;;) {
      const t = this.peek();
      if (!t || t.t !== 'sym' || !INFIX[t.v]) break;
      const [bp, assoc] = INFIX[t.v];
      if (bp < min) break;
      this.next();
      const right = this.expr(assoc === 'R' ? bp : bp + 1);
      left = this.span({ k: 'bin', op: CANON[t.v] || t.v, a: left, b: right, tok: t }, start);
    }
    return left;
  }
  argStart() {
    const t = this.peek();
    if (!t) return false;
    if (t.t === 'num') return true;
    if (t.t === 'id') return !KEYWORDS.has(t.v);
    return t.t === 'sym' && ['(', 'π', 'ℝ', '{'].includes(t.v);
  }
  prefix() {
    const start = this.i;
    const t = this.next();
    if (!t) this.fail(H('הביטוי נגמר באמצע', 'The expression ends too early'));
    if (t.t === 'num') return this.span({ k: 'num', v: parseFloat(t.v), tok: t }, start);
    if (t.t === 'doc') this.fail(H('הערת תיעוד באמצע ביטוי', 'A doc comment inside an expression'), t);
    if (t.t === 'id') {
      if (KEYWORDS.has(t.v)) this.fail(H(`"${t.v}" לא נתמך כאן`, `"${t.v}" is not supported here`), t);
      if (short(t.v) === 'line' && this.isSym('[')) return this.method(this.lineLit(t), start);
      const args = [];
      while (this.argStart()) args.push(this.arg());
      return this.span(args.length ? { k: 'app', f: t.v, args, tok: t } : { k: 'id', v: t.v, tok: t }, start);
    }
    switch (t.v) {
      case '(': return this.method(this.span(this.paren(), start), start);
      case '-': return this.span({ k: 'neg', a: this.expr(75), tok: t }, start);
      case '¬': return this.span({ k: 'not', a: this.expr(40), tok: t }, start);
      case '√': return this.span({ k: 'app', f: 'Real.sqrt', args: [this.arg()], tok: t }, start);
      case '∠': return this.span({ k: 'app', f: '∠', args: [this.arg(), this.arg(), this.arg()], tok: t }, start);
      case 'π': return this.span({ k: 'pi', tok: t }, start);
      case 'ℝ': return this.span({ k: 'R', tok: t }, start);
      case '{': return this.span(this.setLit(), start);
      case '∀': case '∃': return this.span(this.quant(t), start);
      default: return this.fail(H(`לא ברור מה עושה כאן "${t.v}"`, `Unexpected "${t.v}"`), t);
    }
  }
  arg() {
    const start = this.i;
    const t = this.next();
    if (t.t === 'num') return this.span({ k: 'num', v: parseFloat(t.v), tok: t }, start);
    if (t.t === 'id') return this.span({ k: 'id', v: t.v, tok: t }, start);
    if (t.v === '(') return this.span(this.paren(), start);
    if (t.v === 'π') return this.span({ k: 'pi', tok: t }, start);
    if (t.v === 'ℝ') return this.span({ k: 'R', tok: t }, start);
    if (t.v === '{') return this.span(this.setLit(), start);
    return this.fail(H(`לא ברור מה עושה כאן "${t.v}"`, `Unexpected "${t.v}"`), t);
  }
  // line[ℝ, A, B]
  lineLit(t) {
    this.expect('[');
    const R = this.expr(0);
    if (R.k !== 'R') this.fail(H('line[…] צריך להתחיל ב-ℝ', 'line[…] must start with ℝ'), t);
    this.expect(',');
    const a = this.expr(0);
    this.expect(',');
    const b = this.expr(0);
    this.expect(']');
    return { k: 'line', a, b, tok: t };
  }
  // x.SSameSide A B: a method call after an expression
  method(node, start) {
    let out = node;
    while (this.isSym('.') && this.peek(1) && this.peek(1).t === 'id') {
      this.next();
      const f = this.next();
      const args = [out];
      while (this.argStart()) args.push(this.arg());
      out = this.span({ k: 'app', f: `.${f.v}`, args, tok: f }, start);
    }
    return out;
  }
  paren() {
    if (this.isSym(')')) this.fail(H('סוגריים ריקים', 'Empty parentheses'));
    const e = this.expr(0);
    if (this.isSym(':')) { this.next(); this.expr(0); } // a type ascription: (2 : ℝ)
    this.expect(')');
    return e;
  }
  setLit() {
    const items = [];
    if (!this.isSym('}')) {
      items.push(this.expr(0));
      while (this.isSym(',')) { this.next(); items.push(this.expr(0)); }
    }
    this.expect('}');
    return { k: 'set', items };
  }
  // ∀ A B : Point, body   or   ∀ (A B : Point) (h : P), body
  quant(q) {
    const binders = [];
    if (this.isSym('(') || this.isSym('{') || this.isSym('⦃')) {
      while (this.isSym('(') || this.isSym('{') || this.isSym('⦃')) {
        const open = this.next();
        const names = [];
        while (this.peek() && this.peek().t === 'id') names.push(this.next().v);
        this.expect(':');
        const type = this.expr(0);
        this.expect(CLOSE[open.v]);
        binders.push({ names, type });
      }
    } else {
      const names = [];
      while (this.peek() && this.peek().t === 'id') names.push(this.next().v);
      let type = null;
      if (this.isSym(':')) { this.next(); type = this.expr(0); }
      binders.push({ names, type });
    }
    this.expect(',');
    const body = this.expr(0);
    return { k: q.v === '∀' ? 'forall' : 'exists', binders, body, tok: q };
  }
}

// The first theorem / lemma / example: its name, doc comment, binders, goal and comments.
function readDecl(src) {
  const toks = tokenize(src);
  const k = toks.findIndex((t) => t.t === 'id' && DECL.has(t.v));
  if (k < 0) throw new LeanError(H('לא נמצא theorem, lemma או example', 'No theorem, lemma or example found'), null);
  let doc = null;
  for (let j = k - 1; j >= 0 && j >= k - 16; j--) {
    const t = toks[j];
    if (t.t === 'doc') { doc = t.v; break; }
    if ((t.t === 'id' && DOC_STOP.has(t.v)) || (t.t === 'sym' && t.v === ':=')) break;
  }
  const p = new Parser(toks);
  p.i = k + 1;
  let name = null;
  if (toks[k].v !== 'example') {
    const t = p.next();
    if (!t || t.t !== 'id') p.fail(H('חסר שם למשפט', 'The theorem has no name'), toks[k]);
    name = t.v;
  }
  const binders = [];
  while (p.peek() && p.peek().t === 'sym' && CLOSE[p.peek().v]) {
    const open = p.next();
    if (open.v === '[') { // an instance argument: nothing to read
      let depth = 1;
      while (p.peek() && depth) { const t = p.next(); if (t.t === 'sym' && t.v === '[') depth++; else if (t.t === 'sym' && t.v === ']') depth--; }
      continue;
    }
    const names = [];
    while (p.peek() && p.peek().t === 'id') names.push(p.next().v);
    if (!names.length || !p.isSym(':')) p.fail(H('משתנה או הנחה שלא כתובים כמו שצריך', 'A binder that is not well formed'), open);
    p.next();
    const type = p.expr(0);
    const close = p.expect(CLOSE[open.v]);
    binders.push({ names, type, line: open.line, src: src.slice(open.s, close.e), comment: [open.before, close.after].filter(Boolean).join(' '), close });
  }
  if (!p.isSym(':')) p.fail(H('חסרה נקודתיים ואחריהן המסקנה', 'Expected ":" and then the goal'));
  const sig = p.next();
  if (binders.length && sig.after) binders[binders.length - 1].comment = [binders[binders.length - 1].comment, sig.after].filter(Boolean).join(' ');
  const g0 = p.i;
  const goal = p.expr(0);
  const g1 = p.i;
  const rest = p.peek();
  if (rest && !(rest.t === 'sym' && (rest.v === ':=' || rest.v === '|')) && !(rest.t === 'id' && rest.v === 'where')) {
    p.fail(H(`משהו לא צפוי אחרי המסקנה: "${rest.v}"`, `Unexpected "${rest.v}" after the goal`), rest);
  }
  const goalComment = [toks[g0] && toks[g0].before, toks[g1 - 1].after, rest && rest.after,
    rest && rest.v === ':=' && toks[g1 + 1] && toks[g1 + 1].v === 'by' ? toks[g1 + 1].after : null].filter(Boolean).join(' ');
  return { name, doc, binders, goal, goalComment, goalLine: toks[g0] ? toks[g0].line : null, src };
}

// ---------------------------------------------------------------- reading Lean: meaning

class FactError extends Error {
  constructor(msg) { super(msg.en); this.msg = msg; }
}
const short = (name) => String(name).replace(/^(SchoolGeo|EuclideanGeometry|Real|Dist|_root_)\./, '');
const isPointType = (t) => (t.k === 'id' && short(t.v) === 'Point') || (t.k === 'app' && short(t.f) === 'EuclideanSpace');
const isRealType = (t) => t.k === 'R' || (t.k === 'id' && t.v === 'Real');
const LEAN_QUAD = Object.fromEntries(Object.entries(QUADS).map(([k, q]) => [q.lean, k]));
const REL = new Set(['=', '<', '>', '≤', '≥', '≠']);

// polynomials over segments, angles, sin/cos/tan of angles and real variables
const atomKey = (t) => (t.kind === 'seg' ? 's:' + [...t.p].sort().join('') : t.kind === 'area' ? 'S:' + [...t.p].sort().join('') : t.kind === 'ang' ? `a:${t.p[1]}:${[t.p[0], t.p[2]].sort().join('')}`
  : t.kind === 'trig' ? `t:${t.fn}(${atomKey(t.a)})` : 'v:' + t.name);
const monoKey = (f) => f.map((x) => `${atomKey(x.t)}^${x.e}`).sort().join('*') || '1';
const cst = (v) => new Map(Math.abs(v) > EPS ? [['1', { c: v, f: [] }]] : []);
const atomP = (t) => new Map([[monoKey([{ t, e: 1 }]), { c: 1, f: [{ t, e: 1 }] }]]);
function addP(A, B, s = 1) {
  const out = new Map([...A].map(([k, m]) => [k, { ...m }]));
  for (const [k, m] of B) {
    const cur = out.get(k);
    if (cur) cur.c += s * m.c; else out.set(k, { c: s * m.c, f: m.f });
  }
  for (const [k, m] of out) if (Math.abs(m.c) < 1e-12) out.delete(k);
  return out;
}
const scaleP = (A, s) => new Map([...A].map(([k, m]) => [k, { ...m, c: m.c * s }]));
function mulP(A, B) {
  let out = new Map();
  for (const a of A.values()) {
    for (const b of B.values()) {
      const f = new Map();
      for (const x of [...a.f, ...b.f]) {
        const key = atomKey(x.t);
        const cur = f.get(key) || { t: x.t, e: 0 };
        cur.e += x.e;
        f.set(key, cur);
      }
      const fs = [...f.values()].filter((x) => x.e !== 0);
      out = addP(out, new Map([[monoKey(fs), { c: a.c * b.c, f: fs }]]));
    }
  }
  return out;
}
const constOf = (A) => (A.size === 0 ? 0 : A.size === 1 && A.has('1') ? A.get('1').c : null);

function readLeanModel(src) {
  const d = readDecl(src);
  const m = { name: d.name, doc: d.doc, goalComment: d.goalComment, leanPoints: [], reals: new Set(), hyps: [], errors: [], notes: [] };
  const hypOf = (node, extra) => m.hyps.push({ node, ...extra });
  const bind = (names, type, extra) => {
    if (!type) throw new LeanError(H(`חסר הטיפוס של ${names.join(' ')}`, `${names.join(' ')} has no type`), extra.line);
    if (isPointType(type)) m.leanPoints.push(...names);
    else if (isRealType(type)) names.forEach((n) => m.reals.add(n));
    else if (type.k === 'id' && /^(ℕ|ℤ|ℚ|ℂ|Nat|Int|Rat|Prop|Type)$/.test(type.v)) {
      m.errors.push({ line: extra.line, src: extra.src, msg: H(`משתנים מסוג ${type.v} לא נתמכים`, `Variables of type ${type.v} are not supported`) });
    } else hypOf(type, extra);
  };
  for (const b of d.binders) bind(b.names, b.type, { line: b.line, src: b.src, comment: b.comment });
  let g = d.goal;
  for (;;) {
    if (g.k === 'forall') { for (const b of g.binders) bind(b.names, b.type, { line: d.goalLine, src: '' }); g = g.body; continue; }
    if (g.k === 'bin' && g.op === '→') { hypOf(g.a, { line: d.goalLine, src: src.slice(g.a.s, g.a.e) }); g = g.b; continue; }
    break;
  }
  m.goalNode = g;
  m.goalSrc = src.slice(g.s, g.e);
  m.goalLine = d.goalLine;

  // point names: one capital letter each, as on the site
  const letters = new Map();
  const used = new Set(m.leanPoints.filter((n) => /^[A-Z]$/.test(n)));
  for (const n of m.leanPoints) {
    if (letters.has(n)) continue;
    if (/^[A-Z]$/.test(n)) { letters.set(n, n); continue; }
    const L = /^[A-Z]/.test(n) && !used.has(n[0]) ? n[0] : LETTERS.find((x) => !used.has(x));
    if (!L) throw new LeanError(H('יש יותר מ-26 נקודות', 'More than 26 points'), null);
    used.add(L);
    letters.set(n, L);
    m.notes.push(H(`הנקודה ${n} נקראת באתר ${L}`, `Point ${n} is called ${L} on the site`));
  }
  m.letters = letters;
  m.names = [...new Set(letters.values())];
  if (m.names.length < 2) throw new LeanError(H('המשפט צריך לפחות שתי נקודות מסוג Point', 'The theorem needs at least two variables of type Point'), null);

  const show = (node) => (node && node.s != null ? src.slice(node.s, node.e) : '…');
  const fail = (he1, en1) => { throw new FactError(H(he1, en1)); };
  const pt = (node) => {
    if (node.k !== 'id' || !letters.has(node.v)) fail(`"${show(node)}" אינה נקודה`, `"${show(node)}" is not a point`);
    return letters.get(node.v);
  };
  const realVar = (node) => {
    if (node.k !== 'id' || !m.reals.has(node.v)) fail(`"${show(node)}" אינו משתנה ממשי`, `"${show(node)}" is not a real variable`);
    return node.v;
  };
  const args = (node, n, what) => {
    if (node.args.length !== n) fail(`${what} צריך ${n} נקודות`, `${what} takes ${n} points`);
    return node.args.map(pt);
  };

  function poly(node, st) {
    switch (node.k) {
      case 'num': return cst(node.v);
      case 'pi': return cst(Math.PI);
      case 'neg': return scaleP(poly(node.a, st), -1);
      case 'id': {
        const n = short(node.v);
        if (n === 'pi') return cst(Math.PI);
        if (m.reals.has(node.v)) return atomP({ kind: 'var', name: node.v });
        if (letters.has(node.v)) return fail(`הנקודה ${node.v} אינה מספר`, `Point ${node.v} is not a number`);
        return fail(`השם "${node.v}" לא מוכר`, `Unknown name "${node.v}"`);
      }
      case 'bin': {
        const a = poly(node.a, st);
        if (node.op === '^') {
          const n = constOf(poly(node.b, st));
          if (n == null || !Number.isInteger(n) || Math.abs(n) > 4) fail(`חזקה ${show(node.b)} לא נתמכת`, `The power ${show(node.b)} is not supported`);
          let out = cst(1);
          for (let i = 0; i < Math.abs(n); i++) out = mulP(out, a);
          if (n >= 0) return out;
          return divP(cst(1), out, node);
        }
        const b = poly(node.b, st);
        if (node.op === '+') return addP(a, b);
        if (node.op === '-') return addP(a, b, -1);
        if (node.op === '*') return mulP(a, b);
        if (node.op === '/') return divP(a, b, node);
        return fail(`הפעולה ${node.op} לא נתמכת בתוך ביטוי`, `The operation ${node.op} is not supported inside an expression`);
      }
      case 'app': {
        const f = short(node.f);
        if (f === 'len' || f === 'dist') { const [A, B] = args(node, 2, f); return atomP({ kind: 'seg', p: [A, B] }); }
        if (f === 'ang') { const P = args(node, 3, 'ang'); return atomP({ kind: 'ang', p: P }); }
        if (f === 'area') { const P = args(node, 3, 'area'); return atomP({ kind: 'area', p: P }); }
        if (f === '∠' || f === 'angle') { st.rad = true; const P = args(node, 3, '∠'); return scaleP(atomP({ kind: 'ang', p: P }), Math.PI / 180); }
        const trig = { sinD: ['sin', 'deg'], cosD: ['cos', 'deg'], tanD: ['tan', 'deg'], sin: ['sin', 'rad'], cos: ['cos', 'rad'], tan: ['tan', 'rad'] }[f];
        if (trig) {
          if (node.args.length !== 1) fail(`${f} מקבל ערך אחד`, `${f} takes one value`);
          const inner = poly(node.args[0], { rad: false });
          const v = constOf(inner);
          if (v != null) return cst(Math[trig[0]](trig[1] === 'deg' ? (v * Math.PI) / 180 : v));
          const unit = trig[1] === 'deg' ? 1 : Math.PI / 180;
          const only = inner.size === 1 ? [...inner.values()][0] : null;
          if (only && only.f.length === 1 && only.f[0].e === 1 && only.f[0].t.kind === 'ang' && Math.abs(only.c - unit) < 1e-12) {
            return atomP({ kind: 'trig', fn: trig[0], a: only.f[0].t });
          }
          return fail(`${f} של "${show(node.args[0])}" לא נתמך: רק של זווית אחת`, `${f} of "${show(node.args[0])}" is not supported: only of one angle`);
        }
        if (f === 'sqrt') {
          const v = constOf(poly(node.args[0], st));
          if (v == null || v < 0 || node.args.length !== 1) fail(`שורש של "${show(node.args[0])}" לא נתמך: רק של מספר`, `A square root of "${show(node.args[0])}" is not supported: only of a number`);
          return cst(Math.sqrt(v));
        }
        return fail(`הפונקציה ${node.f} לא נתמכת`, `The function ${node.f} is not supported`);
      }
      default: return fail(`"${show(node)}" לא נתמך בתוך ביטוי`, `"${show(node)}" is not supported inside an expression`);
    }
  }
  function divP(a, b, node) {
    const v = constOf(b);
    if (v != null) {
      if (Math.abs(v) < EPS) fail('חילוק באפס', 'Division by zero');
      return scaleP(a, 1 / v);
    }
    if (b.size !== 1) fail(`חילוק בסכום (${show(node.b)}) לא נתמך`, `Dividing by a sum (${show(node.b)}) is not supported`);
    const mono = [...b.values()][0];
    return mulP(a, new Map([[monoKey(mono.f.map((x) => ({ ...x, e: -x.e }))), { c: 1 / mono.c, f: mono.f.map((x) => ({ ...x, e: -x.e })) }]]));
  }

  function claimOfRel(node) {
    const op = node.op;
    if (op === '≤' || op === '≥') fail('האתר עוד לא מכיר ≤ ו-≥: כתבו < או >', 'The site has no ≤ or ≥ yet: write < or >');
    const st = { rad: false };
    let L = poly(node.a, st);
    let R = poly(node.b, st);
    if (st.rad) { L = scaleP(L, 180 / Math.PI); R = scaleP(R, 180 / Math.PI); }
    const all = [...L.values(), ...R.values()];
    if (all.some((x) => x.f.some((y) => y.t.kind === 'var'))) fail('משתנה ממשי בתוך טענה לא נתמך', 'A real variable inside a claim is not supported');
    const of = all.some((x) => x.f.some((y) => y.t.kind === 'ang')) ? 'ang' : 'len';
    const side = (P) => ({
      terms: [...P].filter(([k]) => k !== '1').map(([, x]) => ({ c: x.c, t: x.f.length === 1 && x.f[0].e === 1 ? x.f[0].t : { kind: 'mono', f: x.f } })),
      k: P.has('1') ? P.get('1').c : 0,
    });
    const c = { type: op === '=' ? 'eq' : 'ineq', op, L: side(L), R: side(R), of };
    return checked(schoolOfClaim(c));
  }
  function checked(s) {
    const r = parseClaim(s, m.names);
    if (!r.ok) fail(`אי אפשר לכתוב את זה בכתיב של האתר (${s}): ${r.error.key}`, `This can't be written in the site's notation (${s}): ${r.error.key}`);
    return { kind: 'claim', claim: s, parsed: r.claim };
  }

  // one hypothesis (or the goal) → items
  function facts(node) {
    if (node.k === 'bin' && node.op === '∧') return [...facts(node.a), ...facts(node.b)];
    if (node.k === 'app') {
      const f = short(node.f);
      if (f === 'Sbtw' || f === 'Wbtw') {
        if (node.args.length !== 4 || node.args[0].k !== 'R') fail(`${f} צריך ℝ ושלוש נקודות`, `${f} takes ℝ and three points`);
        const [a, o, b] = node.args.slice(1).map(pt);
        if (f === 'Wbtw') m.notes.push(H(`Wbtw ${a} ${o} ${b} נקרא כמו Sbtw: ${o} בין ${a} ל-${b}`, `Wbtw ${a} ${o} ${b} is read as Sbtw: ${o} strictly between ${a} and ${b}`));
        return [{ kind: 'between', a, o, b }];
      }
      if (f === 'IsTangent') {
        if (node.args.length !== 4) fail('IsTangent צריך שלוש נקודות ורדיוס', 'IsTangent takes three points and a radius');
        const [p, t, o] = node.args.slice(0, 3).map(pt);
        return [{ kind: 'tangent', p, t, o, r: realVar(node.args[3]) }];
      }
      if (f === '.SSameSide' || f === '.SOppSide') {
        const [ln, ...rest] = node.args;
        if (ln.k !== 'line' || rest.length !== 2) fail(`${f.slice(1)} צריך ישר line[ℝ, A, B] ושתי נקודות`, `${f.slice(1)} takes a line line[ℝ, A, B] and two points`);
        const [p, q, a, b] = [ln.a, ln.b, ...rest].map(pt);
        return [{ kind: 'side', p, q, a, b, same: f === '.SSameSide' }];
      }
      if (f === 'IsMidpoint') { const [M, A, B] = args(node, 3, 'IsMidpoint'); return [{ kind: 'mid', m: M, a: A, b: B }]; }
      if (f === 'IsTriangle') return [{ kind: 'tri', P: args(node, 3, 'IsTriangle') }];
      if (f === 'Cong' || f === 'Sim') { const P = args(node, 6, f); return [checked(`△${P.slice(0, 3).join('')} ${f === 'Cong' ? '≅' : '∼'} △${P.slice(3).join('')}`)]; }
      if (f === 'Par' || f === 'Perp') { const P = args(node, 4, f); return [checked(`${P[0]}${P[1]} ${f === 'Par' ? '∥' : '⊥'} ${P[2]}${P[3]}`)]; }
      if (LEAN_QUAD[f]) { const P = args(node, 4, f); return [checked(`${P.join('')} ${QUADS[LEAN_QUAD[f]].he}`)]; }
      return fail(`${node.f} לא נתמך`, `${node.f} is not supported`);
    }
    if (node.k === 'not' && node.a.k === 'app' && short(node.a.f) === 'Collinear' && node.a.args.length === 2 && node.a.args[1].k === 'set' && node.a.args[1].items.length === 3) {
      return [{ kind: 'tri', P: node.a.args[1].items.map(pt) }];
    }
    if (node.k === 'bin' && node.op === '≠') return [{ kind: 'skip' }];
    if (node.k === 'bin' && REL.has(node.op)) {
      // a point on a circle: len O X = r
      const sides = [[node.a, node.b], [node.b, node.a]];
      for (const [x, y] of sides) {
        if (node.op === '=' && x.k === 'id' && m.reals.has(x.v) && y.k === 'app' && ['len', 'dist'].includes(short(y.f)) && y.args.length === 2) {
          const [o, p] = y.args.map(pt);
          return [{ kind: 'circle', r: x.v, o, p }];
        }
      }
      // a fact about the real variables alone, such as 0 < r
      const vars = (n) => (n.k === 'id' ? m.reals.has(n.v) : n.k === 'num' || n.k === 'pi' || (n.k === 'neg' && vars(n.a)) || (n.k === 'bin' && vars(n.a) && vars(n.b)));
      if (vars(node.a) && vars(node.b)) return [{ kind: 'skip' }];
      return [claimOfRel(node)];
    }
    return fail(`"${show(node)}" לא נתמך`, `"${show(node)}" is not supported`);
  }

  m.items = [];
  for (const h of m.hyps) {
    try {
      for (const it of facts(h.node)) m.items.push({ ...it, src: h.src || show(h.node), line: h.line, comment: h.comment || '' });
    } catch (e) {
      if (!(e instanceof FactError)) throw e;
      m.errors.push({ line: h.line, src: h.src || show(h.node), msg: e.msg });
    }
  }
  try {
    const gs = facts(g).filter((x) => x.kind !== 'skip');
    if (gs.length !== 1 || !['claim', 'mid'].includes(gs[0].kind)) fail('המסקנה צריכה להיות טענה אחת שהאתר מכיר (לא עובדה מהשרטוט)', 'The goal must be one claim the site knows (not a diagram fact)');
    m.goal = gs[0].kind === 'mid' ? checked(`${gs[0].a}${gs[0].m} = ${gs[0].m}${gs[0].b}`) : gs[0];
  } catch (e) {
    if (!(e instanceof FactError)) throw e;
    m.errors.push({ line: m.goalLine, src: m.goalSrc, msg: e.msg, goal: true });
  }
  return m;
}

// The model the drawing and the words are made from.
function buildModel(m) {
  const between = [];
  const circles = new Map(); // radius variable → { o, on: [] }
  const tangents = [];
  const triangles = [];
  const givens = [];
  const sides = [];
  const addCircle = (r, o, p, it) => {
    if (!circles.has(r)) circles.set(r, { o, on: [] });
    const c = circles.get(r);
    if (c.o !== o) m.errors.push({ line: it.line, src: it.src, msg: H(`לרדיוס ${r} יש שני מרכזים, ${c.o} ו-${o}`, `Radius ${r} has two centers, ${c.o} and ${o}`) });
    else if (p === o) m.errors.push({ line: it.line, src: it.src, msg: H('מרכז המעגל אינו על המעגל', 'The center is not on the circle') });
    else if (!c.on.includes(p)) c.on.push(p);
  };
  for (const it of m.items) {
    switch (it.kind) {
      case 'between': between.push({ a: it.a, o: it.o, b: it.b }); break;
      case 'circle': addCircle(it.r, it.o, it.p, it); break;
      case 'tangent': tangents.push({ p: it.p, t: it.t, o: it.o }); addCircle(it.r, it.o, it.t, it); break;
      case 'tri': triangles.push(it.P); break;
      case 'side': sides.push({ p: it.p, q: it.q, a: it.a, b: it.b, same: it.same }); break;
      case 'mid': {
        between.push({ a: it.a, o: it.m, b: it.b });
        const r = parseClaim(`${it.a}${it.m} = ${it.m}${it.b}`, m.names);
        givens.push({ claim: `${it.a}${it.m} = ${it.m}${it.b}`, parsed: r.claim, wording: `${it.m} אמצע ${it.a}${it.b}`, comment: it.comment, src: it.src });
        break;
      }
      case 'claim': givens.push({ claim: it.claim, parsed: it.parsed, comment: it.comment, src: it.src }); break;
      default: break;
    }
  }
  return {
    names: m.names, between, circles: [...circles.values()].filter((c) => c.on.length), tangents, triangles, givens, sides,
    goal: m.goal || null, ask: /חשב|מצא|find|compute|calculate/i.test(m.goalComment || ''),
  };
}

// ---------------------------------------------------------------- the drawing

const sub = (P, R) => [P[0] - R[0], P[1] - R[1]];
const dot = (u, v) => u[0] * v[0] + u[1] * v[1];
const crs = (u, v) => u[0] * v[1] - u[1] * v[0];
const norm = (u) => Math.hypot(u[0], u[1]);
const hinge = (v) => (v > 0 ? v : 0);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Points that the position facts put on one line: sets of points, merged when they share two.
function lineSets(between) {
  const lines = [];
  for (const { a, o, b } of between) {
    const pts = [a, o, b];
    let L = lines.find((x) => pts.filter((p) => x.pts.has(p)).length >= 2);
    if (!L) { L = { pts: new Set(), first: { a, b } }; lines.push(L); }
    pts.forEach((p) => L.pts.add(p));
  }
  for (let merged = true; merged;) {
    merged = false;
    for (let i = 0; i < lines.length && !merged; i++) {
      for (let j = i + 1; j < lines.length && !merged; j++) {
        if ([...lines[j].pts].filter((p) => lines[i].pts.has(p)).length >= 2) {
          lines[j].pts.forEach((p) => lines[i].pts.add(p));
          lines.splice(j, 1);
          merged = true;
        }
      }
    }
  }
  return lines;
}

// Each line's points in order along it, its two ends and the points inside it.
function orderLines(lines, pos) {
  for (const L of lines) {
    const arr = [...L.pts];
    const u = sub(pos[arr[1]], pos[arr[0]]);
    let seq = arr.sort((x, y) => dot(sub(pos[x], pos[arr[0]]), u) - dot(sub(pos[y], pos[arr[0]]), u));
    if (seq.indexOf(L.first.a) > seq.indexOf(L.first.b)) seq = seq.reverse();
    L.seq = seq;
    L.ends = [seq[0], seq[seq.length - 1]];
    L.inner = seq.slice(1, -1);
  }
  return lines;
}

const claimTerms = (c) => {
  const out = [];
  const walk = (t) => { if (t.kind === 'mono') t.f.forEach((x) => walk(x.t)); else if (t.kind === 'trig') walk(t.a); else out.push(t); };
  if (c.L) [...c.L.terms, ...c.R.terms].forEach((x) => walk(x.t));
  return out;
};

function shapes(model, lines) {
  const onOneLine = (pts) => lines.some((L) => pts.every((p) => L.pts.has(p)));
  const triples = [];
  const addTri = (P) => { if (new Set(P).size === 3 && !onOneLine(P)) triples.push(P); };
  const quads = [];
  const legs = [];
  for (const T of model.triangles) [0, 1, 2].forEach((i) => addTri([T[(i + 1) % 3], T[i], T[(i + 2) % 3]]));
  for (const c of [...model.givens.map((g) => g.parsed), model.goal && model.goal.parsed].filter(Boolean)) {
    if (c.type === 'cong' || c.type === 'sim') for (const T of [c.P, c.Q]) [0, 1, 2].forEach((i) => addTri([T[(i + 1) % 3], T[i], T[(i + 2) % 3]]));
    if (c.type === 'quad') {
      quads.push(c.P);
      // Lean's trapezoid has legs that are not parallel (else it is a parallelogram)
      if (c.kind === 'trapezoid' || c.kind === 'isoTrapezoid') legs.push([[c.P[0], c.P[3]], [c.P[1], c.P[2]]]);
    }
    for (const t of claimTerms(c)) {
      // a triangle whose area the question names is a real triangle
      if (t.kind === 'area') [0, 1, 2].forEach((i) => addTri([t.p[(i + 1) % 3], t.p[i], t.p[(i + 2) % 3]]));
      if (t.kind !== 'ang') continue;
      // an angle the question sets to 0° or 180° may be flat
      const flat = c.type === 'eq' && c.left && c.left.kind === 'ang' && c.right && c.right.kind === 'num' && (Math.abs(c.right.v) < 1e-9 || Math.abs(c.right.v - 180) < 1e-9);
      if (!flat) addTri(t.p);
    }
  }
  return { triples, quads, legs };
}

const W_EX = 100; // exact facts: on a line, on a circle, tangent
const W_HG = 10; // shape: points apart, triangles not flat
const D_MIN = 0.8;
const S_MIN = 0.17; // sin of about 10°
const T_MIN = 0.12;

function makeResiduals(model, sh, names) {
  const idx = Object.fromEntries(names.map((n, i) => [n, i]));
  const at = (x, n) => [x[2 * idx[n]], x[2 * idx[n] + 1]];
  const claims = [...model.givens.map((g) => g.parsed), ...(model.useGoal && model.goal ? [model.goal.parsed] : [])].filter(Boolean);
  return (x, scale) => {
    const pos = {};
    for (const n of names) pos[n] = at(x, n);
    const r = [];
    for (const { a, o, b } of model.between) {
      const u = sub(pos[b], pos[a]);
      const L = norm(u) || 1e-9;
      r.push(W_EX * crs(u, sub(pos[o], pos[a])) / L);
      const t = dot(sub(pos[o], pos[a]), u) / (L * L);
      r.push(W_HG * hinge(T_MIN - t), W_HG * hinge(t - 1 + T_MIN));
    }
    for (const c of model.circles) {
      const R = Math.hypot(...sub(pos[c.on[0]], pos[c.o]));
      for (const p of c.on.slice(1)) r.push(W_EX * (Math.hypot(...sub(pos[p], pos[c.o])) - R));
      r.push(W_HG * hinge(1.2 - R));
    }
    for (const t of model.tangents) {
      const u = sub(pos[t.o], pos[t.t]); const v = sub(pos[t.p], pos[t.t]);
      r.push(W_EX * dot(u, v) / ((norm(u) * norm(v)) || 1e-9));
    }
    for (const s of model.sides || []) {
      const u = sub(pos[s.q], pos[s.p]);
      const L = norm(u) || 1e-9;
      const da = crs(u, sub(pos[s.a], pos[s.p])) / L; const db = crs(u, sub(pos[s.b], pos[s.p])) / L;
      r.push(W_HG * hinge(0.09 - (s.same ? da * db : -da * db)));
    }
    for (const c of claims) {
      const e = Q.claimErrors(c, pos, scale);
      if (e) for (const { v, tol } of e) r.push(v / tol);
    }
    for (let i = 0; i < names.length; i++) {
      // points apart, and none run off: far away, relative tolerances hide real errors
      r.push(W_HG * hinge(norm(pos[names[i]]) - 15));
      for (let j = i + 1; j < names.length; j++) r.push(W_HG * hinge(D_MIN - Math.hypot(...sub(pos[names[i]], pos[names[j]]))));
    }
    for (const [X, V, Y] of sh.triples) {
      const u = sub(pos[X], pos[V]); const v = sub(pos[Y], pos[V]);
      r.push(W_HG * hinge(S_MIN - Math.abs(crs(u, v)) / ((norm(u) * norm(v)) || 1e-9)));
    }
    for (const P of sh.quads) {
      const s = [0, 1, 2, 3].map((i) => {
        const A = pos[P[i]]; const B = pos[P[(i + 1) % 4]]; const C = pos[P[(i + 2) % 4]];
        const u = sub(B, A); const v = sub(C, B);
        return crs(u, v) / ((norm(u) * norm(v)) || 1e-9);
      });
      const sign = s.reduce((a, b) => a + b, 0) >= 0 ? 1 : -1;
      s.forEach((v) => r.push(W_HG * hinge(S_MIN - sign * v)));
    }
    for (const [[a, b], [c, d]] of sh.legs) {
      const u = sub(pos[b], pos[a]); const v = sub(pos[d], pos[c]);
      r.push(W_HG * hinge(S_MIN - Math.abs(crs(u, v)) / ((norm(u) * norm(v)) || 1e-9)));
    }
    return r;
  };
}

function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

// Levenberg–Marquardt, to residuals of zero.
function lm(x0, f, iterations = 250) {
  let x = [...x0];
  let r = f(x);
  let F = r.reduce((s, v) => s + v * v, 0);
  let mu = 1e-3;
  const n = x.length;
  for (let it = 0; it < iterations && F > 1e-24; it++) {
    const J = [];
    for (let k = 0; k < n; k++) {
      const h = 1e-7 * Math.max(1, Math.abs(x[k]));
      const xp = [...x]; xp[k] += h;
      const rp = f(xp);
      J.push(rp.map((v, i) => (v - r[i]) / h));
    }
    const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => { let s = 0; for (let k = 0; k < r.length; k++) s += J[i][k] * J[j][k]; return s; }));
    const g = Array.from({ length: n }, (_, i) => { let s = 0; for (let k = 0; k < r.length; k++) s += J[i][k] * r[k]; return -s; });
    let improved = false;
    for (let tries = 0; tries < 10 && !improved; tries++) {
      const Am = A.map((row, i) => row.map((v, j) => (i === j ? v + mu * (v + 1e-9) : v)));
      const step = solveLinear(Am, g);
      if (!step) { mu *= 10; continue; }
      const xn = x.map((v, k) => v + step[k]);
      const rn = f(xn);
      const Fn = rn.reduce((s, v) => s + v * v, 0);
      if (Fn < F) { x = xn; r = rn; F = Fn; mu = Math.max(mu / 4, 1e-12); improved = true; } else mu *= 4;
    }
    if (!improved) break;
  }
  return { x, r, F };
}

function initial(model, names, rnd) {
  const pos = {};
  for (const n of names) pos[n] = [rnd() * 8 - 4, rnd() * 8 - 4];
  for (const c of model.circles) {
    const R = 2 + rnd() * 1.5;
    for (const p of c.on) { const th = rnd() * 2 * Math.PI; pos[p] = [pos[c.o][0] + R * Math.cos(th), pos[c.o][1] + R * Math.sin(th)]; }
  }
  for (const t of model.tangents) {
    const u = sub(pos[t.t], pos[t.o]);
    const s = (rnd() < 0.5 ? -1 : 1) * (1 + rnd());
    pos[t.p] = [pos[t.t][0] - u[1] * s, pos[t.t][1] + u[0] * s];
  }
  const ts = model.between.map(() => 0.3 + 0.4 * rnd());
  for (let pass = 0; pass < 3; pass++) {
    model.between.forEach(({ a, o, b }, i) => { pos[o] = [pos[a][0] + ts[i] * (pos[b][0] - pos[a][0]), pos[a][1] + ts[i] * (pos[b][1] - pos[a][1])]; });
  }
  return names.flatMap((n) => pos[n]);
}

const toPos = (x, names) => Object.fromEntries(names.map((n, i) => [n, [x[2 * i], x[2 * i + 1]]]));

function quality(pos, names, sh) {
  const xs = names.map((n) => pos[n]);
  const diam = Math.max(1e-9, ...xs.flatMap((p) => xs.map((q) => Math.hypot(...sub(p, q)))));
  let q = Infinity;
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) q = Math.min(q, Math.hypot(...sub(xs[i], xs[j])) / diam * 3);
  for (const [X, V, Y] of sh.triples) {
    const u = sub(pos[X], pos[V]); const v = sub(pos[Y], pos[V]);
    q = Math.min(q, Math.abs(crs(u, v)) / ((norm(u) * norm(v)) || 1e-9) * 2);
  }
  return q;
}

// A drawing whose coordinates make every position fact and every given true.
function layout(model, { seed = 7, restarts = 40 } = {}) {
  const names = model.names;
  const lines = lineSets(model.between);
  const sh = shapes(model, lines);
  const found = [];
  const rnd = rng(seed);
  const givensParsed = model.givens.map((g) => g.parsed);
  // first without the goal: a drawing where the givens hold and the goal doesn't is a
  // counterexample. Then, if needed, with the goal, so the question gets a drawing that fits it.
  let counter = null;
  for (const useGoal of [false, true]) {
    if (useGoal && !counter) break;
    const f = makeResiduals({ ...model, useGoal }, sh, names);
    for (let k = 0; k < restarts && found.filter((x) => x.goalHolds !== false).length < 3; k++) {
      const x0 = initial(model, names, rnd);
      const { scale } = Q.drawingScale(givensParsed, toPos(x0, names));
      const res = lm(x0, (x) => f(x, scale));
      if (Math.max(0, ...res.r.map(Math.abs)) > 1e-6) continue;
      const pos = toPos(res.x, names);
      const sc = Q.drawingScale(givensParsed, pos).scale;
      if (givensParsed.some((c) => Q.holds(c, pos, sc) === false)) continue;
      const goalHolds = model.goal ? Q.holds(model.goal.parsed, pos, sc) : null;
      if (goalHolds === false) { counter = counter || pos; if (found.length > 6) break; }
      found.push({ pos, goalHolds, q: quality(pos, names, sh) });
    }
  }
  if (!found.length) return null;
  const pick = found.filter((f) => f.goalHolds !== false).sort((a, b) => b.q - a.q)[0] || found.sort((a, b) => b.q - a.q)[0];
  return { ...pick, counter, lines, sh };
}

// Turn the figure so it reads like a textbook drawing, and fit it to the editor's canvas.
function normalize(pos, model, lines, segs) {
  const names = Object.keys(pos);
  let base = null;
  const cs = [...model.givens.map((g) => g.parsed), model.goal && model.goal.parsed].filter(Boolean);
  const tri = model.triangles[0] || (cs.find((c) => c.type === 'cong' || c.type === 'sim') || {}).P;
  const quad = (cs.find((c) => c.type === 'quad') || {}).P;
  if (tri) base = { a: tri[1], b: tri[2], up: tri[0] };
  else if (quad) base = { a: quad[0], b: quad[1], up: quad[2] };
  else {
    // the longest line of the position facts, else the longest segment; the farthest point up
    const len = (s) => Math.hypot(...sub(pos[s[1]], pos[s[0]]));
    const s = lines.map((L) => L.ends).sort((x, y) => len(y) - len(x))[0] || [...segs].sort((x, y) => len(y) - len(x))[0];
    if (s) {
      const off = (n) => Math.abs(crs(sub(pos[s[1]], pos[s[0]]), sub(pos[n], pos[s[0]])));
      base = { a: s[0], b: s[1], up: names.filter((n) => n !== s[0] && n !== s[1]).sort((x, y) => off(y) - off(x))[0] };
    }
  }
  let out = { ...pos };
  if (base) {
    const u = sub(pos[base.b], pos[base.a]);
    const th = -Math.atan2(u[1], u[0]);
    const [c, s] = [Math.cos(th), Math.sin(th)];
    out = Object.fromEntries(names.map((n) => { const p = sub(pos[n], pos[base.a]); return [n, [c * p[0] - s * p[1], s * p[0] + c * p[1]]]; }));
    if (base.up && out[base.up][1] < 0) out = Object.fromEntries(names.map((n) => [n, [out[n][0], -out[n][1]]]));
  }
  const xs = names.map((n) => out[n][0]); const ys = names.map((n) => out[n][1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // circles stick out of their points: leave room for them
  let pad = 0;
  for (const c of model.circles) pad = Math.max(pad, Math.hypot(...sub(out[c.on[0]], out[c.o])));
  const bx0 = Math.min(x0, ...model.circles.map((c) => out[c.o][0] - pad));
  const bx1 = Math.max(x1, ...model.circles.map((c) => out[c.o][0] + pad));
  const by0 = Math.min(y0, ...model.circles.map((c) => out[c.o][1] - pad));
  const by1 = Math.max(y1, ...model.circles.map((c) => out[c.o][1] + pad));
  const k = Math.min(13 / Math.max(bx1 - bx0, 1e-9), 8.6 / Math.max(by1 - by0, 1e-9));
  const cx = (bx0 + bx1) / 2; const cy = (by0 + by1) / 2;
  return Object.fromEntries(names.map((n) => [n, [(out[n][0] - cx) * k, (out[n][1] - cy) * k]]));
}

// qparse's drawing model: points (on a segment, at a crossing or on a circle when the facts say
// so, so dragging keeps them there), the segments the question talks about and the circles.
function toDrawing(model, pos, lines) {
  const names = model.names;
  const diam = Math.max(...names.flatMap((a) => names.map((b) => Math.hypot(...sub(pos[a], pos[b])))));
  const onCircle = new Map();
  for (const c of model.circles) for (const p of c.on.slice(1)) onCircle.set(p, { o: c.o, r: c.on[0] });
  const tangentPts = new Set(model.tangents.map((t) => t.t));
  const cons = {};
  for (const n of names) {
    const ls = lines.filter((L) => L.inner.includes(n));
    if (ls.length === 1 && !onCircle.has(n)) {
      const [a, b] = ls[0].ends; const u = sub(pos[b], pos[a]);
      cons[n] = { k: 'seg', a, b, t: dot(sub(pos[n], pos[a]), u) / dot(u, u) };
    } else if (ls.length >= 2 && !onCircle.has(n)) {
      cons[n] = { k: 'x', a: ls[0].ends[0], b: ls[0].ends[1], c: ls[1].ends[0], d: ls[1].ends[1] };
    } else if (!ls.length && onCircle.has(n) && !tangentPts.has(n)) {
      const { o, r } = onCircle.get(n);
      cons[n] = { k: 'circ', o, r, th: Math.atan2(pos[n][1] - pos[o][1], pos[n][0] - pos[o][0]) };
    }
  }
  const deps = (n) => { const c = cons[n]; return !c ? [] : c.k === 'seg' ? [c.a, c.b] : c.k === 'x' ? [c.a, c.b, c.c, c.d] : [c.o, c.r]; };
  const build = () => {
    const order = []; const done = new Set();
    while (order.length < names.length) {
      const n = names.find((x) => !done.has(x) && deps(x).every((d) => done.has(d)));
      if (n) { order.push(n); done.add(n); continue; }
      const stuck = names.find((x) => !done.has(x) && cons[x]); // a cycle: that point stays free
      delete cons[stuck];
    }
    return order.map((n) => ({ id: n, x: pos[n][0], y: pos[n][1], c: cons[n] ? { ...cons[n] } : null }));
  };
  let pts = build();
  for (let round = 0; round < names.length; round++) {
    const back = Q.solveDrawing({ pts });
    const bad = pts.find((p) => p.c && Math.hypot(...sub(back[p.id], pos[p.id])) > 1e-7 * diam);
    if (!bad) break;
    delete cons[bad.id];
    pts = build();
  }
  // segments: each line end to end, then what the claims name
  const segs = lines.map((L) => [...L.ends]);
  const has = new Set(segs.map((s) => [...s].sort().join('')));
  const addSeg = (a, b) => {
    if (a === b || lines.some((L) => L.pts.has(a) && L.pts.has(b))) return;
    const k = [a, b].sort().join('');
    if (!has.has(k)) { has.add(k); segs.push([a, b]); }
  };
  for (const c of [...model.givens.map((g) => g.parsed), model.goal && model.goal.parsed].filter(Boolean)) {
    if (c.type === 'par' || c.type === 'perp') { addSeg(...c.a); addSeg(...c.b); }
    if (c.type === 'cong' || c.type === 'sim') for (const T of [c.P, c.Q]) { addSeg(T[0], T[1]); addSeg(T[1], T[2]); addSeg(T[2], T[0]); }
    if (c.type === 'quad') [0, 1, 2, 3].forEach((i) => addSeg(c.P[i], c.P[(i + 1) % 4]));
    for (const t of claimTerms(c)) {
      if (t.kind === 'seg') addSeg(...t.p);
      if (t.kind === 'ang') { addSeg(t.p[1], t.p[0]); addSeg(t.p[1], t.p[2]); }
      if (t.kind === 'area') { addSeg(t.p[0], t.p[1]); addSeg(t.p[1], t.p[2]); addSeg(t.p[2], t.p[0]); }
    }
  }
  for (const T of model.triangles) { addSeg(T[0], T[1]); addSeg(T[1], T[2]); addSeg(T[2], T[0]); }
  for (const t of model.tangents) addSeg(t.p, t.t);
  return { pts, segs, circs: model.circles.map((c) => ({ o: c.o, r: c.on[0] })) };
}

// ---------------------------------------------------------------- the words

const keyIn = (c, ctx) => { const r = parseClaim(Q.canonClaim(c), ctx); return r.ok ? claimKey(r.claim) : null; };
const listHe = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ו-${xs[xs.length - 1]}`);

// The nicer wording of a given, read off the drawing: "M אמצע BC", "AD חוצה את ∢BAC".
function wordingOf(g, pos) {
  const c = g.parsed;
  if (g.wording) return g.wording;
  if (c.type !== 'eq' || !c.left || !c.right) return null;
  const strictly = (a, o, b) => Math.abs(crs(sub(pos[b], pos[a]), sub(pos[o], pos[a]))) < 1e-7 * Math.hypot(...sub(pos[b], pos[a])) ** 2
    && dot(sub(pos[a], pos[o]), sub(pos[b], pos[o])) < 0;
  if (c.left.kind === 'seg' && c.right.kind === 'seg') {
    const [P, R] = [c.left.p, c.right.p];
    const M = P.find((x) => R.includes(x));
    const X = P.find((x) => x !== M); const Y = R.find((x) => x !== M);
    if (M && X && Y && X !== Y && strictly(X, M, Y)) return { text: `${M} אמצע ${X}${Y}`, mid: { m: M, a: X, b: Y } };
  }
  if (c.left.kind === 'ang' && c.right.kind === 'ang' && c.left.p[1] === c.right.p[1]) {
    const V = c.left.p[1];
    const a1 = [c.left.p[0], c.left.p[2]]; const a2 = [c.right.p[0], c.right.p[2]];
    const D = a1.find((x) => a2.includes(x));
    const X = a1.find((x) => x !== D); const Y = a2.find((x) => x !== D);
    if (D && X && Y && X !== Y) {
      const whole = Q.angDeg(pos, X, V, Y);
      if (whole < 179 && Math.abs(Q.angDeg(pos, X, V, D) + Q.angDeg(pos, D, V, Y) - whole) < 1e-6) return { text: `${V}${D} חוצה את ∢${X}${V}${Y}` };
    }
  }
  return null;
}

// A wording the teacher wrote (it came back in a Lean comment), used when the reader agrees it
// says exactly this claim.
function commentWording(g, pos, segs) {
  const m = /^\s*נתון\s*:\s*(.+)$/.exec(g.comment || '');
  if (!m) return null;
  const words = m[1].trim().replace(/[.]+$/, '');
  if (!words || /[,;]/.test(words)) return null;
  const parsed = Q.parseText(`נתון: ${words}.`, { pos, segs });
  const ctx = Q.claimContext(pos);
  if (parsed.unknown.length || parsed.givens.length !== 1 || parsed.goal) return null;
  const r = parseClaim(parsed.givens[0].claim, ctx);
  return r.ok && claimKey(r.claim) === keyIn(g.parsed, ctx) ? words : null;
}

function questionWords(model, pos, drawing, lines) {
  const segs = drawing.segs;
  const triNames = [...model.triangles, ...[...model.givens.map((g) => g.parsed), model.goal && model.goal.parsed].filter(Boolean)
    .flatMap((c) => (c.type === 'cong' || c.type === 'sim' ? [c.P, c.Q] : c.type === 'quad' ? [c.P] : []))];
  const isSide = (a, b) => triNames.some((T) => { const i = T.indexOf(a); const j = T.indexOf(b); return i >= 0 && j >= 0 && (Math.abs(i - j) === 1 || Math.abs(i - j) === T.length - 1); });
  const midOnly = new Set();
  const items = model.givens.map((g) => {
    const w = commentWording(g, pos, segs) || wordingOf(g, pos);
    const text = typeof w === 'string' ? w : w ? w.text : g.claim;
    const mid = w && w.mid ? w.mid : g.wording ? { m: /^(\S)/.exec(g.wording)[1], a: g.claim[0], b: g.claim[g.claim.length - 1] } : null;
    if (mid) { const L = lines.find((x) => x.seq.length === 3 && x.inner[0] === mid.m && x.ends.includes(mid.a) && x.ends.includes(mid.b)); if (L) midOnly.add(mid.m); }
    return text;
  });
  const setup = [];
  const cross = model.names.filter((n) => lines.filter((L) => L.inner.includes(n)).length >= 2);
  for (const P of cross) {
    const ls = lines.filter((L) => L.inner.includes(P));
    setup.push(`הישרים ${ls[0].ends.join('')} ו-${ls[1].ends.join('')} נחתכים בנקודה ${P}`);
  }
  for (const L of lines) {
    const inner = L.inner.filter((p) => !cross.includes(p) && !midOnly.has(p));
    if (!inner.length) continue;
    const where = `${isSide(...L.ends) ? 'הצלע ' : ''}${L.ends.join('')}`;
    setup.push(inner.length === 1 ? `הנקודה ${inner[0]} נמצאת על ${where}` : `הנקודות ${listHe(inner)} נמצאות על ${where}`);
  }
  for (const c of model.circles) {
    setup.push(c.on.length === 1 ? `${c.on[0]} נמצאת על מעגל שמרכזו ${c.o}` : `הנקודות ${listHe(c.on)} נמצאות על מעגל שמרכזו ${c.o}`);
  }
  for (const t of model.tangents) setup.push(`${t.p}${t.t} משיק למעגל בנקודה ${t.t}`);
  for (const s of model.sides || []) setup.push(`הנקודות ${s.a} ו-${s.b} נמצאות ${s.same ? 'באותו צד של' : 'משני צדי'} הישר ${s.p}${s.q}`);
  const sentences = [];
  const tri = model.triangles[0] ? model.triangles[0].join('') : null;
  if (setup.length) sentences.push(`${tri ? `במשולש ${tri} ` : ''}${setup.join(', ')}.`);
  else if (tri) sentences.push(`נתון משולש ${tri}.`);
  if (items.length) sentences.push(`נתון: ${items.join(', ')}.`);
  if (model.goal) sentences.push(model.askTerm ? `חשבו את ${model.askTerm}.` : `הוכיחו: ${model.goal.claim}.`);
  return sentences.join('\n');
}

// What the reader makes of the words, against what the Lean says: the same givens and goal?
function wordsAgree(text, model, drawing, pos) {
  const rv = Q.buildReview(drawing, text);
  if ((rv.unknown || []).length || (rv.extraGoals || []).length || !rv.goal) return false;
  const ctx = Q.claimContext(pos);
  const want = new Set(model.givens.map((g) => keyIn(g.parsed, ctx)));
  const got = new Set(rv.givens.map((g) => { const r = parseClaim(g.claim, ctx); return r.ok ? claimKey(r.claim) : null; }));
  if (want.size !== got.size || [...want].some((k) => !got.has(k))) return false;
  if (rv.goal.ask) return !!model.askTerm && rv.goal.ask.replace(/\s/g, '') === model.askTerm.replace(/\s/g, '');
  const r = parseClaim(rv.goal.claim, ctx);
  return !model.askTerm && r.ok && claimKey(r.claim) === keyIn(model.goal.parsed, ctx);
}

// "חשבו את ∢ACB" only when the answer the editor reads off the drawing is the Lean's number exactly.
function askTermOf(model, pos) {
  const c = model.goal && model.goal.parsed;
  if (!model.ask || !c || c.type !== 'eq') return null;
  const [t, n] = c.left && c.right && c.right.kind === 'num' ? [c.left, c.right] : c.left && c.right && c.left.kind === 'num' ? [c.right, c.left] : [];
  if (!t || (t.kind !== 'ang' && t.kind !== 'seg')) return null;
  const { scale } = Q.drawingScale(model.givens.map((g) => g.parsed), pos);
  const shown = t.kind === 'ang' ? Math.round(Q.angDeg(pos, ...t.p)) : scale ? +(Q.dist(pos[t.p[0]], pos[t.p[1]]) * scale).toFixed(2) : null;
  return shown != null && Math.abs(shown - n.v) < 1e-9 ? schoolAtom(t) : null;
}

// ---------------------------------------------------------------- Lean → question

// Only the reading (no drawing): { names, between, circles, tangents, triangles, givens, goal, errors, notes }.
export function readLean(src) {
  try {
    const m = readLeanModel(String(src || ''));
    const model = buildModel(m);
    return { ok: !m.errors.length && !!model.goal, ...model, errors: m.errors, notes: m.notes, name: m.name, doc: m.doc };
  } catch (e) {
    if (e instanceof LeanError) return { ok: false, errors: [{ line: e.info.line, msg: e.info.msg }], notes: [] };
    throw e;
  }
}

// { ok, text, drawing, title, stage, name, goalHolds, notes, errors }
export function leanToQuestion(src, { seed = 7 } = {}) {
  const read = readLean(src);
  if (!read.ok) {
    if (!read.errors.length) read.errors.push({ msg: H('חסרה מסקנה', 'There is no goal') });
    return { ok: false, errors: read.errors, notes: read.notes };
  }
  const model = read;
  const notes = [...read.notes];
  const lay = layout(model, { seed });
  if (!lay) {
    return { ok: false, notes, errors: [{ msg: H('לא הצלחתי לבנות שרטוט שבו כל הנתונים מתקיימים. ייתכן שהם סותרים זה את זה.', 'No drawing makes all the givens true. They may contradict each other.') }] };
  }
  const lines = orderLines(lay.lines, lay.pos);
  const pre = toDrawing(model, lay.pos, lines);
  const pos0 = normalize(lay.pos, model, lines, pre.segs);
  orderLines(lines, pos0);
  const drawing = toDrawing(model, pos0, lines);
  const pos = Q.solveDrawing(drawing);
  if (lay.goalHolds === false) {
    notes.push(H('לא מצאתי שרטוט שבו המסקנה מתקיימת: ייתכן שהמשפט לא נכון, או שחסרה בו הנחה.', 'No drawing found where the goal holds: the theorem may be false, or miss a hypothesis.'));
  } else if (lay.counter) {
    notes.push(H('המשפט כפי שהוא כתוב לא נכון בכל שרטוט: יש שרטוט שבו הנתונים מתקיימים והמסקנה לא. כנראה חסרה עובדה מהשרטוט, למשל באיזה צד של ישר נמצאת נקודה. השרטוט שנבנה הוא אחד שבו המסקנה מתקיימת.',
      'As written, the theorem is not true in every drawing: in some drawing the givens hold and the goal does not. A fact from the picture is probably missing, such as which side of a line a point is on. The drawing built here is one where the goal holds.'));
  }
  model.askTerm = askTermOf(model, pos);
  if (model.ask && !model.askTerm) notes.push(H('המסקנה נשארה "הוכיחו", כי התשובה אינה מספר שלם שאפשר לקרוא מהשרטוט.', 'The goal stays "prove", since the answer is not a whole number the drawing shows.'));

  // the words: the doc comment's, when the reader agrees with the Lean; otherwise written here
  const doc = parseDoc(read.doc);
  let text = null;
  if (doc.text && wordsAgree(doc.text, model, drawing, pos)) text = doc.text;
  if (!text) {
    text = questionWords(model, pos, drawing, lines);
    if (!wordsAgree(text, model, drawing, pos)) notes.push(H('בדקו את הנוסח במסך הבדיקה: הקורא לא הבין אותו בדיוק כמו ה-Lean.', 'Check the wording on the review screen: the reader did not read it exactly as the Lean says.'));
  }
  const stage = (/^geo_(L\d{2})_/.exec(read.name || '') || [])[1] || null;
  // a title: the doc comment's, else what the question asks
  const tri = model.triangles[0] ? `משולש ${model.triangles[0].join('')}: ` : '';
  const title = doc.title || `${tri}${model.askTerm ? `חישוב ${model.askTerm}` : model.goal.claim}`;
  return { ok: true, text, drawing, title, stage, name: read.name, goalHolds: lay.goalHolds, notes, errors: [] };
}

// "כותרת: …" and "שאלה: …" in the doc comment (as problemToLean writes it), or the whole comment.
function parseDoc(doc) {
  if (!doc) return { title: null, text: null };
  const t = /(?:^|\n)\s*(?:כותרת|Title)\s*:\s*(.+)/.exec(doc);
  const q = /(?:^|\n)\s*(?:שאלה|Question)\s*:\s*([\s\S]+)/.exec(doc);
  return { title: t ? t[1].trim() : null, text: q ? q[1].trim() : doc.trim() };
}
