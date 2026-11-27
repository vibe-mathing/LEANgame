// LEANgame accounts: username + password, one study track per student, roles, and admin tools.
//
// Backend: Firebase Auth + Firestore (settings in firebase-config.js, rules in firebase/firestore.rules).
//
// Usernames are free text (any language, spaces allowed, up to 64 characters), or an e-mail address.
// Firebase Auth knows every account by an e-mail address (see loginEmail()):
//   - an e-mail username is used as is, so "forgot password" sends the reset link there;
//   - a plain username becomes "<name>@leangame.example" (or "u-<hash>@leangame.example" for names that are
//     not plain ASCII). Those addresses never get mail, so such accounts have no password recovery.
// The admin may add a separate recovery e-mail (setRecoveryEmail). Once confirmed, it becomes the address the
// admin logs in with, and reset links go there.
// The owner is the account that signed up as OWNER_USERNAME first; its uid is pinned in config/owner.
//
// Without a Firebase config the public site simply has no accounts. On localhost a local test backend
// (accounts kept in this browser's localStorage) stands in, so the pages can be tried before Firebase is set up.
//
// Public API (other modules may rely on it):
//   currentUser() → null | { uid, username, email, name, track, role, tier, features, blocked,
//                            isAdmin, isOwner, isTeacher, isStaff }
//                   role: 'student' | 'student_plus' | 'student_premium' | 'teacher' | 'admin'
//                   tier: the role when it is a student tier, else null
//                   email: the real e-mail the account logs in with, or null
//                   features: string[] of per-user feature flags (only an admin sets them)
//   isAdmin(), isTeacher(), isStaff() (admin or teacher) → boolean (false until the auth state is known)
//   onAuthChange(cb) → cb(user|null) on every change, and right away once the state is known; returns unsubscribe
//   authReady     → Promise, resolves once the first auth state is known
//   syncProgress(all) → called by app.js after it saves lg.progress

import { FIREBASE_CONFIG, OWNER_USERNAME } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
export const LOGIN_DOMAIN = 'leangame.example';
export const TRACKS = ['3', '4', '5', 'uni'];
export const STAFF = 'staff';
// Roles. Every new account is 'student'; the admin changes roles on the admin page.
// student / student_plus / student_premium are tiers (labels other features may read);
// a teacher sees and manages students; an admin can do everything. The owner is always admin.
export const TIERS = ['student', 'student_plus', 'student_premium'];
export const ROLES = [...TIERS, 'teacher', 'admin'];
export const MAX_USERNAME = 64;
export const MIN_PASSWORD = 6;

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const onLocalhost = LOCAL_HOSTS.includes(location.hostname);
// On localhost, "?localaccounts" in the address uses the local test backend even when Firebase is configured.
const forceLocal = onLocalhost && new URLSearchParams(location.search).has('localaccounts');
export const mode = FIREBASE_CONFIG && !forceLocal ? 'firebase' : onLocalhost ? 'local' : 'off';

export class AuthError extends Error {
  constructor(code) { super(code); this.code = code; }
}

// ---------------------------------------------------------------- usernames and login addresses

