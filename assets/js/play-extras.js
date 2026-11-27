// Helpers for the proof screen (app.js):
//   - insertPick: a point, segment or angle tapped in the diagram goes into the claim being written;
//   - newReasons: theorems and definitions the student has not used yet in a solved problem, shown as
//     buttons next to "given" and "algebra" until they have used them (then they are typed like the rest);
//   - findSkip: "skip steps", a tool that is closed unless the admin opens it (tools.js, skipSteps).
//     The student writes a conclusion in one row; the game finds the theorem row in between and the
//     calculation, adds them as rows of their own and says so.
// Its words are kept here, in Hebrew and English, apart from i18n.js.

import { REASONS } from './data.js';
import { parseClaim, checkProof, autoReason, claimKey, eqVec, fmtClaim, termKey } from './geo.js';
import { PROVED_IN } from './tools.js';
import { getLang } from './i18n.js';

const TXT = {
  he: {
    tip: 'לחצו על נקודה, צלע או זווית בשרטוט, והיא תיכנס לטענה.',
    pin: 'השרטוט נשאר למעלה בזמן הכתיבה. לחיצה משחררת אותו.',
    unpin: 'הצמדת השרטוט למעלה בזמן הכתיבה',
    newTag: 'חדש',
    newTitle: 'משפט חדש. אחרי שתשתמשו בו בשאלה שפתרתם, מקלידים את שמו כמו את שאר המשפטים.',
    skipLine: 'דילוג שלבים: התוכנה תוסיף לבד {steps}.',
    skipDone: 'דילגתם על שלבים, והתוכנה הוסיפה לבד: {steps}.',
    skipTag: 'דילוג',
    skipTagTitle: 'השורה נוספה בדילוג שלבים',
    rowN: 'שורה {n}',
    then: ', ואז ',
    yours: 'הטענה שלכם',
  },
  en: {
    tip: 'Tap a point, side or angle in the diagram to add it to the claim.',
    pin: 'The diagram stays on top while you write. Tap to let it scroll.',
    unpin: 'Keep the diagram on top while you write',
    newTag: 'new',
    newTitle: 'A new theorem. Once you have used it in a solved problem, you type its name like the others.',
    skipLine: 'Skip steps: the game adds {steps} by itself.',
    skipDone: 'You skipped steps, so the game added: {steps}.',
    skipTag: 'skipped',
    skipTagTitle: 'Added by skip steps',
    rowN: 'row {n}',
    then: ', then ',
    yours: 'your claim',
  },
};

