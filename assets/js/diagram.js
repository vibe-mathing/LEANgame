// Draws a problem's diagram as SVG from its coordinates, with textbook marks
// (ticks for equal segments, arcs for equal angles) and a highlighter layer that
// lights up whatever the current claim talks about.

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
  let marks = '';
  for (const m of problem.marks || []) {
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
    }
  }

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
    html: `<g class="dg-hl"></g><g class="dg-marks">${marks}</g><g class="dg-lines">${lines}</g>
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
  // an angle: the sector at the nearest vertex that contains the tap
  let ang = null;
  for (const V of Object.keys(model.arms)) {
    const list = model.arms[V];
    if (list.length < 2) continue;
    const d = near(V);
    if (d > tol.ang) continue;
    const th = Math.atan2(T[1] - P[V][1], T[0] - P[V][0]);
    for (let i = 0; i < list.length; i++) {
      const m = list[i]; const n = list[(i + 1) % list.length];
      const span = (n.a - m.a + 4 * Math.PI) % (2 * Math.PI);
      const off = (th - m.a + 4 * Math.PI) % (2 * Math.PI);
      if (off > span) continue;
      if (span >= Math.PI - 1e-6 || d > 0.8 * Math.min(m.len, n.len)) break;
      if (!ang || d < ang.d) ang = { d, p: [m.to, V, n.to] };
      break;
    }
  }
  if (ang) return { kind: 'ang', p: ang.p, text: '∢' + ang.p.join('') };
  return null;
}

export function renderDiagram(problem, { width = 420, height = 320, pad = 50, animate = true, label = '' } = {}) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<svg class="dg${animate ? ' anim' : ''}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}"></svg>`;
  const svg = wrap.firstElementChild;
  let cur;
  let sig;
  let model = null; // pickModel, built on the first pick after each paint
  let shown = null;
  const paint = (p) => {
    cur = draw(p, { width, height, pad });
    svg.innerHTML = cur.html;
    sig = p.consSig || '';
    cur.problem = p;
    model = null;
    shown = null;
  };
  paint(problem);

  // What is under the pointer: { kind: 'pt' | 'seg' | 'ang', p, text } or null. Tolerances are in
  // screen pixels (wider for a finger), so the diagram picks the same way at any size.
  function pick(clientX, clientY, touch = false) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const T = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    const k = 1 / (Math.hypot(ctm.a, ctm.b) || 1);
    model = model || pickModel(cur.problem, cur.P);
    return pickAt(model, cur.P, [T.x, T.y], { pt: (touch ? 17 : 11) * k, seg: (touch ? 15 : 9) * k, ang: (touch ? 80 : 66) * k });
  }
  // Outline what a click would insert (null clears it); flash: briefly mark what was inserted.
  function markPick(hit, flash = false) {
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

  return { el: svg, highlight, clear: () => highlight([]), sync, pick, markPick };
}

// What a claim talks about, as highlight items: left side in one highlighter
// color, right side in another.
export function claimToItems(claim) {
  if (!claim) return [];
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
    else if (t.kind === 'area') items.push({ kind: 'tri', p: t.p, tone }); // the triangle, shaded
    else if (t.kind === 'trig') add(t.a, tone);
    else if (t.kind === 'mono') for (const x of t.f) add(x.t, tone);
  };
  for (const [side, tone] of [[claim.L, 'a'], [claim.R, 'b']]) {
    for (const { t } of (side && side.terms) || []) add(t, tone);
  }
  return items;
}