export const normUsername = (u) => String(u || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = (s) => EMAIL_RE.test(String(s || '').trim());
const SAFE_LOCAL = /^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/;
const OWNER = normUsername(OWNER_USERNAME) || (mode === 'local' ? 'admin' : '');
export const ownerUsername = () => OWNER;

async function sha256hex(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// The address Firebase Auth knows an account by.
export async function loginEmail(username) {
  const u = normUsername(username);
  if (isEmail(u)) return u;
  if (SAFE_LOCAL.test(u) && u.length <= 64 && !u.startsWith('u-')) return `${u}@${LOGIN_DOMAIN}`;
  return `u-${(await sha256hex('leangame-username:' + u)).slice(0, 40)}@${LOGIN_DOMAIN}`;
}
const realEmail = (login) => (login && !String(login).endsWith('@' + LOGIN_DOMAIN) ? login : null);
const ownerEmail = () => (OWNER ? `${OWNER}@${LOGIN_DOMAIN}` : '');

// ---------------------------------------------------------------- state

let user = null;
let known = false;
let notice = null; // why the last session ended: 'blocked' | 'removed'
const listeners = new Set();
let resolveReady;
export const authReady = new Promise((r) => { resolveReady = r; });

export const currentUser = () => user;
export const isAdmin = () => !!(user && user.isAdmin);
export const isTeacher = () => !!(user && user.isTeacher);
export const isStaff = () => !!(user && user.isStaff); // admin or teacher
export const takeNotice = () => { const n = notice; notice = null; return n; };

export function onAuthChange(cb) {
  listeners.add(cb);
  if (known) { try { cb(user); } catch (e) { console.error(e); } }
  return () => listeners.delete(cb);
}

function emit(u) {
  user = u;
  known = true;
  resolveReady(u);
  for (const cb of [...listeners]) { try { cb(u); } catch (e) { console.error(e); } }
}

// Fills role and the derived flags on a raw profile ({ uid, login, username, role, … }).
function withRole(p, isOwner) {
  const role = isOwner ? 'admin' : ROLES.includes(p.role) ? p.role : 'student';
  const username = p.username || String(p.login || '').split('@')[0];
  return { ...p, username, role, isOwner: !!isOwner, isAdmin: role === 'admin', isTeacher: role === 'teacher' };
}

const publicUser = (p) => ({
  uid: p.uid, username: p.username, email: realEmail(p.login), name: p.name, track: p.track, role: p.role,
  tier: TIERS.includes(p.role) ? p.role : null,
  features: Array.isArray(p.features) ? p.features.filter((f) => typeof f === 'string') : [],
  blocked: !!p.blocked, isAdmin: !!p.isAdmin, isOwner: !!p.isOwner,
  isTeacher: !!p.isTeacher, isStaff: !!p.isAdmin || !!p.isTeacher,
});

// ---------------------------------------------------------------- progress (lg.progress stays the store app.js reads)

const PKEY = 'lg.progress';
const OWNER_KEY = 'lg.progressOwner';
let pver = 0; // bumped whenever this module rewrites lg.progress
export const progressVersion = () => pver;

const readLocal = () => { try { return JSON.parse(localStorage.getItem(PKEY)) || {}; } catch { return {}; } };
function writeLocal(all, uid) {
  try {
    localStorage.setItem(PKEY, JSON.stringify(all));
    if (uid) localStorage.setItem(OWNER_KEY, uid);
  } catch { /* ignore */ }
  pver++;
}
function clearLocal() {
  try { localStorage.removeItem(PKEY); localStorage.removeItem(OWNER_KEY); } catch { /* ignore */ }
  pver++;
}

// Solved anywhere counts as solved, hints already waited for count as the larger number,
// and the local copy wins for everything else (it is the newest).
export function mergeProgress(cloud = {}, local = {}) {
  const out = { ...cloud };
  for (const [k, v] of Object.entries(local)) {
    const c = cloud[k] || {};
    const m = { ...c, ...v, solved: !!(c.solved || v?.solved) };
    if (c.hints != null || v?.hints != null) m.hints = Math.max(Number(c.hints) || 0, Number(v?.hints) || 0);
    out[k] = m;
  }
  return out;
}

let syncTimer = null;
let syncPending = null;
export function syncProgress(all) {
  if (!user || !backend) return;
  try { localStorage.setItem(OWNER_KEY, user.uid); } catch { /* ignore */ }
  syncPending = { uid: user.uid, all };
  clearTimeout(syncTimer);
  syncTimer = setTimeout(flushProgress, 1200);
}
function flushProgress() {
  clearTimeout(syncTimer);
  syncTimer = null;
  const job = syncPending;
  syncPending = null;
  if (job && backend) return backend.saveProgress(job.uid, job.all).catch((e) => console.warn('[accounts] progress sync failed', e));
  return Promise.resolve();
}
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && syncPending) flushProgress(); });

// ---------------------------------------------------------------- session handling

