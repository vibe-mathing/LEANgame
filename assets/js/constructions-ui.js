// The construction tool: a "Construct" button in the proof toolbar that opens a panel for
// auxiliary lines. The student picks a construction and its points, names the new points, and
// adds it as a row of the proof. The checking, the new points' coordinates and the facts each
// construction gives are in geo.js (buildConstruction, withConstructions); this file is only the
// panel. Mounted from app.js with mountConstructions({ root, p, dg, addRow }).

import { buildConstruction, parseClaim, fmtClaim } from './geo.js';
import { getLang, t, rich, mathSpan, esc } from './i18n.js';
import { claimToItems } from './diagram.js';

const TXT = {
  he: {
    btn: 'בנייה',
    btnTitle: 'בניית עזר: קטע, המשכה, אנך, מקביל, תיכון או חוצה זווית',
    title: 'בניית עזר',
    close: 'סגירה',
    add: 'הוספת הבנייה',
    gives: 'תתווסף השורה',
    newPts: 'נקודות חדשות',
    kinds: {
      cons_segment: 'קטע',
      cons_extend: 'המשכת קטע',
      cons_midpoint: 'אמצע קטע',
      cons_median: 'תיכון',
      cons_perp: 'אנך',
      cons_parallel: 'ישר מקביל',
      cons_bisector: 'חוצה זווית',
    },
    // {a0} {a1} {a2}: points to choose; {n0} {n1}: names of new points
    forms: {
      cons_segment: 'נעביר את הקטע {a0}{a1}.',
      cons_extend: 'נאריך את הקטע {a0}{a1} מעבר לקצה השני שלו, עד נקודה חדשה {n0}.',
      cons_midpoint: 'נסמן את האמצע של הקטע {a0}{a1} ונקרא לו {n0}.',
      cons_median: 'מהקודקוד {a0} נעביר תיכון לצלע {a1}{a2}, אל האמצע שלה {n0}.',
      cons_perp: 'מהנקודה {a0} נוריד אנך לישר {a1}{a2}. עקב האנך: {n0}.',
      cons_parallel: 'דרך הנקודה {a0} נעביר ישר {n0}{n1} המקביל ל-{a1}{a2}.',
      cons_bisector: 'נעביר את חוצה הזווית ∢{a0}{a1}{a2} עד הצלע שמולה, בנקודה {n0}.',
    },
    angle: 'זווית',
  },
  en: {
    btn: 'Construct',
    btnTitle: 'Auxiliary construction: segment, extension, perpendicular, parallel, median or angle bisector',
    title: 'Auxiliary construction',
    close: 'Close',
    add: 'Add the construction',
    gives: 'Row to be added',
    newPts: 'New points',
    kinds: {
      cons_segment: 'Segment',
      cons_extend: 'Extend',
      cons_midpoint: 'Midpoint',
      cons_median: 'Median',
      cons_perp: 'Perpendicular',
      cons_parallel: 'Parallel',
      cons_bisector: 'Angle bisector',
    },
    forms: {
      cons_segment: 'Draw the segment {a0}{a1}.',
      cons_extend: 'Extend segment {a0}{a1} beyond its second end, to a new point {n0}.',
      cons_midpoint: 'Mark the midpoint of segment {a0}{a1} and call it {n0}.',
      cons_median: 'From vertex {a0}, draw the median to side {a1}{a2}, to its midpoint {n0}.',
      cons_perp: 'From point {a0}, drop a perpendicular to line {a1}{a2}. Its foot: {n0}.',
      cons_parallel: 'Through point {a0}, draw line {n0}{n1} parallel to {a1}{a2}.',
      cons_bisector: 'Draw the bisector of ∢{a0}{a1}{a2} to the opposite side, meeting it at {n0}.',
    },
    angle: 'angle',
  },
};
const tx = () => TXT[getLang() === 'en' ? 'en' : 'he'];

const KINDS = ['cons_segment', 'cons_extend', 'cons_midpoint', 'cons_median', 'cons_perp', 'cons_parallel', 'cons_bisector'];
const ARITY = { cons_segment: [2, 0], cons_extend: [2, 1], cons_midpoint: [2, 1], cons_median: [3, 1], cons_perp: [3, 1], cons_parallel: [3, 2], cons_bisector: [3, 1] };
const NAME_ORDER = 'DEFGHKLMNPQRSTUVWXYZABC';

