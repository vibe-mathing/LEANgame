// Proof tools that open as the student progresses, and the black screen before a hint.
// The admin has every tool open and never waits, except while viewing the site as a
// student. Teachers get the same (fullAccess). Who is playing comes from the account module (auth.js); until it loads,
// nobody is admin.
//
// Settings come in three layers, and each can leave a setting out: the defaults below,
// the site-wide settings the admin saves on the admin page (Firestore config/tools,
// tracks.default), and the settings for the student's track (tracks['3'], …).

import { STAGES, PROBLEMS, REASONS, stageNumber, progressKey } from './data.js';
import { parseClaim, claimKey, fmtClaim, checkProof, termKey } from './geo.js';
import { t, L, esc } from './i18n.js';

// ---------------------------------------------------------------- the tools
// open: 'start', a problem ('L01-2': the tool opens once the student solves it, so it
// follows their progress to any device), or 'never'. A stage id ('L01': every problem
// of the stage) still works, for settings saved before problems were the rule.
// For now every tool is open from the start (the user's choice); the admin page can
// change that per track, and per student.
// hintWait: seconds of black screen before hint 1, 2, 3…; the last value repeats.
// tryFirst: the hint opens after the student's first row of their own (rows a tool
// wrote don't count) or after this many seconds on the problem; 0 = no condition.

export const TOOLS = {
  fillGivens: { open: 'start', icon: 'enter' },
  autoRefs: { open: 'start', icon: 'search' },
  cpctList: { open: 'start', icon: 'spark' },
  clickFacts: { open: 'start', icon: 'enter' },
  // "Ask for a reason" (geo.js findReason): finds the reason and the rows for a claim.
  askReason: { open: 'start', icon: 'search' },
  hint: { open: 'start', icon: 'bulb' },
  // Skip steps (play-extras.js findSkip): a feature, closed unless the admin opens it for a track
  // (the admin page's table) or for one student ('open:skipSteps' in their features).
  skipSteps: { open: 'never', icon: 'spark' },
};
const SETTABLE = Object.keys(TOOLS);
const DEFAULTS = { ...Object.fromEntries(SETTABLE.map((id) => [id, TOOLS[id].open])), hintWait: [10, 30, 60], tryFirst: 120 };
const TRACKS = ['default', '3', '4', '5', 'uni'];

// Problems as 'L01-2' keys, and their site label "1.2".
const problemKey = progressKey;
const splitKey = (k) => { const m = /^(L\d\d)-(\d+)$/.exec(k || ''); return m ? { stage: m[1], n: +m[2] } : null; };
const problemLabel = (k) => { const s = splitKey(k); return s ? `${stageNumber(s.stage)}.${s.n}` : ''; };
const problemExists = (k) => { const s = splitKey(k); return !!(s && (PROBLEMS[s.stage] || []).some((p) => p.n === s.n)); };

// ---------------------------------------------------------------- who is playing, and the settings

let auth = null;
let config = {};
const listeners = new Set();
// Called when the settings, the user, or the admin's student view change.
export const onToolsChange = (cb) => { listeners.add(cb); return () => listeners.delete(cb); };
const changed = () => listeners.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });

import('./auth.js').then((m) => {
  auth = m;
  if (m.onAuthChange) m.onAuthChange(() => changed());
  return reloadToolConfig();
}).catch(() => { /* no accounts */ });

export async function reloadToolConfig() {
  if (!auth || !auth.getToolConfig) return;
  try { config = (await auth.getToolConfig()) || {}; } catch { config = {}; }
  changed();
}

// "View as student": an admin picks a track and sees exactly what its students see.
// Kept for this browser tab only.
let preview = null;
try { preview = sessionStorage.getItem('lg.viewAs') || null; } catch { /* ignore */ }
export const realAdmin = () => !!(auth && auth.isAdmin && auth.isAdmin());
export const viewAs = () => (realAdmin() ? preview : null);
export function setViewAs(track) {
  preview = TRACKS.includes(track) ? track : null;
  try { if (preview) sessionStorage.setItem('lg.viewAs', preview); else sessionStorage.removeItem('lg.viewAs'); } catch { /* ignore */ }
  changed();
}
export const isAdmin = () => realAdmin() && !preview;
// Admins and teachers can do everything: every theorem of every stage, every tool, no waiting.
// While an admin views the site as a student, they get exactly what that student gets.
export const fullAccess = () => isAdmin() || !!(auth && auth.isTeacher && auth.isTeacher());