async function handleProfile(p) {
  if (p && (p.blocked || p.missing)) {
    notice = p.blocked ? 'blocked' : 'removed';
    if (localStorage.getItem(OWNER_KEY) === p.uid) clearLocal();
    try { await backend.signOut(); } catch { /* ignore */ }
    p = null;
  }
  if (!p) { emit(null); return; }

  const owner = localStorage.getItem(OWNER_KEY);
  const local = owner && owner !== p.uid ? {} : readLocal();
  const merged = mergeProgress(p.progress || {}, local);
  const localChanged = JSON.stringify(merged) !== JSON.stringify(local);
  const cloudChanged = JSON.stringify(merged) !== JSON.stringify(p.progress || {});
  if (localChanged || owner !== p.uid) writeLocal(merged, p.uid);
  (cloudChanged ? backend.saveProgress(p.uid, merged) : backend.touch(p.uid))
    .catch((e) => console.warn('[accounts] could not update profile', e));
  emit(publicUser(p));
}

// ---------------------------------------------------------------- errors

const FIREBASE_ERRORS = {
  'auth/email-already-in-use': 'username-taken',
  'auth/invalid-credential': 'wrong-login',
  'auth/invalid-login-credentials': 'wrong-login',
  'auth/wrong-password': 'wrong-login',
  'auth/user-not-found': 'wrong-login',
  'auth/invalid-email': 'bad-username',
  'auth/invalid-new-email': 'bad-email',
  'auth/missing-email': 'bad-email',
  'auth/weak-password': 'weak-password',
  'auth/password-does-not-meet-requirements': 'weak-password',
  'auth/too-many-requests': 'too-many',
  'auth/network-request-failed': 'network',
  'auth/operation-not-allowed': 'not-enabled',
  'auth/requires-recent-login': 'reauth',
  'auth/unauthorized-continue-uri': 'unknown',
  'permission-denied': 'denied',
  unavailable: 'network',
};
function toAuthError(e) {
  if (e instanceof AuthError) return e;
  console.warn('[accounts]', e);
  return new AuthError(FIREBASE_ERRORS[String(e && e.code)] || 'unknown');
}

// ---------------------------------------------------------------- backends

let backend = null;
const backHome = () => ({ url: `${location.origin}${location.pathname}#/login`, handleCodeInApp: false });

