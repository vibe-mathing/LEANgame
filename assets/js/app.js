// LEANgame website: hash router and the three views (home, topic, problem).

import { t, L, getLang, setLang, rich, mathSpan, esc } from './i18n.js';
import { TOPICS, STAGES, REASONS, PROBLEMS, stageNumber, problemList, UNI_SITE } from './data.js';
import { checkProof, prepareProblem, fmtClaim, leanTheorem, parseClaim, leanClaim, autoReason, liveFormat, renamedAngles, syncConstructions, claimKey, findReason } from './geo.js';
import { renderDiagram, claimToItems, provenMarks } from './diagram.js';
import { leanEnabled, leanState, leanCheck, applyLean } from './lean-service.js';
import { icon, glyph, LOGO } from './icons.js';
import { TOOLS, toolOpen, toolLockText, toolsAfter, fillGivens, findRefs, congConclusions, hintWait, hintSeconds, hintTryLeft, isAdmin, fullAccess,
  onToolsChange, realAdmin, viewAs, setViewAs, toolSettings, durationText, PROVED_IN, reasonEarned, provedInLabel } from './tools.js';
import { accountRoute, accountTitle, viewAccount, bindAccount, accountSlot, initAccounts } from './account.js';
import { syncProgress, isStaff as isStaffUser, onAuthChange } from './auth.js';
import { appStrip, appFootLink } from './mobile-app.js';
import { mountConstructions } from './constructions-ui.js';
import { building, addBuildPoint, buildSaid, dropBuild, backspace, findAddition } from './play-extras.js';
import { curriculumOf, inLevel, REASON_ALIASES, AAS_NAMES, STAGE_CURRICULUM, EXAM, TOPIC_LEVELS, LEVELS, MINISTRY } from './curriculum.js';
import { currentUser } from './auth.js';
import { PX, DEV_SKIP, insertPick, newReasons, findSkip } from './play-extras.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const store = {
  get(k, d) { try { const v = localStorage.getItem('lg.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('lg.' + k, JSON.stringify(v)); } catch { /* ignore */ } },
};

const REPO_URL = document.querySelector('meta[name="lg-repo"]')?.content || '';

// Prepare all problems once.
for (const s of STAGES) for (const p of PROBLEMS[s.id] || []) prepareProblem(p, s.id);

const progress = () => store.get('progress', {});
const pkey = (stage, n) => `${stage}-${n}`;
const isSolved = (stage, n) => !!progress()[pkey(stage, n)]?.solved;
// `key`: a teacher bank question keeps its progress under "tq-<id>", apart from the stages.
function saveProgress(stage, n, data, key = pkey(stage, n)) {
  const all = progress();
  all[key] = { ...(all[key] || {}), ...data };
  store.set('progress', all);
  syncProgress(all);
}

// ---------------------------------------------------------------- chrome

const app = $('#app');
let cleanup = null;
let pendingScroll = null;

function renderChrome() {
  const route = currentRoute();
  $('#topbar').innerHTML = `
    <a class="skip" href="#app">${t('nav.skip')}</a>
    <div class="wrap topbar-in">
      <a class="brand" href="#/" aria-label="LEANgame">${LOGO}<span class="wordmark"><b>LEAN</b>game</span><span class="brand-tag">${t('brand.tag')}</span></a>
      <nav class="mainnav" aria-label="${t('nav.home')}">
        <a href="#/" ${route.name === 'home' ? 'aria-current="page"' : ''}>${t('nav.home')}</a>
        <a href="#/hs/geometry" ${route.name === 'topic' || route.name === 'problem' ? 'aria-current="page"' : ''}>${t('nav.geometry')}</a>
        <a href="#/bank" ${route.name === 'author' || route.name === 'tq' ? 'aria-current="page"' : ''}>${t('nav.bank')}</a>
        <button type="button" class="navlink" data-scroll="topics">${t('nav.topics')}</button>
        <button type="button" class="navlink" data-scroll="how">${t('nav.how')}</button>
      </nav>
      <div class="tools">
        ${bankLink(route)}
        <span class="addq-slot" id="addQSlot">${addQuestionLink()}</span>
        ${accountSlot()}
        <button type="button" class="tool lang" id="langBtn" aria-label="${t('nav.langLabel')}" title="${t('nav.langLabel')}">${icon('globe')}<span>${t('nav.langShort')}</span></button>
        <button type="button" class="tool" id="themeBtn" aria-label="${t('nav.theme')}" title="${t('nav.theme')}">${icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon')}</button>
      </div>
    </div>`;
  $('#footer').innerHTML = `
    <div class="wrap footer-in">
      <div class="foot-brand">
        <a class="brand" href="#/">${LOGO}<span class="wordmark"><b>LEAN</b>game</span></a>
        <p>${t('footer.tag')}</p>
      </div>
      <div class="foot-col">
        <h4>${t('footer.game')}</h4>
        <a href="#/hs/geometry">${t('footer.map')}</a>
        <a href="#/hs/geometry/L01/1">${t('footer.first')}</a>
        <a href="#/hs/geometry" data-scroll="toolbox">${t('footer.toolbox')}</a>
        <a href="#/bank">${t('nav.bank')}</a>
        ${appFootLink()}
      </div>
      <div class="foot-col">
        <h4>${t('footer.lean')}</h4>
        <a href="https://lean-lang.org" target="_blank" rel="noopener">${t('footer.leanSite')}</a>
        <a href="https://leanprover-community.github.io/mathlib4_docs/" target="_blank" rel="noopener">${t('footer.mathlib')}</a>
        <a href="https://adam.math.hhu.de/#/g/leanprover-community/nng4" target="_blank" rel="noopener">${t('footer.nng')}</a>
        ${REPO_URL ? `<a href="${REPO_URL}" target="_blank" rel="noopener">${icon('github')} GitHub</a>` : ''}
      </div>
      <p class="foot-base">${t('footer.proto')}</p>
    </div>`;

  $('#langBtn').onclick = () => { setLang(getLang() === 'he' ? 'en' : 'he'); render(); };
  $('#themeBtn').onclick = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set('theme', next);
    $('#themeBtn').innerHTML = icon(next === 'dark' ? 'sun' : 'moon');
  };
  $$('[data-scroll]').forEach((b) => b.addEventListener('click', (e) => {
    const id = b.dataset.scroll;
    const target = document.getElementById(id);
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    e.preventDefault();
    pendingScroll = id;
    location.hash = id === 'toolbox' ? '#/hs/geometry' : '#/';
  }));
}

// Teachers and admins get an "add a question" button in the top bar, at every screen width, so the
// question bank's editor (#/author) is one tap away. The bank itself is for everyone (bankLink below).
function addQuestionLink() {
  if (!isStaffUser()) return '';
  return `<a class="tool addq" href="#/author" title="${esc(t('nav.addQTitle'))}" aria-label="${esc(t('nav.addQTitle'))}"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg></span><span class="addq-t">${t('nav.addQ')}</span></a>`;
}
onAuthChange(() => { const el = document.getElementById('addQSlot'); if (el) el.innerHTML = addQuestionLink(); });

// Everyone, signed in or not, gets the teacher question bank (#/bank) in the top bar where the menu
// is folded away (phones and the app), so it is never only in the footer. Wide screens have the
// menu link instead (styles.css shows this button only below 860px).
function bankLink(route) {
  const here = route.name === 'author' || route.name === 'tq';
  return `<a class="tool bankq" href="#/bank" title="${esc(t('nav.bank'))}" aria-label="${esc(t('nav.bank'))}"${here ? ' aria-current="page"' : ''}><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="8" y="3.5" width="12" height="14" rx="2"/><path d="M5 7.5v11a2 2 0 0 0 2 2h9"/><path d="M11.5 8.5h5M11.5 12h5"/></svg></span><span class="bankq-t">${t('nav.bank')}</span></a>`;
}

// ---------------------------------------------------------------- router

function currentRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'hs' && parts[1] === 'geometry') {
    if (parts.length >= 4) {
      const stage = parts[2].toUpperCase();
      const n = parseInt(parts[3], 10);
      const p = (PROBLEMS[stage] || []).find((x) => x.n === n);
      if (p) return { name: 'problem', stage, n, problem: p };
    }
    return { name: 'topic' };
  }
  // teacher question bank: #/bank, #/author[/<id>] (author.js) and #/tq/<id> to solve one (qbank.js)
  if (parts[0] === 'tq' && parts[1]) return { name: 'tq', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'bank' || parts[0] === 'author') return { name: 'author', parts };
  const acct = accountRoute(parts);
  if (acct) return acct;
  return { name: 'home' };
}

function render() {
  if (cleanup) { cleanup(); cleanup = null; }
  renderChrome();
  const route = currentRoute();
  let after = null;
  if (route.name === 'home') { app.innerHTML = viewHome(); after = bindHome; document.title = 'LEANgame · ' + t('brand.tag'); }
  else if (route.name === 'topic') { app.innerHTML = viewTopic(); after = bindTopic; document.title = `${t('nav.geometry')} · LEANgame`; }
  else if (route.name === 'acct') { app.innerHTML = viewAccount(route); after = (root) => bindAccount(root, route); document.title = accountTitle(route); }
  else if (route.name === 'author') { app.innerHTML = ''; after = (root) => mountAuthor(root, route); } // teacher question bank
  else if (route.name === 'tq') { app.innerHTML = '<div class="wrap" style="padding-block:48px"><div class="acct-wait" aria-busy="true"></div></div>'; after = (root) => mountBankProblem(root, route); }
  else { app.innerHTML = viewProblem(route); after = (root) => bindProblem(root, route); document.title = `${L(route.problem.title)} · LEANgame`; }
  cleanup = after ? after(app) || null : null;
  if (pendingScroll) {
    const el = document.getElementById(pendingScroll);
    pendingScroll = null;
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
    else window.scrollTo(0, 0);
  } else {
    window.scrollTo(0, 0);
  }
}

window.addEventListener('hashchange', render);

// ---------------------------------------------------------------- teacher question bank
// The editor and the bank page live in author.js; a bank question plays in the normal problem
// view, in "bank mode": no pager, breadcrumbs back to the bank, progress under "tq-<id>".

function mountAuthor(root, route) {
  let alive = true;
  let off = null;
  import('./author.js')
    .then((m) => { if (alive) off = m.bindAuthor(root, route.parts); })
    .catch((e) => console.error('[bank] editor not loaded', e));
  return () => { alive = false; if (off) off(); };
}

function mountBankProblem(root, route) {
  let alive = true;
  let off = null;
  import('./qbank.js').then(async (m) => {
    const r = await m.loadPlayable(route.id);
    if (!alive) return;
    if (!r) {
      root.innerHTML = `<div class="wrap" style="padding-block:48px"><p>${esc(m.bankWord('notFound'))}</p><p style="margin-top:16px"><a class="btn btn-ghost" href="#/bank">${esc(m.bankWord('toBank'))}</a></p></div>`;
      return;
    }
    prepareProblem(r.problem, r.stage);
    const draft = !!r.meta.draft;
    const bank = {
      id: r.meta.id, draft,
      backHref: draft ? r.meta.back : '#/bank',
      backLabel: draft ? m.bankWord('back') : m.bankWord('crumb'),
      badge: draft ? m.bankWord('preview') : m.bankWord('badge'),
    };
    const pr = { name: 'problem', stage: r.stage, n: r.problem.n, problem: r.problem, bank };
    root.innerHTML = viewProblem(pr);
    document.title = `${r.problem.titleRaw || ''} · LEANgame`;
    off = bindProblem(root, pr) || null;
  }).catch((e) => {
    console.error('[bank]', e);
    if (alive) root.innerHTML = `<div class="wrap" style="padding-block:48px"><p>${esc(String(e && e.code ? e.code : e))}</p></div>`;
  });
  return () => { alive = false; if (off) off(); };
}

// The level map shows which tools each stage opens; redraw it when that changes
// (tool settings arriving, logging in, an admin viewing as a student).
const toolSig = () => STAGES.map((s) => toolsAfter(s.id).map((id) => id + (toolOpen(id, isSolved) ? 1 : 0)).join(',')).join('|');
let lastToolSig = '';
onToolsChange(() => { if (currentRoute().name === 'topic' && toolSig() !== lastToolSig) render(); });

// ---------------------------------------------------------------- helpers