const currentUser = () => (auth && auth.currentUser ? auth.currentUser() : null);

// Keep only well-formed values, so a bad document can't break the game.
const STAGE_IDS = new Set(STAGES.map((s) => s.id));
const validOpen = (v) => v === 'start' || v === 'never' || STAGE_IDS.has(v) || problemExists(v);
function clean(s) {
  const out = {};
  if (!s || typeof s !== 'object') return out;
  for (const id of SETTABLE) if (validOpen(s[id])) out[id] = s[id];
  if (Array.isArray(s.hintWait) && s.hintWait.length && s.hintWait.every((x) => Number.isInteger(x) && x >= 0 && x <= 600)) out.hintWait = s.hintWait.slice(0, 10);
  if (Number.isInteger(s.tryFirst) && s.tryFirst >= 0 && s.tryFirst <= 1800) out.tryFirst = s.tryFirst;
  return out;
}

export function settingsFor(track) {
  const tr = (config && config.tracks) || {};
  return { ...DEFAULTS, ...clean(tr.default), ...(track && track !== 'default' ? clean(tr[track]) : {}) };
}
const current = () => settingsFor(viewAs() || (currentUser() && currentUser().track) || 'default');

// ---------------------------------------------------------------- opening rules
// Per-student settings live in the profile's `features`, which only an admin can write:
// 'open:<tool>' opens a tool whatever the track says, and 'lock:<tool>' closes it (lock
// wins). A bare tool id (the old way "click a fact" was given) counts as 'open:'.
// While an admin views as a student, their own list is ignored.

const myFeatures = () => {
  const u = viewAs() ? null : currentUser();
  return u && Array.isArray(u.features) ? u.features : [];
};
const override = (id) => {
  const f = myFeatures();
  return f.includes('lock:' + id) ? 'lock' : f.includes('open:' + id) || f.includes(id) ? 'open' : null;
};

export function toolOpen(id, isSolved) {
  if (fullAccess()) return true;
  const o = override(id);
  if (o) return o === 'open';
  const open = current()[id];
  if (open === 'start') return true;
  if (open === 'never') return false;
  const k = splitKey(open);
  if (k) return isSolved(k.stage, k.n);
  const probs = PROBLEMS[open] || [];
  return probs.length > 0 && probs.every((p) => isSolved(open, p.n));
}

// When a locked tool opens, for its lock icon's title.
export function toolLockText(id) {
  if (override(id) === 'lock') return t('tool.lockedForYou');
  const open = current()[id];
  if (splitKey(open)) return t('tool.lockedQ', { q: problemLabel(open) });
  const n = stageNumber(open);
  return n > 0 ? t('tool.locked', { n }) : t('tool.closed');
}

// Tools set to open after a problem of `stageId` (or after the whole stage), for the
// level map.
const stageOf = (open) => (splitKey(open) ? splitKey(open).stage : STAGE_IDS.has(open) ? open : null);
export const toolsAfter = (stageId) => SETTABLE.filter((id) => stageOf(current()[id]) === stageId);

// ---------------------------------------------------------------- theorems the student proves
// A problem with `proves: '<reason id>'` is where the student proves that theorem. Until
// they solve it, the reason stays out of their toolbox, in every problem (admins and teachers
// always have it). PROVED_IN maps the reason to that problem.

export const PROVED_IN = (() => {
  const m = {};
  for (const s of STAGES) for (const p of PROBLEMS[s.id] || []) if (p.proves) m[p.proves] = { stage: s.id, n: p.n };
  return m;
})();
export const reasonEarned = (id, isSolved) => fullAccess() || !PROVED_IN[id] || isSolved(PROVED_IN[id].stage, PROVED_IN[id].n);
// "2.4": the problem that proves the reason, as the site numbers problems.
export const provedInLabel = (id) => (PROVED_IN[id] ? `${stageNumber(PROVED_IN[id].stage)}.${PROVED_IN[id].n}` : '');

// The wait before hint number k + 1.
export const hintSeconds = (k) => {
  const w = current().hintWait;
  return w[Math.min(k, w.length - 1)];
};

// Seconds until the hint opens; 0 = open. `earned`: the student already took a hint
// here or solved the problem before. `since`: when they opened the problem (ms).
export function hintTryLeft({ ownRows, earned, since }) {
  const seconds = current().tryFirst;
  if (fullAccess() || earned || !seconds || ownRows >= 1) return 0;
  return Math.max(0, Math.ceil(seconds - (Date.now() - since) / 1000));
}

