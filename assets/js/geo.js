// The demo checker. In the real game every row is compiled by Lean; here the same
// catalog rules run in the browser so the site can be played without a server.
// It parses school notation, normalizes it (AB = BA, ∢ABC = ∢CBA, letter order in
// congruences), checks each row on its own context, and emits the matching Lean.

import { REASONS } from './data.js';

const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const others = (k) => [0, 1, 2].filter((x) => x !== k);

const ok = (claim) => ({ ok: true, claim });
const fail = (key, vars) => ({ ok: false, error: { key, vars } });

export function normalizeInput(s) {
  return String(s)
    .replace(/[∠∡]/g, '∢')
    .replace(/</g, '∢')
    .replace(/[Δ∆▵▲]/g, '△')
    .replace(/~=|=~|≡|≃|≌/g, '≅')
    .replace(/[º˚]/g, '°')
    .replace(/\s+/g, '')
    .toUpperCase();
}

const safe = (s) => s.replace(/[^A-Z0-9°∢△≅=.,+\-]/g, '');

function parseTerm(p, points) {
  let m;
  if ((m = p.match(/^∢([A-Z])([A-Z])([A-Z])$/))) {
    const pts = [m[1], m[2], m[3]];
    const bad = pts.find((x) => !points.includes(x));
    if (bad) return fail('unknownPoint', { p: `$${bad}$` });
    if (new Set(pts).size < 3) return fail('repeatPoint');
    return { ok: true, term: { kind: 'ang', p: pts } };
  }
  if (/^∢[A-Z]{1,2}$/.test(p)) return fail('angle3');
  if ((m = p.match(/^([A-Z])([A-Z])$/))) {
    const pts = [m[1], m[2]];
    const bad = pts.find((x) => !points.includes(x));
    if (bad) return fail('unknownPoint', { p: `$${bad}$` });
    if (pts[0] === pts[1]) return fail('repeatPoint');
    return { ok: true, term: { kind: 'seg', p: pts } };
  }
  if ((m = p.match(/^(\d+(?:[.,]\d+)?)(°)?$/))) {
    return { ok: true, term: { kind: 'num', v: parseFloat(m[1].replace(',', '.')), deg: !!m[2] } };
  }
  if (/^△/.test(p)) return fail('triangleNeedsCong');
  const shown = safe(p);
  return fail('unknownTerm', { t: shown ? `$${shown}$` : '…' });
}

const typeOf = (t) => (t.kind === 'seg' ? 'len' : t.kind === 'ang' ? 'ang' : t.deg ? 'ang' : null);

export function parseClaim(input, points) {
  const s = normalizeInput(input);
  if (!s) return fail('empty');
  if (s.includes('≅')) {
    const parts = s.split('≅');
    if (parts.length !== 2) return fail('badCong');
    const tri = parts.map((x) => x.replace(/^△/, ''));
    if (!tri.every((x) => /^[A-Z]{3}$/.test(x))) return fail('badCong');
    const P = [...tri[0]];
    const Q = [...tri[1]];
    const bad = [...P, ...Q].find((x) => !points.includes(x));
    if (bad) return fail('unknownPoint', { p: `$${bad}$` });
    if (new Set(P).size < 3 || new Set(Q).size < 3) return fail('repeatPoint');
    return ok({ type: 'cong', P, Q });
  }
  const parts = s.split('=');
  if (parts.length > 2) return fail('oneRelation');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return fail('noRelation');
  const terms = [];
  for (const part of parts) {
    const r = parseTerm(part, points);
    if (!r.ok) return r;
    terms.push(r.term);
  }
  const [l, r] = terms;
  if (l.kind === 'num' && r.kind === 'num') return fail('onlyNumbers');
  const tl = typeOf(l);
  const tr = typeOf(r);
  if (tl && tr && tl !== tr) return fail('mixedTypes');
  const type = tl || tr;
  if (l.kind === 'num') l.type = type;
  if (r.kind === 'num') r.type = type;
  return ok({ type: 'eq', left: l, right: r, of: type });
}

// ---------- normalization ----------

export const segKey = (a, b) => 's:' + [a, b].sort().join('');
export const angKey = (a, v, b) => 'a:' + v + ':' + [a, b].sort().join('');

export function termKey(t) {
  if (t.kind === 'seg') return segKey(...t.p);
  if (t.kind === 'ang') return angKey(...t.p);
  return 'n:' + t.type + ':' + t.v;
}

export function claimKey(c) {
  if (!c) return '';
  if (c.type === 'eq') return [termKey(c.left), termKey(c.right)].sort().join('=');
  const a = c.P.map((p, i) => p + c.Q[i]).sort().join(',');
  const b = c.Q.map((q, i) => q + c.P[i]).sort().join(',');
  return 'cong:' + (a < b ? a : b);
}

