// LEANgame website: hash router and the three views (home, topic, problem).

import { t, L, getLang, setLang, rich, mathSpan, esc } from './i18n.js';
import { TOPICS, STAGES, REASONS, PROBLEMS, stageNumber, problemList } from './data.js';
import { checkProof, prepareProblem, fmtClaim, leanTheorem, parseClaim, leanClaim } from './geo.js';
import { renderDiagram, claimToItems } from './diagram.js';
import { icon, glyph, LOGO } from './icons.js';

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
function saveProgress(stage, n, data) {
  const all = progress();
  all[pkey(stage, n)] = { ...(all[pkey(stage, n)] || {}), ...data };
  store.set('progress', all);
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
        <a href="#/hs/geometry" ${route.name !== 'home' ? 'aria-current="page"' : ''}>${t('nav.geometry')}</a>
        <button type="button" class="navlink" data-scroll="topics">${t('nav.topics')}</button>
        <button type="button" class="navlink" data-scroll="how">${t('nav.how')}</button>
      </nav>
      <div class="tools">
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
  return { name: 'home' };
}

function render() {
  if (cleanup) { cleanup(); cleanup = null; }
  renderChrome();
  const route = currentRoute();
  let after = null;
  if (route.name === 'home') { app.innerHTML = viewHome(); after = bindHome; document.title = 'LEANgame · ' + t('brand.tag'); }
  else if (route.name === 'topic') { app.innerHTML = viewTopic(); after = bindTopic; document.title = `${t('nav.geometry')} · LEANgame`; }
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

// ---------------------------------------------------------------- helpers

const reasonShort = (id) => L(REASONS[id]?.short);
const refsText = (refs) => (refs && refs.length ? ` <span class="refs" dir="ltr">(${[...refs].sort((a, b) => a - b).join(', ')})</span>` : '');

function msgHTML(msg) {
  if (!msg) return '';
  const vars = { ...(msg.vars || {}) };
  if (vars.rid) vars.r = reasonShort(vars.rid);
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
      if (/^(s|g|cfg)\d+$/.test(m)) return `<span class="lr">${m}</span>`;
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
          <button type="button" role="tab" class="tab" aria-selected="false" data-track="uni">${L({ he: 'אוניברסיטה', en: 'University' })} <span class="tab-soon">${t('status.later')}</span></button>
        </div>
      </div>
      <div class="topic-grid" data-panel="hs">${TOPICS.filter((x) => x.track === 'hs').map(topicCard).join('')}</div>
      <div class="topic-grid" data-panel="uni" hidden>
        ${TOPICS.filter((x) => x.track === 'uni').map(topicCard).join('')}
        <p class="uni-note">${icon('info')} ${t('topics.uniNote')}</p>
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
          <div class="unlocks"><span class="unlocks-label">${t('tp.unlocks')}</span>${s.unlocks.map((u) => `<span class="chip">${rich(L(u))}</span>`).join('')}</div>
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

  const catalog = Object.entries(REASONS).filter(([, r]) => r.stage === null || r.stage === 'L01' || r.stage === 'L02');

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

  <section class="section" id="toolbox">
    <div class="wrap">
      <h2 class="h2">${t('tp.toolbox')}</h2>
      <p class="section-lead">${t('tp.toolboxText')}</p>
      <div class="catalog">
        ${catalog.map(([id, r]) => `
          <article class="reason-card k-${r.kind}">
            <div class="rc-top"><span class="rc-kind">${t('kind.' + r.kind)}</span><span class="rc-stage">${r.stage ? t('tp.stage', { n: stageNumber(r.stage) }) : t('tp.always')}</span></div>
            <h3>${L(r.short)}</h3>
            <p class="rc-alt">${getLang() === 'he' ? r.short.en : r.short.he}</p>
            <p>${rich(L(r.statement))}</p>
            <code dir="ltr">${r.lean}</code>
          </article>`).join('')}
      </div>
    </div>
  </section>`;
}

function bindTopic(root) {
  const j = root.querySelector('.journey');
  if (j) { void j.offsetWidth; j.classList.add('in'); }
  return null;
}

// ---------------------------------------------------------------- problem

function viewProblem({ stage, n, problem: p }) {
  const list = PROBLEMS[stage];
  const sNum = stageNumber(stage);
  const st = STAGES.find((s) => s.id === stage);
  const prev = list.find((x) => x.n === n - 1);
  const next = list.find((x) => x.n === n + 1);

  return `
  <div class="pp">
    <div class="wrap">
      <div class="pp-bar">
        <nav class="crumbs" aria-label="breadcrumbs"><a href="#/">${t('nav.home')}</a><span>/</span><a href="#/hs/geometry">${t('nav.geometry')}</a><span>/</span><span>${t('tp.stage', { n: sNum })} · ${L(st.name)}</span></nav>
        <div class="pager">
          ${prev ? `<a class="pager-btn" href="#/hs/geometry/${stage}/${prev.n}" aria-label="${t('pp.prev')}">${icon('chevron', 'dir back')}</a>` : '<span class="pager-btn" aria-hidden="true"></span>'}
          <span>${t('pp.problemOf', { n, m: list.length })}</span>
          ${next ? `<a class="pager-btn" href="#/hs/geometry/${stage}/${next.n}" aria-label="${t('pp.next')}">${icon('chevron', 'dir')}</a>` : '<span class="pager-btn" aria-hidden="true"></span>'}
        </div>
        <span class="proto-badge">${icon('info')} ${t('pp.proto')}</span>
      </div>

      <div class="pp-grid">
        <section class="pp-problem">
          <header class="pp-head">
            <p class="kicker">${t('tp.stage', { n: sNum })} · ${L(st.name)}</p>
            <h1>${L(p.title)}</h1>
            <p class="intro">${rich(L(p.intro))}</p>
          </header>
          <div class="diagram-card paper" id="diagram"></div>
          <dl class="facts">
            <div class="fact-group">
              <dt>${t('pp.given')}</dt>
              <dd><ul>${p.givens.map((g, i) => `<li data-claim="${esc(g.claim)}" tabindex="0">${g.text ? `${rich(L(g.text))} <small>${t('pp.meaning')} ${mathSpan(fmtClaim(p.givensParsed[i]))}</small>` : mathSpan(fmtClaim(p.givensParsed[i]))}</li>`).join('')}</ul></dd>
            </div>
            ${p.config.length ? `<div class="fact-group diag">
              <dt>${t('pp.fromDiagram')}</dt>
              <dd><ul>${p.config.map((c) => `<li>${rich(L(c.text))}</li>`).join('')}</ul><p class="fact-note">${t('pp.fromDiagramNote')}</p></dd>
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
                <label class="switch" title="${t('pp.showLeanLabel')}"><input type="checkbox" id="leanToggle"><span class="switch-ui" aria-hidden="true"></span><span>${icon('code')} ${t('pp.showLean')}</span></label>
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
            <div class="blocked" id="blocked" hidden>${icon('info')} ${t('pp.blocked')}</div>
            <div class="solved" id="solved" hidden></div>
            <form class="composer" id="composer" autocomplete="off" novalidate>
              <div class="cmp-head"><span class="cmp-row" id="cmpRow"></span><span class="live-lean" id="liveLean" dir="ltr" hidden></span></div>
              <label class="cmp-label" for="claimInput">${t('pp.claim')}</label>
              <div class="claim-field">
                <input id="claimInput" class="claim-input" dir="ltr" spellcheck="false" autocapitalize="characters" placeholder="${t('pp.claimPh')}">
                <div class="symkeys" role="group" aria-label="symbols">
                  ${['∢', '△', '≅', '=', '°'].map((s) => `<button type="button" class="symkey" data-sym="${s}">${s}</button>`).join('')}
                </div>
              </div>
              <div class="claim-preview" id="preview" aria-live="polite"></div>
              <span class="cmp-label">${t('pp.reason')}</span>
              <div class="reason-chips" id="reasonChips" role="radiogroup" aria-label="${t('pp.reason')}">
                ${p.allowed.map((id) => {
                  const r = REASONS[id];
                  const from = r.stage && r.stage !== stage ? `<small>${t('pp.fromStage', { n: stageNumber(r.stage) })}</small>` : '';
                  return `<button type="button" class="rchip k-${r.kind}" role="radio" aria-checked="false" data-r="${id}">${L(r.short)}${from}</button>`;
                }).join('')}
              </div>
              <p class="rinfo" id="rinfo"></p>
              <div class="refs-field" id="refsField" hidden>
                <span class="cmp-label">${t('pp.refs')} <small id="refsHint"></small></span>
                <div class="ref-chips" id="refChips"></div>
              </div>
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

function bindProblem(root, { stage, n, problem: p }) {
  const saved = progress()[pkey(stage, n)];
  const state = {
    rows: (saved && saved.rows) || [],
    reason: null,
    refs: new Set(),
    editing: null,
    showLean: store.get('showLean', false),
    hints: 0,
  };

  const dg = renderDiagram(p, { animate: true, label: t('pp.diagramAria') });
  $('#diagram', root).append(dg.el);

  const rowsEl = $('#rows', root);
  const input = $('#claimInput', root);
  const preview = $('#preview', root);
  const leanToggle = $('#leanToggle', root);
  const liveLean = $('#liveLean', root);
  leanToggle.checked = state.showLean;
  let result = checkProof(p, state.rows);
  let wasSolved = result.solvedAt >= 0;

  // hover any [data-claim] fact to highlight it
  $$('[data-claim]', root).forEach((el) => {
    const c = parseClaim(el.dataset.claim, p.pointNames);
    const on = () => dg.highlight(claimToItems(c.claim));
    const off = () => syncPreviewHighlight();
    el.addEventListener('mouseenter', on); el.addEventListener('focus', on);
    el.addEventListener('mouseleave', off); el.addEventListener('blur', off);
  });

  function syncPreviewHighlight() {
    const r = input.value.trim() ? parseClaim(input.value, p.pointNames) : null;
    dg.highlight(r && r.ok ? claimToItems(r.claim) : []);
  }

  function persist() {
    saveProgress(stage, n, { rows: state.rows, solved: result.solvedAt >= 0 || isSolved(stage, n) });
  }

  function renderRows() {
    result = checkProof(p, state.rows);
    const { results } = result;
    rowsEl.innerHTML = results.map((r, i) => {
      const row = state.rows[i];
      const cls = r.ok ? 'ok' : 'bad';
      const claimHTML = r.parsed.ok ? mathSpan(fmtClaim(r.parsed.claim)) : `<span class="raw" dir="ltr">${esc(row.text)}</span>`;
      return `<li class="prow ${cls}${r.goal && r.ok ? ' is-goal' : ''}${state.editing === i ? ' is-editing' : ''}" data-i="${i}" tabindex="0">
        <span class="pnum">${i + 1}</span>
        <span class="pclaim">${claimHTML}${r.goal && r.ok ? `<span class="goal-tag">${t('pp.goalRow')}</span>` : ''}</span>
        <span class="preason">${row.reason ? reasonShort(row.reason) : '—'}${refsText(row.refs)}</span>
        <span class="pstat" title="${r.ok ? t('pp.ok') : t('pp.bad')}">${icon(r.ok ? 'check' : 'x')}<span class="sr">${r.ok ? t('pp.ok') : t('pp.bad')}</span></span>
        <span class="pactions">
          <button type="button" class="mini" data-act="edit" aria-label="${t('pp.edit', { n: i + 1 })}">${icon('edit')}</button>
          <button type="button" class="mini" data-act="del" aria-label="${t('pp.delete', { n: i + 1 })}">${icon('trash')}</button>
        </span>
        ${!r.ok ? `<p class="pmsg">${msgHTML(r.msg)}</p>` : ''}
        ${state.showLean && r.lean ? `<code class="plean${r.ok ? '' : ' is-err'}" dir="ltr">${leanHTML(r.lean)}</code>` : ''}
      </li>`;
    }).join('');
    $('#empty', root).hidden = state.rows.length > 0;
    $('#blocked', root).hidden = !result.blocked;
    renderSolved();
    renderComposerMeta();
    persist();
  }

  function renderSolved() {
    const box = $('#solved', root);
    const solved = result.solvedAt >= 0;
    box.hidden = !solved;
    $('#composer', root).classList.toggle('is-dim', solved);
    if (!solved) { box.innerHTML = ''; wasSolved = false; return; }
    const all = problemList();
    const idx = all.findIndex((x) => x.stage === stage && x.n === n);
    const nxt = all[idx + 1];
    box.innerHTML = `
      <div class="stamp${wasSolved ? ' on still' : ''}"><span>${t('pp.solved.stamp')}</span></div>
      <div class="solved-copy">
        <h3>${t('pp.solved.t')}</h3>
        <p>${t('pp.solved.p')}</p>
        ${nxt ? '' : `<p class="muted">${t('pp.solved.last')}</p>`}
        <div class="cta-row">
          ${nxt ? `<a class="btn btn-primary" href="#/hs/geometry/${nxt.stage}/${nxt.n}">${t('pp.solved.next')} ${icon('arrow', 'dir')}</a>` : ''}
          <a class="btn btn-ghost" href="#/hs/geometry">${icon('map')} ${t('pp.solved.map')}</a>
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
    $$('.rchip', root).forEach((c) => c.setAttribute('aria-checked', String(c.dataset.r === state.reason)));
    const r = state.reason ? REASONS[state.reason] : null;
    $('#rinfo', root).innerHTML = r ? `<b>${L(r.name)}.</b> ${rich(L(r.statement))}` : '';
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
    const r = input.value.trim() ? parseClaim(input.value, p.pointNames) : null;
    const nn = state.editing != null ? state.editing + 1 : state.rows.length + 1;
    const claim = r && r.ok ? leanClaim(r.claim) : '…';
    const reason = state.reason ? REASONS[state.reason].lean : '…';
    const refs = [...state.refs].sort((a, b) => a - b).map((k) => 's' + k).join(' ');
    liveLean.innerHTML = `<span class="ll-tag">${t('pp.livePrefix')}</span> ${leanHTML(`have s${nn} : ${claim} := ${reason}${refs ? ' ' + refs : ''}`)}`;
  }

  function updatePreview() {
    const v = input.value.trim();
    if (!v) {
      preview.innerHTML = `<span class="muted">${t('pp.previewEmpty')}</span>`;
      preview.className = 'claim-preview';
    } else {
      const r = parseClaim(v, p.pointNames);
      preview.className = 'claim-preview ' + (r.ok ? 'is-ok' : 'is-err');
      preview.innerHTML = r.ok ? mathSpan(fmtClaim(r.claim)) : msgHTML(r.error);
    }
    syncPreviewHighlight();
    updateLiveLean();
  }

  function resetComposer() {
    input.value = '';
    state.reason = null;
    state.refs = new Set();
    state.editing = null;
    updatePreview();
  }

  // --- events
  input.addEventListener('input', updatePreview);
  $$('.symkey', root).forEach((b) => b.addEventListener('click', () => {
    const s = b.dataset.sym;
    const a = input.selectionStart ?? input.value.length;
    const e = input.selectionEnd ?? input.value.length;
    const ins = s === '=' || s === '≅' ? ` ${s} ` : s;
    input.value = input.value.slice(0, a) + ins + input.value.slice(e);
    input.focus();
    input.setSelectionRange(a + ins.length, a + ins.length);
    updatePreview();
  }));
  $('#reasonChips', root).addEventListener('click', (e) => {
    const b = e.target.closest('.rchip');
    if (!b) return;
    state.reason = state.reason === b.dataset.r ? null : b.dataset.r;
    if (!state.reason || !REASONS[state.reason].refs) state.refs = new Set();
    renderComposerMeta();
  });
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
    if (!text) { input.focus(); preview.className = 'claim-preview is-err'; preview.innerHTML = msgHTML({ key: 'empty' }); return; }
    const row = { text, reason: state.reason, refs: [...state.refs].sort((a, b) => a - b) };
    if (state.editing != null) state.rows[state.editing] = row; else state.rows.push(row);
    resetComposer();
    renderRows();
    input.focus();
  });
  $('#cancelEdit', root).addEventListener('click', () => { resetComposer(); renderRows(); });

  rowsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const i = +b.closest('.prow').dataset.i;
    if (b.dataset.act === 'del') {
      state.rows.splice(i, 1);
      state.rows.forEach((r) => { r.refs = r.refs.filter((k) => k !== i + 1).map((k) => (k > i + 1 ? k - 1 : k)); });
      if (state.editing != null) resetComposer();
      renderRows();
    } else {
      const row = state.rows[i];
      state.editing = i;
      input.value = row.text;
      state.reason = row.reason;
      state.refs = new Set(row.refs);
      updatePreview();
      renderRows();
      input.focus();
    }
  });
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

  $('#hintBtn', root).addEventListener('click', () => {
    state.hints = Math.min(state.hints + 1, p.hints.length);
    const box = $('#hintBox', root);
    box.hidden = false;
    box.innerHTML = p.hints.slice(0, state.hints).map((h, i) => `<p><span class="hint-n">${t('pp.hintN', { n: i + 1, m: p.hints.length })}</span>${rich(L(h))}</p>`).join('');
    if (state.hints >= p.hints.length) $('#hintBtn', root).disabled = true;
  });

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
  return () => { if (resetArmed) clearTimeout(resetArmed); };
}

// ---------------------------------------------------------------- start

render();