// The settings that apply to whoever is playing (or the track an admin views as).
export const toolSettings = () => current();

// "2 minutes", "a minute", "45 seconds".
export function durationText(sec) {
  if (sec % 60 === 0) return sec === 60 ? t('tool.dur.oneMin') : t('tool.dur.min', { n: sec / 60 });
  return t('tool.dur.sec', { n: sec });
}

// ---------------------------------------------------------------- enter givens
// The rows for the givens the proof doesn't have yet, as { add, rows }: they go on
// top, and the existing rows move down with their references shifted. null when
// every given is already there. `filled` marks rows the tool wrote, not the student.

export function fillGivens(p, rows) {
  const have = new Set(rows.map((r) => {
    const c = parseClaim(r.text, p);
    return c.ok ? claimKey(c.claim) : null;
  }));
  const add = p.givensParsed
    .filter((g) => !have.has(claimKey(g)))
    .map((g) => ({ text: fmtClaim(g), reason: 'given', refs: [], filled: true }));
  if (!add.length) return null;
  const k = add.length;
  return { add: k, rows: [...add, ...rows.map((r) => ({ ...r, refs: (r.refs || []).map((x) => x + k) }))] };
}

// ---------------------------------------------------------------- automatic references
// The earlier rows that let `reason` prove `text`: every choice of rows that check out
// is tried on the checker, smallest choices first. { refs }, { error: 'noClaim' }, or
// null when no choice works.

function* choose(arr, k, from = 0, pick = []) {
  if (pick.length === k) { yield [...pick]; return; }
  for (let i = from; i < arr.length; i++) {
    pick.push(arr[i]);
    yield* choose(arr, k, i + 1, pick);
    pick.pop();
  }
}

export function findRefs(p, rows, upto, text, reason) {
  if (!parseClaim(text, p).ok) return { error: 'noClaim' };
  const need = REASONS[reason] ? REASONS[reason].refs : 0;
  if (!need) return null;
  const before = rows.slice(0, upto);
  const okRows = checkProof(p, before).results.map((r, i) => (r.ok ? i + 1 : 0)).filter(Boolean).slice(-14);
  for (const k of need === 'many' ? [1, 2, 3] : [need]) {
    for (const refs of choose(okRows, k)) {
      if (checkProof(p, [...before, { text, reason, refs }]).results[upto].ok) return { refs };
    }
  }
  return null;
}

// ---------------------------------------------------------------- conclusions from a congruence
// For every congruence row that checks out: its corresponding sides and angles that the
// proof doesn't state yet, as rows ready to add ({ text, reason, refs }). A pair that is
// one segment or one angle under two names (AD = AD) is left out.

export function congConclusions(p, results) {
  const have = new Set(results.filter((r) => r.parsed.ok).map((r) => claimKey(r.parsed.claim)));
  const out = [];
  results.forEach((r, i) => {
    if (!r.ok || !r.parsed.ok || r.parsed.claim.type !== 'cong') return;
    const { P, Q } = r.parsed.claim;
    const sides = [[0, 1], [1, 2], [0, 2]].map(([a, b]) => ({ text: `${P[a]}${P[b]} = ${Q[a]}${Q[b]}`, reason: 'cpct_side' }));
    const angles = [0, 1, 2].map((v) => {
      const [a, b] = [0, 1, 2].filter((x) => x !== v);
      return { text: `∢${P[a]}${P[v]}${P[b]} = ∢${Q[a]}${Q[v]}${Q[b]}`, reason: 'cpct_angle' };
    });
    const items = [...sides, ...angles].filter((it) => {
      if (!p.allowed.includes(it.reason)) return false;
      const c = parseClaim(it.text, p);
      if (!c.ok || !c.claim.left || !c.claim.right || termKey(c.claim.left) === termKey(c.claim.right)) return false;
      return !have.has(claimKey(c.claim));
    }).map((it) => ({ ...it, refs: [i + 1] }));
    if (items.length) out.push({ n: i + 1, claim: r.parsed.claim, items });
  });
  return out;
}

// ---------------------------------------------------------------- the wait before a hint
// A black screen with a countdown. It counts real time, but only while the tab is
// visible, so switching tabs doesn't shorten the wait. Resolves true when the time
// is up and false on cancel (button, Escape, or `signal` aborting).