// ---------- formatting ----------

const fmtNum = (v) => String(Math.round(v * 1000) / 1000);

export function fmtTerm(t) {
  if (t.kind === 'seg') return t.p.join('');
  if (t.kind === 'ang') return '∢' + t.p.join('');
  return fmtNum(t.v) + (t.type === 'ang' ? '°' : '');
}

export function fmtClaim(c) {
  if (!c) return '';
  if (c.type === 'cong') return `△${c.P.join('')} ≅ △${c.Q.join('')}`;
  return `${fmtTerm(c.left)} = ${fmtTerm(c.right)}`;
}

function leanTerm(t) {
  if (t.kind === 'seg') return `len ${t.p[0]} ${t.p[1]}`;
  if (t.kind === 'ang') return `ang ${t.p.join(' ')}`;
  return fmtNum(t.v);
}

export function leanClaim(c) {
  if (c.type === 'cong') return `Cong ${c.P.join(' ')} ${c.Q.join(' ')}`;
  return `${leanTerm(c.left)} = ${leanTerm(c.right)}`;
}

// ---------- equality reasoning (only over the cited rows) ----------

class UnionFind {
  constructor() { this.parent = new Map(); }
  find(x) {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let r = x;
    while (this.parent.get(r) !== r) r = this.parent.get(r);
    this.parent.set(x, r);
    return r;
  }
  union(a, b) { this.parent.set(this.find(a), this.find(b)); }
  same(a, b) { return a === b || this.find(a) === this.find(b); }
}

function ufFrom(refRows) {
  const uf = new UnionFind();
  for (const r of refRows) if (r.claim.type === 'eq') uf.union(termKey(r.claim.left), termKey(r.claim.right));
  return uf;
}

// ---------- problem preparation ----------

export function prepareProblem(p, stageId) {
  if (p.prepared) return p;
  p.stage = stageId;
  p.pointNames = Object.keys(p.points);
  p.givensParsed = p.givens.map((g) => {
    const r = parseClaim(g.claim, p.pointNames);
    if (!r.ok) console.error('Bad given', g.claim, r.error);
    return r.claim;
  });
  const goal = parseClaim(p.goal, p.pointNames);
  if (!goal.ok) console.error('Bad goal', p.goal, goal.error);
  p.goalParsed = goal.claim;
  p.goalKey = claimKey(goal.claim);
  p.prepared = true;
  return p;
}

function degenerate(problem, T) {
  const [a, b, c] = T.map((x) => problem.points[x]);
  const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return Math.abs(cross) < 1e-6;
}

// ---------- congruence criteria ----------

const sideEq = (P, Q, uf, i, j) => uf.same(segKey(P[i], P[j]), segKey(Q[i], Q[j]));
const angEq = (P, Q, uf, k) => {
  const [i, j] = others(k);
  return uf.same(angKey(P[i], P[k], P[j]), angKey(Q[i], Q[k], Q[j]));
};
const sideStr = (P, Q, i, j) => `${P[i]}${P[j]} = ${Q[i]}${Q[j]}`;
const angStr = (P, Q, k) => {
  const [i, j] = others(k);
  return `∢${P[i]}${P[k]}${P[j]} = ∢${Q[i]}${Q[k]}${Q[j]}`;
};

function best(options) {
  let pick = options[0];
  for (const o of options) if (o.length < pick.length) pick = o;
  return { ok: pick.length === 0, missing: pick };
}

const CRITERIA = {
  SSS: (P, Q, uf) => best([[[0, 1], [1, 2], [0, 2]].filter(([i, j]) => !sideEq(P, Q, uf, i, j)).map(([i, j]) => sideStr(P, Q, i, j))]),
  SAS: (P, Q, uf) => best([0, 1, 2].map((k) => {
    const [i, j] = others(k);
    const miss = [];
    if (!sideEq(P, Q, uf, k, i)) miss.push(sideStr(P, Q, k, i));
    if (!angEq(P, Q, uf, k)) miss.push(angStr(P, Q, k));
    if (!sideEq(P, Q, uf, k, j)) miss.push(sideStr(P, Q, k, j));
    return miss;
  })),
  ASA: (P, Q, uf) => best([0, 1, 2].map((k) => {
    const [i, j] = others(k);
    const miss = [];
    if (!angEq(P, Q, uf, i)) miss.push(angStr(P, Q, i));
    if (!sideEq(P, Q, uf, i, j)) miss.push(sideStr(P, Q, i, j));
    if (!angEq(P, Q, uf, j)) miss.push(angStr(P, Q, j));
    return miss;
  })),
};