async function firebaseBackend() {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(SDK + 'firebase-app.js'),
    import(SDK + 'firebase-auth.js'),
    import(SDK + 'firebase-firestore.js'),
  ]);
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = A.getAuth(app);
  auth.languageCode = 'he';
  const db = F.getFirestore(app);
  const uref = (uid) => F.doc(db, 'users', uid);
  const ownerRef = F.doc(db, 'config', 'owner');
  const ms = (ts) => (ts && ts.toMillis ? ts.toMillis() : null);
  const parse = (s) => { try { return JSON.parse(s || '{}') || {}; } catch { return {}; } };

  // The owner's uid, once the owner has signed up (config/owner). Until then the owner is whoever holds ownerEmail().
  let ownerUid = null;
  try { const s = await F.getDoc(ownerRef); ownerUid = s.exists() ? s.data().uid : null; } catch (e) { console.warn('[accounts]', e); }
  const isOwner = (uid, login) => (ownerUid ? uid === ownerUid : !!ownerEmail() && login === ownerEmail());
  const fullLogin = (login) => (String(login || '').includes('@') ? login : `${login}@${LOGIN_DOMAIN}`);

  const fromSnap = (snap) => {
    const x = snap.data();
    const login = fullLogin(x.login);
    return withRole({
      uid: snap.id, login, username: x.username, name: x.name, track: x.track, role: x.role, features: x.features,
      blocked: !!x.blocked, createdAt: ms(x.createdAt), lastSeen: ms(x.lastSeen), progress: parse(x.progress),
    }, isOwner(snap.id, login));
  };

  async function load(fu) {
    if (!fu) return null;
    const snap = await F.getDoc(uref(fu.uid));
    if (!snap.exists()) return { uid: fu.uid, login: fu.email, missing: true };
    // The owner pins their uid the first time they are seen.
    if (!ownerUid && ownerEmail() && fu.email === ownerEmail()) {
      try { await F.setDoc(ownerRef, { uid: fu.uid }); ownerUid = fu.uid; } catch (e) { console.warn('[accounts] could not pin owner', e); }
    }
    // After a confirmed e-mail change, keep the profile's login address in step.
    if (fu.email && snap.data().login !== fu.email) {
      F.updateDoc(uref(fu.uid), { login: fu.email }).catch((e) => console.warn('[accounts]', e));
    }
    const p = fromSnap(snap);
    return { ...p, login: fu.email || p.login };
  }

  let busy = false;
  let handled;
  return {
    ownerClaimed: () => !!ownerUid,
    start(cb) {
      A.onAuthStateChanged(auth, async (fu) => {
        if (busy) return;
        const uid = fu ? fu.uid : null;
        if (uid === handled) return;
        handled = uid;
        try { await cb(await load(fu)); } catch (e) { console.warn('[accounts]', e); await cb(null); }
      });
    },
    async signIn(email, pw) {
      busy = true;
      try {
        const c = await A.signInWithEmailAndPassword(auth, email, pw);
        handled = c.user.uid;
        return await load(c.user);
      } finally { busy = false; }
    },
    async signUp(email, username, pw, name, track, role) {
      busy = true;
      try {
        const c = await A.createUserWithEmailAndPassword(auth, email, pw);
        try {
          await F.setDoc(uref(c.user.uid), {
            login: email, username, name, track, role, blocked: false, progress: '{}',
            createdAt: F.serverTimestamp(), lastSeen: F.serverTimestamp(),
          });
        } catch (e) {
          await c.user.delete().catch(() => {});
          throw e;
        }
        handled = c.user.uid;
        return await load(c.user);
      } finally { busy = false; }
    },
    async signOut() {
      busy = true;
      try { await A.signOut(auth); handled = null; } finally { busy = false; }
    },
    async changePassword(oldPw, newPw) {
      const u = auth.currentUser;
      if (!u) throw new AuthError('signed-out');
      await A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, oldPw));
      await A.updatePassword(u, newPw);
    },
    sendReset: (email) => A.sendPasswordResetEmail(auth, email, backHome()),
    async setRecoveryEmail(email, pw) {
      const u = auth.currentUser;
      if (!u) throw new AuthError('signed-out');
      try {
        await A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, pw));
      } catch (e) {
        throw String(e && e.code).startsWith('auth/') && !['auth/network-request-failed', 'auth/too-many-requests'].includes(e.code)
          ? new AuthError('old-password') : e;
      }
      try { await A.verifyBeforeUpdateEmail(u, email, backHome()); } catch (e) {
        throw e && e.code === 'auth/email-already-in-use' ? new AuthError('email-taken') : e;
      }
    },
    saveProgress: (uid, all) => F.updateDoc(uref(uid), { progress: JSON.stringify(all), lastSeen: F.serverTimestamp() }),
    touch: (uid) => F.updateDoc(uref(uid), { lastSeen: F.serverTimestamp() }),
    setName: (uid, name) => F.updateDoc(uref(uid), { name }),
    async getConfig() {
      const s = await F.getDoc(F.doc(db, 'config', 'site'));
      return s.exists() ? s.data() : {};
    },
    setSignupOpen: (track, open) => F.setDoc(F.doc(db, 'config', 'site'), { signupOpen: { [track]: open } }, { merge: true }),
    async getToolConfig() {
      const s = await F.getDoc(F.doc(db, 'config', 'tools'));
      return s.exists() ? s.data() : {};
    },
    setToolConfig: (data) => F.setDoc(F.doc(db, 'config', 'tools'), data),
    async listUsers() {
      const us = await F.getDocs(F.collection(db, 'users'));
      return us.docs.map(fromSnap);
    },
    updateUser: (uid, patch) => F.updateDoc(uref(uid), patch),
    deleteUser: (uid) => F.deleteDoc(uref(uid)),
  };
}