export function hintWait({ seconds = hintSeconds(0), signal } = {}) {
  if (fullAccess() || seconds <= 0) return Promise.resolve(true);
  return new Promise((resolve) => {
    const R = 56;
    const C = 2 * Math.PI * R;
    const total = seconds * 1000;
    const back = document.activeElement;
    const el = document.createElement('div');
    el.className = 'hint-wait';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'hwTitle');
    el.setAttribute('aria-describedby', 'hwText');
    el.innerHTML = `
      <div class="hw-in">
        <div class="hw-clock" aria-hidden="true">
          <svg class="hw-ring" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="${R}" class="hw-bg"/>
            <circle cx="64" cy="64" r="${R}" class="hw-fg" stroke-dasharray="${C}" stroke-dashoffset="0"/>
          </svg>
          <span class="hw-num">${seconds}</span>
        </div>
        <p class="hw-title" id="hwTitle">${t('tool.wait.t')}</p>
        <p class="hw-text" id="hwText">${t('tool.wait.p')}</p>
        <p class="sr" aria-live="polite"></p>
        <button type="button" class="hw-cancel">${t('tool.wait.cancel')}</button>
      </div>`;

    const others = [...document.body.children].filter((x) => !x.inert);
    others.forEach((x) => { x.inert = true; });
    document.body.append(el);
    const num = el.querySelector('.hw-num');
    const fg = el.querySelector('.hw-fg');
    const live = el.querySelector('[aria-live]');
    const cancel = el.querySelector('.hw-cancel');
    cancel.focus();

    let left = total;
    let last = performance.now();
    let running = !document.hidden;
    let shown = seconds;
    let over = false;

    function finish(ok) {
      if (over) return;
      over = true;
      clearInterval(timer);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('visibilitychange', onVisibility);
      if (signal) signal.removeEventListener('abort', onAbort);
      others.forEach((x) => { x.inert = false; });
      el.remove();
      if (back && back.isConnected) back.focus();
      resolve(ok);
    }
    function step() {
      const now = performance.now();
      if (running) left -= now - last;
      last = now;
      const s = Math.max(0, Math.ceil(left / 1000));
      if (s !== shown) {
        shown = s;
        num.textContent = s;
        if (s > 0 && s % 10 === 0) live.textContent = t('tool.wait.left', { s });
      }
      fg.style.strokeDashoffset = String(C * (1 - Math.max(left, 0) / total));
      if (left <= 0) finish(true);
    }
    // Count up to the moment the tab hides, then stop until it shows again.
    const onVisibility = () => { step(); running = !document.hidden; last = performance.now(); };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      else if (e.key === 'Tab') { e.preventDefault(); cancel.focus(); }
    };
    const onAbort = () => finish(false);

    cancel.addEventListener('click', () => finish(false));
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('visibilitychange', onVisibility);
    const timer = setInterval(step, 100);
    if (signal) {
      if (signal.aborted) { finish(false); return; }
      signal.addEventListener('abort', onAbort);
    }
  });
}

// ---------------------------------------------------------------- the admin page: tool settings
// account.js hands over an empty <section id="admTools">; everything in it is drawn here.
// A track's cell left empty takes the value from "all students"; the "all students"
// column stores only what differs from the defaults in this file.

const trackLabel = (tr) => t('tool.set.track.' + tr);
const trackHead = (tr) => (tr === 'default' ? `<b>${trackLabel(tr)}</b>` : `<span class="track-pill t-${tr}">${trackLabel(tr)}</span>`);

// The choices for when a tool opens: from the start, after one problem (grouped by
// stage), or closed. A stage value saved under the old rule shows as its own choice.
function openOptions(value, inherit) {
  const v0 = value ?? '';
  const opt = (v, label) => `<option value="${v}"${v === v0 ? ' selected' : ''}>${esc(label)}</option>`;
  const legacy = STAGE_IDS.has(v0) ? opt(v0, t('tool.set.after', { n: stageNumber(v0) })) : '';
  const groups = STAGES.filter((s) => (PROBLEMS[s.id] || []).length).map((s, i) => `
    <optgroup label="${esc(t('tp.stage', { n: stageNumber(s.id) }))}">
      ${PROBLEMS[s.id].map((p) => opt(problemKey(s.id, p.n), t('tool.set.afterQ', { q: problemLabel(problemKey(s.id, p.n)), title: L(p.title) }))).join('')}
    </optgroup>`).join('');
  return `${inherit ? opt('', t('tool.set.inherit')) : ''}${opt('start', t('tool.set.start'))}${legacy}${groups}${opt('never', t('tool.set.never'))}`;
}