// A reason as a label: its full name, or, when that is longer than four words, the first three
// words and "…"; pointing at it shows the full name and the full statement.
const plainMath = (s) => String(s || '').replace(/\$([^$]*)\$/g, '$1');
const reasonLabel = (id) => {
  const r = REASONS[id];
  if (!r) return '';
  const name = L(r.name);
  const words = name.trim().split(/\s+/);
  const shown = words.length > 4 ? `${words.slice(0, 3).join(' ')}…` : name;
  const full = plainMath(r.statement && L(r.statement));
  return `<span class="rname" title="${esc(full ? `${name}: ${full}` : name)}">${esc(shown)}</span>`;
};
const reasonShort = reasonLabel;
// inside a sentence (an error message) the name is never cut short
const reasonFull = (id) => esc(L(REASONS[id]?.name));
const reasonsOfStage = (stageId) => Object.entries(REASONS).filter(([, r]) => r.stage === stageId);

// ---------------------------------------------------------------- the curriculum (curriculum.js)
// Level chips "3 · 4 · 5": a level that studies it is lit.
const levelChips = (lv) => `<span class="lv-chips" aria-label="${esc(t('cur.levelsAria', { lv: lv.join(', ') || '—' }))}">${LEVELS.map((n) => `<span class="lv${lv.includes(n) ? ' on' : ''}">${n}</span>`).join('')}</span>`;
// What the curriculum says about a reason, for its toolbox card.
function reasonCurriculum(id) {
  const c = curriculumOf(id);
  if (!c) return '';
  const lvText = (ls) => ls.map((n) => t('cur.units', { n })).join(', ');
  const notes = [];
  if (c.ms) notes.push(`<span class="cur-tag ms">${t('cur.ms')}</span>`);
  if (c.out) notes.push(`<span class="cur-tag out">${t('cur.out', { lv: lvText(c.out) })}</span>`);
  if (c.practice) notes.push(`<span class="cur-tag aux">${t('cur.practice', { lv: lvText(c.practice) })}</span>`);
  if (c.aux) notes.push(`<span class="cur-tag aux">${t('cur.aux', { lv: lvText(c.aux) })}</span>`);
  if (c.opt) notes.push(`<span class="cur-tag opt">${t('cur.opt')}</span>`);
  return `<div class="rc-cur">${levelChips(c.lv)}${notes.join('')}</div>`;
}
// Where a stage is taught, level by level.
function stageWhere(stageId) {
  const w = STAGE_CURRICULUM[stageId];
  if (!w) return '';
  const parts = LEVELS.filter((n) => w[n]).map((n) => `<li><b>${t('cur.units', { n })}</b> ${w[n] === 'ms' ? t('cur.msShort') : esc(L(w[n]))}</li>`);
  return `<div class="stage-where"><span class="unlocks-label">${t('cur.where')}</span><ul>${parts.join('')}</ul></div>`;
}
// The level a reader sees the toolbox for: their track, or what they picked (this tab only).
const toolboxLevel = () => {
  let v = null;
  try { v = sessionStorage.getItem('lg.curLevel'); } catch { /* ignore */ }
  if (v === 'all' || LEVELS.includes(+v)) return v;
  const tr = viewAs() || (currentUser() && currentUser().track);
  return LEVELS.includes(+tr) ? String(tr) : 'all';
};
// "a, b and c" / "a, b ו-c"
const joinList = (items) => (items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + t('pp.and') + items[items.length - 1]);
const refsText = (refs) => (refs && refs.length ? ` <span class="refs" dir="ltr">(${[...refs].sort((a, b) => a - b).join(', ')})</span>` : '');

function msgHTML(msg) {
  if (!msg) return '';
  const vars = { ...(msg.vars || {}) };
  if (vars.rid) vars.r = reasonFull(vars.rid);
  return rich(t('err.' + msg.key, vars));
}

