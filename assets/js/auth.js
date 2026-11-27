// LEANgame accounts: username + password, one study track per student, and admin tools.
//
// Backend: Firebase Auth + Firestore (settings in firebase-config.js, rules in firebase/firestore.rules).
// A username is stored in Firebase Auth as "<username>@leangame.example". That address never gets mail,
// so there is no password recovery by e-mail.
// Without a Firebase config the public site simply has no accounts. On localhost a local test backend
// (accounts kept in this browser's localStorage) stands in, so the pages can be tried before Firebase is set up.
//
// Public API (other modules may rely on it):
//   currentUser() → null | { uid, username, name, track, blocked, isAdmin, isOwner }
//   isAdmin()     → boolean (false until the auth state is known)
//   onAuthChange(cb) → cb(user|null) on every change, and right away once the state is known; returns unsubscribe
//   authReady     → Promise, resolves once the first auth state is known
//   syncProgress(all) → called by app.js after it saves lg.progress

import { FIREBASE_CONFIG, OWNER_USERNAME } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
export const LOGIN_DOMAIN = 'leangame.example';
export const TRACKS = ['3', '4', '5', 'uni'];
export const STAFF = 'staff';
export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,19}$/;
export const MIN_PASSWORD = 6;

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
export const mode = FIREBASE_CONFIG ? 'firebase' : LOCAL_HOSTS.includes(location.hostname) ? 'local' : 'off';

export class AuthError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export const normUsername = (u) => String(u || '').trim().toLowerCase();

// ---------------------------------------------------------------- state

let user = null;
let known = false;
let notice = null; // why the last session ended: 'blocked' | 'removed'
const listeners = new Set();
let resolveReady;
export const authReady = new Promise((r) => { resolveReady = r; });

export const currentUser = () => user;
export const isAdmin = () => !!(user && user.isAdmin);
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