// ---------- per-reason checks ----------
// Each returns { ok, msg?, proof } where proof is the Lean term for the row.

const refNames = (refRows) => refRows.map((r) => 's' + r.n).join(' ');
const isEqOf = (c, kind) => c.type === 'eq' && c.left.kind === kind && c.right.kind === kind;

function congruenceCheck(rid) {
  return (claim, refRows, problem) => {
    const proof = `${REASONS[rid].lean} ${refNames(refRows)}`.trim();
    if (claim.type !== 'cong') return { ok: false, msg: { key: 'needCong', vars: { rid } }, proof };
    for (const T of [claim.P, claim.Q]) {
      if (degenerate(problem, T)) return { ok: false, msg: { key: 'degenerate', vars: { t: `$△${T.join('')}$` } }, proof };
    }
    if (refRows.length < 3) return { ok: false, msg: { key: 'needRefsN', vars: { rid, n: 3 } }, proof };
    const uf = ufFrom(refRows);
    const crit = CRITERIA[rid];
    const r0 = crit(claim.P, claim.Q, uf);
    if (r0.ok) return { ok: true, proof };
    for (const perm of PERMS.slice(1)) {
      const Q2 = perm.map((i) => claim.Q[i]);
      if (crit(claim.P, Q2, uf).ok) {
        return { ok: false, msg: { key: 'wrongOrder', vars: { s: `$△${claim.P.join('')} ≅ △${Q2.join('')}$` } }, proof };
      }
    }
    const m = r0.missing.map((x) => `$${x}$`).join(', ');
    return { ok: false, msg: { key: r0.missing.length === 1 ? 'critMissing1' : 'critMissingN', vars: { rid, m } }, proof };
  };
}

function cpctCheck(kind) {
  const isSide = kind === 'side';
  return (claim, refRows) => {
    const ref = refRows.length === 1 && refRows[0].claim.type === 'cong' ? refRows[0] : null;
    const fallback = `${isSide ? 'cong_side' : 'cong_angle'} ${refNames(refRows)}`.trim();
    if (!isEqOf(claim, isSide ? 'seg' : 'ang')) {
      return { ok: false, msg: { key: isSide ? 'cpctSideNeedSeg' : 'cpctAngleNeedAng' }, proof: fallback };
    }
    if (!ref) return { ok: false, msg: { key: 'cpctNeedCong' }, proof: fallback };
    const { P, Q } = ref.claim;
    const k1 = termKey(claim.left);
    const k2 = termKey(claim.right);
    const options = isSide
      ? [[0, 1, 'AB'], [1, 2, 'BC'], [0, 2, 'AC']].map(([i, j, name]) => [segKey(P[i], P[j]), segKey(Q[i], Q[j]), `cong_side_${name}`])
      : [0, 1, 2].map((k) => {
        const [i, j] = others(k);
        return [angKey(P[i], P[k], P[j]), angKey(Q[i], Q[k], Q[j]), `cong_angle_${'ABC'[k]}`];
      });
    for (const [a, b, name] of options) {
      if (k1 === a && k2 === b) return { ok: true, proof: `${name} s${ref.n}` };
      if (k1 === b && k2 === a) return { ok: true, proof: `(${name} s${ref.n}).symm` };
    }
    return { ok: false, msg: { key: isSide ? 'cpctSideNotCorr' : 'cpctAngleNotCorr', vars: { n: ref.n } }, proof: fallback };
  };
}