// Local test backend: same behaviour, data kept in this browser only. Never used on the public site.
function localBackend() {
  const DB = 'lg.localAccounts';
  const SESSION = 'lg.localSession';
  const empty = () => ({ users: {}, config: {} });
  const load = () => { try { return JSON.parse(localStorage.getItem(DB)) || empty(); } catch { return empty(); } };
  const save = (d) => localStorage.setItem(DB, JSON.stringify(d));
  const wait = () => new Promise((r) => setTimeout(r, 200));
  const hash = (s) => sha256hex('lg:' + s);
  const ownerUid = (d) => d.config.owner?.uid || null;
  const prof = (d, uid) => {
    const u = d.users[uid];
    if (!u) return null;
    const own = ownerUid(d) ? uid === ownerUid(d) : u.login === ownerEmail();
    return withRole({ uid, login: u.login, username: u.username, name: u.name, track: u.track, role: u.role, features: u.features, blocked: !!u.blocked, createdAt: u.createdAt, lastSeen: u.lastSeen, progress: u.progress || {} }, own);
  };
  const patchUser = (uid, patch) => { const d = load(); if (d.users[uid]) Object.assign(d.users[uid], patch); save(d); };
  const me = () => { const uid = localStorage.getItem(SESSION); return (uid && prof(load(), uid)) || null; };
  // Same limits as firestore.rules.
  const guard = () => { const p = me(); if (!p || !p.isAdmin) throw new AuthError('denied'); return p; };
  const guardStaff = () => { const p = me(); if (!p || !(p.isAdmin || (p.isTeacher && !p.blocked))) throw new AuthError('denied'); return p; };
  const enter = (d, uid) => {
    if (!ownerUid(d) && d.users[uid].login === ownerEmail()) { d.config.owner = { uid }; save(d); }
    localStorage.setItem(SESSION, uid);
    return prof(load(), uid);
  };

  return {
    ownerClaimed: () => !!ownerUid(load()),
    async start(cb) {
      const uid = localStorage.getItem(SESSION);
      await cb(uid ? prof(load(), uid) || { uid, missing: true } : null);
    },
    async signIn(email, pw) {
      await wait();
      const d = load();
      const hit = Object.entries(d.users).find(([, u]) => u.login === email);
      if (!hit || hit[1].pw !== await hash(pw)) throw new AuthError('wrong-login');
      return enter(d, hit[0]);
    },
    async signUp(email, username, pw, name, track, role) {
      await wait();
      const d = load();
      if (Object.values(d.users).some((u) => u.login === email)) throw new AuthError('username-taken');
      const own = role === 'admin';
      if (track === STAFF ? !own && d.config.signupOpen?.staff !== true : d.config.signupOpen?.[track] === false) throw new AuthError('signup-closed');
      const uid = 'local-' + Math.random().toString(36).slice(2, 10);
      d.users[uid] = { login: email, username, name, track, role, pw: await hash(pw), blocked: false, createdAt: Date.now(), lastSeen: Date.now(), progress: {} };
      save(d);
      return enter(d, uid);
    },
    async signOut() { localStorage.removeItem(SESSION); },
    async changePassword(oldPw, newPw) {
      await wait();
      const uid = localStorage.getItem(SESSION);
      const d = load();
      if (!d.users[uid] || d.users[uid].pw !== await hash(oldPw)) throw new AuthError('wrong-login');
      d.users[uid].pw = await hash(newPw);
      save(d);
    },
    async sendReset() { await wait(); /* no mail in local test mode */ },
    async setRecoveryEmail(email, pw) {
      await wait();
      const uid = localStorage.getItem(SESSION);
      const d = load();
      if (!d.users[uid] || d.users[uid].pw !== await hash(pw)) throw new AuthError('old-password');
      if (Object.values(d.users).some((u) => u.login === email)) throw new AuthError('email-taken');
      d.users[uid].login = email; // local mode: confirmed at once
      save(d);
    },
    async saveProgress(uid, all) { patchUser(uid, { progress: all, lastSeen: Date.now() }); },
    async touch(uid) { patchUser(uid, { lastSeen: Date.now() }); },
    async setName(uid, name) { patchUser(uid, { name }); },
    async getConfig() { return load().config; },
    async setSignupOpen(track, open) { guard(); const d = load(); d.config.signupOpen = { ...(d.config.signupOpen || {}), [track]: open }; save(d); },
    async getToolConfig() { return load().config.tools || {}; },
    async setToolConfig(data) { guard(); const d = load(); d.config.tools = data; save(d); },
    async listUsers() { guardStaff(); await wait(); const d = load(); return Object.keys(d.users).map((uid) => prof(d, uid)); },
    async updateUser(uid, patch) {
      const p = guardStaff();
      const target = prof(load(), uid);
      if (!p.isAdmin) {
        const ok = target && TIERS.includes(target.role)
          && Object.keys(patch).every((k) => k === 'track' || k === 'blocked')
          && (patch.track === undefined || TRACKS.includes(patch.track));
        if (!ok) throw new AuthError('denied');
      }
      if (!p.isOwner && (target?.role === 'admin' || patch.role === 'admin')) throw new AuthError('denied');
      patchUser(uid, patch);
    },
    async deleteUser(uid) {
      const p = guard();
      if (!p.isOwner && prof(load(), uid)?.role === 'admin') throw new AuthError('denied');
      const d = load(); delete d.users[uid]; save(d);
    },
  };
}