const CSS = `
.cons-panel { margin-top: 14px; padding: 14px 16px; border-radius: 16px; border: 1.5px dashed var(--pen); background: var(--card); display: grid; gap: 10px; }
.cons-panel[hidden] { display: none; }
.cons-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.cons-head h3 { font-size: 1rem; font-weight: 800; color: var(--pen); }
.cons-x { width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--line-2); background: var(--card); color: var(--ink-2); cursor: pointer; font-size: 1.1rem; line-height: 1; }
.cons-kinds { display: flex; flex-wrap: wrap; gap: 6px; }
.cons-kind { height: 34px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line-2); background: var(--card); cursor: pointer; font: inherit; font-size: .86rem; font-weight: 600; color: var(--ink-2); }
.cons-kind:hover { border-color: var(--pen); color: var(--pen); }
.cons-kind[aria-checked="true"] { border-color: var(--pen); color: var(--pen); background: color-mix(in srgb, var(--pen) 12%, transparent); }
.cons-form { font-size: .95rem; line-height: 2.5; }
.cons-form select, .cons-form input { height: 34px; min-width: 46px; padding: 0 4px; border-radius: 8px; border: 1.5px solid var(--line-2); background: var(--paper); color: var(--ink); font-family: var(--font-math); font-size: 1.05rem; text-align: center; margin: 0 2px; direction: ltr; vertical-align: middle; }
.cons-form input { width: 46px; text-transform: uppercase; border-style: dashed; border-color: var(--pen); }
.cons-form select:focus-visible, .cons-form input:focus-visible { outline: 2.5px solid var(--pen); outline-offset: 1px; }
.cons-grp { white-space: nowrap; font-family: var(--font-math); }
.cons-out { font-size: .92rem; color: var(--muted); min-height: 1.4em; }
.cons-out.is-err { color: var(--amber); }
.cons-out b { color: var(--ink-2); }
.cons-actions { display: flex; justify-content: flex-end; gap: 8px; }
.dg .dg-line.dg-cons { stroke: var(--pen); stroke-width: 2; stroke-dasharray: 7 5; stroke-dashoffset: 0; animation: none; }
`;

function injectStyle() {
  if (document.getElementById('cons-style')) return;
  const st = document.createElement('style');
  st.id = 'cons-style';
  st.textContent = CSS;
  document.head.append(st);
}

const PENCIL = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20 20 4" stroke-dasharray="3 3"/><circle cx="4" cy="20" r="1.6" fill="currentColor"/><circle cx="20" cy="4" r="1.6" fill="currentColor"/></svg>';