const CHECKS = {
  given(claim, refRows, problem) {
    const gi = problem.givensParsed.findIndex((g) => claimKey(g) === claimKey(claim));
    if (gi < 0) return { ok: false, msg: { key: 'notGiven' }, proof: 'g?' };
    return { ok: true, proof: `g${gi + 1}` };
  },
  common_side(claim) {
    if (!isEqOf(claim, 'seg')) return { ok: false, msg: { key: 'commonSideNeedsSeg' }, proof: 'rfl' };
    if (termKey(claim.left) !== termKey(claim.right)) return { ok: false, msg: { key: 'notCommonSide' }, proof: 'rfl' };
    return { ok: true, proof: 'rfl' };
  },
  common_angle(claim) {
    if (!isEqOf(claim, 'ang')) return { ok: false, msg: { key: 'commonAngleNeedsAng' }, proof: 'rfl' };
    if (termKey(claim.left) !== termKey(claim.right)) return { ok: false, msg: { key: 'notCommonAngle' }, proof: 'rfl' };
    return { ok: true, proof: 'rfl' };
  },
  vert_angles(claim, refRows, problem) {
    const base = 'vert_angles_eq';
    if (!isEqOf(claim, 'ang')) return { ok: false, msg: { key: 'vertNeedAngles' }, proof: base };
    const [X, V, Y] = claim.left.p;
    const [Z, V2, W] = claim.right.p;
    if (V !== V2) return { ok: false, msg: { key: 'vertSameVertex' }, proof: base };
    const opp = (p, q) => problem.config.findIndex((c) => c.type === 'between' && c.o === V && ((c.a === p && c.b === q) || (c.a === q && c.b === p)));
    for (const [a, b] of [[Z, W], [W, Z]]) {
      const c1 = opp(X, a);
      const c2 = opp(Y, b);
      if (c1 >= 0 && c2 >= 0) return { ok: true, proof: `${base} cfg${c1 + 1} cfg${c2 + 1}` };
    }
    return { ok: false, msg: { key: 'vertNotOpposite' }, proof: base };
  },
  algebra(claim, refRows) {
    const proof = `by linarith [${refRows.map((r) => 's' + r.n).join(', ')}]`;
    if (claim.type !== 'eq') return { ok: false, msg: { key: 'algebraNeedEq' }, proof };
    if (!refRows.length) return { ok: false, msg: { key: 'needRefs' }, proof };
    const uf = ufFrom(refRows);
    if (uf.same(termKey(claim.left), termKey(claim.right))) return { ok: true, proof };
    return {
      ok: false,
      msg: { key: 'algebraFail', vars: { rows: refRows.map((r) => r.n).join(', '), claim: `$${fmtClaim(claim)}$` } },
      proof,
    };
  },
  SAS: congruenceCheck('SAS'),
  ASA: congruenceCheck('ASA'),
  SSS: congruenceCheck('SSS'),
  cpct_side: cpctCheck('side'),
  cpct_angle: cpctCheck('angle'),
};

// Check every row. rows: [{ text, reason, refs: [rowNumbers] }].
export function checkProof(problem, rows) {
  const results = [];
  rows.forEach((row, i) => {
    const n = i + 1;
    const parsed = parseClaim(row.text, problem.pointNames);
    const res = { n, parsed, ok: false, msg: null, lean: null, goal: false };
    results.push(res);
    if (!parsed.ok) { res.msg = parsed.error; return; }
    const claim = parsed.claim;
    res.goal = claimKey(claim) === problem.goalKey;
    const head = `have s${n} : ${leanClaim(claim)} :=`;
    if (!row.reason) { res.msg = { key: 'noReason' }; res.lean = `${head} sorry`; return; }
    if (!problem.allowed.includes(row.reason)) { res.msg = { key: 'reasonNotAllowed' }; res.lean = `${head} sorry`; return; }
    const refs = [...(row.refs || [])].sort((a, b) => a - b);
    for (const r of refs) {
      if (r >= n || r < 1) { res.msg = { key: 'refFuture' }; res.lean = `${head} sorry`; return; }
      if (!results[r - 1].ok) { res.msg = { key: 'refBad', vars: { n: r } }; res.lean = `${head} sorry`; return; }
    }
    const refRows = refs.map((r) => ({ n: r, claim: results[r - 1].parsed.claim }));
    const out = CHECKS[row.reason](claim, refRows, problem);
    res.ok = out.ok;
    res.msg = out.msg || null;
    res.lean = `${head} ${out.proof}`;
  });
  const gi = results.findIndex((r) => r.ok && r.goal);
  let solvedAt = -1;
  let blocked = false;
  if (gi >= 0) {
    if (results.slice(0, gi).every((r) => r.ok)) solvedAt = gi;
    else blocked = true;
  }
  return { results, solvedAt, blocked };
}

// The problem statement as a Lean theorem, with the student's rows if given.
export function leanTheorem(problem, results, upto) {
  const name = `geo_${problem.stage}_${String(problem.n).padStart(4, '0')}`;
  const hyps = [
    ...problem.config.map((c, i) => `(cfg${i + 1} : ${c.lean})`),
    ...problem.givensParsed.map((g, i) => `(g${i + 1} : ${leanClaim(g)})`),
  ];
  const lines = [`theorem ${name} (${problem.pointNames.join(' ')} : Point)`];
  hyps.forEach((h, i) => lines.push(`    ${h}${i === hyps.length - 1 ? ' :' : ''}`));
  if (!hyps.length) lines[0] += ' :';
  lines.push(`    ${leanClaim(problem.goalParsed)} := by`);
  if (results && upto >= 0) {
    for (let i = 0; i <= upto; i++) lines.push(`  ${results[i].lean}`);
    lines.push(`  exact s${upto + 1}`);
  } else {
    lines.push('  sorry');
  }
  return lines.join('\n');
}
