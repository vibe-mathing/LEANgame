// Draws a problem's diagram as SVG from its coordinates, with textbook marks
// (ticks for equal segments, arcs for equal angles), the facts the proof has proven so far
// (provenMarks), and a highlighter layer that lights up whatever the current claim talks about.

import { fmtTerm, lineKey } from './geo.js';

const f = (x) => Math.round(x * 10) / 10;
const pt = (p) => `${f(p[0])} ${f(p[1])}`;

function arcGeom(V, X, Y, r) {
  const a1 = Math.atan2(X[1] - V[1], X[0] - V[0]);
  const a2 = Math.atan2(Y[1] - V[1], Y[0] - V[0]);
  let d = a2 - a1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  const p1 = [V[0] + r * Math.cos(a1), V[1] + r * Math.sin(a1)];
  const p2 = [V[0] + r * Math.cos(a1 + d), V[1] + r * Math.sin(a1 + d)];
  const sweep = d > 0 ? 1 : 0;
  return {
    mid: a1 + d / 2,
    path: `M${pt(p1)}A${f(r)} ${f(r)} 0 0 ${sweep} ${pt(p2)}`,
    wedge: `M${pt(V)}L${pt(p1)}A${f(r)} ${f(r)} 0 0 ${sweep} ${pt(p2)}Z`,
  };
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Textbook marks as SVG, at screen positions P: ticks on equal segments ({ type: 'tick', seg,
// n }), arrows on parallel ones ('par'), the right-angle square ('right', ang), an arc with n
// ticks and an optional value ('arc', ang, n, label), and a length written by a segment ('len',
// seg, label; on the side away from `center`).
function marksSVG(list, P, angleRadius, center) {
  let marks = '';
  for (const m of list) {
    if ((m.seg && m.seg.split('').some((x) => !P[x])) || (m.ang && m.ang.split('').some((x) => !P[x]))) continue;
    if (m.type === 'tick') {
      const [a, b] = m.seg.split('');
      const A = P[a]; const B = P[b];
      const L = dist(A, B);
      const u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
      const nrm = [-u[1], u[0]];
      const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
      for (let k = 0; k < (m.n || 1); k++) {
        const off = (k - ((m.n || 1) - 1) / 2) * 5;
        const c = [M[0] + u[0] * off, M[1] + u[1] * off];
        marks += `<path class="dg-tick" d="M${pt([c[0] - nrm[0] * 7, c[1] - nrm[1] * 7])}L${pt([c[0] + nrm[0] * 7, c[1] + nrm[1] * 7])}"/>`;
      }
    } else if (m.type === 'par') {
      // arrowheads in the middle of a segment, pointing from its first letter to its second
      const [a, b] = m.seg.split('');
      const A = P[a]; const B = P[b];
      const L = dist(A, B);
      const u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
      const nrm = [-u[1], u[0]];
      const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
      for (let k = 0; k < (m.n || 1); k++) {
        const off = (k - ((m.n || 1) - 1) / 2) * 6 + 3;
        const tip = [M[0] + u[0] * off, M[1] + u[1] * off];
        const w = (sg) => [tip[0] - u[0] * 6 + nrm[0] * 4.5 * sg, tip[1] - u[1] * 6 + nrm[1] * 4.5 * sg];
        marks += `<path class="dg-tick" d="M${pt(w(1))}L${pt(tip)}L${pt(w(-1))}"/>`;
      }
    } else if (m.type === 'right') {
      // the right-angle square at V between the arms toward X and Y
      const [X, V, Y] = m.ang.split('');
      const unit = (Q) => { const L = dist(P[V], P[Q]); return [(P[Q][0] - P[V][0]) / L, (P[Q][1] - P[V][1]) / L]; };
      const u1 = unit(X); const u2 = unit(Y); const s = 13; const v = P[V];
      marks += `<path class="dg-arc${m.goal ? ' is-goal' : ''}" d="M${pt([v[0] + u1[0] * s, v[1] + u1[1] * s])}L${pt([v[0] + (u1[0] + u2[0]) * s, v[1] + (u1[1] + u2[1]) * s])}L${pt([v[0] + u2[0] * s, v[1] + u2[1] * s])}"/>`;
    } else if (m.type === 'arc') {
      const [X, V, Y] = m.ang.split('');
      const r = angleRadius(X, V, Y, m.r || 30);
      const g = arcGeom(P[V], P[X], P[Y], r);
      marks += `<path class="dg-arc${m.goal ? ' is-goal' : ''}" d="${g.path}"/>`;
      for (let k = 0; k < (m.n || 0); k++) {
        const th = g.mid + (k - ((m.n || 1) - 1) / 2) * (6 / r);
        const d = [Math.cos(th), Math.sin(th)];
        const v = P[V];
        marks += `<path class="dg-tick" d="M${pt([v[0] + d[0] * (r - 5), v[1] + d[1] * (r - 5)])}L${pt([v[0] + d[0] * (r + 5), v[1] + d[1] * (r + 5)])}"/>`;
      }
      if (m.label) {
        const lr = r + 15;
        const lp = [P[V][0] + Math.cos(g.mid) * lr, P[V][1] + Math.sin(g.mid) * lr];
        marks += `<text class="dg-mlabel${m.goal ? ' is-goal' : ''}" x="${f(lp[0])}" y="${f(lp[1])}">${m.label}</text>`;
      }
    } else if (m.type === 'len') {
      const [a, b] = m.seg.split('');
      const A = P[a]; const B = P[b];
      const L = dist(A, B) || 1;
      const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
      let nrm = [-(B[1] - A[1]) / L, (B[0] - A[0]) / L];
      if ((M[0] - center[0]) * nrm[0] + (M[1] - center[1]) * nrm[1] < 0) nrm = [-nrm[0], -nrm[1]];
      marks += `<text class="dg-mlabel" x="${f(M[0] + nrm[0] * 14)}" y="${f(M[1] + nrm[1] * 14)}">${m.label}</text>`;
    }
  }
  return marks;
}

// The drawing of a problem's diagram: the SVG's inner markup, and the screen position of every point.
function draw(problem, { width = 420, height = 320, pad = 50 } = {}) {
  const names = Object.keys(problem.points);
  const xs = names.map((n) => problem.points[n][0]);
  const ys = names.map((n) => problem.points[n][1]);
  // circles of the diagram (config { type: 'circle', o, on }) count toward the frame
  const circles = (problem.config || []).filter((c) => c.type === 'circle' && c.on && c.on.length)
    .map((c) => ({ o: c.o, r: dist(problem.points[c.o], problem.points[c.on[0]]) }));
  for (const c of circles) {
    const [x, y] = problem.points[c.o];
    xs.push(x - c.r, x + c.r);
    ys.push(y - c.r, y + c.r);
  }
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const s = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
  const ox = (width - spanX * s) / 2 - minX * s;
  const oy = (height - spanY * s) / 2 + maxY * s;
  const P = {};
  for (const n of names) P[n] = [ox + problem.points[n][0] * s, oy - problem.points[n][1] * s];
  const cx = names.reduce((a, n) => a + P[n][0], 0) / names.length;
  const cy = names.reduce((a, n) => a + P[n][1], 0) / names.length;

  const angleRadius = (X, V, Y, r) => Math.min(r, 0.42 * Math.min(dist(P[V], P[X]), dist(P[V], P[Y])));

  // ---- static marks from the givens ----
  const marks = marksSVG(problem.marks || [], P, angleRadius, [cx, cy]);

  const circlePaths = circles.map((c, i) => {
    const [x, y] = P[c.o];
    const r = c.r * s;
    return `<path class="dg-line dg-circle" pathLength="1" style="--i:${i}" d="M${pt([x + r, y])}A${f(r)} ${f(r)} 0 1 0 ${pt([x - r, y])}A${f(r)} ${f(r)} 0 1 0 ${pt([x + r, y])}"/>`;
  }).join('');
  // segments added by construction rows (problem.consSegments) are dashed
  const cons = new Set(problem.consSegments || []);
  const lines = circlePaths + (problem.segments || []).map((sg, i) => {
    const [a, b] = sg.split('');
    // pathLength="1" drives the drawing animation; a dashed construction line needs real lengths
    return `<path class="dg-line${cons.has(sg) ? ' dg-cons' : ''}"${cons.has(sg) ? '' : ' pathLength="1"'} style="--i:${i + circles.length}" d="M${pt(P[a])}L${pt(P[b])}"/>`;
  }).join('');

  const points = names.map((n, i) => `<circle class="dg-point" style="--i:${i}" cx="${f(P[n][0])}" cy="${f(P[n][1])}" r="3.4"/>`).join('');

  const labels = names.map((n, i) => {
    let dx; let dy;
    const off = problem.labelOffset && problem.labelOffset[n];
    if (off) { [dx, dy] = off; } else {
      let vx = P[n][0] - cx; let vy = P[n][1] - cy;
      const L = Math.hypot(vx, vy);
      if (L < 1) { vx = 0; vy = -1; } else { vx /= L; vy /= L; }
      dx = vx * 20; dy = vy * 20;
    }
    return `<text class="dg-label" style="--i:${i}" x="${f(P[n][0] + dx)}" y="${f(P[n][1] + dy)}">${n}</text>`;
  }).join('');

  return {
    P,
    angleRadius,
    center: [cx, cy],
    html: `<g class="dg-hl"></g><g class="dg-marks">${marks}</g><g class="dg-proven"></g><g class="dg-lines">${lines}</g>
    <g class="dg-points">${points}</g><g class="dg-labels">${labels}</g><g class="dg-pick"></g>`,
  };
}

// ---- picking: the point, segment or angle under a click or tap (app.js inserts it into the claim)
// Segments are cut at every point lying on them, so a tap between B and D on BC gives BD. An angle
// is the sector between two neighbouring arms at a vertex; each arm is named by the far end of its
// drawn segment (∢ABC rather than ∢ABD when D lies on BC). Sectors of 180° or more are not angles.

function pickModel(problem, P) {
  const raw = problem.points;
  const names = Object.keys(raw);
  // t in (0, 1) when X lies strictly inside segment AB (math coordinates), else null
  const along = (a, b, x) => {
    const A = raw[a]; const B = raw[b]; const X = raw[x];
    const ux = B[0] - A[0]; const uy = B[1] - A[1];
    const L2 = ux * ux + uy * uy;
    if (!L2) return null;
    const t = ((X[0] - A[0]) * ux + (X[1] - A[1]) * uy) / L2;
    const cross = (X[0] - A[0]) * uy - (X[1] - A[1]) * ux;
    return Math.abs(cross) <= 1e-6 * L2 && t > 1e-9 && t < 1 - 1e-9 ? t : null;
  };
  const pieces = [];
  const arms = {};
  const addArm = (V, X) => {
    const a = Math.atan2(P[X][1] - P[V][1], P[X][0] - P[V][0]);
    const list = arms[V] || (arms[V] = []);
    const same = list.find((m) => Math.abs(Math.atan2(Math.sin(m.a - a), Math.cos(m.a - a))) < 1e-3);
    if (!same) list.push({ a, to: X, len: dist(P[V], P[X]) });
    else if (dist(P[V], P[X]) > same.len) Object.assign(same, { to: X, len: dist(P[V], P[X]) });
  };
  for (const sg of problem.segments || []) {
    const [a, b] = sg.split('');
    if (!P[a] || !P[b]) continue;
    const inner = names.filter((x) => x !== a && x !== b)
      .map((x) => [x, along(a, b, x)]).filter(([, t]) => t != null)
      .sort((p, q) => p[1] - q[1]).map(([x]) => x);
    const chain = [a, ...inner, b];
    for (let i = 0; i + 1 < chain.length; i++) pieces.push([chain[i], chain[i + 1]]);
    chain.forEach((V, i) => { if (i > 0) addArm(V, a); if (i < chain.length - 1) addArm(V, b); });
  }
  for (const V of Object.keys(arms)) arms[V].sort((m, n) => m.a - n.a);
  return { names, pieces, arms };
}

function pickAt(model, P, T, tol) {
  const near = (X) => dist(P[X], T);
  // a point
  let best = null;
  for (const X of model.names) { const d = near(X); if (d <= tol.pt && (!best || d < best.d)) best = { d, X }; }
  if (best) return { kind: 'pt', p: [best.X], text: best.X };
  // Inside the middle of an angle's wedge, the angle wins over its own arms: a finger inside a narrow
  // angle near its vertex is closer than tol.seg to an arm, and used to get that side instead.
  const wedge = angleAt(model, P, T, tol);
  if (wedge && wedge.mid) return { kind: 'ang', p: wedge.p, text: '∢' + wedge.p.join('') };
  // a segment (the piece between two neighbouring points)
  let seg = null;
  for (const [a, b] of model.pieces) {
    const A = P[a]; const B = P[b];
    const ux = B[0] - A[0]; const uy = B[1] - A[1];
    const L2 = ux * ux + uy * uy;
    const t = L2 ? ((T[0] - A[0]) * ux + (T[1] - A[1]) * uy) / L2 : -1;
    if (t <= 0 || t >= 1) continue;
    const d = Math.abs((T[0] - A[0]) * uy - (T[1] - A[1]) * ux) / Math.sqrt(L2);
    if (d <= tol.seg && (!seg || d < seg.d)) seg = { d, a, b };
  }
  if (seg) return { kind: 'seg', p: [seg.a, seg.b], text: seg.a + seg.b };
  if (wedge) return { kind: 'ang', p: wedge.p, text: '∢' + wedge.p.join('') };
  return null;
}

// The angle under T: the sector at the nearest vertex that contains it, { d, p, mid } or null. `mid`:
// T lies in the middle 60% of the sector (by direction) and is not on any drawn segment through
// another vertex (a cevian crossing the wedge keeps its own taps).
function angleAt(model, P, T, tol) {
  let ang = null;
  for (const V of Object.keys(model.arms)) {
    const list = model.arms[V];
    if (list.length < 2) continue;
    const d = dist(P[V], T);
    if (d > tol.ang) continue;
    const th = Math.atan2(T[1] - P[V][1], T[0] - P[V][0]);
    for (let i = 0; i < list.length; i++) {
      const m = list[i]; const n = list[(i + 1) % list.length];
      const span = (n.a - m.a + 4 * Math.PI) % (2 * Math.PI);
      const off = (th - m.a + 4 * Math.PI) % (2 * Math.PI);
      if (off > span) continue;
      if (span >= Math.PI - 1e-6 || d > 0.8 * Math.min(m.len, n.len)) break;
      if (!ang || d < ang.d) ang = { d, p: [m.to, V, n.to], V, frac: off / span };
      break;
    }
  }
  if (!ang) return null;
  let mid = ang.frac >= 0.2 && ang.frac <= 0.8;
  if (mid) {
    // a segment not through the vertex, within reach of the tap, still wins
    for (const [a, b] of model.pieces) {
      if (a === ang.V || b === ang.V) continue;
      const A = P[a]; const B = P[b]; const V = P[ang.V];
      const ux = B[0] - A[0]; const uy = B[1] - A[1];
      const L2 = ux * ux + uy * uy;
      if (!L2) continue;
      if (Math.abs((V[0] - A[0]) * uy - (V[1] - A[1]) * ux) / Math.sqrt(L2) < 1) continue; // on an arm's line
      const t = ((T[0] - A[0]) * ux + (T[1] - A[1]) * uy) / L2;
      if (t <= 0 || t >= 1) continue;
      if (Math.abs((T[0] - A[0]) * uy - (T[1] - A[1]) * ux) / Math.sqrt(L2) <= tol.seg) { mid = false; break; }
    }
  }
  return { d: ang.d, p: ang.p, mid };
}

// The nearest point to T within `r`, as a pick, or null (naming an angle by its points: app.js).
function pointNear(model, P, T, r) {
  let best = null;
  for (const X of model.names) { const d = dist(P[X], T); if (d <= r && (!best || d < best.d)) best = { d, X }; }
  return best ? { kind: 'pt', p: [best.X], text: best.X } : null;
}

export function renderDiagram(problem, { width = 420, height = 320, pad = 50, animate = true, label = '' } = {}) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<svg class="dg${animate ? ' anim' : ''}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}"></svg>`;
  const svg = wrap.firstElementChild;
  let cur;
  let sig;
  let model = null; // pickModel, built on the first pick after each paint
  let shown = null;
  let proven = []; // marks of the facts the proof has proven so far (provenMarks)
  const drawProven = () => {
    const g = svg.querySelector('.dg-proven');
    if (g) g.innerHTML = marksSVG(proven, cur.P, cur.angleRadius, cur.center);
    // a goal angle's "?" gives way to the value found (the proven mark draws it in its place)
    const found = new Set(proven.filter((m) => m.replaces).map((m) => m.replaces));
    const st = svg.querySelector('.dg-marks');
    if (st && cur.problem) {
      const marks = (cur.problem.marks || []).map((m) => (found.has(m.ang) && m.label === '?' ? { ...m, label: '' } : m));
      st.innerHTML = marksSVG(marks, cur.P, cur.angleRadius, cur.center);
    }
  };
  const paint = (p) => {
    cur = draw(p, { width, height, pad });
    svg.innerHTML = cur.html;
    sig = p.consSig || '';
    cur.problem = p;
    model = null;
    shown = null;
    drawProven();
  };
  paint(problem);
  // Show what the proof has proven: marks from provenMarks(problem, results).
  function setProven(marks) {
    proven = marks || [];
    drawProven();
  }

  // What is under the pointer: { kind: 'pt' | 'seg' | 'ang', p, text } or null. Tolerances are in
  // screen pixels (wider for a finger), so the diagram picks the same way at any size.
  // { snap: true }: only points, the nearest within a wide reach (naming an angle by its points).
  function pick(clientX, clientY, touch = false, { snap = false } = {}) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const T = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    const k = 1 / (Math.hypot(ctm.a, ctm.b) || 1);
    model = model || pickModel(cur.problem, cur.P);
    if (snap) return pointNear(model, cur.P, [T.x, T.y], (touch ? 46 : 30) * k);
    return pickAt(model, cur.P, [T.x, T.y], { pt: (touch ? 17 : 11) * k, seg: (touch ? 15 : 9) * k, ang: (touch ? 80 : 66) * k });
  }
  // The points chosen so far while naming an angle or triangle ({ kind: 'build', sym, p }), with the
  // side or arm between the first two; p empty clears it. Its own layer, so hover outlines don't erase it.
  function drawBuild(hit) {
    let g = svg.querySelector('.dg-build');
    if (!g) {
      g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'dg-build');
      svg.append(g);
    }
    const { P } = cur;
    const p = (hit.p || []).filter((x) => P[x]);
    const arm = p.length >= 2 ? `<path class="bd-arm" d="M${pt(P[p[0]])}L${pt(P[p[1]])}"/>` : '';
    g.innerHTML = arm + p.map((x, i) => `<circle class="bd-pt${hit.hover && i === p.length - 1 ? ' is-hover' : ''}" cx="${f(P[x][0])}" cy="${f(P[x][1])}" r="10"/>`).join('');
  }
  // Outline what a click would insert (null clears it); flash: briefly mark what was inserted.
  function markPick(hit, flash = false) {
    if (hit && hit.kind === 'build') { drawBuild(hit); return; }
    const g = svg.querySelector('.dg-pick');
    if (!g) return;
    const key = hit ? hit.kind + hit.p.join('') : '';
    if (!flash && key === shown) return;
    shown = flash ? null : key;
    svg.classList.toggle('is-picking', !!hit && !flash);
    if (!hit) { g.innerHTML = ''; return; }
    const { P, angleRadius } = cur;
    const cls = flash ? ' pk-flash' : '';
    if (hit.kind === 'pt') g.innerHTML = `<circle class="pk-pt${cls}" cx="${f(P[hit.p[0]][0])}" cy="${f(P[hit.p[0]][1])}" r="9"/>`;
    else if (hit.kind === 'seg') g.innerHTML = `<path class="pk-seg${cls}" d="M${pt(P[hit.p[0]])}L${pt(P[hit.p[1]])}"/>`;
    else if (hit.kind === 'tri') g.innerHTML = `<polygon class="pk-tri${cls}" points="${hit.p.map((q) => pt(P[q])).join(' ')}"/>`;
    else {
      const [X, V, Y] = hit.p;
      g.innerHTML = `<path class="pk-ang${cls}" d="${arcGeom(P[V], P[X], P[Y], angleRadius(X, V, Y, 40)).wedge}"/>`;
    }
    if (flash) setTimeout(() => { if (g.isConnected && shown === null) g.innerHTML = ''; }, 650);
  }

  function highlight(items) {
    const { P, angleRadius } = cur;
    svg.querySelector('.dg-hl').innerHTML = (items || []).map((it) => {
      const tone = `tone-${it.tone || 'a'}`;
      if (it.kind === 'seg') return `<path class="hl-seg ${tone}" d="M${pt(P[it.p[0]])}L${pt(P[it.p[1]])}"/>`;
      if (it.kind === 'ang') {
        const [X, V, Y] = it.p;
        const g = arcGeom(P[V], P[X], P[Y], angleRadius(X, V, Y, 40));
        return `<path class="hl-ang ${tone}" d="${g.wedge}"/>`;
      }
      if (it.kind === 'tri') return `<polygon class="hl-tri ${tone}" points="${it.p.map((q) => pt(P[q])).join(' ')}"/>`;
      return '';
    }).join('');
    svg.classList.toggle('has-hl', !!(items && items.length));
  }

  // Redraw when the proof's constructions changed (geo.js syncConstructions); no animation then.
  function sync(p) {
    if ((p.consSig || '') === sig) return false;
    svg.classList.remove('anim');
    paint(p);
    return true;
  }

  return { el: svg, highlight, clear: () => highlight([]), sync, pick, markPick, setProven };
}

// ---- what the proof has proven, drawn on the diagram ----
// Every correct row adds its fact, the way a student marks a drawing: a length found is written
// by its segment, an angle found gets an arc with its value (a right angle, the square), equal
// segments get the same number of ticks and equal angles the same arcs, perpendicular lines the
// square where they meet, parallel lines arrows. Equalities join into groups, so a segment proven
// equal to one the question already ticks gets that many ticks; a new group gets a new count.
export function provenMarks(problem, results) {
  const pts = problem.points;
  const rays = problem.rays || {};
  const segKey = (p) => [...p].sort().join('');
  const angKey = ([X, V, Y]) => V + [(rays[V] && rays[V][X]) || X, (rays[V] && rays[V][Y]) || Y].sort().join('');
  const keyOf = (t) => (t.kind === 'seg' ? 's' + segKey(t.p) : 'a' + angKey(t.p));
  const parent = new Map();
  const find = (k) => { while (parent.get(k) !== k) k = parent.get(k); return k; };
  const add = (k) => { if (!parent.has(k)) parent.set(k, k); };
  const union = (a, b) => { add(a); add(b); parent.set(find(a), find(b)); };
  const name = new Map(); // key → how the mark names it ('AB', 'ABC')
  const count = new Map(); // key → the static mark's count
  const staticKeys = new Set();
  const labelled = new Set();
  let maxTick = 0;
  let maxArc = 0;
  let maxPar = 0;
  // the question's own marks: same count = same group
  const byCount = new Map();
  for (const m of problem.marks || []) {
    const k = m.type === 'tick' ? 's' + segKey(m.seg) : m.type === 'arc' ? 'a' + angKey([...m.ang]) : null;
    if (m.type === 'par') maxPar = Math.max(maxPar, m.n || 1);
    if (m.type === 'right' || (m.type === 'arc' && m.label)) labelled.add('a' + angKey([...m.ang]));
    if (!k) continue;
    add(k);
    staticKeys.add(k);
    const n = m.n || (m.type === 'tick' ? 1 : 0);
    count.set(k, n);
    if (m.type === 'tick') maxTick = Math.max(maxTick, n); else maxArc = Math.max(maxArc, n);
    const g = `${m.type}:${n}`;
    if (n && byCount.has(g)) union(k, byCount.get(g)); else if (n) byCount.set(g, k);
  }
  // the question's "?" on its goal angle: the value found replaces it, at the same place
  const asked = new Map();
  for (const m of problem.marks || []) if (m.type === 'arc' && m.label === '?') asked.set('a' + angKey([...m.ang]), m);
  for (const k of asked.keys()) labelled.delete(k);
  // lines the question already marks parallel
  const parLines = new Set((problem.marks || []).filter((m) => m.type === 'par').map((m) => lineKey(pts, m.seg[0], m.seg[1])));
  const out = [];
  const seen = new Set();
  const once = (m) => { const s = JSON.stringify(m); if (!seen.has(s)) { seen.add(s); out.push(m); } };
  const lineCommon = (la, lb) => {
    const A = (la || '').slice(2).split('');
    const B = (lb || '').slice(2).split('');
    const V = A.find((x) => B.includes(x));
    if (!V) return null;
    const X = A.find((x) => x !== V); const Y = B.find((x) => x !== V);
    return X && Y ? X + V + Y : null;
  };
  for (const r of results || []) {
    if (!r || !r.ok || !r.parsed || !r.parsed.ok) continue;
    const c = r.parsed.claim;
    if (c.type === 'equi') {
      const [A, B, C] = c.P;
      for (const [p, q] of [[A + B, B + C], [B + C, C + A]]) {
        union('s' + segKey(p), 's' + segKey(q));
        name.set('s' + segKey(p), p); name.set('s' + segKey(q), q);
      }
    } else if (c.type === 'eq' && c.left && c.right) {
      const L = c.left; const R = c.right;
      const both = (k) => L.kind === k && R.kind === k;
      if (both('seg') || both('ang')) {
        union(keyOf(L), keyOf(R));
        name.set(keyOf(L), L.p.join('')); name.set(keyOf(R), R.p.join(''));
      } else {
        const [t, v] = L.kind === 'num' ? [R, L] : [L, R];
        if (v.kind !== 'num' || !(t.kind === 'seg' || t.kind === 'ang')) continue;
        if (t.kind === 'seg') once({ type: 'len', seg: t.p.join(''), label: fmtTerm({ kind: 'num', v: v.v, type: 'len' }) });
        else if (!labelled.has(keyOf(t))) {
          labelled.add(keyOf(t));
          const q = asked.get(keyOf(t));
          const label = fmtTerm({ kind: 'num', v: v.v, type: 'ang' });
          if (q) once({ type: 'arc', ang: q.ang, r: q.r, label, replaces: q.ang });
          else once(Math.abs(v.v - 90) < 1e-9 ? { type: 'right', ang: t.p.join('') } : { type: 'arc', ang: t.p.join(''), label });
        }
      }
    } else if (c.type === 'perp') {
      const ang = lineCommon(c.la, c.lb);
      if (ang) once({ type: 'right', ang });
    } else if (c.type === 'par') {
      if (parLines.has(c.la) && parLines.has(c.lb)) continue;
      maxPar += 1;
      once({ type: 'par', seg: c.a.join(''), n: maxPar });
      once({ type: 'par', seg: c.b.join(''), n: maxPar });
    }
  }
  // the equal groups: ticks or arcs on every member the question didn't mark itself
  const groups = new Map();
  for (const k of parent.keys()) {
    const g = find(k);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(k);
  }
  for (const members of groups.values()) {
    if (members.length < 2 || members.every((k) => staticKeys.has(k))) continue;
    const kind = members[0][0];
    const given = members.find((k) => count.get(k));
    let n = given ? count.get(given) : 0;
    if (!n) n = kind === 's' ? ++maxTick : ++maxArc;
    for (const k of members) {
      if (staticKeys.has(k) || !name.has(k)) continue;
      once(kind === 's' ? { type: 'tick', seg: name.get(k), n } : { type: 'arc', ang: name.get(k), n });
    }
  }
  return out.filter((m) => [m.seg, m.ang].filter(Boolean).every((s) => s.split('').every((x) => pts[x])));
}

// What a claim talks about, as highlight items: left side in one highlighter
// color, right side in another.
export function claimToItems(claim) {
  if (!claim) return [];
  if (claim.extItems) return claim.extItems; // claim types from geo-more.js
  if (claim.type === 'cong') return [{ kind: 'tri', p: claim.P, tone: 'a' }, { kind: 'tri', p: claim.Q, tone: 'b' }];
  if (claim.type === 'perp' || claim.type === 'par') return [{ kind: 'seg', p: claim.a, tone: 'a' }, { kind: 'seg', p: claim.b, tone: 'b' }];
  if (claim.type === 'sim') return [{ kind: 'tri', p: claim.P, tone: 'a' }, { kind: 'tri', p: claim.Q, tone: 'b' }];
  if (claim.type === 'quad') return [{ kind: 'tri', p: claim.P, tone: 'a' }];
  if (claim.type === 'drawn') return [{ kind: 'seg', p: claim.a, tone: 'a' }];
  // Every segment and angle of each side (sides can be sums such as ∢AOC + ∢COB, and
  // terms can be products, ratios, squares or sin∢A).
  const items = [];
  const add = (t, tone) => {
    if (t.kind === 'seg' || t.kind === 'ang') items.push({ kind: t.kind, p: t.p, tone });
    else if (t.kind === 'area' || t.kind === 'area4') items.push({ kind: 'tri', p: t.p, tone }); // the triangle, shaded
    else if (t.kind === 'trig') add(t.a, tone);
    else if (t.kind === 'mono') for (const x of t.f) add(x.t, tone);
  };
  for (const [side, tone] of [[claim.L, 'a'], [claim.R, 'b']]) {
    for (const { t } of (side && side.terms) || []) add(t, tone);
  }
  return items;
}