// "From the start", "after problem 1.2", "closed": a setting in words.
function openText(v) {
  if (v === 'start') return t('tool.set.start');
  if (v === 'never') return t('tool.set.never');
  if (splitKey(v)) return t('tool.set.afterQShort', { q: problemLabel(v) });
  return t('tool.set.after', { n: stageNumber(v) });
}

export function mountToolSettings(el) {
  if (!el) return;
  const saved = () => (config && config.tracks) || {};

  function cell(tr, key) {
    const own = clean(saved()[tr])[key];
    const isDefault = tr === 'default';
    if (SETTABLE.includes(key)) {
      return `<select class="adm-select small" data-tr="${tr}" data-key="${key}" aria-label="${esc(t('tool.' + key) + ' · ' + trackLabel(tr))}">${openOptions(isDefault ? own ?? DEFAULTS[key] : own, !isDefault)}</select>`;
    }
    const shown = own == null ? '' : key === 'hintWait' ? own.join(', ') : String(own);
    const ph = isDefault ? (key === 'hintWait' ? DEFAULTS.hintWait.join(', ') : String(DEFAULTS.tryFirst)) : t('tool.set.inheritShort');
    return `<input class="tset-in" ${key === 'tryFirst' ? 'type="number" min="0" max="1800" step="1"' : 'type="text" inputmode="numeric"'} dir="ltr"
      data-tr="${tr}" data-key="${key}" value="${esc(shown)}" placeholder="${esc(ph)}" aria-label="${esc(t('tool.set.' + key) + ' · ' + trackLabel(tr))}">`;
  }

  const row = (key, label, note) => `<tr><th scope="row">${esc(label)}${note ? `<small>${esc(note)}</small>` : ''}</th>${TRACKS.map((tr) => `<td>${cell(tr, key)}</td>`).join('')}</tr>`;

  function draw() {
    const va = viewAs() || '';
    el.innerHTML = `
      <h2 class="acct-h2">${t('tool.set.title')}</h2>
      <p class="acct-hint">${t('tool.set.lead')}</p>
      <div class="tset-wrap">
        <table class="tset">
          <thead><tr><th scope="col">${t('tool.set.col')}</th>${TRACKS.map((tr) => `<th scope="col">${trackHead(tr)}</th>`).join('')}</tr></thead>
          <tbody>
            ${SETTABLE.map((id) => row(id, t('tool.' + id))).join('')}
            ${row('hintWait', t('tool.set.hintWait'), t('tool.set.hintWaitNote'))}
            ${row('tryFirst', t('tool.set.tryFirst'), t('tool.set.tryFirstNote'))}
          </tbody>
        </table>
      </div>
      <div class="tset-actions">
        <button type="button" class="tool-btn" id="tsetSave">${t('tool.set.save')}</button>
        <span class="acct-msg" id="tsetMsg" role="status"></span>
      </div>
      <div class="tset-view">
        <label class="tset-view-l" for="tsetViewAs">${t('tool.set.viewAs')}</label>
        <select class="adm-select" id="tsetViewAs">
          <option value="">${t('tool.set.viewAsOff')}</option>
          ${TRACKS.map((tr) => `<option value="${tr}"${tr === va ? ' selected' : ''}>${esc(t('tool.viewAs.as', { track: trackLabel(tr) }))}</option>`).join('')}
        </select>
        <p class="acct-hint">${t('tool.set.viewAsLead')}</p>
      </div>`;
  }

  // Read the table back; null (and the bad cells marked) when a value is invalid.
  function collect() {
    const tracks = {};
    let ok = true;
    el.querySelectorAll('[data-tr]').forEach((f) => {
      const { tr, key } = f.dataset;
      const raw = f.value.trim();
      f.removeAttribute('aria-invalid');
      let v;
      if (SETTABLE.includes(key)) v = raw || undefined;
      else if (!raw) v = undefined;
      else if (key === 'hintWait') {
        const nums = raw.split(/[\s,،]+/).filter(Boolean).map(Number);
        if (!nums.length || nums.length > 10 || !nums.every((x) => Number.isInteger(x) && x >= 0 && x <= 600)) { ok = false; f.setAttribute('aria-invalid', 'true'); return; }
        v = nums;
      } else {
        const x = Number(raw);
        if (!Number.isInteger(x) || x < 0 || x > 1800) { ok = false; f.setAttribute('aria-invalid', 'true'); return; }
        v = x;
      }
      if (v === undefined) return;
      if (tr === 'default' && JSON.stringify(v) === JSON.stringify(DEFAULTS[key])) return;
      (tracks[tr] = tracks[tr] || {})[key] = v;
    });
    return ok ? { tracks } : null;
  }

  draw();
  el.addEventListener('click', async (e) => {
    if (!e.target.closest('#tsetSave')) return;
    const msg = el.querySelector('#tsetMsg');
    const data = collect();
    if (!data) { msg.className = 'acct-msg err'; msg.textContent = t('tool.set.bad'); return; }
    const btn = el.querySelector('#tsetSave');
    btn.disabled = true;
    try {
      if (!auth || !auth.admin || !auth.admin.setToolConfig) throw new Error('accounts unavailable');
      await auth.admin.setToolConfig(data);
      config = data;
      changed();
      draw();
      const m = el.querySelector('#tsetMsg');
      m.className = 'acct-msg ok';
      m.textContent = t('tool.set.saved');
    } catch (err) {
      btn.disabled = false;
      msg.className = 'acct-msg err';
      msg.textContent = err && err.code === 'denied' ? t('tool.set.denied') : t('tool.set.failed', { e: (err && (err.message || err.code)) || String(err) });
    }
  });
  el.addEventListener('change', (e) => {
    if (e.target.id === 'tsetViewAs') setViewAs(e.target.value);
  });
  // The settings may arrive after the page is drawn.
  if (!(config && config.tracks)) reloadToolConfig().then(() => { if (el.isConnected) draw(); });
}

