// The Lean checking service: `checker/checker.py` in the Lean project (`~/LeanGame` in WSL).
// When it runs, Lean is the judge of every row: its verdicts replace the in-browser check
// (geo.js), which stays as the instant first answer and as the fallback.
//
// The site contacts the service only when the site itself is served from this computer
// (localhost), or after `localStorage['lg.leanService']` is set to the service's address,
// because browsers ask a visitor's permission before a public site may reach localhost.

import { t, esc } from './i18n.js';
import { fmtClaim, claimKey, sameNameFacts } from './geo.js';

const DEFAULT_URL = 'http://localhost:8790';
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

function serviceUrl() {
  let v = null;
  try { v = localStorage.getItem('lg.leanService'); } catch { /* no storage */ }
  if (v) { try { v = JSON.parse(v); } catch { /* a plain string */ } }
  if (typeof v === 'string' && /^https?:\/\//.test(v)) return v.replace(/\/+$/, '');
  return LOCAL_HOSTS.includes(location.hostname) ? DEFAULT_URL : null;
}

export const leanEnabled = () => serviceUrl() !== null;

let state = 'unknown'; // 'online' | 'offline' | 'unknown'
let lastProbe = 0;
export const leanState = () => state;

async function probe(url) {
  if (state === 'offline' && Date.now() - lastProbe < 15000) return false;
  lastProbe = Date.now();
  try {
    const r = await fetch(url + '/health', { signal: AbortSignal.timeout(2000) });
    state = r.ok && (await r.json()).ok ? 'online' : 'offline';
  } catch {
    state = 'offline';
  }
  return state === 'online';
}

// A row that restates a given under a reason the given allows (`also`, e.g. the definition of
// an angle bisector) is, for Lean, the given itself.
function reasonFor(p, row, r) {
  if (!row.reason || !r || !r.parsed.ok) return row.reason || null;
  const key = claimKey(r.parsed.claim);
  const restated = (p.givens || []).some((g, i) =>
    (g.also || []).includes(row.reason) && p.givensParsed[i] && claimKey(p.givensParsed[i]) === key);
  return restated ? 'given' : row.reason;
}

// The request: the question and the rows, as structures (never Lean text).
function request(p, rows, results) {
  return {
    points: p.points,
    config: p.config.map(({ type, a, o, b }) => ({ type, a, o, b })),
    givens: p.givensParsed,
    // Every name of the same angle or segment, as equalities: facts from the diagram.
    nameFacts: sameNameFacts(p),
    goal: p.goalParsed,
    allowed: p.allowed,
    rows: rows.map((row, i) => ({
      claim: results[i] && results[i].parsed.ok ? results[i].parsed.claim : null,
      reason: reasonFor(p, row, results[i]),
      refs: row.refs || [],
    })),
  };
}

/** Ask Lean to check the rows. Returns the service's answer, or null when it isn't available. */
export async function leanCheck(p, rows, results) {
  const url = serviceUrl();
  if (!url) return null;
  if (state !== 'online' && !(await probe(url))) return null;
  try {
    const r = await fetch(url + '/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request(p, rows, results)),
      signal: AbortSignal.timeout(90000),
    });
    const res = await r.json();
    return r.ok && res.ok ? res : null;
  } catch {
    state = 'offline';
    return null;
  }
}

function missingText(m) {
  if (m.kind === 'claim') return `$${m.text}$`;
  if (m.kind === 'between') {
    const [a, o, b] = m.points.map((x) => `$${x}$`);
    return t('lean.between', { a, o, b });
  }
  if (m.kind === 'triangle') return t('lean.triangle', { t: `$△${m.points.join('')}$` });
  return m.text;
}

// Lean's feedback, as one of the messages the site already shows (i18n.js, `err.*`).
function message(e, row, r) {
  switch (e.key) {
    case 'missing': {
      const m = e.missing.map(missingText).join(', ');
      return { key: e.missing.length === 1 ? 'critMissing1' : 'critMissingN', vars: { rid: row.reason, m } };
    }
    case 'shape':
      return { key: 'reasonNoFit', vars: { rid: row.reason } };
    case 'algebraFail':
      return {
        key: 'algebraFail',
        vars: { rows: (row.refs || []).join(', '), claim: r.parsed.ok ? `$${fmtClaim(r.parsed.claim)}$` : '…' },
      };
    case 'notGiven': case 'notInDiagram': case 'refBad': case 'reasonNotAllowed':
    case 'refFuture': case 'needRefs': case 'noReason':
      return { key: e.key, vars: e.vars || {} };
    default:
      return { key: 'leanRaw', vars: { text: esc(e.text || e.key) } };
  }
}

/** Replace the browser's verdicts in `local` (the result of geo.js checkProof) with Lean's. */
export function applyLean(local, res, rows) {
  local.results.forEach((r, i) => {
    const l = res.rows[i];
    if (!l) return;
    // Reasons Lean doesn't have yet, and claim shapes it can't read yet: the browser's verdict stands.
    if (!l.ok && l.error && ['unknownReason', 'badClaim'].includes(l.error.key)) return;
    r.byLean = true;
    // A claim the browser could not read keeps the browser's message, which says why.
    if (!r.parsed.ok) return;
    r.ok = l.ok;
    r.goal = l.goal;
    r.msg = l.ok ? null : message(l.error || { key: 'leanRaw' }, rows[i], r);
  });
  const gi = local.results.findIndex((r) => r.ok && r.goal);
  local.solvedAt = gi >= 0 && local.results.slice(0, gi).every((r) => r.ok) ? gi : -1;
  local.blocked = gi >= 0 && local.solvedAt < 0;
  return local;
}
