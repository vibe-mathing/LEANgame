// Teacher questions: reads a question written in words (Hebrew first) together with a drawing,
// and turns them into the site's problem format (the format of PROBLEMS in data.js).
// No DOM here, so tests/qparse.mjs runs it in Node.
//
//   drawing  { pts: [{ id, x, y, c }], segs: [[a, b]], circs: [{ o, r }] }   math coordinates, y up
//            c: null (free) | { k: 'seg', a, b, t } on segment ab | { k: 'x', a, b, c, d } where lines ab, cd meet
//               | { k: 'circ', o, r, th } on the circle with center o through r
//   parseText(text, ctx)     → what the words say: givens, goal, position facts, what was not understood
//   buildReview(drawing, text) → everything the review screen shows, filled in automatically
//   reviewReport(review, drawing) → checks: parsing, the drawing as a witness, marks, config
//   buildProblem(review, drawing) → the problem object the player runs
//   straighten(drawing, claims) → moves the free parts of the drawing until the givens hold exactly
//   playable(stored) → a stored question ready for the player, with every teacher text escaped

import { parseClaim, claimKey, fmtClaim, QUADS, prepareProblem, angKey, segKey } from './geo.js';
import { STAGES } from './data.js';
import { esc } from './i18n.js';

// ---------------------------------------------------------------- plane geometry

const sub = (P, Q) => [P[0] - Q[0], P[1] - Q[1]];
const dot = (u, v) => u[0] * v[0] + u[1] * v[1];
const crs = (u, v) => u[0] * v[1] - u[1] * v[0];
const norm = (u) => Math.hypot(u[0], u[1]);
export const dist = (P, Q) => norm(sub(P, Q));
const DEG = 180 / Math.PI;

export function lineIntersect(A, B, C, D) {
  const r = sub(B, A); const s = sub(D, C);
  const den = crs(r, s);
  if (Math.abs(den) < 1e-12 * Math.max(1, norm(r) * norm(s))) return null;
  const t = crs(sub(C, A), s) / den;
  return [A[0] + t * r[0], A[1] + t * r[1]];
}

// Positions of every point, in creation order (a constraint only names earlier points).
export function solveDrawing(d) {
  const pos = {};
  for (const p of (d && d.pts) || []) {
    const c = p.c;
    let P = null;
    if (c && c.k === 'seg' && pos[c.a] && pos[c.b]) {
      P = [pos[c.a][0] + c.t * (pos[c.b][0] - pos[c.a][0]), pos[c.a][1] + c.t * (pos[c.b][1] - pos[c.a][1])];
    } else if (c && c.k === 'x' && pos[c.a] && pos[c.b] && pos[c.c] && pos[c.d]) {
      P = lineIntersect(pos[c.a], pos[c.b], pos[c.c], pos[c.d]);
    } else if (c && c.k === 'circ' && pos[c.o] && pos[c.r]) {
      const r = dist(pos[c.o], pos[c.r]);
      P = [pos[c.o][0] + r * Math.cos(c.th), pos[c.o][1] + r * Math.sin(c.th)];
    }
    pos[p.id] = P || [p.x, p.y];
  }
  return pos;
}

// Same test as geo.js, so the drawing and the checker agree on what lies on a line.
function collinear(pos, P, Q, X) {
  const u = sub(pos[Q], pos[P]); const v = sub(pos[X], pos[P]);
  return Math.abs(crs(u, v)) < 1e-6 * norm(u) * Math.max(1, norm(v));
}

// geo.js's computeRays (not exported there): the representative point of each ray V→X.
function computeRays(points) {
  const names = Object.keys(points);
  const rays = {};
  for (const V of names) {
    rays[V] = {};
    for (const X of names) {
      if (X === V) continue;
      const vx = sub(points[X], points[V]);
      let rep = X;
      for (const Y of names) {
        if (Y === V || Y === X) continue;
        const vy = sub(points[Y], points[V]);
        if (Math.abs(crs(vx, vy)) < 1e-6 * norm(vx) * norm(vy) && dot(vx, vy) > 0 && Y < rep) rep = Y;
      }
      rays[V][X] = rep;
    }
  }
  return rays;
}

// What parseClaim needs to read claims about this drawing.
export function claimContext(pos) {
  return { pointNames: Object.keys(pos), points: pos, rays: computeRays(pos) };
}

export const angDeg = (pos, X, V, Y) => {
  const u = sub(pos[X], pos[V]); const v = sub(pos[Y], pos[V]);
  return Math.atan2(Math.abs(crs(u, v)), dot(u, v)) * DEG;
};

// ---------------------------------------------------------------- facts read off the drawing

const H = (he, en) => ({ he, en });

function betweenFact(a, o, b, ends) {
  const onSeg = ends && ends[0] === a && ends[1] === b;
  return {
    type: 'between', a, o, b, lean: `Sbtw ℝ ${a} ${o} ${b}`,
    text: onSeg
      ? H(`$${o}$ נמצאת על $${a}${b}$`, `$${o}$ lies on $${a}${b}$`)
      : H(`$${o}$ נמצאת בין $${a}$ ל-$${b}$`, `$${o}$ lies between $${a}$ and $${b}$`),
  };
}
export function circleFact(o, on) {
  return {
    type: 'circle', o, on, lean: on.map((p) => `len ${o} ${p} = r`).join(' ∧ '),
    text: H(`$${on.join('$, $')}$ על המעגל שמרכזו $${o}$`, `$${on.join('$, $')}$ lie on the circle with center $${o}$`),
  };
}
export function tangentFact(p, t, o) {
  return {
    type: 'tangent', p, t, o, lean: `IsTangent ${p} ${t} ${o} r`,
    text: H(`$${p}${t}$ משיק למעגל בנקודה $${t}$`, `$${p}${t}$ is tangent to the circle at $${t}$`),
  };
}

// The "from the diagram" facts: every point strictly inside a drawn segment (or a chain of
// collinear drawn segments) lies between its two neighbours on that line, and the points on
// each circle. These are exactly the facts the built-in problems list in `config`.
export function drawingConfig(d, pos) {
  const names = Object.keys(pos);
  const out = [];
  const segs = (d.segs || []).filter(([a, b]) => pos[a] && pos[b] && a !== b && dist(pos[a], pos[b]) > 1e-9);
  const groups = [];
  for (const s of segs) {
    let g = groups.find((x) => collinear(pos, x.a, x.b, s[0]) && collinear(pos, x.a, x.b, s[1]));
    if (!g) { g = { a: s[0], b: s[1], segs: [] }; groups.push(g); }
    g.segs.push(s);
  }
  for (const g of groups) {
    const A = pos[g.a];
    const u0 = sub(pos[g.b], A);
    const u = [u0[0] / norm(u0), u0[1] / norm(u0)];
    const par = (n) => dot(sub(pos[n], A), u);
    const tol = 1e-7 * Math.max(1, norm(u0));
    // covered stretches of the line: overlapping or touching segments merge
    const iv = g.segs.map(([p, q]) => ({ lo: Math.min(par(p), par(q)), hi: Math.max(par(p), par(q)), seg: par(p) <= par(q) ? [p, q] : [q, p], dir: par(p) <= par(q) }))
      .sort((x, y) => x.lo - y.lo);
    const merged = [];
    for (const x of iv) {
      const last = merged[merged.length - 1];
      if (last && x.lo <= last.hi + tol) { last.hi = Math.max(last.hi, x.hi); last.parts.push(x); } else merged.push({ lo: x.lo, hi: x.hi, parts: [x] });
    }
    const onLine = names.filter((n) => collinear(pos, g.a, g.b, n));
    for (const m of merged) {
      const pts = onLine.filter((n) => par(n) > m.lo - tol && par(n) < m.hi + tol).sort((x, y) => par(x) - par(y));
      // keep the letter order the teacher drew (BC rather than CB) when one segment spans the stretch
      const whole = m.parts.find((x) => Math.abs(x.lo - m.lo) < tol && Math.abs(x.hi - m.hi) < tol);
      const forward = whole ? whole.dir : true;
      const seq = forward ? pts : [...pts].reverse();
      const ends = [seq[0], seq[seq.length - 1]];
      for (let i = 1; i < seq.length - 1; i++) out.push(betweenFact(seq[i - 1], seq[i], seq[i + 1], ends));
    }
  }
  const circs = (d.circs || []).filter((c) => pos[c.o] && pos[c.r]);
  for (const c of circs) {
    const R = dist(pos[c.o], pos[c.r]);
    if (R < 1e-9) continue;
    const on = names.filter((n) => n !== c.o && Math.abs(dist(pos[c.o], pos[n]) - R) < 1e-6 * R);
    if (on.length) out.push(circleFact(c.o, on));
  }
  return out;
}

// ---------------------------------------------------------------- reading the words

const RIGHT = ''; // "ישר זווית", kept away from the angle rule
const LIST = ''; // a comma inside a list of points
const SLOT = '';
const SLOT_END = '';
const PF = '[והבלשמכ]{0,3}'; // Hebrew one-letter prefixes