const booted = (async () => {
  if (mode === 'off') { emit(null); return; }
  try {
    backend = mode === 'firebase' ? await firebaseBackend() : localBackend();
    await backend.start(handleProfile);
  } catch (e) {
    console.warn('[accounts] unavailable', e);
    backend = null;
    if (!known) emit(null);
  }
})();

async function need() {
  await booted;
  if (!backend) throw new AuthError(mode === 'off' ? 'not-configured' : 'unavailable');
  return backend;
}

export const accountsAvailable = async () => { await booted; return !!backend; };

// ---------------------------------------------------------------- student actions

export async function getSignupOpen() {
  const b = await need();
  let cfg = {};
  try { cfg = (await b.getConfig()) || {}; } catch (e) { console.warn('[accounts]', e); }
  const open = cfg.signupOpen || {};
  // Student tracks are open unless closed; the staff link is closed unless the admin opens it.
  return { ...Object.fromEntries(TRACKS.map((t) => [t, open[t] !== false])), [STAFF]: open[STAFF] === true };
}

// Proof-tool settings per track, set on the admin page (config/tools). Anyone may read them.
export async function getToolConfig() {
  try {
    const b = await need();
    return (await b.getToolConfig()) || {};
  } catch (e) {
    if (!(e instanceof AuthError)) console.warn('[accounts] tool settings unavailable', e);
    return {};
  }
}

export async function signUp({ username, password, name, track }) {
  const uname = normUsername(username);
  name = String(name || '').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 60) throw new AuthError('bad-name');
  if (!uname || uname.length > MAX_USERNAME) throw new AuthError('bad-username');
  if (String(password || '').length < MIN_PASSWORD) throw new AuthError('weak-password');
  if (track !== STAFF && !TRACKS.includes(track)) throw new AuthError('bad-track');
  const b = await need();
  const asOwner = !!OWNER && uname === OWNER;
  if (asOwner && b.ownerClaimed()) throw new AuthError('username-taken');
  if (asOwner && track !== STAFF) throw new AuthError('owner-staff');
  if (!asOwner && !(await getSignupOpen())[track]) throw new AuthError(track === STAFF ? 'staff-closed' : 'signup-closed');
  const email = await loginEmail(uname);
  let p;
  try { p = await b.signUp(email, uname, password, name, track, asOwner ? 'admin' : 'student'); } catch (e) {
    const err = toAuthError(e);
    // A Firestore refusal here means the page and firestore.rules disagree: say so instead of hiding it.
    throw err.code === 'denied' ? new AuthError('rules-denied') : err;
  }
  await handleProfile(p);
  if (!user) throw new AuthError(takeNotice() || 'unknown');
  return user;
}