export function PX(key, vars) {
  let s = TXT[getLang()]?.[key] ?? TXT.he[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}

// On localhost, "?skipsteps" opens the skip-steps tool for testing without an account.
export const DEV_SKIP = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
  && new URLSearchParams(location.search).has('skipsteps');

// ---------------------------------------------------------------- tap to insert

const OP_END = /[=+\-−<>≅∼∥⊥*/(]$/;
const SPACED_OP = /[=<>≅∼∥⊥+\-−]$/;

// The claim text after inserting a tapped item at `caret`: { value, caret }.
// A point joins the name being written (∢A → ∢AB, △AB → △ABC). An angle right after a lone ∢
// replaces it. A segment or angle right after another term gets " = " in between.
export function insertPick(value, caret, hit) {
  const at = Math.max(0, Math.min(caret ?? value.length, value.length));
  const before = value.slice(0, at);
  const after = value.slice(at);
  const b = before.replace(/\s+$/, '');
  let head;
  if (hit.kind === 'pt') head = before;
  else if (hit.kind === 'ang' && /∢$/.test(b)) head = b.slice(0, -1);
  else if (!b) head = '';
  else if (/[△(]$/.test(b)) head = b;
  else if (OP_END.test(b)) head = b + (SPACED_OP.test(b) ? ' ' : '');
  else head = b + ' = ';
  const tail = after && !/^\s/.test(after) && hit.kind !== 'pt' ? ' ' + after : after;
  return { value: head + hit.text + tail, caret: (head + hit.text).length };
}

// ---------------------------------------------------------------- new theorems as buttons

const QUICK_KINDS = new Set(['theorem', 'definition']);
const MAX_NEW = 8;

// The reasons of this stage (and theorems the student proved themselves) that they have not used in
// any solved problem. `all`: the saved progress; `ownKey`: this problem's key, left out.
export function newReasons(p, stageId, all, ownKey) {
  const used = new Set();
  for (const [k, v] of Object.entries(all || {})) {
    if (k === ownKey || !v || !v.solved || !Array.isArray(v.rows)) continue;
    for (const r of v.rows) if (r && r.reason && !r.auto) used.add(r.reason);
  }
  return (p.allowed || [])
    .filter((id) => {
      const R = REASONS[id];
      return R && QUICK_KINDS.has(R.kind) && !used.has(id) && (R.stage === stageId || !!PROVED_IN[id]);
    })
    .slice(0, MAX_NEW);
}

// ---------------------------------------------------------------- skip steps

// Reasons a skipped row may use: theorems, definitions and the basic facts (not "given", "algebra",
// constructions, or "the same segment/angle").
const BRIDGE_KINDS = new Set(['theorem', 'definition', 'basic']);
const NO_BRIDGE = new Set(['common_side', 'common_angle']);
const MAX_ATOMS = 9;

const termText = (t) => (t.kind === 'ang' ? '∢' + t.p.join('') : t.p.join(''));

function atomsOf(claim, out) {
  if (!claim || (claim.type !== 'eq' && claim.type !== 'ineq')) return;
  for (const side of [claim.L, claim.R]) {
    for (const { t } of side.terms) {
      if (t.kind === 'ang' || t.kind === 'seg') out.set(termKey(t), t);
    }
  }
}

function* pairs(a) { for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) yield [a[i], a[j]]; }
function* triples(a) {
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) for (let k = j + 1; k < a.length; k++) yield [a[i], a[j], a[k]];
}

// The rows in between that the game may write itself, cheapest first.
function* bridgeTexts(angs, segs) {
  const A = angs.map(termText);
  const S = segs.map(termText);
  for (const [x, y] of pairs(A)) { yield `${x} + ${y} = 180°`; yield `${x} = ${y}`; }
  for (const [x, y] of pairs(S)) yield `${x} = ${y}`;
  for (const x of A) yield `${x} = 90°`;
  for (const [x, y, z] of triples(A)) {
    yield `${x} + ${y} + ${z} = 180°`;
    yield `${x} = ${y} + ${z}`; yield `${y} = ${x} + ${z}`; yield `${z} = ${x} + ${y}`;
  }
  for (const [x, y, z] of triples(S)) { yield `${x} + ${y} = ${z}`; yield `${x} + ${z} = ${y}`; yield `${y} + ${z} = ${x}`; }
}

const fake = (claim, n) => ({ n, ok: true, parsed: { ok: true, claim } });

// For a claim the student wrote without a reason (and that is not a plain calculation): the rows that
// get there, ending with the claim itself as a calculation. Rows: givens the proof has not written yet,
// one theorem row, and the claim. null when nothing that short works.
//   p: the prepared problem; rows: the proof; upto: where the claim goes (index); text: the claim.
// Returns { rows: [{ text, reason, refs, skip: true }, ...] }; every row checks out in checkProof.
export function findSkip(p, rows, upto, text) {
  const parsed = parseClaim(text, p);
  if (!parsed.ok || (parsed.claim.type !== 'eq' && parsed.claim.type !== 'ineq')) return null;
  const target = parsed.claim;
  const before = rows.slice(0, upto);
  const res = checkProof(p, before).results;
  const okRes = res.filter((r) => r.ok && r.parsed.ok);
  const have = new Set(okRes.map((r) => claimKey(r.parsed.claim)));
  const missing = (p.givensParsed || []).filter((g) => !have.has(claimKey(g)));
  const givenRows = missing.map((g) => ({ text: fmtClaim(g), reason: 'given', refs: [] }));
  const nG = missing.length;
  const base = [...res, ...missing.map((g, i) => fake(g, upto + 1 + i))];
  const bridgeN = upto + nG + 1;

  // Does the claim follow by calculation from the rows, the missing givens and `extra` (row bridgeN)?
  const follows = (extra) => {
    const list = extra ? [...base, fake(extra, bridgeN)] : base;
    const a = autoReason(p, list, target, list.length);
    return a && a.reason === 'algebra' && a.refs.length ? a : null;
  };

  const okNums = res.map((r, i) => (r.ok ? i + 1 : 0)).filter(Boolean);
  const refPool = [...okNums.slice(-10), ...missing.map((_, i) => upto + 1 + i)];
  const pre = [...before, ...givenRows];
  const reasonFor = (candText) => {
    for (const rid of p.allowed) {
      const R = REASONS[rid];
      if (!R || !BRIDGE_KINDS.has(R.kind) || NO_BRIDGE.has(rid)) continue;
      const opts = R.refs === 0 ? [[]] : R.refs === 1 ? refPool.map((k) => [k]) : R.refs === 2 ? [...pairs(refPool)] : [];
      for (const refs of opts) {
        const trial = [...pre, { text: candText, reason: rid, refs }];
        if (checkProof(p, trial).results[trial.length - 1].ok) return { reason: rid, refs };
      }
    }
    return null;
  };

  // Keep only the givens that a row cites, and number the rows again.
  const assemble = (bridge, algRefs) => {
    const usedG = missing.map((_, i) => upto + 1 + i).filter((k) => algRefs.includes(k) || (bridge && bridge.refs.includes(k)));
    const map = new Map();
    usedG.forEach((k, j) => map.set(k, upto + 1 + j));
    if (bridge) map.set(bridgeN, upto + usedG.length + 1);
    const re = (refs) => refs.map((k) => map.get(k) ?? k).sort((a, b) => a - b);
    const out = [
      ...usedG.map((k) => ({ ...givenRows[k - upto - 1], skip: true })),
      ...(bridge ? [{ text: bridge.text, reason: bridge.reason, refs: re(bridge.refs), skip: true }] : []),
      { text, reason: 'algebra', refs: re(algRefs), skip: true },
    ];
    const check = checkProof(p, [...before, ...out]).results.slice(upto);
    return check.every((r) => r.ok) ? { rows: out } : null;
  };

  // Only givens were missing.
  const direct = follows(null);
  if (direct) return assemble(null, direct.refs);

  // One theorem row in between.
  const angs = new Map();
  const segs = new Map();
  for (const c of [...okRes.map((r) => r.parsed.claim), ...missing, target]) {
    const m = new Map();
    atomsOf(c, m);
    for (const [k, t] of m) (t.kind === 'ang' ? angs : segs).set(k, t);
  }
  const tried = new Set();
  for (const candText of bridgeTexts([...angs.values()].slice(0, MAX_ATOMS), [...segs.values()].slice(0, MAX_ATOMS))) {
    const c = parseClaim(candText, p);
    if (!c.ok) continue;
    const key = claimKey(c.claim);
    if (tried.has(key) || have.has(key)) continue;
    tried.add(key);
    if (c.claim.type === 'eq' && !eqVec(c.claim).size) continue; // the same thing twice
    const a = follows(c.claim);
    if (!a || !a.refs.includes(bridgeN)) continue;
    const r = reasonFor(candText);
    if (!r) continue;
    const done = assemble({ text: candText, ...r }, a.refs);
    if (done) return done;
  }
  return null;
}