// Very small Lean highlighter for display.
function leanHTML(code) {
  const KW = new Set(['theorem', 'example', 'have', 'by', 'exact', 'sorry', 'fun', 'import', 'namespace', 'end', 'open']);
  return code.split('\n').map((line) => {
    let comment = '';
    const ci = line.indexOf('--');
    if (ci >= 0) { comment = line.slice(ci); line = line.slice(0, ci); }
    const out = esc(line).replace(/([A-Za-z_][A-Za-z0-9_.']*|ℝ|:=|\d+)/g, (m) => {
      if (KW.has(m)) return `<span class="lk">${m}</span>`;
      if (m === ':=') return `<span class="lo">${m}</span>`;
      if (/^\d+$/.test(m)) return `<span class="ln">${m}</span>`;
      if (/^(len|ang|Cong|Sbtw|Point|ℝ)$/.test(m)) return `<span class="lt">${m}</span>`;
      if (/^(cong_|vert_|adj_|rfl|linarith|bisector|midpoint)/.test(m)) return `<span class="lf">${m}</span>`;
      if (/^(s|g|cfg|ray|nd)\d+$/.test(m)) return `<span class="lr">${m}</span>`;
      if (/^geo_/.test(m)) return `<span class="lf">${m}</span>`;
      return m;
    });
    return out + (comment ? `<span class="lc">${esc(comment)}</span>` : '');
  }).join('\n');
}

// ---------------------------------------------------------------- home

function viewHome() {
  const featured = TOPICS.find((x) => x.id === 'geometry');
  const topicCard = (tp) => {
    const open = tp.status === 'open';
    const tag = open ? 'a' : 'div';
    const attrs = open ? `href="#/hs/${tp.id}"` : 'aria-disabled="true"';
    return `<${tag} class="topic-card st-${tp.status}${tp === featured ? ' featured' : ''}" ${attrs}>
      <div class="tc-top"><span class="tc-glyph">${glyph(tp.glyph, 'topic')}</span><span class="badge b-${tp.status}">${t('status.' + tp.status)}</span></div>
      <h3>${L(tp.name)}</h3>
      ${TOPIC_LEVELS[tp.id] ? `<p class="tc-levels">${levelChips(TOPIC_LEVELS[tp.id])}<span>${t('cur.unitsWord')}</span></p>` : ''}
      <p>${rich(L(tp.blurb))}</p>
      ${open ? `<div class="tc-foot"><span>${t('topic.levels', { n: tp.levels })}</span><span class="tc-go">${t('topic.enter')} ${icon('arrow', 'dir')}</span></div>` : ''}
      ${tp === featured ? featuredArt() : ''}
    </${tag}>`;
  };

  return `
  <section class="hero">
    <div class="wrap hero-in">
      <div class="hero-copy">
        <p class="eyebrow">${t('hero.eyebrow')}</p>
        <h1 class="display">${t('hero.title1')}<br>${t('hero.title2')}</h1>
        <p class="lead">${rich(t('hero.lead'))}</p>
        <div class="cta-row">
          <a class="btn btn-primary" href="#/hs/geometry/L01/1">${t('hero.cta1')} ${icon('arrow', 'dir')}</a>
          <a class="btn btn-ghost" href="#/hs/geometry">${icon('map')} ${t('hero.cta2')}</a>
        </div>
        <p class="hero-note">${icon('check')} <span>${t('hero.note')}</span></p>
      </div>
      <div class="hero-demo">
        <div class="demo-card paper" role="img" aria-label="${t('demo.aria')}">
          <div class="demo-head"><span class="dots"><i></i><i></i><i></i></span><span>${t('demo.head')}</span></div>
          <div class="demo-body">
            <div class="demo-diagram"></div>
            <div class="demo-facts">
              <div><b>${t('pp.given')}:</b> ${mathSpan('AB = AC')}, ${mathSpan('∢BAD = ∢CAD')}</div>
              <div><b>${t('pp.goal')}:</b> ${mathSpan('BD = CD')}</div>
            </div>
          </div>
          <div class="demo-table">
            <div class="dt-head"><span>#</span><span>${t('pp.colClaim')}</span><span>${t('pp.colReason')}</span><span></span></div>
            <ol class="dt-rows"></ol>
          </div>
          <div class="demo-lean" dir="ltr"><span class="demo-lean-tag">Lean</span><code class="demo-lean-code"></code></div>
          <div class="stamp demo-stamp"><span>${t('pp.solved.stamp')}</span></div>
        </div>
        <span class="margin-note">${t('hero.margin')}</span>
      </div>
    </div>
  </section>

  ${appStrip()}

  <section class="section" id="how">
    <div class="wrap">
      <p class="kicker">${t('how.kicker')}</p>
      <h2 class="h2">${t('how.title')}</h2>
      <ol class="steps">
        ${[1, 2, 3].map((i) => `
          <li class="step">
            <span class="step-n">${i}</span>
            <h3>${t(`how.s${i}.t`)}</h3>
            <p>${rich(t(`how.s${i}.p`))}</p>
          </li>`).join('')}
      </ol>
      <div class="mapping">
        <div class="mapping-copy">
          <h3>${t('map.title')}</h3>
          <p>${t('map.text')}</p>
          <ul class="legend">
            <li class="tone-claim">${t('map.claim')}</li>
            <li class="tone-reason">${t('map.reason')}</li>
            <li class="tone-refs">${t('map.refs')}</li>
          </ul>
        </div>
        <div class="mapping-visual">
          <div class="map-row">
            <span class="mr-n">4</span>
            <span class="mr-claim tone-claim">${mathSpan('△ABD ≅ △ACD')}</span>
            <span class="mr-reason"><span class="tone-reason">${reasonShort('SAS')}</span> <span class="tone-refs" dir="ltr">(1, 2, 3)</span></span>
          </div>
          <div class="map-arrow" aria-hidden="true"><svg viewBox="0 0 24 40"><path d="M12 2v34M5 29l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
          <pre class="map-code" dir="ltr"><span class="lk">have</span> <span class="lr">s4</span> : <span class="tone-claim">Cong A B D A C D</span> <span class="lo">:=</span> <span class="tone-reason">cong_SAS</span> <span class="tone-refs">s1 s2 s3</span></pre>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="topics">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="kicker">${t('topics.kicker')}</p>
          <h2 class="h2">${t('topics.title')}</h2>
          <p class="section-lead">${t('topics.text')}</p>
        </div>
        <div class="tabs" role="tablist">
          <button type="button" role="tab" class="tab" aria-selected="true" data-track="hs">${L({ he: 'תיכון', en: 'High school' })}</button>
          <button type="button" role="tab" class="tab" aria-selected="false" data-track="uni">${L({ he: 'אוניברסיטה', en: 'University' })}</button>
        </div>
      </div>
      <div class="topic-grid" data-panel="hs">${TOPICS.filter((x) => x.track === 'hs').map(topicCard).join('')}</div>
      <div class="topic-grid" data-panel="uni" hidden>
        <p class="uni-note">${icon('info')} <span>${t('topics.uniNote')} <a href="${UNI_SITE}">vibe-mathing.github.io/uni ↗</a></span></p>
      </div>
    </div>
  </section>

  <section class="band">
    <div class="wrap">
      <p class="kicker">${t('why.kicker')}</p>
      <h2 class="h2">${t('why.title')}</h2>
      <div class="why-grid">
        ${[1, 2, 3].map((i) => `
          <div class="why">
            <span class="why-ic">${icon(['check', 'globe', 'spark'][i - 1])}</span>
            <h3>${t(`why.${i}.t`)}</h3>
            <p>${rich(t(`why.${i}.p`))}</p>
          </div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <p class="kicker">${t('road.kicker')}</p>
      <h2 class="h2">${t('road.title')}</h2>
      <ol class="road">
        ${[[1, 'now'], [2, 'next'], [3, 'later'], [4, 'later']].map(([i, s]) => `
          <li class="road-item r-${s}">
            <span class="road-dot"></span>
            <span class="road-when">${t('road.' + s)}</span>
            <h3>${t(`road.${i}.t`)}</h3>
            <p>${t(`road.${i}.p`)}</p>
          </li>`).join('')}
      </ol>
    </div>
  </section>

  <section class="section cta-section">
    <div class="wrap">
      <div class="cta-card paper">
        <div>
          <h2 class="h2">${t('cta.title')}</h2>
          <p>${t('cta.text')}</p>
        </div>
        <a class="btn btn-primary btn-lg" href="#/hs/geometry/L01/1">${t('cta.btn')} ${icon('arrow', 'dir')}</a>
      </div>
    </div>
  </section>`;
}

function featuredArt() {
  return `<svg class="tc-art" viewBox="0 0 220 160" aria-hidden="true">
    <circle cx="132" cy="70" r="52" class="art-c"/>
    <path d="M40 140L104 26 196 140z" class="art-t"/>
    <path d="M104 26L118 140" class="art-l"/>
    <path d="M58 108l9 5M159 104l-9 5" class="art-k"/>
    <circle cx="104" cy="26" r="3.5" class="art-p"/><circle cx="40" cy="140" r="3.5" class="art-p"/><circle cx="196" cy="140" r="3.5" class="art-p"/><circle cx="118" cy="140" r="3.5" class="art-p"/>
  </svg>`;
}

function bindHome(root) {
  // track tabs
  $$('.tab', root).forEach((tab) => tab.addEventListener('click', () => {
    $$('.tab', root).forEach((x) => x.setAttribute('aria-selected', String(x === tab)));
    $$('[data-panel]', root).forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.track; });
  }));
  return runHeroDemo(root);
}

function runHeroDemo(root) {
  const card = $('.demo-card', root);
  if (!card) return null;
  const p = PROBLEMS.L02[0];
  const dg = renderDiagram(p, { animate: true, label: L(p.title) });
  $('.demo-diagram', card).append(dg.el);
  const script = [
    { text: 'AB = AC', reason: 'given', refs: [] },
    { text: '∢BAD = ∢CAD', reason: 'given', refs: [] },
    { text: 'AD = AD', reason: 'common_side', refs: [] },
    { text: '△ABD ≅ △ACD', reason: 'SAS', refs: [1, 2, 3] },
    { text: 'BD = CD', reason: 'cpct_side', refs: [4] },
  ];
  const { results } = checkProof(p, script);
  const list = $('.dt-rows', card);
  const code = $('.demo-lean-code', card);
  const stamp = $('.demo-stamp', card);
  let alive = true;
  const timers = [];
  const wait = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)));

  const rowEl = (i, full) => {
    const li = document.createElement('li');
    li.className = 'dt-row' + (full ? ' in ok has-reason' : '');
    li.innerHTML = `<span class="dt-n">${i + 1}</span><span class="dt-claim">${full ? mathSpan(fmtClaim(results[i].parsed.claim)) : ''}</span>
      <span class="dt-reason">${full ? reasonShort(script[i].reason) + refsText(script[i].refs) : ''}</span><span class="dt-st">${full ? icon('check') : ''}</span>`;
    return li;
  };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    script.forEach((_, i) => list.append(rowEl(i, true)));
    code.innerHTML = leanHTML(results[4].lean);
    stamp.classList.add('on');
    return () => {};
  }

  async function loop() {
    while (alive) {
      list.innerHTML = '';
      code.innerHTML = '<span class="lc">-- …</span>';
      stamp.classList.remove('on');
      dg.clear();
      await wait(900);
      for (let i = 0; i < script.length; i++) {
        const li = rowEl(i, false);
        list.append(li);
        void li.offsetWidth;
        li.classList.add('in');
        const text = fmtClaim(results[i].parsed.claim);
        const cl = $('.dt-claim', li);
        for (let k = 1; k <= text.length; k++) { cl.innerHTML = mathSpan(text.slice(0, k)) + '<i class="caret"></i>'; await wait(42); }
        cl.innerHTML = mathSpan(text);
        dg.highlight(claimToItems(results[i].parsed.claim));
        await wait(320);
        $('.dt-reason', li).innerHTML = reasonShort(script[i].reason) + refsText(script[i].refs);
        li.classList.add('has-reason');
        await wait(420);
        code.innerHTML = leanHTML(results[i].lean);
        code.classList.remove('flash'); void code.offsetWidth; code.classList.add('flash');
        await wait(450);
        $('.dt-st', li).innerHTML = icon('check');
        li.classList.add('ok');
        await wait(1000);
      }
      dg.clear();
      stamp.classList.add('on');
      await wait(3800);
      card.classList.add('fade');
      await wait(450);
      card.classList.remove('fade');
    }
  }
  loop();
  return () => { alive = false; timers.forEach(clearTimeout); };
}

// ---------------------------------------------------------------- topic

function viewTopic() {
  lastToolSig = toolSig();
  const all = problemList();
  const solved = all.filter((x) => isSolved(x.stage, x.n)).length;
  const pct = all.length ? solved / all.length : 0;
  const R = 34;
  const C = 2 * Math.PI * R;

  const stageCard = (s, idx) => {
    const probs = PROBLEMS[s.id] || [];
    const open = s.status === 'open' && probs.length;
    const nSolved = probs.filter((p) => isSolved(s.id, p.n)).length;
    const firstOpen = probs.find((p) => !isSolved(s.id, p.n)) || probs[0];
    const cta = !open ? '' : nSolved === 0 ? t('tp.start') : nSolved < probs.length ? t('tp.continue') : t('tp.review');
    return `<li class="stage ${open ? 'is-open' : 'is-soon'}${open && nSolved === probs.length ? ' is-done' : ''}" style="--i:${idx}">
      <div class="stage-node" aria-hidden="true"><span>${String(idx + 1).padStart(2, '0')}</span></div>
      <article class="stage-card">
        <div class="stage-glyph">${glyph(s.glyph)}</div>
        <div class="stage-body">
          <div class="stage-top"><span class="stage-label">${t('tp.stage', { n: idx + 1 })}</span><span class="badge b-${open ? 'open' : 'soon'}">${open ? t('status.open') : t('status.soon')}</span></div>
          <h3>${L(s.name)}</h3>
          <p class="stage-blurb">${rich(L(s.blurb))}</p>
          ${stageWhere(s.id)}
          <div class="unlocks"><span class="unlocks-label">${t('tp.unlocks')}</span>${reasonsOfStage(s.id).map(([id]) => `<span class="chip">${reasonLabel(id)}</span>`).join('')}</div>
          ${toolsAfter(s.id).length ? `<div class="unlocks"><span class="unlocks-label">${t('tool.onFinish')}</span>${toolsAfter(s.id).map((id) => `<span class="chip chip-tool" title="${esc(t('tool.' + id + '.title') + ' ' + toolLockText(id))}">${icon(toolOpen(id, isSolved) ? TOOLS[id].icon : 'lock')}${esc(t('tool.' + id))}</span>`).join('')}</div>` : ''}
          ${open ? `<div class="stage-foot">
            <div class="pips" aria-label="${probs.length === 1 ? t('tp.problem1') : t('tp.problems', { n: probs.length })}">
              ${probs.map((p) => `<a class="pip${isSolved(s.id, p.n) ? ' done' : ''}" href="#/hs/geometry/${s.id}/${p.n}" title="${esc(L(p.title))}${isSolved(s.id, p.n) ? ' · ' + t('tp.solved') : ''}">${isSolved(s.id, p.n) ? icon('check') : p.n}</a>`).join('')}
            </div>
            <a class="btn btn-small btn-primary" href="#/hs/geometry/${s.id}/${firstOpen.n}">${cta} ${icon('arrow', 'dir')}</a>
          </div>` : `<div class="stage-foot muted">${icon('lock')} ${t('status.soon')}</div>`}
        </div>
      </article>
    </li>`;
  };

  const groups = [{ id: null, title: t('pp.groupBasic') }, ...STAGES.map((s, i) => ({ id: s.id, title: `${t('tp.stage', { n: i + 1 })} · ${L(s.name)}` }))];

  return `
  <section class="topic-hero">
    <div class="wrap topic-hero-in">
      <div>
        <nav class="crumbs" aria-label="breadcrumbs"><a href="#/">${t('nav.home')}</a><span>/</span><span>${L({ he: 'תיכון', en: 'High school' })}</span></nav>
        <h1 class="display">${t('nav.geometry')}</h1>
        <p class="lead">${t('tp.lead')}</p>
      </div>
      <div class="progress-card paper">
        <svg class="ring" viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="${R}" class="ring-bg"/>
          <circle cx="40" cy="40" r="${R}" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/>
        </svg>
        <div class="progress-num"><b>${solved}</b><span>${t('tp.of', { n: all.length })}</span></div>
        <p>${t('tp.progress')}</p>
      </div>
    </div>
  </section>

  <section class="section journey-section">
    <div class="wrap">
      <div class="section-head compact">
        <h2 class="h2">${t('tp.journey')}</h2>
        <p class="note">${icon('info')} ${t('tp.order')}</p>
      </div>
      <ol class="journey">${STAGES.map(stageCard).join('')}</ol>
    </div>
  </section>

  <section class="section" id="bagrut">
    <div class="wrap">
      <h2 class="h2">${t('cur.examTitle')}</h2>
      <p class="section-lead">${t('cur.examLead')}</p>
      <div class="exam-grid">
        ${LEVELS.map((n) => `
          <article class="exam-card paper">
            <h3>${t('cur.units', { n })}</h3>
            <p><b>${t('cur.papers')}</b> ${esc(L(EXAM[n].papers))}</p>
            <p><b>${t('cur.geoPart')}</b> ${esc(L(EXAM[n].geometry))}</p>
            <p class="exam-out"><b>${t('cur.notIn')}</b> ${esc(L(EXAM[n].out))}</p>
          </article>`).join('')}
      </div>
      <p class="note exam-rules">${icon('info')} <span>${t('cur.rules')} <a href="${MINISTRY.page}" target="_blank" rel="noopener">${t('cur.srcPage')} ↗</a> · <a href="${MINISTRY.notTaught}" target="_blank" rel="noopener">${t('cur.srcOut')} ↗</a> · <a href="${MINISTRY.grading}" target="_blank" rel="noopener">${t('cur.srcGrading')} ↗</a></span></p>
    </div>
  </section>

  <section class="section" id="toolbox">
    <div class="wrap">
      <h2 class="h2">${t('tp.toolbox')}</h2>
      <p class="section-lead">${t('tp.toolboxText')}</p>
      <label class="cur-filter">${t('cur.filter')}
        <select class="adm-select small" data-cur-level>
          ${['all', ...LEVELS.map(String)].map((v) => `<option value="${v}"${v === toolboxLevel() ? ' selected' : ''}>${v === 'all' ? t('cur.allLevels') : t('cur.units', { n: v })}</option>`).join('')}
        </select>
      </label>
      ${groups.map((g) => `
        <h3 class="catalog-title">${g.title}</h3>
        <div class="catalog">
          ${reasonsOfStage(g.id).map(([rid, r]) => `
            <article class="reason-card k-${r.kind}${toolboxLevel() !== 'all' && !inLevel(rid, toolboxLevel()) ? ' lv-dim' : ''}" data-rid="${rid}">
              <div class="rc-top"><span class="rc-kind">${t('kind.' + r.kind)}</span>${r.playable ? `<span class="rc-demo">${icon('check')} ${t('tp.demoTag')}</span>` : ''}</div>
              ${reasonCurriculum(rid)}
              ${PROVED_IN[rid] ? `<p class="rc-proved${reasonEarned(rid, isSolved) ? ' is-done' : ''}">${icon(reasonEarned(rid, isSolved) ? 'check' : 'lock')} ${t(reasonEarned(rid, isSolved) ? 'tool.provedDone' : 'tool.provedIn', { q: provedInLabel(rid) })}</p>` : ''}
              <h4>${esc(L(r.name))}</h4>
              <p class="rc-alt">${esc(getLang() === 'he' ? r.name.en : r.name.he)}</p>
              <p>${rich(L(r.statement))}</p>
              <code dir="ltr">${r.lean}</code>
            </article>`).join('')}
        </div>`).join('')}
    </div>
  </section>`;
}

function bindTopic(root) {
  const j = root.querySelector('.journey');
  if (j) { void j.offsetWidth; j.classList.add('in'); }
  // Toolbox by level: reasons outside the chosen level's curriculum are dimmed, not hidden.
  const lvSel = root.querySelector('[data-cur-level]');
  if (lvSel) lvSel.addEventListener('change', () => {
    try { sessionStorage.setItem('lg.curLevel', lvSel.value); } catch { /* ignore */ }
    $$('.reason-card[data-rid]', root).forEach((card) => card.classList.toggle('lv-dim', lvSel.value !== 'all' && !inLevel(card.dataset.rid, lvSel.value)));
  });
  return null;
}

// ---------------------------------------------------------------- problem

function viewProblem({ stage, n, problem: p, bank }) {
  const list = bank ? [p] : PROBLEMS[stage]; // a teacher bank question stands alone
  const sNum = stageNumber(stage);
  const st = STAGES.find((s) => s.id === stage);
  const prev = list.find((x) => x.n === n - 1);
  const next = list.find((x) => x.n === n + 1);
  const renamed = renamedAngles(p);

  return `
  <div class="pp">
    <div class="wrap">
      <div class="pp-bar">
        <nav class="crumbs" aria-label="breadcrumbs"><a href="#/">${t('nav.home')}</a><span>/</span>${bank ? `<a href="${esc(bank.backHref)}">${esc(bank.backLabel)}</a>` : `<a href="#/hs/geometry">${t('nav.geometry')}</a>`}<span>/</span><span>${t('tp.stage', { n: sNum })} · ${L(st.name)}</span></nav>
        ${bank ? `<span class="badge">${esc(bank.badge)}</span>` : ''}
        <div class="pager"${bank ? ' hidden' : ''}>
          ${prev ? `<a class="pager-btn" href="#/hs/geometry/${stage}/${prev.n}" aria-label="${t('pp.prev')}">${icon('chevron', 'dir back')}</a>` : '<span class="pager-btn" aria-hidden="true"></span>'}
          <span>${t('pp.problemOf', { n, m: list.length })}</span>
          ${next ? `<a class="pager-btn" href="#/hs/geometry/${stage}/${next.n}" aria-label="${t('pp.next')}">${icon('chevron', 'dir')}</a>` : '<span class="pager-btn" aria-hidden="true"></span>'}
        </div>
        <span class="proto-badge" id="protoBadge">${icon('info')} ${t('pp.proto')}</span>
      </div>

      <div class="pp-grid">
        <section class="pp-problem">
          <header class="pp-head">
            <p class="kicker">${t('tp.stage', { n: sNum })} · ${L(st.name)}</p>
            <h1>${L(p.title)}</h1>
            <p class="intro">${rich(L(p.intro))}</p>
          </header>
          <div class="diagram-card paper" id="diagram">
            <button type="button" class="dg-angle" id="dgAngle" aria-pressed="false" title="${esc(PX('angleTitle'))}"><b aria-hidden="true">∢</b><span>${esc(PX('angleBtn'))}</span></button>
            <button type="button" class="dg-pin" id="dgPin" aria-pressed="true" title="${esc(PX('pin'))}" aria-label="${esc(PX('pin'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v7"/></svg></button>
          </div>
          <p class="dg-tip">${esc(PX('tip'))}</p>
          <dl class="facts">
            <div class="fact-group">
              <dt>${t('pp.given')}</dt>
              <dd><ul>${p.givens.map((g, i) => `<li data-claim="${esc(g.claim)}" data-g="${i}" tabindex="0">${g.text ? `${rich(L(g.text))} <small>${t('pp.meaning')} ${mathSpan(fmtClaim(p.givensParsed[i]))}</small>` : mathSpan(fmtClaim(p.givensParsed[i]))}</li>`).join('')}</ul></dd>
            </div>
            ${p.config.length || renamed.length ? `<div class="fact-group diag">
              <dt>${t('pp.fromDiagram')}</dt>
              <dd><ul>${p.config.map((c) => `<li>${rich(L(c.text))}</li>`).join('')}${renamed.map((names) => `<li data-claim="${esc(`∢${names[0].join('')} = ∢${names[1].join('')}`)}" tabindex="0">${t('pp.sameAngle', { names: joinList(names.map((x) => mathSpan('∢' + x.join('')))) })}</li>`).join('')}</ul><p class="fact-note">${t('pp.fromDiagramNote')}</p></dd>
            </div>` : ''}
            <div class="fact-group goal">
              <dt title="${t('pp.goalLong')}">${t('pp.goal')}</dt>
              <dd><ul><li data-claim="${esc(p.goal)}" tabindex="0">${mathSpan(fmtClaim(p.goalParsed))}</li></ul></dd>
            </div>
          </dl>
          <details class="lean-peek">
            <summary>${icon('code')} ${t('pp.inLean')}</summary>
            <pre class="lean" dir="ltr">${leanHTML(leanTheorem(p))}</pre>
          </details>
        </section>

        <section class="pp-proof" aria-labelledby="proofTitle">
          <div class="notebook paper">
            <div class="nb-head">
              <h2 id="proofTitle">${t('pp.proof')}</h2>
              <div class="nb-tools">
                <label class="view-as" id="viewAsWrap" hidden><span>${t('tool.viewAs')}</span><select id="viewAs" class="view-as-sel">
                  <option value="">${t('tool.viewAs.admin')}</option>
                  ${['default', '3', '4', '5', 'uni'].map((tr) => `<option value="${tr}">${esc(t('tool.viewAs.as', { track: t('tool.set.track.' + tr) }))}</option>`).join('')}
                </select></label>
                <span class="lean-status" id="leanStatus" role="status" hidden></span>
                <label class="switch" title="${t('pp.showLeanLabel')}"><input type="checkbox" id="leanToggle"><span class="switch-ui" aria-hidden="true"></span><span>${icon('code')} ${t('pp.showLean')}</span></label>
                <button type="button" class="tool-btn" id="givensBtn"></button>
                <button type="button" class="tool-btn" id="hintBtn">${icon('bulb')} <span>${t('pp.hint')}</span></button>
                <button type="button" class="tool-btn" id="resetBtn">${icon('reset')} <span>${t('pp.reset')}</span></button>
              </div>
            </div>
            <div class="hint-box" id="hintBox" hidden></div>
            <div class="ptable">
              <div class="prow phead" aria-hidden="true"><span>#</span><span>${t('pp.colClaim')}</span><span>${t('pp.colReason')}</span><span></span></div>
              <ol class="prows" id="rows"></ol>
              <div class="pempty" id="empty">
                <p class="pempty-t">${t('pp.empty.t')}</p>
                <ol>${[1, 2, 3].map((i) => `<li>${rich(t('pp.empty.' + i))}</li>`).join('')}</ol>
              </div>
            </div>
            <div class="cpct-panel" id="cpctPanel" hidden></div>
            <div class="blocked" id="blocked" hidden>${icon('info')} ${t('pp.blocked')}</div>
            <div class="solved" id="solved" hidden></div>
            <form class="composer" id="composer" autocomplete="off" novalidate>
              <div class="cmp-head"><span class="cmp-row" id="cmpRow"></span><span class="live-lean" id="liveLean" dir="ltr" hidden></span></div>
              <label class="cmp-label" for="claimInput">${t('pp.claim')}</label>
              <div class="claim-field">
                <input id="claimInput" class="claim-input" dir="ltr" spellcheck="false" autocapitalize="characters" placeholder="${t('pp.claimPh')}">
                <div class="symkeys" role="group" aria-label="symbols">
                  ${['∢', '△', 'S△', 'S□', '≅', '⊥', '∥', '∼', '<', '>', '=', '+', '−', '²', '/', '°'].filter((s) => sNum >= ({ '∥': 4, '<': 5, '>': 5, '²': 6, '∼': 9, '/': 9, 'S△': 6, 'S□': 6 }[s] || 1)).map((s) => `<button type="button" class="symkey" data-sym="${s}">${s}</button>`).join('')}<button type="button" class="symkey symkey-del" data-sym="⌫" title="${esc(PX('backspace'))}" aria-label="${esc(PX('backspace'))}">⌫</button>
                </div>
                <div class="symkeys numkeys" role="group" aria-label="${esc(PX('digits'))}">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.'].map((d) => `<button type="button" class="symkey numkey" data-sym="${d}">${d}</button>`).join('')}</div>
              </div>
              <div class="claim-preview" id="preview" aria-live="polite"></div>
              <span class="cmp-label" id="reasonLabel">${t('pp.reason')}</span>
              <div class="reason-field" id="reasonField">
                <div class="reason-row">
                  <div class="quick-reasons" role="group" aria-labelledby="reasonLabel">
                    ${['given', 'algebra'].map((id) => `<button type="button" class="qchip" data-r="${id}" aria-pressed="false">${reasonShort(id)}</button>`).join('')}
                  </div>
                  <div class="reason-combo" id="reasonCombo">
                    <span class="rc-chosen" id="reasonChosen" hidden></span>
                    <input id="reasonInput" class="reason-input" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="reasonSugg"
                      aria-labelledby="reasonLabel" placeholder="${t('pp.reasonType')}" autocomplete="off" spellcheck="false">
                    <ul class="reason-sugg" id="reasonSugg" role="listbox" aria-labelledby="reasonLabel" hidden></ul>
                  </div>
                  <button type="button" class="mini-tool ask-reason" id="askReasonBtn" hidden>${icon(TOOLS.askReason.icon)} ${t('tool.askReason.btn')}</button>
                </div>
                <p class="auto-line" id="autoLine" hidden></p>
              </div>
              <p class="rinfo" id="rinfo"></p>
              <div class="refs-field" id="refsField" hidden>
                <span class="cmp-label">${t('pp.refs')} <small id="refsHint"></small><button type="button" class="mini-tool" id="autoRefsBtn" hidden>${icon(TOOLS.autoRefs.icon)} ${t('tool.autoRefs.btn')}</button></span>
                <div class="ref-chips" id="refChips"></div>
              </div>
              <p class="cmp-msg" id="cmpMsg" role="alert" hidden></p>
              <div class="cmp-actions">
                <button type="button" class="btn btn-ghost btn-small" id="cancelEdit" hidden>${t('pp.cancel')}</button>
                <button type="submit" class="btn btn-primary" id="addBtn">${icon('enter')} <span id="addLabel">${t('pp.add')}</span></button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  </div>`;
}

// Reasons are not listed: the student types a name and gets completions.
// Matching ignores dots, quotes and spaces, so "צזצ" finds "צ.ז.צ".
const squash = (s) => String(s).toLowerCase().replace(/[.\s"'״׳\-–,:()]/g, '');

// usable(id): false for a reason the checker can't take here (area of a triangle: claims have no
// areas yet; a definition only a given cites), so it isn't offered.
function matchReasons(query, allowed, usable = () => true) {
  const q = squash(query);
  if (!q) return [];
  const scored = [];
  for (const [id, r] of Object.entries(REASONS)) {
    if (!usable(id)) continue;
    const names = [r.short.he, r.short.en, r.name.he, r.name.en, r.lean, ...(REASON_ALIASES[id] || [])];
    let score = 0;
    for (const nm of names) {
      const whole = squash(nm);
      if (whole.startsWith(q)) score = Math.max(score, 3);
      else if (String(nm).toLowerCase().split(/[\s\-]+/).some((w) => squash(w).startsWith(q))) score = Math.max(score, 2);
      else if (q.length >= 2 && whole.includes(q)) score = Math.max(score, 1);
    }
    if (score) scored.push({ id, r, score, locked: !allowed.includes(id) });
  }
  scored.sort((a, b) => a.locked - b.locked || b.score - a.score);
  return [...scored.filter((x) => !x.locked).slice(0, 6), ...scored.filter((x) => x.locked).slice(0, 2)];
}

function exactReason(query, allowed) {
  const q = squash(query);
  return Object.keys(REASONS).find((id) => allowed.includes(id)
    && [REASONS[id].short.he, REASONS[id].short.en, REASONS[id].name.he, REASONS[id].name.en].some((nm) => squash(nm) === q));
}

function bindProblem(root, { stage, n, problem: p, bank }) {
  // A theorem the student proves in its own problem stays out of their toolbox until then (tools.js).
  // Admins and teachers (fullAccess) get every reason of every stage, not only this stage's.
  p.allowedAll = p.allowedAll || p.allowed;
  const earnReasons = () => {
    const base = fullAccess() ? Object.keys(REASONS) : p.allowedAll;
    p.allowed = base.filter((id) => reasonEarned(id, isSolved));
  };
  earnReasons();
  // teacher question bank: progress under "tq-<id>"; the editor's preview saves nothing
  const pk = bank ? `tq-${bank.id}` : pkey(stage, n);
  const solvedHere = () => !!progress()[pk]?.solved;
  const save = (data) => {
    // the editor's preview saves no progress, but a solved proof unlocks publishing (qbank.js)
    if (bank && bank.draft) {
      if (data.solved && data.rows) import('./qbank.js').then((m) => m.markDraftSolved(data.rows)).catch(() => {});
      return;
    }
    saveProgress(stage, n, data, pk);
  };
  const saved = bank && bank.draft ? null : progress()[pk];
  const state = {
    rows: (saved && saved.rows) || [],
    reason: null,
    refs: new Set(),
    editing: null,
    showLean: store.get('showLean', false),
    hints: Math.min((saved && saved.hints) || 0, p.hints.length), // hints already waited for stay open
  };

  syncConstructions(p, state.rows); // construction rows add points and lines (geo.js)
  const dg = renderDiagram(p, { animate: true, label: t('pp.diagramAria') });
  $('#diagram', root).append(dg.el);
  // the construction tool (constructions-ui.js) adds its row at the end of the proof
  mountConstructions({ root, p, dg, addRow: (row) => { state.rows.push(row); renderRows(); } });

  // Tap or click a point, segment or angle in the diagram: it goes into the claim (play-extras.js).
  // With a finger the claim field is not focused, so the phone keyboard stays closed.
  const ppEl = $('.pp', root);
  let lastPointer = 'mouse';
  ppEl.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType || 'mouse'; }, true);
  dg.el.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') dg.markPick(dg.pick(e.clientX, e.clientY)); });
  dg.el.addEventListener('pointerleave', () => dg.markPick(null));
  dg.el.addEventListener('click', (e) => {
    const touch = lastPointer !== 'mouse';
    const hit = dg.pick(e.clientX, e.clientY, touch);
    if (!hit) return;
    const r = insertPick(input.value, input.selectionStart ?? input.value.length, hit);
    input.value = liveFormat(r.value);
    showMsg('');
    updatePreview();
    dg.markPick(hit, true);
    if (!touch) input.focus();
    try { input.setSelectionRange(r.caret, r.caret); } catch { /* ignore */ }
  });
  // On a phone the diagram stays on top of the screen while the student writes, unless they let it go.
  const pinBtn = $('#dgPin', root);
  const setPin = (on) => {
    ppEl.classList.toggle('dg-free', !on);
    pinBtn.setAttribute('aria-pressed', String(on));
    pinBtn.title = PX(on ? 'pin' : 'unpin');
    pinBtn.setAttribute('aria-label', pinBtn.title);
    store.set('dgPin', on);
  };
  setPin(store.get('dgPin', true));
  pinBtn.addEventListener('click', () => setPin(pinBtn.getAttribute('aria-pressed') !== 'true'));

  const rowsEl = $('#rows', root);
  const input = $('#claimInput', root);
  const preview = $('#preview', root);
  const leanToggle = $('#leanToggle', root);
  const liveLean = $('#liveLean', root);
  leanToggle.checked = state.showLean;

  // Naming an angle (or a triangle) by its points (play-extras.js building). The "∢ angle" button on the
  // diagram starts "∢" in the claim; while the claim ends in ∢ or △ and fewer than three letters, a tap
  // anywhere near a point adds that point, and the diagram rings the points chosen so far. This runs
  // before the tap-to-insert handler above (capture) and stops it only in that state; the button then
  // says what to tap next, and pressing it again takes the half-written name out.
  const angleBtn = $('#dgAngle', root);
  const caretAt = () => input.selectionStart ?? input.value.length;
  let buildHover = null; // the point under the mouse while naming
  function syncBuild() {
    const b = building(input.value, caretAt());
    dg.el.classList.toggle('is-building', !!b);
    angleBtn.setAttribute('aria-pressed', String(!!b));
    angleBtn.title = b ? PX('buildCancel') : PX('angleTitle');
    angleBtn.innerHTML = b
      ? `<b dir="ltr">${esc(b.sym + b.letters)}</b><span>${esc(buildSaid(b))}</span>${icon('x')}`
      : `<b aria-hidden="true">∢</b><span>${esc(PX('angleBtn'))}</span>`;
    const pts = b ? [...b.letters, ...(buildHover && !b.letters.includes(buildHover) ? [buildHover] : [])] : [];
    dg.markPick({ kind: 'build', p: pts, hover: pts.length > (b ? b.letters.length : 0) });
  }
  const nudge = () => { angleBtn.classList.remove('is-nudge'); void angleBtn.offsetWidth; angleBtn.classList.add('is-nudge'); };
  dg.el.addEventListener('click', (e) => {
    const b = building(input.value, caretAt());
    if (!b) return;
    const touch = lastPointer !== 'mouse';
    // a lone "∢" and a tap inside an angle: tap-to-insert puts that angle in the ∢'s place
    if (b.sym === '∢' && !b.letters) {
      const hit = dg.pick(e.clientX, e.clientY, touch);
      if (hit && hit.kind === 'ang') return;
    }
    e.stopImmediatePropagation();
    const hit = dg.pick(e.clientX, e.clientY, touch, { snap: true });
    const r = hit && addBuildPoint(input.value, caretAt(), b, hit.p[0]);
    if (!r) { nudge(); return; }
    input.value = r.value;
    if (!touch) input.focus();
    try { input.setSelectionRange(r.caret, r.caret); } catch { /* ignore */ }
    buildHover = null;
    showMsg('');
    updatePreview();
    if (r.done) dg.markPick({ kind: b.sym === '∢' ? 'ang' : 'tri', p: [...b.letters, hit.p[0]] }, true);
  }, true);
  dg.el.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const b = building(input.value, caretAt());
    if (!b) return;
    dg.markPick(null); // no side or angle outline while naming by points
    const h = dg.pick(e.clientX, e.clientY, false, { snap: true });
    const X = h ? h.p[0] : null;
    if (X !== buildHover) { buildHover = X; syncBuild(); }
  });
  dg.el.addEventListener('pointerleave', () => { if (buildHover) { buildHover = null; syncBuild(); } });
  angleBtn.addEventListener('click', () => {
    const b = building(input.value, caretAt());
    const r = b ? dropBuild(input.value, caretAt(), b) : insertPick(input.value, caretAt(), { kind: 'ang', text: '∢' });
    input.value = r.value;
    if (lastPointer === 'mouse') input.focus();
    try { input.setSelectionRange(r.caret, r.caret); } catch { /* ignore */ }
    buildHover = null;
    showMsg('');
    updatePreview();
  });
  // the caret moved inside the claim (a tap or an arrow key): the naming state follows it
  for (const ev of ['keyup', 'pointerup']) input.addEventListener(ev, () => syncBuild());
  let result = checkProof(p, state.rows);
  let wasSolved = result.solvedAt >= 0;

  // Lean is the judge when the checking service runs (lean-service.js): its verdicts replace the
  // browser's, row by row. Without the service, the browser's check stands.
  let lean = null; // { key, res }: Lean's answer for the rows serialized as `key`
  let leanTimer = 0;
  const leanStatusEl = $('#leanStatus', root);
  const rowsKey = () => JSON.stringify(state.rows.map((r) => [r.text, r.reason || null, r.refs || []]));

  function showLeanStatus() {
    leanStatusEl.hidden = !leanEnabled();
    // "checking is simulated in the browser" is only true while Lean isn't answering
    $('#protoBadge', root).hidden = leanEnabled() && leanState() === 'online';
    if (leanStatusEl.hidden) return;
    const s = leanState();
    leanStatusEl.className = 'lean-status is-' + s;
    leanStatusEl.innerHTML = `${icon(s === 'online' ? 'check' : 'info')} <span>${t('lean.status.' + s)}</span>`;
  }

  function scheduleLean() {
    if (!leanEnabled()) return;
    const key = rowsKey();
    clearTimeout(leanTimer);
    leanTimer = setTimeout(async () => {
      const res = await leanCheck(p, state.rows, result.results);
      showLeanStatus();
      if (res && rowsKey() === key) {
        lean = { key, res };
        renderRows();
      }
    }, 250);
  }
  showLeanStatus();

  // hover any [data-claim] fact to highlight it
  $$('[data-claim]', root).forEach((el) => {
    const c = parseClaim(el.dataset.claim, p);
    const on = () => dg.highlight(claimToItems(c.claim));
    const off = () => syncPreviewHighlight();
    el.addEventListener('mouseenter', on); el.addEventListener('focus', on);
    el.addEventListener('mouseleave', off); el.addEventListener('blur', off);
  });

  function syncPreviewHighlight() {
    const r = input.value.trim() ? parseClaim(input.value, p) : null;
    dg.highlight(r && r.ok ? claimToItems(r.claim) : []);
  }

  function persist() {
    save({ rows: state.rows, solved: result.solvedAt >= 0 || solvedHere() });
  }

  function renderRows() {
    syncConstructions(p, state.rows);
    dg.sync(p);
    result = checkProof(p, state.rows);
    if (lean && lean.key === rowsKey()) applyLean(result, lean.res, state.rows);
    else scheduleLean();
    const { results } = result;
    dg.setProven(provenMarks(p, results)); // every fact proven so far, marked on the diagram
    rowsEl.innerHTML = results.map((r, i) => {
      const row = state.rows[i];
      const cls = r.ok ? 'ok' : 'bad';
      const claimHTML = r.parsed.ok ? mathSpan(fmtClaim(r.parsed.claim)) : `<span class="raw" dir="ltr">${esc(row.text)}</span>`;
      return `<li class="prow ${cls}${r.goal && r.ok ? ' is-goal' : ''}${r.byLean ? ' by-lean' : ''}${state.editing === i ? ' is-editing' : ''}" data-i="${i}" tabindex="0">
        <span class="pnum">${i + 1}</span>
        <span class="pclaim">${claimHTML}${r.goal && r.ok ? `<span class="goal-tag">${t('pp.goalRow')}</span>` : ''}</span>
        <span class="preason">${row.reason ? reasonShort(row.reason) : '—'}${refsText(row.refs)}${row.auto ? `<span class="auto-tag" title="${t('pp.autoTitle')}">${icon('spark')}${t('pp.autoTag')}</span>` : ''}${row.skip ? `<span class="auto-tag skip-tag" title="${esc(PX('skipTagTitle'))}">${icon('spark')}${esc(PX('skipTag'))}</span>` : ''}</span>
        <span class="pstat" title="${r.byLean ? t('lean.checked') + ' · ' : ''}${r.ok ? t('pp.ok') : t('pp.bad')}">${icon(r.ok ? 'check' : 'x')}<span class="sr">${r.ok ? t('pp.ok') : t('pp.bad')}</span></span>
        <span class="pactions">
          <button type="button" class="mini mv-up" data-act="up" aria-label="${t('pp.moveUp', { n: i + 1 })}" title="${t('pp.moveUp', { n: i + 1 })}"${i === 0 ? ' disabled' : ''}>${icon('chevron')}</button>
          <button type="button" class="mini mv-down" data-act="down" aria-label="${t('pp.moveDown', { n: i + 1 })}" title="${t('pp.moveDown', { n: i + 1 })}"${i === results.length - 1 ? ' disabled' : ''}>${icon('chevron')}</button>
          <button type="button" class="mini" data-act="edit" aria-label="${t('pp.edit', { n: i + 1 })}">${icon('edit')}</button>
          <button type="button" class="mini" data-act="del" aria-label="${t('pp.delete', { n: i + 1 })}">${icon('trash')}</button>
        </span>
        ${!r.ok ? `<p class="pmsg">${msgHTML(r.msg)}</p>` : ''}
        ${state.showLean && r.lean ? `<code class="plean${r.ok ? '' : ' is-err'}" dir="ltr">${leanHTML(r.lean)}</code>` : ''}
      </li>`;
    }).join('');
    $('#empty', root).hidden = state.rows.length > 0;
    $('#blocked', root).hidden = !result.blocked;
    // a given already in the proof is marked, and clicking it again adds nothing
    $$('.facts li[data-g]', root).forEach((li) => li.classList.toggle('is-used', givenRow(li) >= 0));
    renderSolved();
    renderComposerMeta();
    persist();
    toolsAfterRows(); // the hint lock and the conclusions list follow the rows (tools.js)
  }

  function renderSolved() {
    const box = $('#solved', root);
    const solved = result.solvedAt >= 0;
    box.hidden = !solved;
    $('#composer', root).classList.toggle('is-dim', solved);
    if (!solved) { box.innerHTML = ''; wasSolved = false; return; }
    if (!wasSolved) { toolNews = toolsOpenedNow(); theoremNews = !!p.proves && !solvedHere() && !fullAccess(); syncTools(); }
    const all = problemList();
    const idx = all.findIndex((x) => x.stage === stage && x.n === n);
    const nxt = bank ? null : all[idx + 1];
    box.innerHTML = `
      <div class="stamp${wasSolved ? ' on still' : ''}"><span>${t('pp.solved.stamp')}</span></div>
      <div class="solved-copy">
        <h3>${t('pp.solved.t')}</h3>
        <p>${t('pp.solved.p')}</p>
        ${nxt || bank ? '' : `<p class="muted">${t('pp.solved.last')}</p>`}
        ${theoremNews ? `<p class="tool-news">${icon('spark')}<span><b>${t('tool.theoremNew', { name: reasonShort(p.proves) })}</b> ${t('tool.theoremNewP')}</span></p>` : ''}
        ${toolNews.map((id) => `<p class="tool-news">${icon(TOOLS[id].icon)}<span><b>${t('tool.new', { name: t('tool.' + id) })}</b> ${t('tool.' + id + '.new')}</span></p>`).join('')}
        <div class="cta-row">
          ${nxt ? `<a class="btn btn-primary" href="#/hs/geometry/${nxt.stage}/${nxt.n}">${t('pp.solved.next')} ${icon('arrow', 'dir')}</a>` : ''}
          ${bank ? `<a class="btn btn-ghost" href="${esc(bank.backHref)}">${icon('map')} ${esc(bank.backLabel)}</a>` : `<a class="btn btn-ghost" href="#/hs/geometry">${icon('map')} ${t('pp.solved.map')}</a>`}
        </div>
        <details class="lean-peek">
          <summary>${icon('code')} ${t('pp.solved.code')}</summary>
          <pre class="lean" dir="ltr">${leanHTML(leanTheorem(p, result.results, result.solvedAt))}</pre>
        </details>
      </div>`;
    if (!wasSolved) {
      const stampEl = box.querySelector('.stamp');
      void stampEl.offsetWidth;
      stampEl.classList.add('on');
    }
    wasSolved = true;
  }

  function renderComposerMeta() {
    const nextN = state.editing != null ? state.editing + 1 : state.rows.length + 1;
    $('#cmpRow', root).textContent = state.editing != null ? t('pp.editing', { n: nextN }) : t('pp.row', { n: nextN });
    $('#addLabel', root).textContent = state.editing != null ? t('pp.update') : t('pp.add');
    $('#cancelEdit', root).hidden = state.editing == null;
    renderReasonField();
    const r = state.reason ? REASONS[state.reason] : null;
    $('#rinfo', root).innerHTML = r ? `<b>${esc(L(r.name))}.</b> ${rich(L(r.statement))}` : '';
    const needs = r ? r.refs : 0;
    const field = $('#refsField', root);
    field.hidden = !needs;
    if (needs) {
      const maxRow = state.editing != null ? state.editing : state.rows.length;
      $('#refsHint', root).textContent = needs === 'many' ? t('pp.refsPickMany') : needs === 1 ? t('pp.refsPick1') : t('pp.refsPick', { n: needs });
      $('#refChips', root).innerHTML = maxRow === 0
        ? `<span class="muted">${t('pp.refsNone')}</span>`
        : Array.from({ length: maxRow }, (_, i) => i + 1).map((k) => {
          const res = result.results[k - 1];
          const claim = res && res.parsed.ok ? fmtClaim(res.parsed.claim) : state.rows[k - 1].text;
          return `<button type="button" class="refchip${res && res.ok ? '' : ' is-bad'}" aria-pressed="${state.refs.has(k)}" data-k="${k}" title="${esc(claim)}"><b>${k}</b><span>${mathSpan(claim)}</span></button>`;
        }).join('');
    }
    updateLiveLean();
  }

  function updateLiveLean() {
    liveLean.hidden = !state.showLean;
    if (!state.showLean) return;
    const r = input.value.trim() ? parseClaim(input.value, p) : null;
    const nn = state.editing != null ? state.editing + 1 : state.rows.length + 1;
    const claim = r && r.ok ? leanClaim(r.claim) : '…';
    const auto = currentAuto();
    const rid = state.reason || (auto && auto.reason);
    const reason = rid ? REASONS[rid].lean : '…';
    const refs = (state.reason ? [...state.refs] : auto ? auto.refs : []).sort((a, b) => a - b).map((k) => 's' + k).join(' ');
    liveLean.innerHTML = `<span class="ll-tag">${t('pp.livePrefix')}</span> ${leanHTML(`have s${nn} : ${claim} := ${reason}${refs ? ' ' + refs : ''}`)}`;
  }

  function updatePreview() {
    const v = input.value.trim();
    if (!v) {
      preview.innerHTML = `<span class="muted">${t('pp.previewEmpty')}</span>`;
      preview.className = 'claim-preview';
    } else if (chainParts(v)) {
      const parts = chainParts(v);
      preview.className = 'claim-preview is-ok';
      preview.innerHTML = `${esc(t('pp.chainSplit', { n: parts.length }))} ${parts.map((s) => mathSpan(fmtClaim(parseClaim(s, p).claim))).join(' · ')}`;
    } else {
      const r = parseClaim(v, p);
      preview.className = 'claim-preview ' + (r.ok ? 'is-ok' : 'is-err');
      preview.innerHTML = r.ok ? mathSpan(fmtClaim(r.claim)) : msgHTML(r.error);
      // half-way through naming an angle by its points: what to tap next, not an error
      const bd = !r.ok && building(input.value, caretAt());
      if (bd) { preview.className = 'claim-preview'; preview.innerHTML = `<span class="muted">${esc(buildSaid(bd))}</span>`; }
    }
    syncPreviewHighlight();
    renderReasonField();
    updateLiveLean();
    syncBuild();
  }

  const upto = () => (state.editing != null ? state.editing : state.rows.length);

  // "AB = BC = CA": one row for each neighbouring pair (AB = BC, BC = CA), or null.
  function chainParts(text) {
    const parts = String(text).split('=').map((s) => s.trim());
    if (parts.length < 3 || parts.some((s) => !s)) return null;
    const out = parts.slice(1).map((s, i) => `${parts[i]} = ${s}`);
    return out.every((s) => parseClaim(s, p).ok) ? out : null;
  }
  // The rows of a chain go in where the claim was going, like skipped steps. A part that is a
  // given, an identity or a calculation gets its own reason; the others get the chosen reason.
  function addChain(parts) {
    if (!state.reason && reasonInput.value.trim()) {
      const exact = exactReason(reasonInput.value, p.allowed);
      if (!exact) { showMsg(`${icon('info')} ${t('pp.pickFromList')}`); reasonInput.focus(); openSugg(); return; }
      state.reason = exact;
    }
    const at = upto();
    const before = state.rows.slice(0, at);
    const chosen = state.reason ? { reason: state.reason, refs: [...state.refs].sort((a, b) => a - b) } : null;
    const made = [];
    for (const text of parts) {
      const done = checkProof(p, [...before, ...made]).results;
      const a = autoReason(p, done, parseClaim(text, p).claim, at + made.length);
      const auto = a && p.allowed.includes(a.reason) ? { ...a, auto: true } : null;
      const fits = (c) => c && checkProof(p, [...before, ...made, { text, reason: c.reason, refs: c.refs }]).results[at + made.length].ok;
      const pick = [chosen, auto].find(fits) || chosen || auto;
      if (!pick) { showMsg(`${icon('info')} ${t('pp.needReason')}`); reasonInput.focus(); return; }
      made.push({ text, reason: pick.reason, refs: pick.refs, ...(pick.auto ? { auto: true } : {}) });
    }
    const editing = state.editing != null;
    const extra = made.length - (editing ? 1 : 0);
    const later = state.rows.slice(editing ? at + 1 : at).map((r) => ({ ...r, refs: (r.refs || []).map((k) => (k > at ? k + extra : k)) }));
    state.rows = [...state.rows.slice(0, at), ...made, ...later];
    resetComposer();
    renderRows();
    refocus();
  }

  // A calculation (or an identity such as AB = AB) fills in its own reason.
  function currentAuto() {
    if (state.reason) return null;
    const v = input.value.trim();
    if (!v) return null;
    const r = parseClaim(v, p);
    if (!r.ok) return null;
    const a = autoReason(p, result.results, r.claim, upto());
    return a && p.allowed.includes(a.reason) ? a : null;
  }

  function showMsg(html) {
    const m = $('#cmpMsg', root);
    m.classList.remove('is-skip');
    m.hidden = !html;
    m.innerHTML = html || '';
  }

  function resetComposer() {
    input.value = '';
    state.reason = null;
    state.refs = new Set();
    state.editing = null;
    showMsg('');
    reasonInput.value = '';
    closeSugg();
    updatePreview();
  }

  // --- reason field: "given" and "algebra" as buttons, everything else typed with completion
  const reasonInput = $('#reasonInput', root);
  const sugg = $('#reasonSugg', root);
  const chosen = $('#reasonChosen', root);
  let active = -1;
  let options = [];

  // "given", "algebra", and the theorems the student has not used yet in a solved problem (play-extras.js)
  const quickWrap = $('.quick-reasons', root);
  let quickIds = ['given', 'algebra'];
  function renderQuick() {
    const fresh = newReasons(p, stage, progress(), pk);
    quickIds = ['given', 'algebra', ...fresh];
    quickWrap.classList.toggle('has-new', fresh.length > 0);
    const chip = (id) => {
      const isNew = fresh.includes(id);
      return `<button type="button" class="qchip${isNew ? ' is-new' : ''}" data-r="${id}" aria-pressed="${state.reason === id}"${isNew ? ` title="${esc(PX('newTitle'))}"` : ''}>${reasonShort(id)}${isNew ? `<span class="qnew">${esc(PX('newTag'))}</span>` : ''}</button>`;
    };
    // the new ones in a row of their own, which scrolls sideways on a phone (styles.css)
    quickWrap.innerHTML = ['given', 'algebra'].map(chip).join('') + (fresh.length ? `<span class="qnew-row">${fresh.map(chip).join('')}</span>` : '');
  }

  // Skip steps (a tool the admin opens): the rows the game would add for the claim being written.
  const skipOn = () => DEV_SKIP || toolOpen('skipSteps', solvedNow);
  let skipMemo = { key: null, val: null };
  function currentSkip() {
    if (!skipOn() || state.reason || reasonInput.value.trim()) return null;
    const v = input.value.trim();
    if (!v || currentAuto()) return null;
    const key = `${v}|${upto()}|${rowsKey()}|${p.allowed.join()}`;
    if (skipMemo.key !== key) {
      let val = null;
      try { val = findSkip(p, state.rows, upto(), v); } catch (e) { console.warn('[skip]', e); }
      skipMemo = { key, val };
    }
    return skipMemo.val;
  }
  // A calculation that also needs an angle or segment addition read off the diagram (for every
  // student, play-extras.js findAddition): with "algebra" chosen, or with no reason at all.
  let addMemo = { key: null, val: null };
  function currentAddition() {
    if (state.reason ? state.reason !== 'algebra' : reasonInput.value.trim()) return null;
    const v = input.value.trim();
    if (!v || (!state.reason && currentAuto())) return null;
    const key = `${v}|${upto()}|${rowsKey()}|${p.allowed.join()}`;
    if (addMemo.key !== key) {
      let val = null;
      try { val = findAddition(p, state.rows, upto(), v); } catch (e) { console.warn('[addition]', e); }
      addMemo = { key, val };
    }
    return addMemo.val;
  }
  // The fact rows go in first; the claim cites them (filled in by itself only when no reason was chosen).
  function additionRows(ad) {
    const n = ad.rows.length;
    const at = upto();
    let last = ad.rows[n - 1];
    if (!state.reason) last = { ...last, auto: true };
    else if (state.refs.size) {
      // the rows the student cited, with the added facts, when they are enough
      const mine = { ...last, refs: [...new Set([...state.refs, ...ad.rows.slice(0, -1).map((_, i) => at + 1 + i)])].sort((a, b) => a - b) };
      const trial = [...state.rows.slice(0, at), ...ad.rows.slice(0, -1), mine];
      if (checkProof(p, trial).results[trial.length - 1].ok) last = mine;
    }
    return { rows: [...ad.rows.slice(0, -1), last] };
  }
  const applyAddition = (ad) => applySkip(additionRows(ad), 'addDone');
  // "row 2: ∢AOC + ∢COB = 180° (adjacent angles), then row 3: algebra (1, 2)"
  function skipStepsHTML(sk, first) {
    return sk.rows.map((r, i) => {
      const c = parseClaim(r.text, p);
      const last = i === sk.rows.length - 1;
      return `${last && i ? PX('then') : i ? ', ' : ''}${PX('rowN', { n: first + i })} ${last ? PX('yours') : mathSpan(c.ok ? fmtClaim(c.claim) : r.text)} (<b>${reasonShort(r.reason)}</b>${refsText(r.refs)})`;
    }).join('');
  }

  function renderReasonField() {
    const rid = state.reason;
    const quick = quickIds.includes(rid);
    $$('.qchip', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.r === rid)));
    chosen.hidden = !rid || quick;
    reasonInput.hidden = !!rid && !quick;
    if (rid && !quick) chosen.innerHTML = `<b>${reasonShort(rid)}</b><button type="button" class="mini" data-clear aria-label="${t('pp.reasonClear')}">${icon('x')}</button>`;
    const auto = currentAuto();
    const line = $('#autoLine', root);
    const ad = auto ? null : currentAddition();
    const sk = auto || ad ? null : currentSkip();
    line.hidden = (!auto && !sk && !ad) || !!reasonInput.value.trim();
    line.classList.toggle('is-skip', !!(sk || ad));
    if (auto) line.innerHTML = `${icon('spark')} ${t('pp.autoNote', { r: `<b>${reasonShort(auto.reason)}</b>${refsText(auto.refs)}` })}`;
    else if (ad) line.innerHTML = `${icon('spark')} <span>${PX('addLine', { steps: skipStepsHTML(additionRows(ad), upto() + 1) })}</span>`;
    else if (sk) line.innerHTML = `${icon('spark')} <span>${PX('skipLine', { steps: skipStepsHTML(sk, upto() + 1) })}</span>`;
  }

  function openSugg() {
    options = matchReasons(reasonInput.value, p.allowed, (id) => REASONS[id].playable || p.givens.some((g) => (g.also || []).includes(id)));
    active = options.findIndex((o) => !o.locked);
    // "צ.ז.ז" is not a congruence theorem in the Bagrut: say what to write instead.
    const aas = AAS_NAMES.includes(squash(reasonInput.value));
    sugg.innerHTML = (aas ? `<li class="sugg is-empty is-note" aria-disabled="true">${t('cur.aas')}</li>` : '') + (options.length
      ? options.map((o, i) => `<li role="option" id="rs-${i}" class="sugg${o.locked ? ' is-locked' : ''}${i === active ? ' is-active' : ''}" data-i="${i}" aria-disabled="${o.locked}">
          <span class="sg-name">${esc(L(o.r.name))}</span>
          <span class="sg-text">${o.locked ? `${icon('lock')} ${p.allowedAll && p.allowedAll.includes(o.id) ? t('tool.proveFirst', { q: provedInLabel(o.id) }) : t('pp.lockedAt', { n: stageNumber(o.r.stage) })}` : rich(L(o.r.statement))}</span>
        </li>`).join('')
      : aas ? '' : `<li class="sugg is-empty" aria-disabled="true">${t('pp.reasonNone')}</li>`);
    sugg.hidden = !reasonInput.value.trim();
    reasonInput.setAttribute('aria-expanded', String(!sugg.hidden));
    reasonInput.setAttribute('aria-activedescendant', active >= 0 ? `rs-${active}` : '');
  }
  function closeSugg() {
    sugg.hidden = true;
    reasonInput.setAttribute('aria-expanded', 'false');
  }
  function moveActive(d) {
    const open = options.map((o, i) => (o.locked ? -1 : i)).filter((i) => i >= 0);
    if (!open.length) return;
    const pos = open.indexOf(active);
    active = open[(pos + d + open.length) % open.length];
    $$('.sugg', sugg).forEach((li) => li.classList.toggle('is-active', +li.dataset.i === active));
    reasonInput.setAttribute('aria-activedescendant', `rs-${active}`);
  }
  function pickReason(id) {
    state.reason = id;
    state.refs = new Set();
    if (id === 'algebra') {
      const auto = autoFor('algebra');
      if (auto) state.refs = new Set(auto.refs);
    }
    reasonInput.value = '';
    closeSugg();
    showMsg('');
    renderComposerMeta();
    updatePreview();
  }
  // The calculation rows for a claim, used to pre-mark rows when "algebra" is picked by hand.
  function autoFor(rid) {
    const v = input.value.trim();
    if (!v) return null;
    const r = parseClaim(v, p);
    if (!r.ok) return null;
    const a = autoReason(p, result.results, r.claim, upto());
    return a && a.reason === rid ? a : null;
  }

  quickWrap.addEventListener('click', (e) => {
    const b = e.target.closest('.qchip');
    if (!b) return;
    if (state.reason === b.dataset.r) { state.reason = null; state.refs = new Set(); renderComposerMeta(); updatePreview(); return; }
    pickReason(b.dataset.r);
  });
  renderQuick();
  chosen.addEventListener('click', (e) => {
    if (!e.target.closest('[data-clear]')) return;
    state.reason = null;
    state.refs = new Set();
    renderComposerMeta();
    updatePreview();
    reasonInput.focus();
  });
  reasonInput.addEventListener('input', () => { showMsg(''); openSugg(); renderReasonField(); });
  reasonInput.addEventListener('focus', () => { if (reasonInput.value.trim()) openSugg(); });
  reasonInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (sugg.hidden) openSugg(); else moveActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Escape') { closeSugg(); }
    else if (e.key === 'Enter' && !sugg.hidden && active >= 0) { e.preventDefault(); pickReason(options[active].id); }
  });
  sugg.addEventListener('pointerdown', (e) => {
    const li = e.target.closest('.sugg');
    e.preventDefault();
    if (!li || li.getAttribute('aria-disabled') === 'true') return;
    pickReason(options[+li.dataset.i].id);
  });
  const outside = (e) => { if (!sugg.hidden && !e.target.closest('#reasonCombo')) closeSugg(); };
  document.addEventListener('pointerdown', outside);

  // --- events
  input.addEventListener('input', () => {
    const v = liveFormat(input.value);
    if (v !== input.value) {
      const a = input.selectionStart; const b = input.selectionEnd;
      input.value = v;
      input.setSelectionRange(a, b);
    }
    showMsg('');
    updatePreview();
  });
  $$('.symkey', root).forEach((b) => b.addEventListener('click', () => {
    const s = b.dataset.sym;
    const a = input.selectionStart ?? input.value.length;
    const e = input.selectionEnd ?? input.value.length;
    if (s === '⌫') {
      const r = backspace(input.value, a, e);
      input.value = r.value;
      if (lastPointer === 'mouse' || document.activeElement === input) input.focus();
      input.setSelectionRange(r.caret, r.caret);
      showMsg('');
      updatePreview();
      return;
    }
    const ins = ['=', '≅', '∼', '⊥', '∥', '<', '>', '+', '−'].includes(s) ? ` ${s} ` : s;
    input.value = input.value.slice(0, a) + ins + input.value.slice(e);
    // On a phone, keep the keyboard closed while the student builds the claim from keys and taps.
    if (lastPointer === 'mouse' || document.activeElement === input) input.focus();
    input.setSelectionRange(a + ins.length, a + ins.length);
    updatePreview();
  }));
  $('#refChips', root).addEventListener('click', (e) => {
    const b = e.target.closest('.refchip');
    if (!b) return;
    const k = +b.dataset.k;
    if (state.refs.has(k)) state.refs.delete(k); else state.refs.add(k);
    renderComposerMeta();
  });
  $('#composer', root).addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) { refocus(); preview.className = 'claim-preview is-err'; preview.innerHTML = msgHTML({ key: 'empty' }); return; }
    const chain = chainParts(text);
    if (chain) { addChain(chain); return; }
    if (!parseClaim(text, p).ok) { refocus(); updatePreview(); return; }
    let row;
    if (!state.reason && reasonInput.value.trim()) {
      const exact = exactReason(reasonInput.value, p.allowed);
      if (!exact) { showMsg(`${icon('info')} ${t('pp.pickFromList')}`); reasonInput.focus(); openSugg(); return; }
      state.reason = exact;
    }
    const ad = currentAddition();
    if (ad) { applyAddition(ad); return; }
    if (state.reason) {
      row = { text, reason: state.reason, refs: [...state.refs].sort((a, b) => a - b) };
    } else {
      const auto = currentAuto();
      const sk = auto ? null : currentSkip();
      if (sk) { applySkip(sk); return; }
      if (!auto) { showMsg(`${icon('info')} ${t('pp.needReason')}`); reasonInput.focus(); return; }
      row = { text, reason: auto.reason, refs: auto.refs, auto: true };
    }
    if (state.editing != null) state.rows[state.editing] = row; else state.rows.push(row);
    resetComposer();
    renderRows();
    refocus();
  });
  // After a row goes in, the claim field takes the focus again, but on a phone only when the keyboard
  // was already open: a claim built from taps and keys leaves it closed.
  function refocus() {
    if (lastPointer === 'mouse' || typingNow) input.focus();
  }
  let typingNow = false; // the claim or reason field had the focus when the row was sent (Enter)
  $('#composer', root).addEventListener('submit', () => { typingNow = [input, reasonInput].includes(document.activeElement); }, true);
  // A sign key or the angle button doesn't take the focus from the claim, so an open keyboard stays open.
  for (const el of [...$$('.symkeys', root), angleBtn]) el.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  $('#cancelEdit', root).addEventListener('click', () => { resetComposer(); renderRows(); });

  // Skip steps: the rows go in where the claim was going; later rows move down, and their references
  // to the edited row or after it move with them. The student is told which rows the game wrote.
  function applySkip(sk, done = 'skipDone') {
    const at = upto();
    const editing = state.editing != null;
    const extra = sk.rows.length - (editing ? 1 : 0);
    const later = state.rows.slice(editing ? at + 1 : at).map((r) => ({ ...r, refs: (r.refs || []).map((k) => (k > at ? k + extra : k)) }));
    state.rows = [...state.rows.slice(0, at), ...sk.rows.map((r) => ({ ...r })), ...later];
    const note = `${icon('spark')} <span>${PX(done, { steps: skipStepsHTML(sk, at + 1) })}</span>`;
    resetComposer();
    renderRows();
    showMsg(note);
    $('#cmpMsg', root).classList.add('is-skip');
    if (lastPointer === 'mouse') input.focus();
  }

  rowsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const i = +b.closest('.prow').dataset.i;
    if (b.dataset.act === 'up' || b.dataset.act === 'down') {
      moveRow(i, b.dataset.act === 'up' ? -1 : 1);
    } else if (b.dataset.act === 'del') {
      state.rows.splice(i, 1);
      state.rows.forEach((r) => { r.refs = r.refs.filter((k) => k !== i + 1).map((k) => (k > i + 1 ? k - 1 : k)); });
      if (state.editing != null) resetComposer();
      renderRows();
    } else {
      const row = state.rows[i];
      state.editing = i;
      input.value = row.text;
      state.reason = row.auto ? null : row.reason;
      state.refs = new Set(row.auto ? [] : row.refs);
      updatePreview();
      renderRows();
      // on a phone the composer comes into view with the keyboard still closed
      if (lastPointer === 'mouse') input.focus(); else $('#composer', root).scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });
  // Swap a row with the one above or below it. References follow the rows, so a row that cited
  // row 3 still cites the same claim; a row moved above a row it cites turns red until fixed.
  function moveRow(i, d) {
    const j = i + d;
    if (j < 0 || j >= state.rows.length) return;
    const a = i + 1, b = j + 1;
    [state.rows[i], state.rows[j]] = [state.rows[j], state.rows[i]];
    state.rows.forEach((r) => { r.refs = (r.refs || []).map((k) => (k === a ? b : k === b ? a : k)).sort((x, y) => x - y); });
    if (state.editing === i) state.editing = j; else if (state.editing === j) state.editing = i;
    if (state.editing == null) state.refs = new Set([...state.refs].map((k) => (k === a ? b : k === b ? a : k)));
    renderRows();
    const btn = rowsEl.querySelector(`.prow[data-i="${j}"] [data-act="${d < 0 ? 'up' : 'down'}"]`);
    (btn && !btn.disabled ? btn : rowsEl.querySelector(`.prow[data-i="${j}"]`)).focus();
  }

  const rowHover = (e) => {
    const li = e.target.closest('.prow');
    if (!li) return;
    const r = result.results[+li.dataset.i];
    dg.highlight(r && r.parsed.ok ? claimToItems(r.parsed.claim) : []);
  };
  rowsEl.addEventListener('mouseover', rowHover);
  rowsEl.addEventListener('focusin', rowHover);
  rowsEl.addEventListener('mouseleave', syncPreviewHighlight);
  rowsEl.addEventListener('focusout', syncPreviewHighlight);

  leanToggle.addEventListener('change', () => { state.showLean = leanToggle.checked; store.set('showLean', state.showLean); renderRows(); });

  // --- tools that open with progress (tools.js)
  const hintBtn = $('#hintBtn', root);
  const givensBtn = $('#givensBtn', root);
  const autoRefsBtn = $('#autoRefsBtn', root);
  const askReasonBtn = $('#askReasonBtn', root);
  const cpctPanel = $('#cpctPanel', root);
  const toolsAbort = new AbortController(); // ends a hint wait when the student leaves the page
  let hintWaiting = false;
  let toolNews = []; // tools this solve opened, announced in the "solved" box
  let theoremNews = false; // this solve proved a theorem that now joins the toolbox
  const openedAt = Date.now();
  let tryTimer = 0; // re-checks the hint when its "try first" time runs out
  const factsEl = $('.facts', root);
  const viewAsWrap = $('#viewAsWrap', root);
  const viewAsSel = $('#viewAs', root);

  // This problem counts as solved as soon as the proof is complete, even before persist() saves it.
  const solvedNow = (s, k) => (s === stage && k === n && result.solvedAt >= 0) || isSolved(s, k);
  const toolsOpenedNow = () => (fullAccess() ? [] : Object.keys(TOOLS).filter((id) => toolOpen(id, solvedNow) && !toolOpen(id, isSolved)));

  function syncTools() {
    const open = toolOpen('fillGivens', solvedNow);
    givensBtn.classList.toggle('is-locked', !open);
    givensBtn.setAttribute('aria-disabled', String(!open));
    givensBtn.title = open ? t('tool.fillGivens.title') : toolLockText('fillGivens');
    givensBtn.innerHTML = `${icon(open ? TOOLS.fillGivens.icon : 'lock')} <span>${t('tool.fillGivens')}</span>`;
    autoRefsBtn.hidden = !toolOpen('autoRefs', solvedNow);
    autoRefsBtn.title = t('tool.autoRefs.title');
    askReasonBtn.hidden = !toolOpen('askReason', solvedNow);
    askReasonBtn.title = t('tool.askReason.title');
    // A special feature: clicking a given or the goal copies it into the claim field.
    const click = toolOpen('clickFacts', solvedNow);
    factsEl.classList.toggle('facts-click', click);
    $$('.fact-group:not(.diag) li[data-claim]', factsEl).forEach((li) => { li.title = click ? t(li.dataset.g != null ? 'tool.clickFacts.titleGiven' : 'tool.clickFacts.title') : ''; });
    viewAsWrap.hidden = !realAdmin();
    viewAsSel.value = viewAs() || '';
    syncHint();
  }

  function toolsAfterRows() {
    syncHint();
    renderConclusions();
  }

  // Under the proof: the corresponding sides and angles of each congruence row, ready to add.
  let conclusions = [];
  function renderConclusions() {
    conclusions = toolOpen('cpctList', solvedNow) && result.solvedAt < 0 ? congConclusions(p, result.results) : [];
    cpctPanel.hidden = !conclusions.length;
    cpctPanel.innerHTML = conclusions.map((g, gi) => `
      <div class="cpct-group">
        <p class="cpct-head">${icon(TOOLS.cpctList.icon)} <span>${t('tool.cpctList.head', { n: g.n })}</span> ${mathSpan(fmtClaim(g.claim))}</p>
        <div class="cpct-chips">${g.items.map((it, ii) => `<button type="button" class="cpct-chip" data-g="${gi}" data-i="${ii}" title="${esc(t('tool.cpctList.hint'))}">${mathSpan(it.text)}</button>`).join('')}</div>
      </div>`).join('');
  }

  // Seconds until the hint opens: first the student tries, then each hint costs a longer wait.
  const hintLeft = () => hintTryLeft({
    ownRows: state.rows.filter((r) => !r.filled).length,
    earned: state.hints > 0 || solvedHere(),
    since: openedAt,
  });

  function syncHint() {
    const done = state.hints >= p.hints.length;
    const closed = !toolOpen('hint', solvedNow); // the settings can close hints for a track
    const left = closed ? 0 : hintLeft();
    const locked = !done && (closed || left > 0);
    hintBtn.classList.toggle('is-locked', locked);
    hintBtn.setAttribute('aria-disabled', String(locked));
    hintBtn.innerHTML = `${icon(locked ? 'lock' : TOOLS.hint.icon)} <span>${t('pp.hint')}</span>`;
    hintBtn.title = closed ? toolLockText('hint')
      : left > 0 ? t('tool.hint.tryFirstTitle', { time: durationText(toolSettings().tryFirst) })
        : fullAccess() || done ? '' : t('tool.hint.title', { s: hintSeconds(state.hints) });
    clearTimeout(tryTimer);
    if (!done && !closed && left > 0) tryTimer = setTimeout(syncHint, left * 1000 + 100);
  }

  function renderHints() {
    const box = $('#hintBox', root);
    box.hidden = !state.hints;
    box.innerHTML = p.hints.slice(0, state.hints).map((h, i) => `<p><span class="hint-n">${t('pp.hintN', { n: i + 1, m: p.hints.length })}</span>${rich(L(h))}</p>`).join('');
    hintBtn.disabled = state.hints >= p.hints.length;
  }

  hintBtn.addEventListener('click', async () => {
    if (hintWaiting || state.hints >= p.hints.length) return;
    if (!toolOpen('hint', solvedNow)) { showMsg(`${icon('lock')} ${toolLockText('hint')}`); return; }
    const left = hintLeft();
    if (left > 0) { showMsg(`${icon('lock')} ${t('tool.hint.tryFirst', { s: left })}`); return; }
    hintWaiting = true;
    const ok = await hintWait({ seconds: hintSeconds(state.hints), signal: toolsAbort.signal });
    hintWaiting = false;
    if (!ok) return;
    state.hints = Math.min(state.hints + 1, p.hints.length);
    save({ hints: state.hints });
    renderHints();
    syncHint();
  });

  givensBtn.addEventListener('click', () => {
    if (!toolOpen('fillGivens', solvedNow)) { showMsg(`${icon('lock')} ${toolLockText('fillGivens')}`); return; }
    const filled = fillGivens(p, state.rows);
    if (!filled) { showMsg(`${icon('info')} ${t('tool.fillGivens.none')}`); return; }
    // The rows move down, so a row being edited and the rows picked as references move with them.
    state.rows = filled.rows;
    if (state.editing != null) state.editing += filled.add;
    state.refs = new Set([...state.refs].map((k) => k + filled.add));
    showMsg('');
    renderRows();
  });

  autoRefsBtn.addEventListener('click', () => {
    if (!toolOpen('autoRefs', solvedNow) || !state.reason) return;
    const found = findRefs(p, state.rows, upto(), input.value, state.reason);
    if (!found || found.error) {
      showMsg(`${icon('info')} ${t(found ? 'tool.autoRefs.noClaim' : 'tool.autoRefs.none')}`);
      if (found) input.focus();
      return;
    }
    state.refs = new Set(found.refs);
    showMsg('');
    renderComposerMeta();
  });

  // "Ask for a reason": the reason and its rows go into the composer; the student adds the row.
  askReasonBtn.addEventListener('click', () => {
    if (!toolOpen('askReason', solvedNow)) return;
    // In a chain, the theorem for the parts that are not identities or calculations.
    const parts = chainParts(input.value) || [input.value.trim()];
    const finds = parts[0] ? parts.map((s) => findReason(p, state.rows, upto(), s)) : [{ error: 'noClaim' }];
    const plain = ['given', 'algebra', 'common_side', 'common_angle'];
    const found = finds.find((f) => f && !f.error && !plain.includes(f.reason)) || finds.find((f) => f && !f.error) || finds[0];
    if (!found || found.error) {
      showMsg(`${icon('info')} ${t(found ? 'tool.autoRefs.noClaim' : 'tool.askReason.none')}`);
      if (found) input.focus();
      return;
    }
    state.reason = found.reason;
    state.refs = new Set(found.refs);
    reasonInput.value = '';
    closeSugg();
    renderComposerMeta();
    updatePreview();
    showMsg(`${icon('spark')} ${t('tool.askReason.found', { r: `<b>${reasonShort(found.reason)}</b>${refsText(found.refs)}` })}`);
  });

  cpctPanel.addEventListener('click', (e) => {
    const b = e.target.closest('.cpct-chip');
    if (!b) return;
    const it = conclusions[+b.dataset.g] && conclusions[+b.dataset.g].items[+b.dataset.i];
    if (!it) return;
    state.rows.push({ text: it.text, reason: it.reason, refs: it.refs, filled: true });
    renderRows();
  });

  // The row that already states this given, or -1.
  function givenRow(li) {
    const g = p.givensParsed[+li.dataset.g];
    if (!g) return -1;
    const k = claimKey(g);
    return result.results.findIndex((x) => x.parsed.ok && claimKey(x.parsed.claim) === k);
  }
  // A given goes into the proof as a row of its own ("given"), once; the goal and the
  // facts from the diagram go into the claim field.
  function copyFact(li) {
    if (li.dataset.g != null && p.givensParsed[+li.dataset.g]) {
      const at = givenRow(li);
      if (at >= 0) {
        showMsg(`${icon('info')} ${t('tool.clickFacts.already', { n: at + 1 })}`);
        const row = rowsEl.querySelector(`.prow[data-i="${at}"]`);
        if (row) { row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash'); }
        return;
      }
      state.rows.push({ text: fmtClaim(p.givensParsed[+li.dataset.g]), reason: 'given', refs: [] });
      showMsg('');
      renderRows();
      return;
    }
    const r = parseClaim(li.dataset.claim, p);
    input.value = r.ok ? fmtClaim(r.claim) : li.dataset.claim;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
  const factOf = (e) => (toolOpen('clickFacts', solvedNow) ? e.target.closest('.fact-group:not(.diag) li[data-claim]') : null);
  factsEl.addEventListener('click', (e) => { const li = factOf(e); if (li) copyFact(li); });
  factsEl.addEventListener('keydown', (e) => {
    const li = e.key === 'Enter' ? factOf(e) : null;
    if (li) { e.preventDefault(); copyFact(li); }
  });

  viewAsSel.addEventListener('change', () => setViewAs(viewAsSel.value));
  // Settings, the user, or the admin's student view changed: redraw everything the tools touch.
  // (renderRows re-checks the proof, since an admin's view can change which theorems are earned.)
  const offTools = onToolsChange(() => { earnReasons(); renderQuick(); syncTools(); renderHints(); renderRows(); });

  syncTools();
  renderHints();

  let resetArmed = null;
  $('#resetBtn', root).addEventListener('click', (e) => {
    const btn = e.currentTarget;
    if (!resetArmed) {
      btn.classList.add('armed');
      btn.querySelector('span:last-child').textContent = t('pp.resetConfirm');
      resetArmed = setTimeout(() => { resetArmed = null; btn.classList.remove('armed'); btn.querySelector('span:last-child').textContent = t('pp.reset'); }, 3000);
      return;
    }
    clearTimeout(resetArmed); resetArmed = null;
    btn.classList.remove('armed');
    btn.querySelector('span:last-child').textContent = t('pp.reset');
    state.rows = [];
    resetComposer();
    wasSolved = false;
    renderRows();
  });

  updatePreview();
  renderRows();
  return () => {
    if (resetArmed) clearTimeout(resetArmed);
    document.removeEventListener('pointerdown', outside);
    toolsAbort.abort();
    clearTimeout(tryTimer);
    offTools();
  };
}

// ---------------------------------------------------------------- start

initAccounts({ rerender: render, routeName: () => currentRoute().name });
render();