export function mountConstructions({ root, p, dg, addRow }) {
  injectStyle();
  const tools = root.querySelector('.nb-tools');
  const composer = root.querySelector('#composer');
  if (!tools || !composer) return null;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tool-btn';
  btn.id = 'consBtn';
  btn.setAttribute('aria-expanded', 'false');
  tools.append(btn);

  const panel = document.createElement('section');
  panel.className = 'cons-panel';
  panel.id = 'consPanel';
  panel.hidden = true;
  composer.before(panel);

  const st = { kind: 'cons_median', args: [], news: [] };

  const usedNames = () => new Set(p.pointNames);
  const freshNames = (k, taken = new Set()) => {
    const used = usedNames();
    return [...NAME_ORDER].filter((x) => !used.has(x) && !taken.has(x)).slice(0, k);
  };
  function defaults(kind) {
    const [na, nn] = ARITY[kind];
    const pts = p.base ? Object.keys(p.base.points) : p.pointNames;
    let args = pts.slice(0, na);
    if (kind === 'cons_bisector' && pts.length >= 3) args = [pts[1], pts[0], pts[2]];
    st.args = args;
    st.news = freshNames(nn);
  }

  const sel = (i) => `<select class="cons-pt" data-arg="${i}" aria-label="${esc(tx().kinds[st.kind])} ${i + 1}">${p.pointNames.map((x) => `<option${x === st.args[i] ? ' selected' : ''}>${x}</option>`).join('')}</select>`;
  const inp = (i) => `<input class="cons-name" data-new="${i}" maxlength="1" spellcheck="false" autocomplete="off" value="${esc(st.news[i] || '')}" aria-label="${esc(tx().newPts)} ${i + 1}">`;

  function current() {
    return { kind: st.kind, args: [...st.args], news: st.news.map((x) => String(x || '').toUpperCase()) };
  }

  function result() {
    const cons = current();
    const out = buildConstruction({ points: p.points, segments: p.segments || [] }, cons);
    if (out.error) return { cons, error: out.error };
    const text = out.claim || cons.args.join('');
    const parsed = out.claim ? parseClaim(out.claim, { ...p, points: { ...p.points, ...out.points }, pointNames: [...p.pointNames, ...Object.keys(out.points)], rays: null }) : null;
    const shown = parsed && parsed.ok ? fmtClaim(parsed.claim) : text;
    return { cons, text, shown, claim: parsed && parsed.ok ? parsed.claim : null };
  }

  function preview() {
    const r = result();
    const outEl = panel.querySelector('.cons-out');
    const addBtn = panel.querySelector('.cons-add');
    if (r.error) {
      outEl.className = 'cons-out is-err';
      outEl.innerHTML = rich(t('err.' + r.error.key, r.error.vars || {}));
      addBtn.disabled = true;
    } else {
      outEl.className = 'cons-out';
      const nn = r.cons.news.length ? ` · ${esc(tx().newPts)}: ${r.cons.news.map((x) => mathSpan(x)).join(', ')}` : '';
      outEl.innerHTML = `<b>${esc(tx().gives)}:</b> ${mathSpan(r.shown)}${nn}`;
      addBtn.disabled = false;
    }
    // light up what the construction starts from
    const [a0, a1, a2] = r.cons.args;
    const items = [];
    if (['cons_segment', 'cons_extend', 'cons_midpoint'].includes(st.kind)) items.push({ kind: 'seg', p: [a0, a1], tone: 'a' });
    else if (st.kind === 'cons_bisector') items.push({ kind: 'ang', p: [a0, a1, a2], tone: 'a' });
    else items.push({ kind: 'seg', p: [a1, a2], tone: 'a' });
    try { dg.highlight(items.filter((it) => it.p.every((x) => p.points[x])).concat(r.claim ? claimToItems(r.claim).filter((it) => it.p.every((x) => p.points[x])).map((it) => ({ ...it, tone: 'b' })) : [])); } catch { /* points not drawn yet */ }
  }

  function render() {
    const T = tx();
    btn.innerHTML = `${PENCIL} <span>${esc(T.btn)}</span>`;
    btn.title = T.btnTitle;
    // the boxes of one name (a segment, an angle, a line) read left to right, also in Hebrew
    const form = T.forms[st.kind].replace(/(∢?(?:\{[an]\d\})+)/g, '<span class="cons-grp" dir="ltr">$1</span>').replace(/\{a(\d)\}/g, (_, i) => sel(+i)).replace(/\{n(\d)\}/g, (_, i) => inp(+i));
    panel.innerHTML = `
      <div class="cons-head"><h3>${esc(T.title)}</h3><button type="button" class="cons-x" aria-label="${esc(T.close)}">×</button></div>
      <div class="cons-kinds" role="radiogroup" aria-label="${esc(T.title)}">
        ${KINDS.map((k) => `<button type="button" class="cons-kind" role="radio" aria-checked="${k === st.kind}" data-kind="${k}">${esc(T.kinds[k])}</button>`).join('')}
      </div>
      <p class="cons-form">${form}</p>
      <p class="cons-out" aria-live="polite"></p>
      <div class="cons-actions"><button type="button" class="btn btn-primary btn-small cons-add">${esc(T.add)}</button></div>`;
    preview();
  }

  function open(on) {
    panel.hidden = !on;
    btn.setAttribute('aria-expanded', String(on));
    btn.classList.toggle('armed', false);
    if (on) {
      if (!st.args.length || st.args.some((x) => !p.points[x])) defaults(st.kind);
      st.news = st.news.map((x) => (x && !p.points[x] ? x : null));
      if (st.news.some((x) => !x)) st.news = freshNames(ARITY[st.kind][1]);
      render();
      panel.querySelector(`.cons-kind[aria-checked="true"]`).focus();
    } else {
      dg.clear();
    }
  }

  btn.addEventListener('click', () => open(panel.hidden));
  panel.addEventListener('click', (e) => {
    const k = e.target.closest('.cons-kind');
    if (k) {
      st.kind = k.dataset.kind;
      defaults(st.kind);
      render();
      panel.querySelector(`.cons-kind[data-kind="${st.kind}"]`).focus();
      return;
    }
    if (e.target.closest('.cons-x')) { open(false); btn.focus(); return; }
    if (e.target.closest('.cons-add')) {
      const r = result();
      if (r.error) return;
      addRow({ text: r.text, reason: st.kind, refs: [], cons: r.cons });
      open(false);
    }
  });
  panel.addEventListener('change', (e) => {
    const s = e.target.closest('.cons-pt');
    if (s) { st.args[+s.dataset.arg] = s.value; preview(); }
  });
  panel.addEventListener('input', (e) => {
    const n = e.target.closest('.cons-name');
    if (n) {
      n.value = n.value.toUpperCase().replace(/[^A-Z]/g, '');
      st.news[+n.dataset.new] = n.value;
      preview();
    }
  });
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); open(false); btn.focus(); }
  });

  render();
  return { open, render };
}