export function normalizeText(text) {
  let s = String(text || '').normalize('NFC').replace(/\r/g, '')
    .replace(/[״“”„]/g, '"').replace(/[׳‘’`]/g, "'").replace(/[־–—]/g, '-').replace(/ /g, ' ');
  s = s.replace(/[A-Za-z]+/g, (w) => (/^(sin|cos|tan)$/i.test(w) ? w.toLowerCase() : w.toUpperCase()));
  s = s.replace(/\|\||\/\//g, '∥').replace(/_\|_|⟂/g, '⊥').replace(/[∠∡]/g, '∢').replace(/[Δ∆▵▲]/g, '△').replace(/[▭◻▢⬜■▯]/g, '□')
    .replace(/~=|=~|≡|≃|≌/g, '≅').replace(/~/g, '∼').replace(/[º˚]/g, '°').replace(/\^2/g, '²')
    .replace(/[·×]/g, '*').replace(/−/g, '-');
  s = s.replace(/ישרת?\s+(?:ה)?זוו?ית/g, RIGHT);
  s = s.replace(/(^|[\s(=+\-,:])<\s*(?=[A-Z]{1,3}(?![A-Z]))/g, '$1∢');
  s = s.replace(new RegExp(`${PF}זוו?יות\\s+((?:∢?[A-Z]{1,3}\\s*(?:,|ו-?)\\s*)+∢?[A-Z]{1,3})(?![A-Z])`, 'g'),
    (m, list) => list.replace(/∢?([A-Z]{1,3})/g, '∢$1'));
  s = s.replace(new RegExp(`${PF}זוו?ית\\s*(?=[A-Z]{1,3}(?![A-Z]))`, 'g'), '∢');
  s = s.replace(/∢\s+(?=[A-Z])/g, '∢').replace(/△\s+(?=[A-Z])/g, '△');
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*(?:מעלות|מעלה|°)/g, '$1°');
  // "הזווית ∢COB": the word goes, the sign stays
  s = s.replace(new RegExp(`${PF}זוו?ית\\s*∢`, 'g'), '∢');
  // "X גדולה פי 2 מ-Y" → X = 2Y; "X קטנה פי 2 מ-Y" → 2X = Y; "X גדולה ב-20° מ-Y" → X − 20° = Y
  const TIMES = { 'שניים': 2, 'שתיים': 2, 'שלושה': 3, 'שלוש': 3, 'ארבעה': 4, 'ארבע': 4, 'חמישה': 5, 'חמש': 5 };
  const num = `(\\d+(?:[.,]\\d+)?|${Object.keys(TIMES).join('|')})`;
  const k = (w) => TIMES[w] || w;
  const term = '((?:∢|sin∢|cos∢|tan∢)?[A-Z]{1,3})';
  s = s.replace(new RegExp(`${term}\\s+(?:גדול|גדולה|גדולים|גדולות)\\s+פי\\s+${num}\\s+מ-?\\s*`, 'g'), (m, X, n) => `${X} = ${k(n)}`);
  s = s.replace(new RegExp(`${term}\\s+(?:קטן|קטנה|קטנים|קטנות)\\s+פי\\s+${num}\\s+מ-?\\s*`, 'g'), (m, X, n) => `${k(n)}${X} = `);
  s = s.replace(new RegExp(`${term}\\s+(?:גדול|גדולה|גדולים|גדולות)\\s+ב-?\\s*(\\d+(?:[.,]\\d+)?°?)\\s+מ-?\\s*`, 'g'), (m, X, d) => `${X} - ${d} = `);
  s = s.replace(new RegExp(`${term}\\s+(?:קטן|קטנה|קטנים|קטנות)\\s+ב-?\\s*(\\d+(?:[.,]\\d+)?°?)\\s+מ-?\\s*`, 'g'), (m, X, d) => `${X} + ${d} = `);
  s = s.replace(/\s*(?:שווה|שווים|שוות)\s+ל-?\s*/g, ' = ');
  s = s.replace(/\s*(?:גדול|גדולה|גדולים|גדולות)\s+מ-?\s*/g, ' > ');
  s = s.replace(/\s*(?:קטן|קטנה|קטנים|קטנות)\s+מ-?\s*/g, ' < ');
  s = s.replace(/\s*(?:מקביל|מקבילה|מקבילים|מקבילות)\s+ל-?\s*/g, ' ∥ ');
  s = s.replace(/\s*(?:מאונך|מאונכת|מאונכים|מאונכות|ניצב|ניצבת)\s+ל-?\s*/g, ' ⊥ ');
  s = s.replace(/\s*(?:חופף|חופפת|חופפים)\s+ל-?\s*/g, ' ≅ ');
  s = s.replace(/\s*(?:דומה|דומים)\s+ל-?\s*/g, ' ∼ ');
  // "המשולש ABD ≅ משולש ACD": the word goes, the triangle sign stays
  s = s.replace(new RegExp(`${PF}משולש(?:ים)?\\s+(?=[A-Z]{3}\\s*[≅∼])`, 'g'), '△');
  s = s.replace(new RegExp(`([≅∼]\\s*)${PF}משולש\\s+(?=[A-Z]{3})`, 'g'), '$1△');
  return s;
}

const GOAL_RE = /(?:^|[\s,:(])ו?(?:הוכיחו|הוכיחי|הוכח|הראו|הראי|הראה|צ"ל|צריך\s+להוכיח|יש\s+להוכיח|נדרש\s+להוכיח|PROVE(?:\s+THAT)?|SHOW(?:\s+THAT)?)(?:\s*:|\s+ש-?|\s+כי|\s+את\s+ש-?|\s+|$)/;
const ASK_RE = /(?:^|[\s,:(])ו?(?:חשבו|חשבי|חשב|מצאו|מצאי|מצא|מהו|מהי|מה\s+גודל|מה\s+אורך|FIND|COMPUTE|CALCULATE)(?:\s*:|\s+|$)(?:את\s+)?(?:ה?(?:גודל|אורך|ערך)\s+)?(?:של\s+)?/;
const GIVEN_RE = /(?:^|(?<=[\s,(]))ו?(?:נתון|נתונה|נתונים|נתונות|ידוע|GIVEN)(?:\s*:|\s+ש-?|\s+כי|\s+|$)/g;

const QUAD_WORDS = [['בר חסימה במעגל', 'cyclic'], ['בר חסימה', 'cyclic'], ['חוסם מעגל', 'tangential'], // geo-more.js kinds
  ['טרפז שווה שוקיים', 'isoTrapezoid'], ['טרפז ש"ש', 'isoTrapezoid'], ['מקבילית', 'parallelogram'], ['מלבן', 'rectangle'],
  ['מעויין', 'rhombus'], ['מעוין', 'rhombus'], ['ריבוע', 'square'], ['דלתון', 'kite'], ['טרפז', 'trapezoid']];
const QW = QUAD_WORDS.map(([w]) => w.replace(/"/g, '"')).join('|');
const quadKind = (w) => (QUAD_WORDS.find(([x]) => x === w) || [])[1];

const letters = (s) => [...String(s)];
const triOthers = (tri, v) => letters(tri).filter((x) => x !== v);

// Items the words produce:
//   { kind: 'claim', claim, text?, also?, note?, src }        a given (or the goal)
//   { kind: 'fact', fact: 'on'|'ext'|'cross'|'circle'|'center'|'diam'|'tangent', …, src }
//   { kind: 'ctx', tri | quad }                                  "במשולש ABC" and the like
//   { kind: 'iso' | 'equi' | 'rightTri', tri, base?, v?, src } resolved once everything is read
//   { kind: 'unknown', src, err? }
//   { kind: 'ask', term, src }                                   "חשבו את ∢BOD"

const claimItem = (claim, src, extra = {}) => ({ kind: 'claim', claim, src, ...extra });

// Patterns that join several things with "ו" or commas; they run before a part is cut into clauses.
const MULTI = [
  { // A(0, 12), A = (0, 12): a point's coordinates (analytic geometry, geo-more.js), kept whole before
    // the text is split at commas and brackets
    re: /([A-Z])\s*=?\s*\(\s*(-?\d*(?:\.\d+)?(?:√\d+)?(?:\/\d+)?)\s*[,;]\s*(-?\d*(?:\.\d+)?(?:√\d+)?(?:\/\d+)?)\s*\)/g,
    fn: (m) => [claimItem(`${m[1]}(${m[2]};${m[3]})`, m[0])],
  },
  { // A, B ו-C על המעגל שמרכזו O
    re: new RegExp(`(?:ה?נקודות\\s+)?([A-Z](?:\\s*,\\s*[A-Z])*(?:\\s*ו-?\\s*[A-Z])?)\\s+(?:נמצאות\\s+|נמצאת\\s+|נמצא\\s+|מונחות\\s+)?על\\s+(?:ה)?(?:מעגל|היקף(?:\\s+ה?מעגל)?)(?:\\s+(?:ש)?מרכזו\\s+(?:הוא\\s+|ב-?\\s*)?([A-Z])(?![A-Z]))?`, 'g'),
    fn: (m) => [{ kind: 'fact', fact: 'circle', pts: m[1].match(/[A-Z]/g), o: m[2] || null }],
    setup: true,
  },
  { // הנקודות D ו-E על BC
    re: /(?:ה?נקודות\s+)?([A-Z](?:\s*,\s*[A-Z])*\s*ו-?\s*[A-Z])\s+(?:נמצאות\s+|מונחות\s+)?על\s+(?:ה?(?:צלע|קטע|ישר|בסיס)\s+)?([A-Z])([A-Z])(?![A-Z])/g,
    fn: (m) => m[1].match(/[A-Z]/g).map((x) => ({ kind: 'fact', fact: 'on', p: x, a: m[2], b: m[3] })),
    setup: true,
  },
  { // האלכסונים (AC ו-BD) נחתכים ב-O
    re: /(?:ה)?אלכסונים(?:\s+(?:שלה|שלו))?(?:\s+(?:של\s+)?(?:ה?(?:מרובע|מקבילית|מלבן|מעוין|ריבוע|דלתון|טרפז)\s+)?([A-Z]{4})?)?(?:\s+([A-Z]{2})\s*ו-?\s*([A-Z]{2}))?\s+(?:נחתכים|נפגשים|נחתכות|נפגשות|מצטלבים)\s+ב(?:נקודה\s+)?-?\s*([A-Z])(?![A-Z])/g,
    // the quadrilateral may be named later in the same sentence: resolved at the end (diagOf)
    fn: (m) => (m[2] && m[3] ? [{ kind: 'fact', fact: 'cross', o: m[4], l1: m[2], l2: m[3] }] : [{ kind: 'fact', fact: 'cross', o: m[4], diagOf: m[1] || null }]),
    setup: true,
  },
  { // הישר EF חותך אותם (את AB ואת CD) בנקודות G ו-H
    re: /(?:ה?(?:ישר|קטע|חותך)\s+)?([A-Z]{2})\s+(?:חותך|חוצה|פוגש)\s+(?:את\s+)?(?:אותם|אותן|(?:ה?(?:ישרים|קטעים)\s+)?([A-Z]{2})\s*(?:ו-?|ואת)\s*(?:את\s+)?([A-Z]{2}))\s+ב(?:נקודות\s+)?-?\s*([A-Z])\s*ו-?\s*(?:ב-?)?\s*([A-Z])(?![A-Z])/g,
    fn: (m) => [
      { kind: 'fact', fact: 'online', p: m[4], line: m[1] }, { kind: 'fact', fact: 'online', p: m[5], line: m[1] },
      ...(m[2] ? [{ kind: 'fact', fact: 'online', p: m[4], line: m[2] }, { kind: 'fact', fact: 'online', p: m[5], line: m[3] }] : []),
    ],
    setup: true,
  },
  { // הקטעים AB ו-CD חוצים זה את זה בנקודה O: they cross at O, and O is the midpoint of both
    re: /(?:ה?(?:ישרים|קטעים|אלכסונים)\s+)?([A-Z])([A-Z])\s*ו-?\s*([A-Z])([A-Z])\s+(?:חוצים|חוצות)\s+(?:זה\s+את\s+זה|זו\s+את\s+זו)\s+ב(?:נקודה\s+)?-?\s*([A-Z])(?![A-Z])/g,
    fn: (m) => [
      { kind: 'fact', fact: 'cross', o: m[5], l1: m[1] + m[2], l2: m[3] + m[4] },
      ...[[m[1], m[2]], [m[3], m[4]]].map(([a, b]) => claimItem(`${a}${m[5]} = ${m[5]}${b}`, m[0], {
        also: ['midpoint_def'], text: H(`$${m[5]}$ אמצע $${a}${b}$`, `$${m[5]}$ is the midpoint of $${a}${b}$`), foot: { p: m[5], a, b },
      })),
    ],
    setup: true,
  },
  { // D, E ו-F הן אמצעי הצלעות AB, BC ו-CA
    re: /(?:ה?נקודות\s+)?([A-Z](?:\s*,\s*[A-Z])*\s*ו-?\s*[A-Z])\s+(?:הן\s+|הם\s+)?(?:ה)?אמצעי\s+(?:ה?(?:צלעות|קטעים|שוקיים)\s+)?([A-Z]{2}(?:\s*,\s*[A-Z]{2})*\s*ו-?\s*[A-Z]{2})(?:\s+(?:של\s+)?(?:ה?משולש\s+)?△?[A-Z]{3})?(?![A-Z])/g,
    fn: (m) => {
      const ps = m[1].match(/[A-Z]/g);
      const segs = m[2].match(/[A-Z]{2}/g);
      if (ps.length !== segs.length) return [{ kind: 'unknown', src: m[0] }];
      return ps.map((M, i) => {
        const [a, b] = segs[i];
        return claimItem(`${a}${M} = ${M}${b}`, m[0], {
          also: ['midpoint_def'], text: H(`$${M}$ אמצע $${a}${b}$`, `$${M}$ is the midpoint of $${a}${b}$`), foot: { p: M, a, b },
        });
      });
    },
  },
  { // מהנקודה P יוצאים שני משיקים למעגל (שמרכזו O), ונוגעים בו ב-A וב-B
    re: /מ(?:ה)?(?:נקודה\s+)?-?\s*([A-Z])\s+(?:יוצאים|יוצאות|עוברים|מעבירים|הועברו|העבירו)\s+(?:שני\s+)?משיקים(?:\s+ל(?:ה)?מעגל)?(?:\s+(?:ש)?מרכזו\s+(?:הוא\s+)?([A-Z])(?![A-Z]))?[\s,]*(?:ו)?(?:ה(?:ם|ן)\s+)?(?:נוגעים|נוגעות|משיקים)\s+(?:בו\s+|בו\s+)?ב(?:נקודות\s+)?-?\s*([A-Z])\s*ו-?\s*(?:ב-?)?\s*([A-Z])(?![A-Z])/g,
    fn: (m) => [
      { kind: 'fact', fact: 'tangent', a: m[1], b: m[3], t: m[3] }, { kind: 'fact', fact: 'tangent', a: m[1], b: m[4], t: m[4] },
      { kind: 'fact', fact: 'circle', pts: [m[3], m[4]], o: m[2] || null },
    ],
    setup: true,
  },
  { // דרך הקודקוד A (של המשולש ABC) עובר הישר DE, המקביל ל-BC
    re: /דרך\s+(?:ה?(?:נקודה|קודקוד)\s+)?([A-Z])(?![A-Z])(?:\s+של\s+(?:ה?משולש\s+)?△?[A-Z]{3})?\s+(?:עובר|העובר|מעבירים|הועבר|העבירו|נעביר)\s+(?:(?:את\s+)?ה?ישר\s+)?([A-Z]{2})\s*,?\s*(?:ה|ש|ו)?\s*∥\s*([A-Z]{2})(?![A-Z])/g,
    fn: (m) => [claimItem(`${m[2]} ∥ ${m[3]}`, m[0]), { kind: 'fact', fact: 'online', p: m[1], line: m[2] }],
  },
  { // הישר DE עובר דרך A ומקביל ל-BC
    re: /(?:ה?ישר\s+)?([A-Z]{2})\s+(?:עובר|העובר)\s+דרך\s+(?:ה?(?:נקודה|קודקוד)\s+)?([A-Z])(?![A-Z])\s*,?\s*(?:ו|ה)?\s*∥\s*([A-Z]{2})(?![A-Z])/g,
    fn: (m) => [claimItem(`${m[1]} ∥ ${m[3]}`, m[0]), { kind: 'fact', fact: 'online', p: m[2], line: m[1] }],
  },
  { // (ו)הבסיסים שלו AB ו-DC: the bases of a trapezoid are parallel
    re: /(?:ו)?(?:ה)?בסיסים(?:\s+(?:שלו|שלה|של\s+ה?טרפז(?:\s+[A-Z]{4})?))?\s+(?:הם\s+|הן\s+)?([A-Z]{2})\s*ו-?\s*([A-Z]{2})(?![A-Z])/g,
    fn: (m) => [claimItem(`${m[1]} ∥ ${m[2]}`, m[0], { text: H(`הבסיסים הם $${m[1]}$ ו-$${m[2]}$`, `The bases are $${m[1]}$ and $${m[2]}$`) })],
  },
  { // descriptions the drawing already shows: "הצלע BC מוארכת (לשני הצדדים) עד D ועד E",
    // "הקרניים OC ו-OD באותו צד שלו"
    re: /(?:ה?(?:צלע|קטע|ישר)\s+)?[A-Z]{2}\s+(?:מוארכת|מוארך|מוארכים|הוארכה|הוארך)[^.\n]*?עד\s+(?:ה?נקודה\s+)?[A-Z](?![A-Z])(?:\s*ו(?:עד\s+)?-?\s*[A-Z](?![A-Z]))?|(?:ו)?(?:ה)?(?:קרניים|קרנות|נקודות)\s+[A-Z]{1,2}\s*ו-?\s*[A-Z]{1,2}\s+(?:נמצאות\s+|נמצאים\s+)?(?:באותו\s+צד|משני\s+צדי|בצדדים\s+שונים)(?:\s+(?:של\s+)?(?:ה?ישר\s+)?(?:[A-Z]{2}(?![A-Z])|שלו|שלה))?/g,
    fn: () => [],
    setup: true,
  },
  { // AC ו-BD נחתכים בנקודה O
    re: /(?:ה?(?:ישרים|קטעים)\s+)?([A-Z]{2})\s*ו-?\s*([A-Z]{2})\s+(?:נחתכים|נחתכות|נפגשים|נפגשות|מצטלבים|חותכים\s+זה\s+את\s+זה)\s+ב(?:נקודה\s+)?-?\s*([A-Z])(?![A-Z])/g,
    fn: (m) => [{ kind: 'fact', fact: 'cross', o: m[3], l1: m[1], l2: m[2] }],
    setup: true,
  },
  { // PA ו-PB משיקים למעגל (בנקודות A ו-B)
    re: /([A-Z]{2})\s*ו-?\s*([A-Z]{2})\s+(?:הם\s+)?משיקים(?:\s+ל(?:ה)?מעגל)?(?:\s+(?:ש)?מרכזו\s+[A-Z](?![A-Z]))?(?:\s+ב(?:נקודות\s+)?-?\s*([A-Z])\s*ו-?\s*(?:ב-?)?\s*([A-Z])(?![A-Z]))?/g,
    fn: (m) => [{ kind: 'fact', fact: 'tangent', a: m[1][0], b: m[1][1], t: m[3] || null }, { kind: 'fact', fact: 'tangent', a: m[2][0], b: m[2][1], t: m[4] || null }],
    setup: true,
  },
  { // AB ו-CD מקבילים / מאונכים / שווים
    re: /(?:ה?(?:ישרים|קטעים|צלעות)\s+)?([A-Z]{2})\s*ו-?\s*([A-Z]{2})\s+(מקבילים|מקבילות|מאונכים|מאונכות|ניצבים|שווים|שוות)(?:\s+זה\s+לזה|\s+זו\s+לזו)?/g,
    fn: (m) => [claimItem(`${m[1]} ${/^מקביל/.test(m[3]) ? '∥' : /^(מאונכ|ניצב)/.test(m[3]) ? '⊥' : '='} ${m[2]}`, m[0])],
  },
  { // AC חוצה את ∢BAD ואת ∢BCD
    re: /([A-Z])([A-Z])\s+(?:הוא\s+|היא\s+)?(?:ה)?חוצה\s+(?:את\s+)?(?:ה)?∢([A-Z]{1,3})\s*(?:ו-?\s*|ואת\s+|וגם\s+(?:את\s+)?)(?:ה)?∢([A-Z]{1,3})(?![A-Z])/g,
    fn: (m, ctx) => [...bisector([m[0], m[1], m[2], m[3]], ctx), ...bisector([m[0], m[1], m[2], m[4]], ctx)],
  },
  { // ∢A ו-∢B שוות
    re: /(∢[A-Z]{1,3})\s*ו-?\s*(∢[A-Z]{1,3})\s+(?:שוות|שווים)(?:\s+זו\s+לזו)?/g,
    fn: (m) => [claimItem(`${m[1]} = ${m[2]}`, m[0])],
  },
  { // המשולשים ABC ו-DEF חופפים / דומים
    re: /(?:ה?משולשים\s+)?△?([A-Z]{3})\s*ו-?\s*△?([A-Z]{3})\s+(חופפים|דומים)/g,
    fn: (m) => [claimItem(`△${m[1]} ${m[3] === 'חופפים' ? '≅' : '∼'} △${m[2]}`, m[0])],
  },
];

// Patterns inside one clause. Each returns items; the matched text is removed from the clause.
const SINGLE = [
  { // משולש ABC שווה שוקיים (שבו הבסיס BC)
    re: new RegExp(`(?:${PF}משולש\\s+)?△?([A-Z]{3})\\s+(?:הוא\\s+)?(?:משולש\\s+)?שווה[\\s-]+(?:ה)?שוקיים(?:\\s+(?:שבו|ש|עם|ש-)?\\s*(?:ה)?בסיס\\s+(?:הוא\\s+)?([A-Z]{2}))?`, 'g'),
    fn: (m) => [{ kind: 'iso', tri: m[1], base: m[2] || null, src: m[0] }, { kind: 'ctx', tri: m[1] }],
  },
  {
    re: new RegExp(`${PF}משולש\\s+שווה[\\s-]+(?:ה)?שוקיים\\s+△?([A-Z]{3})(?:\\s+(?:שבו|עם)?\\s*(?:ה)?בסיס\\s+(?:הוא\\s+)?([A-Z]{2}))?`, 'g'),
    fn: (m) => [{ kind: 'iso', tri: m[1], base: m[2] || null, src: m[0] }, { kind: 'ctx', tri: m[1] }],
  },
  {
    re: new RegExp(`(?:${PF}משולש\\s+)?△?([A-Z]{3})\\s+(?:הוא\\s+)?(?:משולש\\s+)?שווה[\\s-]+(?:ה)?צלעות|${PF}משולש\\s+שווה[\\s-]+(?:ה)?צלעות\\s+△?([A-Z]{3})`, 'g'),
    fn: (m) => [{ kind: 'equi', tri: m[1] || m[2], src: m[0] }, { kind: 'ctx', tri: m[1] || m[2] }],
  },
  {
    re: new RegExp(`(?:${PF}משולש\\s+)?△?([A-Z]{3})\\s+(?:הוא\\s+)?(?:משולש\\s+)?${RIGHT}(?:\\s+(?:ב-?|בקודקוד\\s+)\\s*([A-Z])(?![A-Z]))?|${PF}משולש\\s+${RIGHT}\\s+△?([A-Z]{3})(?:\\s+(?:ב-?|בקודקוד\\s+)\\s*([A-Z])(?![A-Z]))?`, 'g'),
    fn: (m) => [{ kind: 'rightTri', tri: m[1] || m[3], v: m[2] || m[4] || null, src: m[0] }, { kind: 'ctx', tri: m[1] || m[3] }],
  },
  { // מקבילית ABCD / המרובע ABCD הוא מקבילית
    re: new RegExp(`${PF}(?:ה?מרובע\\s+)?(${QW})\\s+([A-Z]{4})(?![A-Z])`, 'g'),
    fn: (m) => [claimItem(`${m[2]} ${QUADS[quadKind(m[1])].he}`, m[0]), { kind: 'ctx', quad: m[2] }],
  },
  {
    re: new RegExp(`(?:${PF}(?:ה)?מרובע\\s+)?([A-Z]{4})\\s+(?:הוא\\s+|היא\\s+)?(?:ה)?(${QW})`, 'g'),
    fn: (m) => [claimItem(`${m[1]} ${QUADS[quadKind(m[2])].he}`, m[0]), { kind: 'ctx', quad: m[1] }],
  },
  { re: new RegExp(`${PF}(?:ה)?מרובע\\s+([A-Z]{4})(?![A-Z])`, 'g'), fn: (m) => [{ kind: 'ctx', quad: m[1] }], setup: true },
  { // M אמצע AB
    re: /(?:ה?נקודה\s+)?([A-Z])\s+(?:היא\s+|הוא\s+)?(?:נקודת\s+)?(?:ה)?אמצע\s+(?:של\s+)?(?:ה?(?:צלע|קטע|בסיס|יתר|שוק)\s+)?([A-Z])([A-Z])(?![A-Z])/g,
    fn: (m) => [claimItem(`${m[2]}${m[1]} = ${m[1]}${m[3]}`, m[0], {
      also: ['midpoint_def'], text: H(`$${m[1]}$ אמצע $${m[2]}${m[3]}$`, `$${m[1]}$ is the midpoint of $${m[2]}${m[3]}$`),
      foot: { p: m[1], a: m[2], b: m[3] },
    })],
  },
  { // AD תיכון לצלע BC / AD תיכון במשולש ABC
    re: new RegExp(`([A-Z])([A-Z])\\s+(?:הוא\\s+)?(?:ה)?תיכון\\s+(?:(?:ל-?|לצלע\\s+|ליתר\\s+|לבסיס\\s+)([A-Z])([A-Z])|(?:${PF}משולש\\s+)△?([A-Z]{3}))(?![A-Z])`, 'g'),
    fn: (m, ctx) => median(m, ctx),
  },
  { // AD גובה לצלע BC / AD גובה במשולש ABC
    re: new RegExp(`([A-Z])([A-Z])\\s+(?:הוא\\s+)?(?:ה)?גובה\\s+(?:(?:ל-?|לצלע\\s+|ליתר\\s+|לבסיס\\s+)([A-Z])([A-Z])|(?:${PF}משולש\\s+)△?([A-Z]{3}))(?![A-Z])`, 'g'),
    fn: (m, ctx) => altitude(m, ctx),
  },
  { // AD חוצה את ∢BAC
    re: /([A-Z])([A-Z])\s+(?:הוא\s+|היא\s+)?(?:ה)?חוצה\s+(?:את\s+)?(?:ה)?∢([A-Z]{1,3})(?![A-Z])/g,
    fn: (m, ctx) => bisector(m, ctx),
  },
  { // AD חוצה את (הצלע) BC
    re: /([A-Z])([A-Z])\s+(?:ה)?חוצה\s+(?:את\s+)?(?:ה?(?:צלע|קטע|בסיס)\s+)?([A-Z])([A-Z])(?![A-Z])/g,
    fn: (m) => segBisector(m),
  },
  { // E על המשך BC (מעבר ל-C)
    re: /(?:ה?נקודה\s+)?([A-Z])\s+(?:נמצאת\s+|נמצא\s+|מונחת\s+)?על\s+(?:ה)?המשך\s+(?:של\s+)?(?:ה?(?:צלע|קטע)\s+)?([A-Z])([A-Z])(?![A-Z])(?:\s+מעבר\s+ל-?\s*([A-Z]))?/g,
    fn: (m) => [{ kind: 'fact', fact: 'ext', p: m[1], a: m[2], b: m[3] }],
    setup: true,
  },
  { // D על BC
    re: /(?:ה?נקודה\s+)?([A-Z])\s+(?:נמצאת\s+|נמצא\s+|מונחת\s+)?על\s+(?:ה?(?:צלע|קטע|ישר|בסיס|יתר|שוק)\s+)?([A-Z])([A-Z])(?![A-Z])/g,
    fn: (m) => [{ kind: 'fact', fact: 'on', p: m[1], a: m[2], b: m[3] }],
    setup: true,
  },
  { // O מפגש האלכסונים
    re: /([A-Z])\s+(?:היא\s+|הוא\s+)?(?:נקודת\s+)?(?:ה)?(?:מפגש|חיתוך)\s+(?:ה)?אלכסונים(?:\s+(?:של\s+)?(?:ה?מרובע\s+)?([A-Z]{4}))?/g,
    fn: (m) => [{ kind: 'fact', fact: 'cross', o: m[1], diagOf: m[2] || null }],
    setup: true,
  },
  { // מעגל שמרכזו O / O מרכז המעגל (not inside "משיק למעגל שמרכזו O", which the tangent rule reads)
    re: /(?<!משיקה?\s+ל(?:ה)?)(?:ה)?מעגל\s+(?:ש)?מרכזו\s+(?:הוא\s+|ב-?\s*)?([A-Z])(?![A-Z])|([A-Z])\s+(?:הוא\s+|היא\s+)?מרכז\s+(?:ה)?מעגל/g,
    fn: (m) => [{ kind: 'fact', fact: 'center', o: m[1] || m[2] }],
    setup: true,
  },
  { // A על המעגל
    re: /([A-Z])\s+(?:נמצאת\s+|נמצא\s+)?על\s+(?:ה)?(?:מעגל|היקף)/g,
    fn: (m) => [{ kind: 'fact', fact: 'circle', pts: [m[1]], o: null }],
    setup: true,
  },
  { re: /([A-Z])([A-Z])\s+(?:הוא\s+)?(?:ה)?קוטר/g, fn: (m) => [{ kind: 'fact', fact: 'diam', a: m[1], b: m[2] }], setup: true },
  { // PA משיק למעגל בנקודה A
    re: /([A-Z])([A-Z])\s+(?:הוא\s+|היא\s+)?(?:ה)?משיקה?(?:\s+ל(?:ה)?מעגל)?(?:\s+(?:ש)?מרכזו\s+([A-Z]))?(?:\s+ב(?:נקודה\s+)?-?\s*([A-Z])(?![A-Z]))?/g,
    fn: (m) => [{ kind: 'fact', fact: 'tangent', a: m[1], b: m[2], t: m[4] || null, o: m[3] || null }],
    setup: true,
  },
  { re: /(∢[A-Z]{1,3})\s+(?:היא\s+|הוא\s+)?ישרה/g, fn: (m) => [claimItem(`${m[1]} = 90°`, m[0])] },
  { // (ש)זוויות הבסיס (של המשולש ABC) שוות: resolved with the triangle's apex (parseText)
    re: new RegExp(`${PF}זוו?יות\\s+(?:ה)?בסיס(?:\\s+(?:של\\s+)?(?:ה?משולש\\s+)?△?([A-Z]{3}))?\\s+(?:שוות|שווים)(?:\\s+זו\\s+לזו)?`, 'g'),
    fn: (m) => [{ kind: 'baseAngles', tri: m[1] || null, src: m[0] }],
  },
  { // "והנקודה E ביניהם": the drawing shows it, nothing to prove
    re: /(?:ו)?(?:ה?נקודה\s+)?([A-Z])\s+(?:נמצאת\s+|נמצא\s+)?(?:ביניהם|ביניהן|בין\s+(?:ה?ישרים|ה?קטעים|ה?מקבילים))/g,
    fn: () => [],
    setup: true,
  },
  { // "הקרן OC", "האלכסון AC", "הקטע AD": names what is drawn, says nothing to prove
    re: /(?:ה)?(?:קרן|קטע|ישר|אלכסון|צלע)\s+([A-Z]{2})(?![A-Z])(?!\s*[=<>∥⊥≅∼+\-*/])/g,
    fn: () => [],
    setup: true,
  },
  { re: new RegExp(`${PF}משולש(?:ים)?\\s+(?:ה)?△?([A-Z]{3})(?![A-Z])`, 'g'), fn: (m) => [{ kind: 'ctx', tri: m[1] }], setup: true },
  // "△ABC" alone names the triangle; "S△ABC" is its area, a term of a claim, so it is left whole
  { re: /(?<![≅∼]\s*|S)△([A-Z]{3})(?![A-Z]|\s*[≅∼])/g, fn: (m) => [{ kind: 'ctx', tri: m[1] }], setup: true },
];

function median(m, ctx) {
  const [X, D] = [m[1], m[2]];
  let side = m[3] && m[4] ? m[3] + m[4] : m[5] ? triOthers(m[5], X).join('') : null;
  if (!side) return [{ kind: 'unknown', src: m[0] }];
  const [B, C] = letters(side);
  // the foot is the letter of the median that is not the vertex
  const foot = [B, C].includes(D) ? null : D;
  if (!foot) return [{ kind: 'unknown', src: m[0] }];
  return [claimItem(`${B}${foot} = ${foot}${C}`, m[0], {
    also: ['midpoint_def'], text: H(`$${X}${foot}$ תיכון לצלע $${B}${C}$`, `$${X}${foot}$ is the median to $${B}${C}$`),
    foot: { p: foot, a: B, b: C },
  })].concat(m[5] ? [{ kind: 'ctx', tri: m[5] }] : []);
}

function altitude(m, ctx) {
  const [X, D] = [m[1], m[2]];
  const side = m[3] && m[4] ? m[3] + m[4] : m[5] ? triOthers(m[5], X).join('') : null;
  if (!side) return [{ kind: 'unknown', src: m[0] }];
  return [claimItem(`${X}${D} ⊥ ${side}`, m[0], {
    text: H(`$${X}${D}$ גובה לצלע $${side}$`, `$${X}${D}$ is the altitude to $${side}$`),
    foot: { p: D, a: side[0], b: side[1], perp: X },
  })].concat(m[5] ? [{ kind: 'ctx', tri: m[5] }] : []);
}

function bisector(m, ctx) {
  const [P, Q] = [m[1], m[2]];
  let ang = m[3];
  // "AD חוצה את ∢A": the angle at A whose arms are not AD itself
  if (ang.length === 1) ang = resolveAngle(ang, ctx, [P === ang ? Q : P]);
  if (!ang || ang.length !== 3) return [{ kind: 'unknown', src: m[0], err: { key: 'angle3' } }];
  const [X, V, Y] = letters(ang);
  const D = P === V ? Q : Q === V ? P : null;
  if (!D) return [{ kind: 'unknown', src: m[0], why: 'bisVertex' }];
  return [claimItem(`∢${X}${V}${D} = ∢${D}${V}${Y}`, m[0], {
    also: ['bisector_def'], text: H(`$${V}${D}$ חוצה את $∢${X}${V}${Y}$`, `$${V}${D}$ bisects $∢${X}${V}${Y}$`),
    bis: { v: V, d: D, x: X, y: Y },
  })];
}

function segBisector(m) {
  // AD bisects BC: the point of AD that lies on BC is its midpoint (D when D is on BC)
  const [P, Q, B, C] = [m[1], m[2], m[3], m[4]];
  const M = [P, Q].find((x) => x !== B && x !== C);
  const other = [P, Q].find((x) => x !== M);
  const foot = [B, C].includes(other) ? null : (Q !== B && Q !== C ? Q : P);
  if (!foot || foot === B || foot === C) return [{ kind: 'unknown', src: m[0] }];
  return [claimItem(`${B}${foot} = ${foot}${C}`, m[0], {
    also: ['midpoint_def'], text: H(`$${P}${Q}$ חוצה את $${B}${C}$`, `$${P}${Q}$ bisects $${B}${C}$`),
    foot: { p: foot, a: B, b: C },
  })];
}

// "∢A": the angle at A of the triangle (or quadrilateral) named in the question, or the only
// angle the drawing shows at A.
export function resolveAngle(V, ctx, exclude = []) {
  for (const tri of ctx.tris) if (tri.includes(V) && !exclude.some((x) => tri.includes(x))) return `${triOthers(tri, V)[0]}${V}${triOthers(tri, V)[1]}`;
  for (const q of ctx.quads) {
    const i = q.indexOf(V);
    if (i >= 0 && !exclude.some((x) => q.includes(x))) return `${q[(i + 3) % 4]}${V}${q[(i + 1) % 4]}`;
  }
  if (ctx.pos && ctx.pos[V]) {
    const rays = ctx.rays || computeRays(ctx.pos);
    const arms = new Map();
    const skip = new Set(exclude.filter((x) => ctx.pos[x] && rays[V] && rays[V][x]).map((x) => rays[V][x]));
    for (const [P, Q] of ctx.segs || []) {
      if (!ctx.pos[P] || !ctx.pos[Q]) continue;
      const add = (X) => { const r = rays[V] && rays[V][X]; if (r && !arms.has(r) && !skip.has(r)) arms.set(r, X); };
      if (P === V) add(Q);
      else if (Q === V) add(P);
      else if (collinear(ctx.pos, P, Q, V) && dot(sub(ctx.pos[P], ctx.pos[V]), sub(ctx.pos[Q], ctx.pos[V])) < 0) { add(P); add(Q); }
    }
    if (arms.size === 2) { const [X, Y] = [...arms.values()]; return `${X}${V}${Y}`; }
  }
  return null;
}

// The relations written as math in a clause: "AB = AC", "∢A + ∢B = 180°", "AB ∥ CD", "AB = BC = CA".
const OP_END = /[+\-*/(]$/;
const OP_START = /^[+\-*/)²°]/;
function tailExpr(s) {
  const toks = s.trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return '';
  const out = [toks.pop()];
  while (toks.length && (OP_END.test(toks[toks.length - 1]) || OP_START.test(out[0]))) out.unshift(toks.pop());
  return out.join(' ');
}
function headExpr(s) {
  const toks = s.trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return '';
  const out = [toks.shift()];
  while (toks.length && (OP_END.test(out[out.length - 1]) || OP_START.test(toks[0]))) out.push(toks.shift());
  return out.join(' ');
}
const REL_RUN = /(?:sin|cos|tan|[A-Z0-9∢△□°.,√²+\-*/()\s])*[=<>∥⊥≅∼](?:sin|cos|tan|[A-Z0-9∢△□°.,√²+\-*/()=<>∥⊥≅∼\s])*/g;

function relations(clause, ctx) {
  const items = [];
  const rest = clause.replace(REL_RUN, (run) => {
    const parts = run.split(/([=<>∥⊥≅∼])/);
    const sides = [];
    const ops = [];
    for (let i = 0; i < parts.length; i++) (i % 2 ? ops : sides).push(parts[i]);
    sides[0] = tailExpr(sides[0]);
    sides[sides.length - 1] = headExpr(sides[sides.length - 1]);
    for (let i = 0; i < ops.length; i++) {
      const L = fixAngles(sides[i].trim().replace(/[.,]+$/, ''), ctx);
      const R = fixAngles(sides[i + 1].trim().replace(/[.,]+$/, ''), ctx);
      if (!L || !R) { items.push({ kind: 'unknown', src: run.trim(), err: { key: 'noRelation' } }); continue; }
      items.push(claimItem(`${L} ${ops[i]} ${R}`, run.trim()));
    }
    return ' ';
  });
  return { items, rest };
}

const fixAngles = (s, ctx) => s.replace(/∢([A-Z])(?![A-Z])/g, (m, V) => { const a = resolveAngle(V, ctx); return a ? '∢' + a : m; });

function classify(clause, ctx) {
  const items = [];
  const setupBits = [];
  let rest = clause;
  for (const pat of SINGLE) {
    rest = rest.replace(pat.re, (...m) => {
      const got = pat.fn(m, ctx);
      for (const it of got) {
        if (it.kind === 'ctx') { if (it.tri) ctx.tris.push(it.tri); if (it.quad) ctx.quads.push(it.quad); }
        if (it.kind === 'fact' && it.fact === 'center') ctx.center = it.o;
      }
      items.push(...got.filter((x) => x.kind !== 'ctx').map((x) => ({ src: m[0].trim(), ...x })));
      if (pat.setup) setupBits.push(m[0].trim());
      return ' ';
    });
  }
  const rel = relations(rest, ctx);
  items.push(...rel.items);
  rest = rel.rest;
  // Anything left that still names a point or a number was not understood.
  const left = rest.replace(/[\s,.:;'"()\-]+/g, ' ').trim();
  if (/[A-Z∢△□0-9=<>∥⊥≅∼]/.test(left)) items.push({ kind: 'unknown', src: clause.trim() });
  return { items, setupBits };
}

// Cut a part of a sentence into clauses, after taking out the patterns that span "ו" and commas.
function analyzePart(part, ctx) {
  const pieces = [];
  const stash = [];
  let work = part;
  for (const pat of MULTI) {
    work = work.replace(pat.re, (...m) => {
      stash.push({ text: m[0].trim(), items: pat.fn(m, ctx).map((x) => ({ src: m[0].trim(), ...x })), setup: !!pat.setup });
      return ` ${SLOT}${stash.length - 1}${SLOT_END} `;
    });
  }
  work = work.replace(/([A-Z])\s*,\s*(?=[A-Z](?![A-Z]))/g, `$1${LIST}`);
  const clauses = work.split(new RegExp(`\\s*[,()]\\s*|\\s+ו-?\\s*(?=[A-Z∢△□${SLOT}])|\\s+וכן\\s+|\\s+ו(?=(?:ה|ב)?(?:נקוד|קטע|ישר|זווי|משולש|מרובע|מעגל|אלכסונ|צלע))`));
  for (let c of clauses) {
    if (!c || !c.trim()) continue;
    c = c.replace(new RegExp(LIST, 'g'), ', ');
    // a clause that starts with "ו-" before math ("ו-AD ⊥ BC" after a comma): the "ו" is a word, not a minus
    c = c.replace(new RegExp(`^\\s*ו-?\\s*(?=[A-Z∢△□${SLOT}]|sin|cos|tan)`), '');
    c = c.replace(new RegExp(`${SLOT}(\\d+)${SLOT_END}`, 'g'), (m, i) => {
      const s = stash[+i];
      pieces.push({ text: s.text, items: s.items, setup: s.setup ? s.text : '' });
      return ' ';
    });
    if (!c.trim()) continue;
    const { items, setupBits } = classify(c, ctx);
    const claims = items.some((x) => x.kind === 'claim' || x.kind === 'iso' || x.kind === 'equi' || x.kind === 'rightTri' || x.kind === 'unknown');
    pieces.push({ text: c.trim(), items, setup: claims ? setupBits.join(' ') : c.trim() });
  }
  return pieces;
}

// ctx: { pos?, segs?, circs? } from the drawing (optional).
export function parseText(text, drawingCtx = {}) {
  const s = normalizeText(text);
  const ctx = { tris: [], quads: [], center: null, pos: drawingCtx.pos || null, segs: drawingCtx.segs || [], rays: drawingCtx.pos ? computeRays(drawingCtx.pos) : null };
  const sentences = s.split(/\n+|(?<!\d)\.(?!\d)|[;!?]/).map((x) => x.trim()).filter(Boolean);
  const givenPieces = [];
  const goalPieces = [];
  const askPieces = [];
  let inGoal = false;
  let askMode = false;
  const introParts = [];
  for (const sentence of sentences) {
    let pre = sentence;
    let post = null;
    if (!inGoal) {
      const g = sentence.match(GOAL_RE);
      const a = sentence.match(ASK_RE);
      const hit = [g, a].filter(Boolean).sort((x, y) => x.index - y.index)[0];
      if (hit) {
        pre = sentence.slice(0, hit.index);
        post = sentence.slice(hit.index + hit[0].length);
        inGoal = true;
        askMode = hit === a;
      }
    } else {
      pre = null;
      post = sentence;
    }
    if (pre && pre.trim()) {
      const pieces = analyzePart(pre.replace(GIVEN_RE, ' '), ctx);
      givenPieces.push(...pieces);
      const setup = pieces.map((p) => p.setup).filter(Boolean).join(', ');
      if (setup) introParts.push(setup);
    }
    if (post && post.trim()) {
      if (askMode) askPieces.push(post.trim());
      else goalPieces.push(...analyzePart(post.replace(GIVEN_RE, ' '), ctx));
    }
  }

  const out = { givens: [], goal: null, extraGoals: [], facts: [], unknown: [], notes: [], tris: ctx.tris, quads: ctx.quads, center: ctx.center };
  const take = (pieces, role) => {
    const list = role === 'goal' ? out.extraGoals : out.givens;
    const shapes = [];
    for (const p of pieces) {
      for (const it of p.items) {
        if (it.kind === 'claim') list.push({ ...it, claim: fixAngles(it.claim, ctx) });
        else if (it.kind === 'fact') {
          if (it.diagOf !== undefined) {
            // "the diagonals meet at O": the diagonals of the quadrilateral the question names
            const q = it.diagOf || ctx.quads[ctx.quads.length - 1];
            if (q) out.facts.push({ ...it, l1: q[0] + q[2], l2: q[1] + q[3] }); else out.unknown.push({ kind: 'unknown', src: it.src, role, why: 'diag' });
          } else out.facts.push(it);
        } else if (it.kind === 'unknown') out.unknown.push({ ...it, role });
        else if (it.kind === 'iso' || it.kind === 'equi' || it.kind === 'rightTri') shapes.push(it);
        else if (it.kind === 'baseAngles') {
          const claim = baseAngles(it, ctx, [...out.givens, ...list]);
          if (claim) list.push(claimItem(claim, it.src)); else out.unknown.push({ kind: 'unknown', src: it.src, role });
        }
      }
    }
    // shapes last, so "משולש ABC שווה שוקיים (AB = AC)" doesn't state AB = AC twice
    for (const it of shapes) list.push(...resolveShape(it, ctx, list));
    const seen = new Set();
    const kept = list.filter((x) => { const k = x.claim.replace(/\s/g, ''); if (seen.has(k)) return false; seen.add(k); return true; });
    list.splice(0, list.length, ...kept);
  };
  take(givenPieces, 'given');
  take(goalPieces, 'goal');
  if (askPieces.length) {
    const txt = askPieces.join(' ');
    const m = txt.match(/∢[A-Z]{1,3}(?![A-Z])|(?<![A-Z])[A-Z]{2}(?![A-Z])/);
    if (m) out.goal = { ask: fixAngles(m[0], ctx), src: txt };
    else out.unknown.push({ kind: 'unknown', src: txt, role: 'goal' });
  } else if (out.extraGoals.length) {
    out.goal = out.extraGoals.shift();
  }
  out.intro = introParts.join('. ').replace(/\s+/g, ' ').trim();
  out.center = ctx.center || (out.facts.find((f) => f.fact === 'circle' && f.o) || {}).o || null;
  out.ctx = ctx;
  return out;
}

// "זוויות הבסיס שוות": the two angles of the triangle at the ends of its base. The apex is the vertex
// of a stated equality of two sides (AB = AC), else the one an "isosceles" phrase named.
function baseAngles(it, ctx, existing) {
  const tri = it.tri || ctx.tris[ctx.tris.length - 1];
  if (!tri) return null;
  let apex = null;
  for (const x of existing) {
    const m = x.claim.replace(/\s/g, '').match(/^([A-Z])([A-Z])=([A-Z])([A-Z])$/);
    if (!m) continue;
    const common = [m[1], m[2]].find((p) => p === m[3] || p === m[4]);
    if (common && tri.includes(common) && [m[1], m[2], m[3], m[4]].every((p) => tri.includes(p))) { apex = common; break; }
  }
  if (!apex) return null;
  const [p, q] = triOthers(tri, apex);
  return `∢${apex}${p}${q} = ∢${apex}${q}${p}`;
}

// "משולש ABC שווה שוקיים" and friends become claims, unless the question already states one.
function resolveShape(it, ctx, existing) {
  const [A, B, C] = letters(it.tri);
  const same = (claim) => existing.some((x) => x.claim.replace(/\s/g, '') === claim.replace(/\s/g, ''));
  if (it.kind === 'equi') {
    return [`${A}${B} = ${B}${C}`, `${B}${C} = ${C}${A}`].filter((c) => !same(c))
      .map((c) => claimItem(c, it.src, { text: H(`המשולש $${it.tri}$ שווה צלעות`, `Triangle $${it.tri}$ is equilateral`) }));
  }
  if (it.kind === 'iso') {
    const sides = [[A, B], [B, C], [C, A]];
    const sideOf = (s) => s.replace(/\s/g, '');
    // an equality of two sides of this triangle is already stated: nothing to add
    const stated = existing.some((x) => {
      const m = x.claim.replace(/\s/g, '').match(/^([A-Z]{2})=([A-Z]{2})$/);
      return m && [m[1], m[2]].every((s) => sides.some(([p, q]) => (s === p + q || s === q + p))) && sideOf(m[1]) !== sideOf(m[2]);
    });
    if (stated) return [];
    let apex = A; let note = 'isoAssumed';
    if (it.base) { apex = letters(it.tri).find((x) => !it.base.includes(x)) || A; note = null; }
    const [p, q] = triOthers(it.tri, apex);
    return [claimItem(`${apex}${p} = ${apex}${q}`, it.src, { note, text: H(`המשולש $${it.tri}$ שווה שוקיים`, `Triangle $${it.tri}$ is isosceles`) })];
  }
  // right triangle
  let v = it.v; let note = null;
  if (!v) {
    const has90 = existing.some((x) => {
      const m = x.claim.replace(/\s/g, '').match(/^∢([A-Z]{3})=90°?$|^90°?=∢([A-Z]{3})$/);
      return m && letters(m[1] || m[2]).every((l) => it.tri.includes(l));
    });
    if (has90) return [];
    if (ctx.pos && letters(it.tri).every((x) => ctx.pos[x])) {
      v = letters(it.tri).map((x) => [x, Math.abs(90 - angDeg(ctx.pos, ...triOthers(it.tri, x).slice(0, 1), x, triOthers(it.tri, x)[1]))]).sort((a, b) => a[1] - b[1])[0][0];
    } else v = letters(it.tri)[2];
    note = 'rightAssumed';
  }
  const [p, q] = triOthers(it.tri, v);
  return [claimItem(`∢${p}${v}${q} = 90°`, it.src, { note, text: H(`המשולש $${it.tri}$ ישר זווית ב-$${v}$`, `Triangle $${it.tri}$ has a right angle at $${v}$`) })];
}

// Wrap point names and short math in $…$ so the player typesets them left-to-right.
export function wrapMath(s) {
  return String(s || '').replace(/\$[^$]*\$|(?:sin|cos|tan)?[∢△□]?[A-Z]{1,4}(?:\s*[=<>∥⊥≅∼]\s*(?:sin|cos|tan)?[∢△□]?[A-Z0-9°.]+)*/g, (m) => (m.startsWith('$') ? m : `$${m}$`));
}

// ---------------------------------------------------------------- the drawing as a witness

const LEN_TOL = 0.02; // relative
const ANG_TOL = 1; // degrees
const NONPAR_MIN = 5; // degrees between lines that must not be parallel (a trapezoid's legs)

function termVal(t, pos) {
  if (t.kind === 'seg') return { v: dist(pos[t.p[0]], pos[t.p[1]]), dim: 1 };
  if (t.kind === 'ang') return { v: angDeg(pos, ...t.p), dim: 0, ang: true };
  if (t.kind === 'trig') return { v: Math[t.fn](angDeg(pos, ...t.a.p) / DEG), dim: 0 };
  if (t.kind === 'area' || t.kind === 'area4') {
    const Q = t.p.map((x) => pos[x]); // the shoelace formula, for a triangle or a quadrilateral
    return { v: Math.abs(Q.reduce((s, q, i) => s + q[0] * Q[(i + 1) % Q.length][1] - Q[(i + 1) % Q.length][0] * q[1], 0)) / 2, dim: 2 };
  }
  let v = 1; let dim = 0;
  for (const x of t.f) { const r = termVal(x.t, pos); v *= r.v ** x.e; dim += r.dim * x.e; }
  return { v, dim };
}
function sideVal(side, pos, scale) {
  let v = side.k; let needScale = false;
  for (const { c, t } of side.terms) {
    const r = termVal(t, pos);
    if (r.dim !== 0) { if (scale == null) needScale = true; v += c * r.v * (scale || 1) ** r.dim; } else v += c * r.v;
  }
  return { v, needScale };
}
const lineDir = (pos, [P, Q]) => { const u = sub(pos[Q], pos[P]); const n = norm(u) || 1; return [u[0] / n, u[1] / n]; };
const lineAngle = (pos, a, b) => Math.acos(Math.min(1, Math.abs(dot(lineDir(pos, a), lineDir(pos, b))))) * DEG;
const rel = (a, b) => (a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-9);

// The scale of the drawing: real length per drawing unit, from the first given "XY = number".
export function drawingScale(parsedGivens, pos) {
  for (const c of parsedGivens) {
    if (!c || c.type !== 'eq' || c.of !== 'len') continue;
    const [s, n] = c.left && c.left.kind === 'seg' && c.right && c.right.kind === 'num' ? [c.left, c.right]
      : c.right && c.right.kind === 'seg' && c.left && c.left.kind === 'num' ? [c.right, c.left] : [];
    if (s && n.v > 0) { const d = dist(pos[s.p[0]], pos[s.p[1]]); if (d > 1e-9) return { scale: n.v / d, by: s.p.join('') }; }
  }
  return { scale: null, by: null };
}

// Errors of a claim in the drawing, each { v, tol } (|v| ≤ tol means it holds), or null when the
// drawing can't say (a length given as a number and no scale).
export function claimErrors(c, pos, scale) {
  if (!c) return null;
  if (typeof c.extErrs === 'function') return c.extErrs(pos, scale); // claim types from geo-more.js
  const quadErr = (kind, P) => {
    const [A, B, C, D] = P;
    const par = (a, b) => ({ v: lineAngle(pos, a, b), tol: ANG_TOL });
    const perp = (a, b) => ({ v: 90 - lineAngle(pos, a, b), tol: ANG_TOL });
    const eq = (a, b) => ({ v: rel(dist(pos[a[0]], pos[a[1]]), dist(pos[b[0]], pos[b[1]])), tol: LEN_TOL });
    // legs that are not parallel: zero once they meet at NONPAR_MIN° or more, so a trapezoid is
    // never a parallelogram (Lean's IsTrapezoid says ¬ AD ∥ BC)
    const notPar = (a, b) => ({ v: Math.max(0, NONPAR_MIN - lineAngle(pos, a, b)), tol: ANG_TOL });
    const pg = [par([A, B], [D, C]), par([A, D], [B, C])];
    switch (kind) {
      case 'parallelogram': return pg;
      case 'rectangle': return [...pg, perp([A, B], [B, C])];
      case 'rhombus': return [...pg, eq([A, B], [B, C])];
      case 'square': return [...pg, perp([A, B], [B, C]), eq([A, B], [B, C])];
      case 'kite': return [eq([A, B], [A, D]), eq([C, B], [C, D])];
      case 'trapezoid': return [par([A, B], [D, C]), notPar([A, D], [B, C])];
      case 'isoTrapezoid': return [par([A, B], [D, C]), notPar([A, D], [B, C]), eq([A, D], [B, C])];
      default: return [];
    }
  };
  if (c.type === 'quad') return quadErr(c.kind, c.P);
  if (c.type === 'par') return [{ v: lineAngle(pos, c.a, c.b), tol: ANG_TOL }];
  if (c.type === 'perp') return [{ v: 90 - lineAngle(pos, c.a, c.b), tol: ANG_TOL }];
  if (c.type === 'cong' || c.type === 'sim') {
    const pairs = [[0, 1], [1, 2], [0, 2]].map(([i, j]) => [dist(pos[c.P[i]], pos[c.P[j]]), dist(pos[c.Q[i]], pos[c.Q[j]])]);
    if (c.type === 'cong') return pairs.map(([a, b]) => ({ v: rel(a, b), tol: LEN_TOL }));
    const r = pairs.map(([a, b]) => a / Math.max(b, 1e-9));
    return [{ v: rel(r[0], r[1]), tol: LEN_TOL }, { v: rel(r[0], r[2]), tol: LEN_TOL }];
  }
  const L = sideVal(c.L, pos, scale); const R = sideVal(c.R, pos, scale);
  if (L.needScale || R.needScale) {
    // a pure comparison of lengths (AB = AC, AB = 2CD) does not depend on the scale
    const homog = Math.abs(c.L.k) < 1e-12 && Math.abs(c.R.k) < 1e-12;
    if (!homog) return null;
    const L1 = sideVal(c.L, pos, 1); const R1 = sideVal(c.R, pos, 1);
    if (c.type === 'ineq') return [{ v: Math.max(0, (c.op === '>' ? R1.v - L1.v : L1.v - R1.v) / Math.max(Math.abs(L1.v), 1e-9) + LEN_TOL), tol: LEN_TOL }];
    return [{ v: rel(L1.v, R1.v), tol: LEN_TOL }];
  }
  if (c.of === 'ang') {
    if (c.type === 'ineq') return [{ v: Math.max(0, (c.op === '>' ? R.v - L.v : L.v - R.v) + ANG_TOL), tol: ANG_TOL }];
    return [{ v: L.v - R.v, tol: ANG_TOL }];
  }
  if (c.type === 'ineq') return [{ v: Math.max(0, (c.op === '>' ? R.v - L.v : L.v - R.v) / Math.max(Math.abs(L.v), 1e-9) + LEN_TOL), tol: LEN_TOL }];
  return [{ v: rel(L.v, R.v), tol: LEN_TOL }];
}

export function holds(c, pos, scale) {
  const e = claimErrors(c, pos, scale);
  if (!e) return null;
  return e.every((x) => Math.abs(x.v) <= x.tol + 1e-9);
}

// What the drawing shows for the terms of a claim, for the review screen: "AB ≈ 4.1, AC ≈ 4.6".
export function measured(c, pos, scale) {
  if (!c) return [];
  const out = [];
  const fmt = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(/\.?0+$/, '');
  const seg = (P, Q) => out.push(`${P}${Q} ≈ ${fmt(dist(pos[P], pos[Q]) * (scale || 1))}`);
  const ang = (X, V, Y) => out.push(`∢${X}${V}${Y} ≈ ${Math.round(angDeg(pos, X, V, Y))}°`);
  const walk = (t) => {
    if (t.kind === 'seg') seg(...t.p);
    else if (t.kind === 'ang') ang(...t.p);
    else if (t.kind === 'trig') walk(t.a);
    else if (t.kind === 'mono') t.f.forEach((x) => walk(x.t));
  };
  if (c.type === 'eq' || c.type === 'ineq') { [...c.L.terms, ...c.R.terms].forEach((x) => walk(x.t)); }
  else if (c.type === 'par' || c.type === 'perp') out.push(`${c.a.join('')}, ${c.b.join('')}: ${Math.round(lineAngle(pos, c.a, c.b))}°`);
  else if (c.type === 'cong' || c.type === 'sim') { [[0, 1], [1, 2], [0, 2]].forEach(([i, j]) => { seg(c.P[i], c.P[j]); seg(c.Q[i], c.Q[j]); }); }
  else if (c.type === 'quad') { const P = c.P; [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(([i, j]) => seg(P[i], P[j])); }
  return [...new Set(out)];
}

// ---------------------------------------------------------------- straightening the drawing
// Levenberg–Marquardt over the free parts of the drawing (free points, positions along a
// segment, angles on a circle), so that every given holds exactly, while staying close to what
// the teacher drew.

function variables(d) {
  const vars = [];
  d.pts.forEach((p, i) => {
    if (!p.c) { vars.push({ i, f: 'x' }, { i, f: 'y' }); }
    else if (p.c.k === 'seg') vars.push({ i, f: 't' });
    else if (p.c.k === 'circ') vars.push({ i, f: 'th' });
  });
  return vars;
}
const getVar = (d, v) => (v.f === 'x' || v.f === 'y' ? d.pts[v.i][v.f] : d.pts[v.i].c[v.f]);
function setVar(d, v, x) {
  if (v.f === 'x' || v.f === 'y') d.pts[v.i][v.f] = x;
  else if (v.f === 't') d.pts[v.i].c.t = Math.min(0.995, Math.max(0.005, x));
  else d.pts[v.i].c.th = x;
}

function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

// claims: parsed claims to make true; extra: [{ type: 'tangent', p, t, o }] facts.
export function straighten(drawing, claims, { extra = [], iterations = 120 } = {}) {
  const d = JSON.parse(JSON.stringify(drawing));
  const vars = variables(d);
  if (!vars.length) return { drawing: d, ok: false };
  const pos0 = solveDrawing(d);
  const spans = Object.values(pos0);
  const xs = spans.map((p) => p[0]); const ys = spans.map((p) => p[1]);
  const typ = Math.max(1e-6, Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 3);
  const { scale } = drawingScale(claims, pos0);
  const x0 = vars.map((v) => getVar(d, v));
  const LAMBDA = 1e-3;
  const residuals = (x) => {
    vars.forEach((v, k) => setVar(d, v, x[k]));
    const pos = solveDrawing(d);
    const r = [];
    for (const c of claims) {
      const e = claimErrors(c, pos, scale);
      if (e) for (const { v, tol } of e) r.push(v / tol);
    }
    for (const f of extra) {
      if (f.type === 'tangent' && pos[f.p] && pos[f.t] && pos[f.o]) r.push((90 - angDeg(pos, f.o, f.t, f.p)) / ANG_TOL);
    }
    vars.forEach((v, k) => {
      const w = v.f === 't' ? 1 : v.f === 'th' ? 1 : 1 / typ;
      r.push(Math.sqrt(LAMBDA) * (x[k] - x0[k]) * w);
    });
    return r;
  };
  const cost = (r) => r.reduce((s, v) => s + v * v, 0);
  let x = [...x0];
  let r = residuals(x);
  let F = cost(r);
  let mu = 1e-3;
  for (let it = 0; it < iterations; it++) {
    const n = x.length;
    const J = r.map(() => new Array(n).fill(0));
    for (let k = 0; k < n; k++) {
      const h = (vars[k].f === 'x' || vars[k].f === 'y' ? typ : 1) * 1e-6;
      const xp = [...x]; xp[k] += h;
      const rp = residuals(xp);
      for (let i = 0; i < r.length; i++) J[i][k] = (rp[i] - r[i]) / h;
    }
    const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => J.reduce((s, row) => s + row[i] * row[j], 0)));
    const g = Array.from({ length: n }, (_, i) => J.reduce((s, row, k) => s + row[i] * r[k], 0));
    let improved = false;
    for (let tries = 0; tries < 8 && !improved; tries++) {
      const Am = A.map((row, i) => row.map((v, j) => (i === j ? v * (1 + mu) + 1e-12 : v)));
      const step = solveLinear(Am, g.map((v) => -v));
      if (!step) { mu *= 10; continue; }
      const xn = x.map((v, k) => v + step[k]);
      const rn = residuals(xn);
      const Fn = cost(rn);
      if (Fn < F) {
        improved = F - Fn > 1e-14;
        x = xn; r = rn; F = Fn;
        mu = Math.max(mu / 3, 1e-9);
        if (!improved) break;
      } else mu *= 4;
    }
    if (!improved) break;
    const claimPart = r.slice(0, r.length - vars.length);
    if (claimPart.every((v) => Math.abs(v) < 1e-4)) break;
  }
  vars.forEach((v, k) => setVar(d, v, x[k]));
  const pos = solveDrawing(d);
  // free points get rounded coordinates, then constrained points are recomputed exactly
  for (const p of d.pts) { p.x = pos[p.id][0]; p.y = pos[p.id][1]; }
  const ok = claims.every((c) => holds(c, pos, scale) !== false)
    && extra.every((f) => f.type !== 'tangent' || !pos[f.o] || Math.abs(90 - angDeg(pos, f.o, f.t, f.p)) <= ANG_TOL);
  return { drawing: d, ok };
}

// ---------------------------------------------------------------- marks, labels, stage

class Groups {
  constructor() { this.parent = new Map(); this.item = new Map(); }
  add(key, item) { if (!this.parent.has(key)) { this.parent.set(key, key); this.item.set(key, item); } }
  find(k) { while (this.parent.get(k) !== k) k = this.parent.get(k); return k; }
  union(a, b) { this.parent.set(this.find(a), this.find(b)); }
  groups() {
    const g = new Map();
    for (const k of this.parent.keys()) { const r = this.find(k); if (!g.has(r)) g.set(r, []); g.get(r).push(this.item.get(k)); }
    return [...g.values()].filter((x) => x.length > 1);
  }
}

// Textbook marks from the givens and the goal: ticks for equal segments, arcs for equal angles,
// angle sizes, right-angle squares and arrows for parallel lines.
export function autoMarks(givens, goal, pos) {
  const rays = computeRays(pos);
  const aKey = (p) => angKey(p[0], p[1], p[2], rays);
  const marks = [];
  const segG = new Groups(); const angG = new Groups(); const parG = new Groups();
  const angleMark = new Map(); // angKey → mark
  const right = [];
  const arc = (p, extra) => {
    const k = aKey(p);
    const m = angleMark.get(k) || { type: 'arc', ang: p.join(''), r: 30 };
    Object.assign(m, extra);
    angleMark.set(k, m);
  };
  const rightAt = (a, b, goalMark) => {
    // the named point where lines a and b meet
    const onA = Object.keys(pos).filter((n) => n === a[0] || n === a[1] || collinear(pos, a[0], a[1], n));
    const onB = Object.keys(pos).filter((n) => n === b[0] || n === b[1] || collinear(pos, b[0], b[1], n));
    const V = onA.find((n) => onB.includes(n));
    if (!V) return;
    const X = onA.find((n) => n !== V); const Y = onB.find((n) => n !== V);
    if (X && Y) right.push({ type: 'right', ang: X + V + Y, ...(goalMark ? { goal: true } : {}) });
  };
  for (const c of givens) {
    if (!c) continue;
    if (c.type === 'eq' && c.left && c.right) {
      const [l, r] = [c.left, c.right];
      if (l.kind === 'seg' && r.kind === 'seg') {
        const a = segKey(...l.p); const b = segKey(...r.p);
        segG.add(a, l.p.join('')); segG.add(b, r.p.join('')); segG.union(a, b);
      } else if (l.kind === 'ang' && r.kind === 'ang') {
        const a = aKey(l.p); const b = aKey(r.p);
        angG.add(a, l.p); angG.add(b, r.p); angG.union(a, b);
      } else if ((l.kind === 'ang' && r.kind === 'num') || (r.kind === 'ang' && l.kind === 'num')) {
        const [t, n] = l.kind === 'ang' ? [l, r] : [r, l];
        if (Math.abs(n.v - 90) < 1e-9) right.push({ type: 'right', ang: t.p.join('') });
        else arc(t.p, { label: `${+n.v.toFixed(2)}°` });
      }
    } else if (c.type === 'par') {
      const a = c.a.join(''); const b = c.b.join('');
      parG.add(a, c.a); parG.add(b, c.b); parG.union(a, b);
    } else if (c.type === 'perp') rightAt(c.a, c.b, false);
    else if (c.type === 'quad' && ['rectangle', 'square'].includes(c.kind)) right.push({ type: 'right', ang: c.P[3] + c.P[0] + c.P[1] });
  }
  segG.groups().slice(0, 3).forEach((g, i) => g.forEach((s) => marks.push({ type: 'tick', seg: s, n: i + 1 })));
  const ag = angG.groups().slice(0, 3);
  ag.forEach((g, i) => g.forEach((p) => arc(p, { n: i + 1 })));
  parG.groups().slice(0, 2).forEach((g, i) => {
    const ref = lineDir(pos, g[0]);
    g.forEach((p) => {
      const d = lineDir(pos, p);
      marks.push({ type: 'par', seg: dot(ref, d) >= 0 ? p.join('') : p[1] + p[0], n: i + 1 });
    });
  });
  if (goal) {
    if ((goal.type === 'eq' || goal.type === 'ineq') && goal.left && goal.right) {
      const [l, r] = [goal.left, goal.right];
      if (l.kind === 'ang' && r.kind === 'num' && goal.type === 'eq') {
        if (Math.abs(r.v - 90) < 1e-9) right.push({ type: 'right', ang: l.p.join(''), goal: true });
        else arc(l.p, { label: '?', goal: true, r: 34 });
      } else if (l.kind === 'ang' && r.kind === 'ang') { arc(l.p, { goal: true, r: 34 }); arc(r.p, { goal: true, r: 34 }); }
    } else if (goal.type === 'perp') rightAt(goal.a, goal.b, true);
  }
  return [...marks, ...angleMark.values(), ...right];
}

// Where each label goes: in the widest gap between the lines that meet at the point,
// in the player's pixel units (y down).
export function labelOffsets(pos, segs, circs) {
  const out = {};
  for (const n of Object.keys(pos)) {
    const dirs = [];
    for (const [P, Q] of segs) {
      if (!pos[P] || !pos[Q]) continue;
      if (P === n) dirs.push(sub(pos[Q], pos[n]));
      else if (Q === n) dirs.push(sub(pos[P], pos[n]));
      else if (collinear(pos, P, Q, n) && dot(sub(pos[P], pos[n]), sub(pos[Q], pos[n])) < 0) { dirs.push(sub(pos[P], pos[n])); dirs.push(sub(pos[Q], pos[n])); }
    }
    for (const c of circs) {
      if (!pos[c.o] || !pos[c.r] || c.o === n) continue;
      const R = dist(pos[c.o], pos[c.r]);
      if (Math.abs(dist(pos[c.o], pos[n]) - R) < 1e-6 * R) {
        const inward = sub(pos[c.o], pos[n]);
        dirs.push(inward, [-inward[1], inward[0]], [inward[1], -inward[0]]);
      } else if (n === c.o) continue;
    }
    if (!dirs.length) continue;
    const angs = dirs.filter((u) => norm(u) > 1e-9).map((u) => Math.atan2(u[1], u[0])).sort((a, b) => a - b);
    if (!angs.length) continue;
    let best = angs[0] + Math.PI; let gap = -1;
    for (let i = 0; i < angs.length; i++) {
      const a = angs[i]; const b = i + 1 < angs.length ? angs[i + 1] : angs[0] + 2 * Math.PI;
      if (b - a > gap) { gap = b - a; best = (a + b) / 2; }
    }
    if (angs.length === 1) best = angs[0] + Math.PI;
    out[n] = [Math.round(Math.cos(best) * 20), Math.round(-Math.sin(best) * 20)];
  }
  return out;
}

const hasTerm = (c, pred) => {
  if (!c || !c.L) return false;
  const walk = (t) => pred(t) || (t.kind === 'trig' && walk(t.a)) || (t.kind === 'mono' && t.f.some((x) => walk(x.t)));
  return [...c.L.terms, ...c.R.terms].some((x) => walk(x.t));
};

// The latest stage the question needs, judged from what it talks about. The teacher confirms.
export function suggestStage(givens, parsedGivens, goal, config) {
  const all = [...parsedGivens, goal].filter(Boolean);
  const mids = givens.filter((g) => (g.also || []).includes('midpoint_def')).length;
  const segEq = parsedGivens.filter((c) => c && c.type === 'eq' && c.left && c.right && c.left.kind === 'seg' && c.right.kind === 'seg');
  const sharesVertex = segEq.some((c) => c.left.p.some((x) => c.right.p.includes(x)));
  const tests = [
    ['L11', all.some((c) => hasTerm(c, (t) => t.kind === 'trig')), 'trig'],
    ['L10', config.some((c) => c.type === 'circle' || c.type === 'tangent'), 'circle'],
    ['L09', all.some((c) => c.type === 'sim' || hasTerm(c, (t) => t.kind === 'mono' && t.f.some((x) => x.e < 0))), 'sim'],
    ['L08', all.some((c) => hasTerm(c, (t) => t.kind === 'mono' && t.f.some((x) => x.e === 2))), 'pyth'],
    ['L07', mids >= 2, 'midseg'],
    ['L06', all.some((c) => c.type === 'quad'), 'quad'],
    ['L05', all.some((c) => c.type === 'ineq'), 'ineq'],
    ['L04', all.some((c) => c.type === 'par'), 'par'],
    ['L03', sharesVertex && goal && (goal.type === 'perp' || (goal.of === 'ang')), 'iso'],
    ['L02', all.some((c) => c.type === 'cong') || (goal && goal.type === 'eq' && goal.of === 'len' && !goal.L.k && !goal.R.k) || segEq.length > 0, 'cong'],
  ];
  const hit = tests.find((x) => x[1]);
  return hit ? { stage: hit[0], why: hit[2] } : { stage: 'L01', why: 'angles' };
}

// ---------------------------------------------------------------- review and problem

// The canonical way to store a claim: the player's own notation (Hebrew quadrilateral names).
export function canonClaim(c) {
  if (!c) return '';
  if (c.type === 'quad') return `${c.P.join('')} ${QUADS[c.kind].he}`;
  return fmtClaim(c);
}

// Everything the review screen shows, filled in from the words and the drawing.
export function buildReview(drawing, text, { title = '', stage = null } = {}) {
  const pos = solveDrawing(drawing);
  const parsed = parseText(text, { pos, segs: drawing.segs || [] });
  const ctx = claimContext(pos);
  const seen = new Set();
  const givens = [];
  for (const g of parsed.givens) {
    const r = parseClaim(g.claim, ctx);
    const key = r.ok ? claimKey(r.claim) : g.claim;
    if (seen.has(key)) continue;
    seen.add(key);
    // The canonical form, unless it loses precision: a constant like 2√3·sin80° is shown with three
    // decimals, so then the teacher's own wording is kept (it reads back exactly).
    let claim = g.claim;
    if (r.ok) {
      const canon = canonClaim(r.claim);
      const back = parseClaim(canon, ctx);
      claim = back.ok && claimKey(back.claim) === key ? canon : g.claim;
    }
    givens.push({ claim, text: g.text || null, also: g.also || [], note: g.note || null, src: g.src || '', foot: g.foot || null, bis: g.bis || null });
  }
  let goal = null;
  if (parsed.goal && parsed.goal.ask) {
    goal = { claim: '', ask: parsed.goal.ask, src: parsed.goal.src, value: suggestValue(parsed.goal.ask, ctx, givens, pos) };
  } else if (parsed.goal) {
    const r = parseClaim(parsed.goal.claim, ctx);
    goal = { claim: r.ok ? canonClaim(r.claim) : parsed.goal.claim, src: parsed.goal.src, note: parsed.goal.note || null, text: parsed.goal.text || null };
  }
  const tangents = tangentFacts(parsed, drawing, pos);
  const parsedGivens = givens.map((g) => parseClaim(g.claim, ctx)).map((r) => (r.ok ? r.claim : null));
  const goalParsed = goal && goal.claim ? (parseClaim(goal.claim, ctx).claim || null) : null;
  const config = [...drawingConfig(drawing, pos), ...tangents.map((t) => t.fact)];
  const st = suggestStage(givens, parsedGivens, goalParsed, config);
  return {
    title: title || suggestTitle(parsed, goal),
    intro: wrapMath(parsed.intro),
    stage: stage || st.stage,
    stageWhy: st.why,
    givens,
    goal,
    facts: parsed.facts,
    tangents: tangents.map((t) => ({ p: t.fact.p, t: t.fact.t, o: t.fact.o })),
    center: parsed.center,
    unknown: parsed.unknown,
    extraGoals: parsed.extraGoals.map((x) => x.claim),
    hints: [],
    marksOff: [],
  };
}

// The answer the drawing shows, only when the drawing already satisfies every given
// (a rough drawing would suggest a wrong answer).
function suggestValue(ask, ctx, givens, pos) {
  const r = parseClaim(`${ask} = 0`, ctx);
  if (!r.ok || !r.claim.left) return '';
  const pg = givens.map((g) => parseClaim(g.claim, ctx)).map((x) => (x.ok ? x.claim : null));
  const { scale } = drawingScale(pg.filter(Boolean), pos);
  if (pg.some((c) => !c || holds(c, pos, scale) === false)) return '';
  const t = r.claim.left;
  if (t.kind === 'ang') return `${Math.round(angDeg(pos, ...t.p))}°`;
  if (t.kind === 'seg') return scale ? String(+(dist(pos[t.p[0]], pos[t.p[1]]) * scale).toFixed(2)) : '';
  return '';
}

function suggestTitle(parsed, goal) {
  const fig = parsed.quads[0] ? `מרובע ${parsed.quads[0]}` : parsed.tris[0] ? `משולש ${parsed.tris[0]}` : '';
  const g = goal ? (goal.ask ? `חישוב ${goal.ask}` : goal.claim) : '';
  if (!fig && parsed.intro) return parsed.intro.split(/\.\s/)[0].trim().slice(0, 80);
  return [fig, g].filter(Boolean).join(': ').slice(0, 80);
}

function tangentFacts(parsed, drawing, pos) {
  const out = [];
  const circs = (drawing.circs || []).filter((c) => pos[c.o] && pos[c.r]);
  for (const f of parsed.facts.filter((x) => x.fact === 'tangent')) {
    // the touching point is the letter on a circle
    const onCircles = (n) => circs.filter((c) => pos[n] && Math.abs(dist(pos[c.o], pos[n]) - dist(pos[c.o], pos[c.r])) < 1e-6 * dist(pos[c.o], pos[c.r]));
    const T = f.t || [f.a, f.b].find((n) => onCircles(n).length);
    const P = [f.a, f.b].find((n) => n !== T);
    let cs = T && P ? onCircles(T) : [];
    // "משיק למעגל שמרכזו N": that circle. Otherwise, when T is on several circles (two circles that
    // touch at T), every circle the line really touches at T: their common tangent.
    if (f.o) cs = cs.filter((c) => c.o === f.o);
    else if (cs.length > 1) {
      const touch = cs.filter((c) => pos[P] && Math.abs(90 - angDeg(pos, c.o, T, P)) <= ANG_TOL);
      cs = touch.length ? touch : cs.slice(0, 1);
    }
    for (const c of cs) out.push({ fact: tangentFact(P, T, c.o), src: f.src });
  }
  return out;
}

// The checks behind the review screen. Errors block saving; warnings are for the teacher to judge.
export function reviewReport(review, drawing) {
  const pos = solveDrawing(drawing);
  const ctx = claimContext(pos);
  const names = Object.keys(pos);
  const errors = [];
  const warnings = [];
  const givens = review.givens.map((g) => {
    const r = parseClaim(g.claim, ctx);
    return { ...g, parsed: r.ok ? r.claim : null, err: r.ok ? null : r.error };
  });
  const parsedGivens = givens.map((g) => g.parsed);
  const { scale, by } = drawingScale(parsedGivens, pos);
  for (const g of givens) {
    if (g.err) { errors.push({ key: 'givenBad', claim: g.claim, err: g.err }); continue; }
    g.holds = holds(g.parsed, pos, scale);
    g.measured = measured(g.parsed, pos, scale);
    if (g.holds === false) warnings.push({ key: 'givenNotDrawn', claim: g.claim });
  }
  let goal = null;
  const goalClaim = review.goal ? (review.goal.ask ? (review.goal.value ? `${review.goal.ask} = ${review.goal.value}` : '') : review.goal.claim) : '';
  if (!goalClaim) {
    errors.push({ key: review.goal && review.goal.ask ? 'goalNoValue' : 'noGoal' });
    // what the drawing shows, as a hint for the answer
    const r = review.goal && review.goal.ask ? parseClaim(`${review.goal.ask} = 0`, ctx) : null;
    if (r && r.ok) goal = { claim: '', parsed: null, err: null, measured: measured(r.claim, pos, scale) };
  } else {
    const r = parseClaim(goalClaim, ctx);
    goal = { claim: goalClaim, parsed: r.ok ? r.claim : null, err: r.ok ? null : r.error };
    if (!r.ok) errors.push({ key: 'goalBad', claim: goalClaim, err: r.error });
    else {
      goal.holds = holds(r.claim, pos, scale);
      goal.measured = measured(r.claim, pos, scale);
      if (parsedGivens.some((c) => c && claimKey(c) === claimKey(r.claim))) errors.push({ key: 'goalIsGiven' });
    }
  }
  if (!givens.length) warnings.push({ key: 'noGivens' });
  if (names.length < 2) errors.push({ key: 'noDrawing' });
  // every point the words use must be in the drawing
  const used = new Set();
  const mark = (s) => { for (const ch of String(s).match(/[A-Z]/g) || []) used.add(ch); };
  // not point names: sin/cos/tan, and the S of an area (S△ABC, S(ABC))
  const letters = (s) => String(s).replace(/sin|cos|tan/gi, '').replace(/S(?=\s*[△□(])/g, '');
  review.givens.forEach((g) => mark(letters(g.claim)));
  if (goalClaim) mark(letters(goalClaim));
  (review.facts || []).forEach((f) => [f.p, f.a, f.b, f.o, f.l1, f.l2, f.line, ...(f.pts || [])].forEach((x) => x && mark(x)));
  const missing = [...used].filter((x) => !pos[x]).sort();
  if (missing.length) errors.push({ key: 'missingPoints', pts: missing });
  const unused = names.filter((n) => !used.has(n) && !String(review.intro || '').includes(n));
  if (unused.length) warnings.push({ key: 'unusedPoints', pts: unused });
  for (const u of review.unknown || []) if (!u.dismissed) errors.push({ key: 'unknown', src: u.src, err: u.err || null });
  if ((review.extraGoals || []).length) warnings.push({ key: 'extraGoals', claims: review.extraGoals });
  if ((drawing.circs || []).length > 1) warnings.push({ key: 'manyCircles' });
  for (const g of givens) if (g.note) warnings.push({ key: g.note, claim: g.claim });
  // position facts the words state, checked against the drawing
  const config = [...drawingConfig(drawing, pos), ...(review.tangents || []).filter((t) => pos[t.p] && pos[t.t] && pos[t.o]).map((t) => tangentFact(t.p, t.t, t.o))];
  const facts = (review.facts || []).filter((f) => f.fact !== 'tangent').map((f) => ({ ...f, ok: factHolds(f, drawing, pos, review) }));
  for (const f of facts) if (f.ok === false) errors.push({ key: 'factNotDrawn', fact: f });
  for (const t of review.tangents || []) {
    if (!pos[t.p] || !pos[t.t] || !pos[t.o]) continue;
    const a = angDeg(pos, t.o, t.t, t.p);
    if (Math.abs(90 - a) > ANG_TOL) warnings.push({ key: 'tangentNotDrawn', fact: t, angle: Math.round(a) });
  }
  // the drawing must witness the givens, and then the goal should hold too
  const witness = givens.every((g) => g.holds !== false) && (review.tangents || []).every((t) => !pos[t.o] || Math.abs(90 - angDeg(pos, t.o, t.t, t.p)) <= ANG_TOL);
  if (!witness) errors.push({ key: 'notWitness' });
  else if (goal && goal.holds === false) errors.push({ key: review.goal && review.goal.ask ? 'answerWrong' : 'goalFalse', measured: goal.measured });
  const marks = autoMarks(parsedGivens, goal ? goal.parsed : null, pos);
  // a final check exactly as the player prepares the problem
  if (!errors.length) {
    const problem = buildProblem(review, drawing);
    const v = validateProblem(problem);
    for (const e of v) errors.push(e);
  }
  return { pos, givens, goal, scale, scaleBy: by, config, facts, errors, warnings, marks, witness };
}

function factHolds(f, drawing, pos, review) {
  const has = (...xs) => xs.every((x) => x && pos[x]);
  const strictlyBetween = (a, o, b) => collinear(pos, a, b, o) && dot(sub(pos[a], pos[o]), sub(pos[b], pos[o])) < 0;
  const center = f.o || review.center || (drawing.circs && drawing.circs[0] && drawing.circs[0].o) || null;
  const onCirc = (n) => (drawing.circs || []).some((c) => c.o === center && pos[c.r] && pos[n] && Math.abs(dist(pos[c.o], pos[n]) - dist(pos[c.o], pos[c.r])) < 1e-6 * dist(pos[c.o], pos[c.r]));
  switch (f.fact) {
    case 'on': return has(f.p, f.a, f.b) ? strictlyBetween(f.a, f.p, f.b) : null;
    case 'ext': return has(f.p, f.a, f.b) ? collinear(pos, f.a, f.b, f.p) && !strictlyBetween(f.a, f.p, f.b) && f.p !== f.a && f.p !== f.b : null;
    case 'cross': return has(f.o, f.l1[0], f.l1[1], f.l2[0], f.l2[1]) ? collinear(pos, f.l1[0], f.l1[1], f.o) && collinear(pos, f.l2[0], f.l2[1], f.o) : null;
    case 'online': return has(f.p, f.line[0], f.line[1]) ? f.line.includes(f.p) || collinear(pos, f.line[0], f.line[1], f.p) : null;
    case 'circle': return center ? (f.pts || []).every((n) => onCirc(n)) : false;
    case 'center': return (drawing.circs || []).some((c) => c.o === f.o);
    case 'diam': return center && has(f.a, f.b, center) ? onCirc(f.a) && onCirc(f.b) && strictlyBetween(f.a, center, f.b) : null;
    default: return null;
  }
}

// The problem object the player runs (the format of PROBLEMS in data.js).
export function buildProblem(review, drawing) {
  const pos = solveDrawing(drawing);
  const ctx = claimContext(pos);
  const points = {};
  for (const n of Object.keys(pos)) points[n] = [+pos[n][0].toFixed(12), +pos[n][1].toFixed(12)];
  const segs = (drawing.segs || []).filter(([a, b]) => pos[a] && pos[b]).map(([a, b]) => a + b);
  const givens = review.givens.map((g) => {
    const out = { claim: g.claim };
    if (g.text && (g.text.he || g.text.en)) out.text = { ...g.text };
    if (g.also && g.also.length) out.also = [...g.also];
    return out;
  });
  const goalClaim = review.goal ? (review.goal.ask ? `${review.goal.ask} = ${review.goal.value}` : review.goal.claim) : '';
  const parsedGivens = givens.map((g) => { const r = parseClaim(g.claim, ctx); return r.ok ? r.claim : null; });
  const gp = parseClaim(goalClaim, ctx);
  const off = new Set(review.marksOff || []);
  const marks = autoMarks(parsedGivens, gp.ok ? gp.claim : null, pos).filter((m) => !off.has(markId(m)));
  const config = [...drawingConfig(drawing, pos), ...(review.tangents || []).filter((t) => pos[t.p] && pos[t.t] && pos[t.o]).map((t) => tangentFact(t.p, t.t, t.o))];
  return {
    title: { he: String(review.title || '').trim() },
    intro: { he: String(review.intro || '').trim() },
    points,
    labelOffset: labelOffsets(pos, drawing.segs || [], drawing.circs || []),
    segments: segs,
    config,
    givens,
    goal: goalClaim,
    marks,
    hints: (review.hints || []).map((h) => String(h || '').trim()).filter(Boolean).map((h) => ({ he: h })),
  };
}

export const markId = (m) => `${m.type}:${m.seg || m.ang}`;

// The same checks a built-in problem gets: givens and goal parse when the player prepares the
// problem, and the coordinates witness the givens.
export function validateProblem(problem) {
  const errors = [];
  const p = JSON.parse(JSON.stringify(problem));
  const stage = STAGES[0].id;
  const origError = console.error;
  console.error = () => {};
  try { prepareProblem(p, stage); } finally { console.error = origError; }
  p.givensParsed.forEach((c, i) => { if (!c) errors.push({ key: 'givenBad', claim: problem.givens[i].claim }); });
  if (!p.goalParsed) errors.push({ key: 'goalBad', claim: problem.goal });
  const { scale } = drawingScale(p.givensParsed.filter(Boolean), p.points);
  if (p.givensParsed.some((c) => c && holds(c, p.points, scale) === false)) errors.push({ key: 'notWitness' });
  return errors;
}

// ---------------------------------------------------------------- stored questions

const TEXT_MAX = { title: 120, intro: 2000, text: 300, hint: 600 };
const clip = (s, n) => String(s == null ? '' : s).slice(0, n);

// Teacher text for rich() in i18n.js, which typesets $…$ (escaping it) and passes the rest as HTML:
// escape everything outside $…$, and leave $…$ for rich() to escape once. The split finds exactly
// the segments rich() finds, since escaping adds and removes no "$".
export const escRich = (s) => String(s == null ? '' : s).split(/(\$[^$]+\$)/).map((part, i) => (i % 2 ? part : esc(part))).join('');

const plainLT = (o, n) => (o && typeof o === 'object' ? { he: esc(clip(o.he, n)), ...(o.en ? { en: esc(clip(o.en, n)) } : {}) } : { he: esc(clip(o, n)) });
const safeLT = (o, n) => (o && typeof o === 'object' ? { he: escRich(clip(o.he, n)), ...(o.en ? { en: escRich(clip(o.en, n)) } : {}) } : { he: escRich(clip(o, n)) });

// A stored question as the player gets it. Every text a teacher typed is escaped here, because
// the player renders titles, intros, givens' texts and hints as trusted HTML (only $…$ is typeset).
export function playable(stored, id) {
  const pr = typeof stored.data === 'string' ? JSON.parse(stored.data) : stored.data;
  const out = {
    n: id,
    bankId: id,
    title: plainLT(pr.title, TEXT_MAX.title), // shown as plain text, without $…$ typesetting
    titleRaw: clip(pr.title && pr.title.he, TEXT_MAX.title),
    intro: safeLT(pr.intro, TEXT_MAX.intro),
    points: {},
    labelOffset: {},
    segments: (pr.segments || []).filter((s) => /^[A-Z]{2}$/.test(s)),
    config: [],
    givens: [],
    goal: String(pr.goal || ''),
    marks: [],
    hints: (pr.hints || []).slice(0, 12).map((h) => safeLT(h, TEXT_MAX.hint)),
  };
  for (const [n, p] of Object.entries(pr.points || {})) {
    if (/^[A-Z]$/.test(n) && Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)) out.points[n] = [p[0], p[1]];
  }
  for (const [n, p] of Object.entries(pr.labelOffset || {})) {
    if (out.points[n] && Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)) out.labelOffset[n] = [p[0], p[1]];
  }
  const P = (x) => typeof x === 'string' && /^[A-Z]$/.test(x) && out.points[x];
  for (const c of pr.config || []) {
    if (c.type === 'between' && P(c.a) && P(c.o) && P(c.b)) out.config.push(betweenFact(c.a, c.o, c.b, c.text && /נמצאת על/.test(String(c.text.he || '')) ? [c.a, c.b] : null));
    else if (c.type === 'circle' && P(c.o) && Array.isArray(c.on) && c.on.every(P)) out.config.push(circleFact(c.o, [...c.on]));
    else if (c.type === 'tangent' && P(c.p) && P(c.t) && P(c.o)) out.config.push(tangentFact(c.p, c.t, c.o));
  }
  for (const g of (pr.givens || []).slice(0, 40)) {
    const x = { claim: String(g.claim || '') };
    if (g.text) x.text = safeLT(g.text, TEXT_MAX.text);
    if (Array.isArray(g.also)) x.also = g.also.filter((r) => ['midpoint_def', 'bisector_def'].includes(r));
    out.givens.push(x);
  }
  const MARK_TYPES = ['tick', 'arc', 'right', 'par'];
  for (const m of pr.marks || []) {
    if (!MARK_TYPES.includes(m.type)) continue;
    const x = { type: m.type };
    if (m.seg && /^[A-Z]{2}$/.test(m.seg) && [...m.seg].every(P)) x.seg = m.seg;
    if (m.ang && /^[A-Z]{3}$/.test(m.ang) && [...m.ang].every(P)) x.ang = m.ang;
    if (!x.seg && !x.ang) continue;
    if (Number.isInteger(m.n) && m.n >= 0 && m.n <= 3) x.n = m.n;
    if (Number.isFinite(m.r)) x.r = Math.min(60, Math.max(10, m.r));
    if (m.label) x.label = esc(clip(m.label, 12));
    if (m.goal) x.goal = true;
    out.marks.push(x);
  }
  // Named parameters (r = OX, α = ∢OCX, S = S△MEO) and rounded answers, used by the bagrut questions:
  // geo-more.js replaces a name by its term before a claim is read.
  if (pr.names && typeof pr.names === 'object') {
    const names = {};
    for (const [k, v] of Object.entries(pr.names).slice(0, 8)) {
      if (/^[A-Za-zα-ωΑ-Ω]{1,2}$/.test(k) && typeof v === 'string' && /^[A-Z∢△□]{2,7}$/.test(v)) names[k] = v;
    }
    if (Object.keys(names).length) out.names = names;
  }
  if (pr.rounding && Number.isInteger(pr.rounding.min) && pr.rounding.min >= 0 && pr.rounding.min <= 6) out.rounding = { min: pr.rounding.min };
  return out;
}
