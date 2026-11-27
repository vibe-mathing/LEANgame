// The teacher question bank ("שאלות מורים"): questions that teachers and admins add with the
// question editor (author.js), stored in Firestore (collection teacherQuestions) or, in local test
// mode, in this browser.
//
//   teacherQuestions/{id} { authorUid, authorName, title, stage, status: 'published' | 'draft',
//                           data   (the problem as JSON, the format of PROBLEMS in data.js),
//                           source (the words and the drawing as JSON, so the editor can reopen it),
//                           solution (the author's accepted proof rows as JSON, '' if not solved yet),
//                           createdAt, updatedAt }
//
// A question is published only after its author has solved it: the editor's "try it" player reports
// a solved proof (markDraftSolved), the editor saves it with the question, and saveQuestion and
// firestore.rules refuse status 'published' without a solution.
//
// Who may do what (firebase/firestore.rules enforces the same):
//   everyone   reads published questions
//   staff      (teacher or admin) reads every question and adds new ones
//   the author edits and deletes their own; an admin edits and deletes any
//
// It reuses the Firebase app that auth.js starts, so the SDK URL must match auth.js exactly.

import * as auth from './auth.js';
import { playable } from './qparse.js';
import { getLang } from './i18n.js';

// The few words the player needs for a bank question (app.js shows them in the breadcrumbs).
const WORDS = {
  he: { crumb: 'שאלות מורים', back: 'חזרה לעריכה', badge: 'שאלת מורה', preview: 'תצוגה מקדימה', draft: 'טיוטה', notFound: 'השאלה לא נמצאה במאגר, או שהיא עדיין טיוטה.', toBank: 'למאגר השאלות', by: 'מאת {name}' },
  en: { crumb: 'Teacher questions', back: 'Back to editing', badge: 'Teacher question', preview: 'Preview', draft: 'Draft', notFound: 'This question is not in the bank, or it is still a draft.', toBank: 'To the question bank', by: 'by {name}' },
};
export const bankWord = (k, vars) => String((WORDS[getLang()] || WORDS.he)[k] ?? WORDS.he[k] ?? k).replace(/\{(\w+)\}/g, (_, v) => (vars && vars[v]) ?? '');

const SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
const LOCAL_KEY = 'lg.localQuestions';
const DRAFT_KEY = 'lg.tqDraft';
const COLL = 'teacherQuestions';

export class BankError extends Error {
  constructor(code) { super(code); this.code = code; }
}

let fbPromise = null;
async function firestore() {
  if (!fbPromise) {
    fbPromise = (async () => {
      await auth.accountsAvailable();
      const [{ getApp }, F] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-firestore.js')]);
      return { F, db: F.getFirestore(getApp()) };
    })();
  }
  return fbPromise;
}

const me = () => auth.currentUser();
const isStaff = () => auth.isStaff();
export const canEdit = (q) => !!(q && me() && isStaff() && (q.authorUid === me().uid || auth.isAdmin()));
export const canAdd = () => isStaff();
export const mode = () => auth.mode;

const ms = (ts) => (ts && ts.toMillis ? ts.toMillis() : typeof ts === 'number' ? ts : null);
const fromDoc = (id, x) => ({
  id, authorUid: x.authorUid, authorName: x.authorName || '', title: x.title || '', stage: x.stage || 'L01',
  status: x.status === 'draft' ? 'draft' : 'published', data: x.data || '{}', source: x.source || '{}',
  solution: x.solution || '', createdAt: ms(x.createdAt), updatedAt: ms(x.updatedAt),
});
const parseRows = (s) => { try { const r = JSON.parse(s || 'null'); return Array.isArray(r) && r.length ? r : null; } catch { return null; } };

const toCode = (e) => {
  if (e instanceof BankError) return e;
  const c = String((e && e.code) || '');
  if (c.includes('permission-denied')) return new BankError('denied');
  if (c.includes('unavailable') || c.includes('network')) return new BankError('network');
  console.warn('[bank]', e);
  return new BankError('unknown');
};

// ---------------------------------------------------------------- local test backend

const loadLocal = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}; } catch { return {}; } };
const saveLocal = (all) => localStorage.setItem(LOCAL_KEY, JSON.stringify(all));

// ---------------------------------------------------------------- reading