// ---------------------------------------------------------------- the admin page: one student's tools
// account.js mounts this in a student's expanded row (u: the listUsers() entry). Each
// tool can follow the track, be always open, or be locked for this student. Saved in the
// profile's `features`; entries this panel doesn't know are kept as they are.

export function mountStudentTools(el, u) {
  if (!el || !u) return;
  const feats = () => (Array.isArray(u.features) ? u.features : []);
  const ours = (x) => /^(open|lock):/.test(x) || SETTABLE.includes(x);
  const trackText = (id) => openText(settingsFor(u.track)[id]);

  function draw(msg) {
    const f = feats();
    const now = (id) => (f.includes('lock:' + id) ? 'lock' : f.includes('open:' + id) || f.includes(id) ? 'open' : '');
    const opt = (id, v, label) => `<option value="${v}"${now(id) === v ? ' selected' : ''}>${esc(label)}</option>`;
    el.innerHTML = `
      <div class="stools">
        <p class="stools-h">${esc(t('tool.st.title', { name: u.name || u.username || '' }))}</p>
        <div class="stools-grid">
          ${SETTABLE.map((id) => `
            <label class="stools-item"><span>${esc(t('tool.' + id))}</span>
              <select class="adm-select small" data-tool="${id}">
                ${opt(id, '', t('tool.st.byTrack', { v: trackText(id) }))}${opt(id, 'open', t('tool.st.open'))}${opt(id, 'lock', t('tool.st.lock'))}
              </select>
            </label>`).join('')}
        </div>
        <div class="tset-actions">
          <button type="button" class="tool-btn" data-stools-save>${t('tool.set.save')}</button>
          <span class="acct-msg${msg ? ' ' + msg.kind : ''}" role="status">${msg ? esc(msg.text) : ''}</span>
        </div>
      </div>`;
  }

  draw();
  el.onclick = async (e) => {
    const btn = e.target.closest('[data-stools-save]');
    if (!btn) return;
    const list = feats().filter((x) => !ours(x));
    el.querySelectorAll('[data-tool]').forEach((s) => { if (s.value) list.push(`${s.value}:${s.dataset.tool}`); });
    btn.disabled = true;
    try {
      if (!auth || !auth.admin || !auth.admin.setFeatures) throw new Error('accounts unavailable');
      await auth.admin.setFeatures(u.uid, list);
      u.features = list;
      draw({ kind: 'ok', text: t('tool.st.saved') });
    } catch (err) {
      btn.disabled = false;
      const m = el.querySelector('.acct-msg');
      m.className = 'acct-msg err';
      m.textContent = err && err.code === 'denied' ? t('tool.set.denied') : t('tool.set.failed', { e: (err && (err.message || err.code)) || String(err) });
    }
  };
}
