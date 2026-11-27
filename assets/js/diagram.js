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

export function renderDiagram(problem, { width = 420, height = 320, pad = 50, animate = true, label = '' } = {}) {
  const names = Object.keys(problem.points);
  const xs = names.map((n) => problem.points[n][0]);
  const ys = names.map((n) => problem.points[n][1]);
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

  const lines = (problem.segments || []).map((sg, i) => {
    const [a, b] = sg.split('');
    return `<path class="dg-line" pathLength="1" style="--i:${i}" d="M${pt(P[a])}L${pt(P[b])}"/>`;
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

  const wrap = document.createElement('div');
  wrap.innerHTML = `<svg class="dg${animate ? ' anim' : ''}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">
    <g class="dg-hl"></g><g class="dg-marks">${marks}</g><g class="dg-lines">${lines}</g>
    <g class="dg-points">${points}</g><g class="dg-labels">${labels}</g></svg>`;
  const svg = wrap.firstElementChild;
  const hl = svg.querySelector('.dg-hl');

  function highlight(items) {
    hl.innerHTML = (items || []).map((it) => {
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

  return { el: svg, highlight, clear: () => highlight([]) };
}

// What a claim talks about, as highlight items: left side in one highlighter
// color, right side in another.
export function claimToItems(claim) {
  if (!claim) return [];
  if (claim.type === 'cong') return [{ kind: 'tri', p: claim.P, tone: 'a' }, { kind: 'tri', p: claim.Q, tone: 'b' }];
  if (claim.type === 'perp') return [{ kind: 'seg', p: claim.a, tone: 'a' }, { kind: 'seg', p: claim.b, tone: 'b' }];
  // Every segment and angle of each side (sides can be sums such as ∢AOC + ∢COB).
  const items = [];
  for (const [side, tone] of [[claim.L, 'a'], [claim.R, 'b']]) {
    for (const { t } of (side && side.terms) || []) {
      if (t.kind === 'seg' || t.kind === 'ang') items.push({ kind: t.kind, p: t.p, tone });
    }
  }
  return items;
}