export async function listQuestions() {
  await auth.authReady;
  if (auth.mode === 'off') throw new BankError('off');
  try {
    let out;
    if (auth.mode === 'local') {
      out = Object.entries(loadLocal()).map(([id, x]) => fromDoc(id, x)).filter((q) => q.status === 'published' || isStaff());
    } else {
      const { F, db } = await firestore();
      const col = F.collection(db, COLL);
      const snap = await F.getDocs(isStaff() ? col : F.query(col, F.where('status', '==', 'published')));
      out = snap.docs.map((d) => fromDoc(d.id, d.data()));
    }
    return out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (e) { throw toCode(e); }
}

export async function getQuestion(id) {
  await auth.authReady;
  if (auth.mode === 'off') throw new BankError('off');
  try {
    if (auth.mode === 'local') {
      const x = loadLocal()[id];
      if (!x || (x.status !== 'published' && !isStaff())) return null;
      return fromDoc(id, x);
    }
    const { F, db } = await firestore();
    const s = await F.getDoc(F.doc(db, COLL, id));
    return s.exists() ? fromDoc(s.id, s.data()) : null;
  } catch (e) {
    const err = toCode(e);
    if (err.code === 'denied') return null; // a draft, seen by someone who isn't staff
    throw err;
  }
}

// A bank question ready for the player: { stage, problem } or null.
export async function loadPlayable(id) {
  if (id === 'draft') {
    let d = null;
    try { d = JSON.parse(sessionStorage.getItem(DRAFT_KEY)); } catch { /* ignore */ }
    if (!d || !d.problem) return null;
    return { stage: d.stage, problem: playable({ data: d.problem }, 'draft'), meta: { id: 'draft', draft: true, back: d.back || '#/author' } };
  }
  const q = await getQuestion(id);
  if (!q) return null;
  return { stage: q.stage, problem: playable(q, id), meta: { id, title: q.title, author: q.authorName, status: q.status } };
}

// The editor's "try it" button: the player reads the problem from this tab's storage.
export function setTryDraft(stage, problem, back) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ stage, problem, back }));
}

// ---------------------------------------------------------------- solved before published
// Solutions are kept per exact version of the problem (its JSON), so any change to the question
// asks for a new solution.
const SOLVED_KEY = 'lg.tqSolved';
function problemSig(problem) {
  const s = JSON.stringify(problem || null);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return `${s.length}-${h.toString(36)}`;
}
const loadSolved = () => { try { return JSON.parse(localStorage.getItem(SOLVED_KEY)) || {}; } catch { return {}; } };

// Called by the player when the author solves the "try it" draft.
export function markDraftSolved(rows) {
  let d = null;
  try { d = JSON.parse(sessionStorage.getItem(DRAFT_KEY)); } catch { /* ignore */ }
  if (!d || !d.problem || !Array.isArray(rows) || !rows.length) return;
  const all = loadSolved();
  all[problemSig(d.problem)] = { rows, at: Date.now() };
  const keep = Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, 30);
  try { localStorage.setItem(SOLVED_KEY, JSON.stringify(Object.fromEntries(keep))); } catch { /* ignore */ }
}

// The accepted proof rows for exactly this problem, or null. A saved question's own solution counts too.
export function solvedFor(problem, saved) {
  const hit = loadSolved()[problemSig(problem)];
  if (hit) return hit.rows;
  if (saved && saved.solution && saved.data === JSON.stringify(problem)) return parseRows(saved.solution);
  return null;
}

// ---------------------------------------------------------------- writing

const clean = (q) => ({
  title: String(q.title || '').trim().slice(0, 120),
  stage: /^L\d\d$/.test(q.stage) ? q.stage : 'L01',
  status: q.status === 'draft' ? 'draft' : 'published',
  data: JSON.stringify(q.data),
  source: JSON.stringify(q.source || {}),
  solution: Array.isArray(q.solution) && q.solution.length ? JSON.stringify(q.solution) : '',
});

// Adds a question (no id) or updates one. Returns the id.
// q.solution: the author's accepted proof rows for exactly q.data; required to publish.
export async function saveQuestion(q) {
  await auth.authReady;
  const u = me();
  if (!u || !isStaff()) throw new BankError('denied');
  const fields = clean(q);
  if (!fields.title) throw new BankError('noTitle');
  if (fields.status === 'published' && !fields.solution) throw new BankError('unsolved');
  if (fields.data.length > 100000 || fields.source.length > 100000) throw new BankError('tooBig');
  try {
    if (auth.mode === 'local') {
      const all = loadLocal();
      if (q.id) {
        const old = all[q.id];
        if (!old || !canEdit(fromDoc(q.id, old))) throw new BankError('denied');
        all[q.id] = { ...old, ...fields, updatedAt: Date.now() };
        saveLocal(all);
        return q.id;
      }
      const id = 'q' + Math.random().toString(36).slice(2, 12);
      all[id] = { ...fields, authorUid: u.uid, authorName: String(u.name || u.username || '').slice(0, 60), createdAt: Date.now(), updatedAt: Date.now() };
      saveLocal(all);
      return id;
    }
    const { F, db } = await firestore();
    if (q.id) {
      await F.updateDoc(F.doc(db, COLL, q.id), { ...fields, updatedAt: F.serverTimestamp() });
      return q.id;
    }
    const ref = await F.addDoc(F.collection(db, COLL), {
      ...fields, authorUid: u.uid, authorName: String(u.name || u.username || '').slice(0, 60),
      createdAt: F.serverTimestamp(), updatedAt: F.serverTimestamp(),
    });
    return ref.id;
  } catch (e) { throw toCode(e); }
}

// From the bank page: publishing works only for a question saved with its solution.
export async function setStatus(q, status) {
  return saveQuestion({ ...q, status, data: JSON.parse(q.data), source: JSON.parse(q.source), solution: parseRows(q.solution) });
}

export async function deleteQuestion(q) {
  await auth.authReady;
  if (!canEdit(q)) throw new BankError('denied');
  try {
    if (auth.mode === 'local') {
      const all = loadLocal();
      delete all[q.id];
      saveLocal(all);
      return;
    }
    const { F, db } = await firestore();
    await F.deleteDoc(F.doc(db, COLL, q.id));
  } catch (e) { throw toCode(e); }
}