const publicUser = (p) => ({
  uid: p.uid, username: p.login, name: p.name, track: p.track,
  blocked: !!p.blocked, isAdmin: !!p.isAdmin, isOwner: !!p.isOwner,
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
  'auth/weak-password': 'weak-password',
  'auth/password-does-not-meet-requirements': 'weak-password',
  'auth/too-many-requests': 'too-many',
  'auth/network-request-failed': 'network',
  'auth/operation-not-allowed': 'not-enabled',
  'auth/requires-recent-login': 'reauth',
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
let bootError = null;

async function firebaseBackend() {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(SDK + 'firebase-app.js'),
    import(SDK + 'firebase-auth.js'),
    import(SDK + 'firebase-firestore.js'),
  ]);
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  const owner = normUsername(OWNER_USERNAME);
  const uref = (uid) => F.doc(db, 'users', uid);
  const email = (login) => `${login}@${LOGIN_DOMAIN}`;
  const loginOf = (em) => String(em || '').split('@')[0];
  const ms = (ts) => (ts && ts.toMillis ? ts.toMillis() : null);
  const parse = (s) => { try { return JSON.parse(s || '{}') || {}; } catch { return {}; } };
  const isOwnerLogin = (login) => !!owner && login === owner;

  const fromSnap = (snap, admins) => {
    const x = snap.data();
    return {
      uid: snap.id, login: x.login, name: x.name, track: x.track, blocked: !!x.blocked,
      createdAt: ms(x.createdAt), lastSeen: ms(x.lastSeen), progress: parse(x.progress),
      isOwner: isOwnerLogin(x.login), isAdmin: isOwnerLogin(x.login) || admins.has(snap.id),
    };
  };

  async function load(fu) {
    if (!fu) return null;
    const snap = await F.getDoc(uref(fu.uid));
    if (!snap.exists()) return { uid: fu.uid, login: loginOf(fu.email), missing: true };
    let admin = isOwnerLogin(loginOf(fu.email));
    if (!admin) { try { admin = (await F.getDoc(F.doc(db, 'admins', fu.uid))).exists(); } catch { admin = false; } }
    return fromSnap(snap, new Set(admin ? [fu.uid] : []));
  }

  let busy = false;
  let handled;
  return {
    owner,
    start(cb) {
      A.onAuthStateChanged(auth, async (fu) => {
        if (busy) return;
        const uid = fu ? fu.uid : null;
        if (uid === handled) return;
        handled = uid;
        try { await cb(await load(fu)); } catch (e) { console.warn('[accounts]', e); await cb(null); }
      });
    },
    async signIn(login, pw) {
      busy = true;
      try {
        const c = await A.signInWithEmailAndPassword(auth, email(login), pw);
        handled = c.user.uid;
        return await load(c.user);
      } finally { busy = false; }
    },
    async signUp(login, pw, name, track) {
      busy = true;
      try {
        const c = await A.createUserWithEmailAndPassword(auth, email(login), pw);
        try {
          await F.setDoc(uref(c.user.uid), {
            login, name, track, blocked: false, progress: '{}',
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
      const [us, ad] = await Promise.all([F.getDocs(F.collection(db, 'users')), F.getDocs(F.collection(db, 'admins'))]);
      const admins = new Set(ad.docs.map((d) => d.id));
      return us.docs.map((d) => fromSnap(d, admins));
    },
    updateUser: (uid, patch) => F.updateDoc(uref(uid), patch),
    async deleteUser(uid) {
      await F.deleteDoc(uref(uid));
      await F.deleteDoc(F.doc(db, 'admins', uid)).catch(() => {});
    },
    setAdmin: (uid, on) => (on
      ? F.setDoc(F.doc(db, 'admins', uid), { since: F.serverTimestamp() })
      : F.deleteDoc(F.doc(db, 'admins', uid))),
  };
}

// Local test backend: same behaviour, data kept in this browser only. Never used on the public site.
function localBackend() {
  const DB = 'lg.localAccounts';
  const SESSION = 'lg.localSession';
  const owner = normUsername(OWNER_USERNAME) || 'admin';
  const empty = () => ({ users: {}, admins: {}, config: {} });
  const load = () => { try { return JSON.parse(localStorage.getItem(DB)) || empty(); } catch { return empty(); } };
  const save = (d) => localStorage.setItem(DB, JSON.stringify(d));
  const wait = () => new Promise((r) => setTimeout(r, 200));
  const hash = async (s) => {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lg:' + s));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  };
  const prof = (d, uid) => {
    const u = d.users[uid];
    if (!u) return null;
    const own = u.login === owner;
    return { uid, login: u.login, name: u.name, track: u.track, blocked: !!u.blocked, createdAt: u.createdAt, lastSeen: u.lastSeen, progress: u.progress || {}, isOwner: own, isAdmin: own || !!d.admins[uid] };
  };
  const patchUser = (uid, patch) => { const d = load(); if (d.users[uid]) Object.assign(d.users[uid], patch); save(d); };
  const isAdminNow = () => { const uid = localStorage.getItem(SESSION); const p = uid && prof(load(), uid); return !!(p && p.isAdmin); };
  const guard = () => { if (!isAdminNow()) throw new AuthError('denied'); };

  return {
    owner,
    async start(cb) {
      const uid = localStorage.getItem(SESSION);
      await cb(uid ? prof(load(), uid) || { uid, missing: true } : null);
    },
    async signIn(login, pw) {
      await wait();
      const d = load();
      const hit = Object.entries(d.users).find(([, u]) => u.login === login);
      if (!hit || hit[1].pw !== await hash(pw)) throw new AuthError('wrong-login');
      localStorage.setItem(SESSION, hit[0]);
      return prof(d, hit[0]);
    },
    async signUp(login, pw, name, track) {
      await wait();
      const d = load();
      if (Object.values(d.users).some((u) => u.login === login)) throw new AuthError('username-taken');
      if (track === STAFF ? login !== owner : d.config.signupOpen?.[track] === false) throw new AuthError('signup-closed');
      const uid = 'local-' + Math.random().toString(36).slice(2, 10);
      d.users[uid] = { login, name, track, pw: await hash(pw), blocked: false, createdAt: Date.now(), lastSeen: Date.now(), progress: {} };
      save(d);
      localStorage.setItem(SESSION, uid);
      return prof(d, uid);
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
    async saveProgress(uid, all) { patchUser(uid, { progress: all, lastSeen: Date.now() }); },
    async touch(uid) { patchUser(uid, { lastSeen: Date.now() }); },
    async setName(uid, name) { patchUser(uid, { name }); },
    async getConfig() { return load().config; },
    async setSignupOpen(track, open) { guard(); const d = load(); d.config.signupOpen = { ...(d.config.signupOpen || {}), [track]: open }; save(d); },
    async getToolConfig() { return load().config.tools || {}; },
    async setToolConfig(data) { guard(); const d = load(); d.config.tools = data; save(d); },
    async listUsers() { guard(); await wait(); const d = load(); return Object.keys(d.users).map((uid) => prof(d, uid)); },
    async updateUser(uid, patch) { guard(); patchUser(uid, patch); },
    async deleteUser(uid) { guard(); const d = load(); delete d.users[uid]; delete d.admins[uid]; save(d); },
    async setAdmin(uid, on) {
      const me = prof(load(), localStorage.getItem(SESSION));
      if (!me || !me.isOwner) throw new AuthError('denied');
      const d = load();
      if (on) d.admins[uid] = { since: Date.now() }; else delete d.admins[uid];
      save(d);
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
    bootError = e;
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
export const ownerUsername = () => (backend ? backend.owner : normUsername(OWNER_USERNAME));

// ---------------------------------------------------------------- student actions

export async function getSignupOpen() {
  const b = await need();
  let cfg = {};
  try { cfg = (await b.getConfig()) || {}; } catch (e) { console.warn('[accounts]', e); }
  const open = cfg.signupOpen || {};
  return Object.fromEntries(TRACKS.map((t) => [t, open[t] !== false]));
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
  const login = normUsername(username);
  name = String(name || '').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 60) throw new AuthError('bad-name');
  if (!USERNAME_RE.test(login)) throw new AuthError('bad-username');
  if (String(password || '').length < MIN_PASSWORD) throw new AuthError('weak-password');
  if (track !== STAFF && !TRACKS.includes(track)) throw new AuthError('bad-track');
  const b = await need();
  if (track === STAFF) {
    if (!b.owner || login !== b.owner) throw new AuthError('not-owner');
  } else if (!(await getSignupOpen())[track]) {
    throw new AuthError('signup-closed');
  }
  let p;
  try { p = await b.signUp(login, password, name, track); } catch (e) {
    const err = toAuthError(e);
    throw err.code === 'denied' ? new AuthError('signup-closed') : err;
  }
  await handleProfile(p);
  if (!user) throw new AuthError(takeNotice() || 'unknown');
  return user;
}

export async function signIn(username, password) {
  const login = normUsername(username);
  if (!login || !password) throw new AuthError('wrong-login');
  const b = await need();
  let p;
  try { p = await b.signIn(login, password); } catch (e) { throw toAuthError(e); }
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
const call = async (fn) => { try { return await fn(); } catch (e) { throw toAuthError(e); } };

export const admin = {
  listUsers: async () => { const b = await needAdmin(); return call(() => b.listUsers()); },
  setTrack: async (uid, track) => { const b = await needAdmin(); return call(() => b.updateUser(uid, { track })); },
  setBlocked: async (uid, blocked) => { const b = await needAdmin(); return call(() => b.updateUser(uid, { blocked })); },
  remove: async (uid) => { const b = await needAdmin(); return call(() => b.deleteUser(uid)); },
  setSignupOpen: async (track, open) => { const b = await needAdmin(); return call(() => b.setSignupOpen(track, open)); },
  setToolConfig: async (data) => { const b = await needAdmin(); return call(() => b.setToolConfig(data)); },
  setAdmin: async (uid, on) => {
    const b = await needAdmin();
    if (!user.isOwner) throw new AuthError('denied');
    return call(() => b.setAdmin(uid, on));
  },
};