// Log in with a username or with the e-mail address the account uses.
export async function signIn(username, password) {
  const uname = normUsername(username);
  if (!uname || !password) throw new AuthError('wrong-login');
  const b = await need();
  let p;
  try { p = await b.signIn(await loginEmail(uname), password); } catch (e) { throw toAuthError(e); }
  await handleProfile(p);
  if (!user) throw new AuthError(takeNotice() || 'wrong-login');
  return user;
}

export async function signOut() {
  const b = await need();
  await flushProgress();
  await b.signOut();
  clearLocal();
  emit(null);
}

export async function changePassword(oldPw, newPw) {
  if (String(newPw || '').length < MIN_PASSWORD) throw new AuthError('weak-password');
  const b = await need();
  try { await b.changePassword(oldPw, newPw); } catch (e) { throw toAuthError(e); }
}

// "Forgot password": Firebase mails a reset link if an account uses this address.
// It does not say whether one does, so the page always shows the same message.
export async function sendPasswordReset(email) {
  email = String(email || '').trim().toLowerCase();
  if (!isEmail(email) || email.endsWith('@' + LOGIN_DOMAIN)) throw new AuthError('bad-email');
  const b = await need();
  try { await b.sendReset(email); } catch (e) {
    const err = toAuthError(e);
    if (err.code !== 'wrong-login') throw err;
  }
}

// Admins only: a separate recovery e-mail. Firebase mails a confirmation link; once confirmed,
// the admin logs in with that address and reset links go there.
export async function setRecoveryEmail(email, currentPassword) {
  email = String(email || '').trim().toLowerCase();
  if (!isEmail(email) || email.endsWith('@' + LOGIN_DOMAIN)) throw new AuthError('bad-email');
  const b = await need();
  if (!isAdmin()) throw new AuthError('denied');
  try { await b.setRecoveryEmail(email, currentPassword); } catch (e) { throw toAuthError(e); }
  if (mode === 'local') emit({ ...user, email });
}

export async function setMyName(name) {
  name = String(name || '').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 60) throw new AuthError('bad-name');
  const b = await need();
  if (!user) throw new AuthError('signed-out');
  try { await b.setName(user.uid, name); } catch (e) { throw toAuthError(e); }
  emit({ ...user, name });
}

// ---------------------------------------------------------------- admin actions (firestore.rules enforce these too)

async function needAdmin() {
  const b = await need();
  if (!isAdmin()) throw new AuthError('denied');
  return b;
}
async function needStaff() {
  const b = await need();
  if (!isStaff()) throw new AuthError('denied');
  return b;
}
const call = async (fn) => { try { return await fn(); } catch (e) { throw toAuthError(e); } };

// Admin: everything. Teacher: list students, change a student's track, block or unblock a student.
// Only the owner touches other admins (including giving or taking away the admin role).
export const admin = {
  listUsers: async () => { const b = await needStaff(); return call(() => b.listUsers()); },
  setTrack: async (uid, track) => { const b = await needStaff(); return call(() => b.updateUser(uid, { track })); },
  setBlocked: async (uid, blocked) => { const b = await needStaff(); return call(() => b.updateUser(uid, { blocked })); },
  setRole: async (uid, role) => {
    const b = await needAdmin();
    if (!ROLES.includes(role)) throw new AuthError('bad-role');
    return call(() => b.updateUser(uid, { role }));
  },
  // Per-user feature flags, e.g. ['clickFacts'] (read by tools.js from currentUser().features).
  setFeatures: async (uid, features) => {
    const b = await needAdmin();
    const list = [...new Set((features || []).filter((f) => typeof f === 'string' && f))];
    return call(() => b.updateUser(uid, { features: list }));
  },
  remove: async (uid) => { const b = await needAdmin(); return call(() => b.deleteUser(uid)); },
  setSignupOpen: async (track, open) => { const b = await needAdmin(); return call(() => b.setSignupOpen(track, open)); },
  setToolConfig: async (data) => { const b = await needAdmin(); return call(() => b.setToolConfig(data)); },
};
