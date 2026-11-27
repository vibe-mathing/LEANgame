// LEANgame accounts: username + password, one study track per student, roles, and admin tools.
//
// Backend: Firebase Auth + Firestore (settings in firebase-config.js, rules in firebase/firestore.rules).
//
// Logging in: with the username and password, or with the e-mail and password.
// "Forgot password": the student types their e-mail and Firebase mails a reset link. The e-mail is private:
// only the student and the site staff see it.
//
// How it works without a server:
//   - Usernames are free text (any language, spaces allowed, up to 64 characters). Each one is claimed once
//     in usernames/{hash(username)}, which holds only the uid.
//   - Firebase Auth knows every account by an address. Without an e-mail it is a made-up address derived
//     from the username (loginEmail()), which never gets mail. With an e-mail, the address is the e-mail.
//   - To log in with the username of an account that has an e-mail, the page looks up logins/{key}, where
//     key = PBKDF2(username + password). Only someone who knows the password can find that document, so the
//     e-mail stays private. The document is rewritten after each password login and password change, so after
//     a reset one login with the e-mail and the new password brings username login back.
//   - The owner is the account that signed up as OWNER_USERNAME first; its uid is pinned in config/owner.
//
// Without a Firebase config the public site simply has no accounts. On localhost a local test backend
// (accounts kept in this browser's localStorage) stands in; "?localaccounts" forces it even with Firebase.
//
// Public API (other modules may rely on it):
//   currentUser() → null | { uid, username, email, name, track, role, tier, features, blocked,
//                            isAdmin, isOwner, isTeacher, isStaff }
//                   role: 'student' | 'student_plus' | 'student_premium' | 'teacher' | 'admin'
//                   tier: the role when it is a student tier, else null
//                   email: the account's real e-mail, or null
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
const forceLocal = onLocalhost && new URLSearchParams(location.search).has('localaccounts');
export const mode = FIREBASE_CONFIG && !forceLocal ? 'firebase' : onLocalhost ? 'local' : 'off';

export class AuthError extends Error {
  constructor(code) { super(code); this.code = code; }
}

// ---------------------------------------------------------------- usernames, addresses and keys

export const normUsername = (u) => String(u || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
const normEmail = (e) => String(e || '').trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = (s) => EMAIL_RE.test(String(s || '').trim());
const SAFE_LOCAL = /^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/;
const OWNER = normUsername(OWNER_USERNAME) || (mode === 'local' ? 'admin' : '');
export const ownerUsername = () => OWNER;
const ownerEmail = () => (OWNER ? `${OWNER}@${LOGIN_DOMAIN}` : '');
const realEmail = (addr) => (addr && !String(addr).endsWith('@' + LOGIN_DOMAIN) ? addr : null);
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');

async function sha256hex(s) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}
// usernames/{id}: must match uhash() in firestore.rules.
const usernameId = (username) => sha256hex('leangame-username:' + normUsername(username));

// The made-up Auth address of an account without an e-mail.
export async function loginEmail(username) {
  const u = normUsername(username);
  if (isEmail(u)) return u;
  if (SAFE_LOCAL.test(u) && u.length <= 64 && !u.startsWith('u-')) return `${u}@${LOGIN_DOMAIN}`;
  return `u-${(await usernameId(u)).slice(0, 40)}@${LOGIN_DOMAIN}`;
}

// logins/{key}: only someone who knows both the username and the password can compute it.
async function loginKey(username, password) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(normUsername(username) + '\u0000' + password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('leangame-login-v1'), iterations: 120000 }, base, 256);
  return hex(bits);
}

// ---------------------------------------------------------------- state

let user = null;
let raw = null; // the signed-in profile as loaded (includes loginKey)
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
  raw = p;
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

// After a password login or a password change by an account with an e-mail, point logins/{key}
// for (username, password) at the account's e-mail, and drop the key of the previous password.
async function refreshLoginKey(password) {
  const p = raw;
  if (!p || !backend || !realEmail(p.login) || !p.username || p.username === p.login) return;
  try {
    const key = await loginKey(p.username, password);
    const doc = await backend.getLogin(key);
    if (!doc || doc.email !== p.login) {
      if (doc && doc.uid !== p.uid) return; // someone else's key (practically impossible): leave it alone
      if (doc) await backend.deleteLogin(key);
      await backend.putLogin(key, p.uid, p.login);
    }
    if (p.loginKey && p.loginKey !== key) await backend.deleteLogin(p.loginKey).catch(() => {});
    if (p.loginKey !== key) { await backend.setLoginKey(p.uid, key); p.loginKey = key; }
  } catch (e) {
    console.warn('[accounts] could not refresh username login', e);
  }
}

// ---------------------------------------------------------------- errors

const FIREBASE_ERRORS = {
  'auth/email-already-in-use': 'email-taken',
  'auth/invalid-credential': 'wrong-login',
  'auth/invalid-login-credentials': 'wrong-login',
  'auth/wrong-password': 'wrong-login',
  'auth/user-not-found': 'wrong-login',
  'auth/invalid-email': 'bad-email',
  'auth/invalid-new-email': 'bad-email',
  'auth/missing-email': 'bad-email',
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
// Both backends offer the same calls. signUp: create the Auth user, claim the username, create the profile,
// undoing the earlier steps if a later one fails.

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
  const nref = (id) => F.doc(db, 'usernames', id);
  const lref = (key) => F.doc(db, 'logins', key);
  const ownerRef = F.doc(db, 'config', 'owner');
  const ms = (ts) => (ts && ts.toMillis ? ts.toMillis() : null);
  const parse = (s) => { try { return JSON.parse(s || '{}') || {}; } catch { return {}; } };

  // The owner's uid, once the owner has logged in with this code (config/owner). Until then the owner is whoever holds ownerEmail().
  let ownerUid = null;
  try { const s = await F.getDoc(ownerRef); ownerUid = s.exists() ? s.data().uid : null; } catch (e) { console.warn('[accounts]', e); }
  const isOwner = (uid, login) => (ownerUid ? uid === ownerUid : !!ownerEmail() && login === ownerEmail());
  const fullLogin = (login) => (String(login || '').includes('@') ? login : `${login}@${LOGIN_DOMAIN}`);

  const fromSnap = (snap) => {
    const x = snap.data();
    const login = fullLogin(x.login);
    return withRole({
      uid: snap.id, login, username: x.username, name: x.name, track: x.track, role: x.role, features: x.features,
      loginKey: x.loginKey || null, blocked: !!x.blocked, createdAt: ms(x.createdAt), lastSeen: ms(x.lastSeen),
      progress: parse(x.progress),
    }, isOwner(snap.id, login));
  };

  async function load(fu) {
    if (!fu) return null;
    const snap = await F.getDoc(uref(fu.uid));
    if (!snap.exists()) return { uid: fu.uid, login: fu.email, missing: true };
    const x = snap.data();
    // The owner pins their uid the first time they log in.
    if (!ownerUid && ownerEmail() && fu.email === ownerEmail()) {
      try { await F.setDoc(ownerRef, { uid: fu.uid }); ownerUid = fu.uid; } catch (e) { console.warn('[accounts] could not pin owner', e); }
    }
    const patch = {};
    // After a confirmed e-mail change, keep the profile's login address in step.
    if (fu.email && x.login !== fu.email) patch.login = fu.email;
    // Profiles from before usernames were claimed: claim the username now.
    if (!x.username) {
      const uname = normUsername(String(x.login || '').split('@')[0]);
      try {
        const id = await usernameId(uname);
        const s = await F.getDoc(nref(id));
        if (!s.exists()) await F.setDoc(nref(id), { uid: fu.uid, username: uname });
        if (!s.exists() || s.data().uid === fu.uid) patch.username = uname;
      } catch (e) { console.warn('[accounts] could not claim username', e); }
    }
    if (Object.keys(patch).length) {
      try { await F.updateDoc(uref(fu.uid), patch); } catch (e) { console.warn('[accounts]', e); }
    }
    const p = fromSnap(snap);
    return { ...p, ...patch, login: fu.email || p.login };
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
    async usernameTaken(username) {
      return (await F.getDoc(nref(await usernameId(username)))).exists();
    },
    async signIn(email, pw) {
      busy = true;
      try {
        const c = await A.signInWithEmailAndPassword(auth, email, pw);
        handled = c.user.uid;
        return await load(c.user);
      } finally { busy = false; }
    },
    async signUp(email, username, pw, profile) {
      busy = true;
      try {
        const c = await A.createUserWithEmailAndPassword(auth, email, pw);
        const uid = c.user.uid;
        const id = await usernameId(username);
        try {
          await F.setDoc(nref(id), { uid, username });
        } catch (e) {
          // Refused: either someone took the username a moment ago, or the page and the rules disagree.
          let taken = false;
          if (e && e.code === 'permission-denied') { try { taken = (await F.getDoc(nref(id))).exists(); } catch { /* ignore */ } }
          await c.user.delete().catch(() => {});
          throw taken ? new AuthError('username-taken') : e;
        }
        try {
          await F.setDoc(uref(uid), { ...profile, login: email, username, createdAt: F.serverTimestamp(), lastSeen: F.serverTimestamp() });
        } catch (e) {
          await F.deleteDoc(nref(id)).catch(() => {});
          await c.user.delete().catch(() => {});
          throw e;
        }
        handled = uid;
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
    async setEmail(email, pw) {
      const u = auth.currentUser;
      if (!u) throw new AuthError('signed-out');
      try {
        await A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, pw));
      } catch (e) {
        throw ['auth/network-request-failed', 'auth/too-many-requests'].includes(e && e.code) ? e : new AuthError('old-password');
      }
      await A.verifyBeforeUpdateEmail(u, email, backHome());
      return false; // not changed yet: waits for the confirmation link
    },
    async getLogin(key) {
      const s = await F.getDoc(lref(key));
      return s.exists() ? s.data() : null;
    },
    putLogin: (key, uid, email) => F.setDoc(lref(key), { uid, email }),
    deleteLogin: (key) => F.deleteDoc(lref(key)),
    setLoginKey: (uid, key) => F.updateDoc(uref(uid), { loginKey: key }),
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

// Local test backend: same behaviour and the same limits as firestore.rules, data kept in this browser only.
function localBackend() {
  const DB = 'lg.localAccounts';
  const SESSION = 'lg.localSession';
  const empty = () => ({ users: {}, usernames: {}, logins: {}, config: {} });
  const load = () => { try { return { ...empty(), ...JSON.parse(localStorage.getItem(DB)) }; } catch { return empty(); } };
  const save = (d) => localStorage.setItem(DB, JSON.stringify(d));
  const wait = () => new Promise((r) => setTimeout(r, 150));
  const hash = (s) => sha256hex('lg:' + s);
  const ownerUid = (d) => d.config.owner?.uid || null;
  const prof = (d, uid) => {
    const u = d.users[uid];
    if (!u) return null;
    const own = ownerUid(d) ? uid === ownerUid(d) : u.login === ownerEmail();
    return withRole({ uid, login: u.login, username: u.username, name: u.name, track: u.track, role: u.role, features: u.features, loginKey: u.loginKey || null, blocked: !!u.blocked, createdAt: u.createdAt, lastSeen: u.lastSeen, progress: u.progress || {} }, own);
  };
  const patchUser = (uid, patch) => { const d = load(); if (d.users[uid]) Object.assign(d.users[uid], patch); save(d); };
  const meUid = () => localStorage.getItem(SESSION);
  const me = () => { const uid = meUid(); return (uid && prof(load(), uid)) || null; };
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
      const uid = meUid();
      await cb(uid ? prof(load(), uid) || { uid, missing: true } : null);
    },
    async usernameTaken(username) { return !!load().usernames[await usernameId(username)]; },
    async signIn(email, pw) {
      await wait();
      const d = load();
      const hit = Object.entries(d.users).find(([, u]) => u.login === email);
      if (!hit || hit[1].pw !== await hash(pw)) throw new AuthError('wrong-login');
      return enter(d, hit[0]);
    },
    async signUp(email, username, pw, profile) {
      await wait();
      const d = load();
      if (Object.values(d.users).some((u) => u.login === email)) throw new AuthError('email-taken');
      const id = await usernameId(username);
      if (d.usernames[id]) throw new AuthError('username-taken');
      const own = profile.role === 'admin';
      const t = profile.track;
      if (t === STAFF ? !own && d.config.signupOpen?.staff !== true : d.config.signupOpen?.[t] === false) throw new AuthError('rules-denied');
      const uid = 'local-' + Math.random().toString(36).slice(2, 10);
      d.usernames[id] = { uid, username };
      d.users[uid] = { ...profile, progress: {}, login: email, username, pw: await hash(pw), createdAt: Date.now(), lastSeen: Date.now() };
      save(d);
      return enter(d, uid);
    },
    async signOut() { localStorage.removeItem(SESSION); },
    async changePassword(oldPw, newPw) {
      await wait();
      const d = load();
      const u = d.users[meUid()];
      if (!u || u.pw !== await hash(oldPw)) throw new AuthError('wrong-login');
      u.pw = await hash(newPw);
      save(d);
    },
    async sendReset() { await wait(); /* no mail in local test mode */ },
    async setEmail(email, pw) {
      await wait();
      const d = load();
      const u = d.users[meUid()];
      if (!u || u.pw !== await hash(pw)) throw new AuthError('old-password');
      if (Object.values(d.users).some((x) => x.login === email)) throw new AuthError('email-taken');
      u.login = email; // local mode: confirmed at once
      save(d);
      return true;
    },
    async getLogin(key) { return load().logins[key] || null; },
    async putLogin(key, uid, email) {
      const d = load();
      if (d.logins[key] || uid !== meUid() || d.users[uid]?.login !== email) throw new AuthError('denied');
      d.logins[key] = { uid, email }; save(d);
    },
    async deleteLogin(key) {
      const d = load();
      if (d.logins[key] && d.logins[key].uid !== meUid()) throw new AuthError('denied');
      delete d.logins[key]; save(d);
    },
    async setLoginKey(uid, key) { patchUser(uid, { loginKey: key }); },
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

// email is optional. When given, the account logs in with it too and "forgot password" works for it.
export async function signUp({ username, email, password, name, track }) {
  const uname = normUsername(username);
  name = String(name || '').trim().replace(/\s+/g, ' ');
  email = normEmail(email);
  if (!email && isEmail(uname)) email = uname; // an e-mail typed as the username
  if (!name || name.length > 60) throw new AuthError('bad-name');
  if (!uname || uname.length > MAX_USERNAME) throw new AuthError('bad-username');
  if (email && (!isEmail(email) || email.endsWith('@' + LOGIN_DOMAIN))) throw new AuthError('bad-email');
  if (String(password || '').length < MIN_PASSWORD) throw new AuthError('weak-password');
  if (track !== STAFF && !TRACKS.includes(track)) throw new AuthError('bad-track');
  const b = await need();
  const asOwner = !!OWNER && uname === OWNER;
  if (asOwner && b.ownerClaimed()) throw new AuthError('username-taken');
  if (asOwner && track !== STAFF) throw new AuthError('owner-staff');
  if (asOwner && email) throw new AuthError('owner-email-later');
  if (!asOwner && !(await getSignupOpen())[track]) throw new AuthError(track === STAFF ? 'staff-closed' : 'signup-closed');
  try { if (await b.usernameTaken(uname)) throw new AuthError('username-taken'); } catch (e) { if (e instanceof AuthError) throw e; }
  const addr = email || await loginEmail(uname);
  const profile = { name, track, role: asOwner ? 'admin' : 'student', blocked: false, progress: '{}' };
  let p;
  try { p = await b.signUp(addr, uname, password, profile); } catch (e) {
    const err = toAuthError(e);
    if (err.code === 'email-taken' && !email) throw new AuthError('username-taken');
    // A Firestore refusal here means the page and firestore.rules disagree: say so instead of hiding it.
    throw err.code === 'denied' ? new AuthError('rules-denied') : err;
  }
  await handleProfile(p);
  if (!user) throw new AuthError(takeNotice() || 'unknown');
  await refreshLoginKey(password);
  return user;
}

// Log in with the username or the e-mail.
export async function signIn(id, password) {
  const b = await need();
  if (!String(id || '').trim() || !password) throw new AuthError('wrong-login');
  let p;
  try {
    if (isEmail(id)) {
      p = await b.signIn(normEmail(id), password);
    } else {
      const uname = normUsername(id);
      try {
        p = await b.signIn(await loginEmail(uname), password); // accounts without an e-mail
      } catch (e) {
        if (toAuthError(e).code !== 'wrong-login') throw e;
        const doc = await b.getLogin(await loginKey(uname, password)); // accounts with an e-mail
        if (!doc) throw new AuthError('wrong-login');
        p = await b.signIn(doc.email, password);
      }
    }
  } catch (e) { throw toAuthError(e); }
  await handleProfile(p);
  if (!user) throw new AuthError(takeNotice() || 'wrong-login');
  await refreshLoginKey(password);
  return user;
}

export async function signOut() {
  const b = await need();
  await flushProgress();
  await b.signOut();
  clearLocal();
  raw = null;
  emit(null);
}

export async function changePassword(oldPw, newPw) {
  if (String(newPw || '').length < MIN_PASSWORD) throw new AuthError('weak-password');
  const b = await need();
  try { await b.changePassword(oldPw, newPw); } catch (e) { throw toAuthError(e); }
  await refreshLoginKey(newPw);
}

// "Forgot password": Firebase mails a reset link if an account uses this address.
// It does not say whether one does, so the page always shows the same message.
export async function sendPasswordReset(email) {
  email = normEmail(email);
  if (!isEmail(email) || email.endsWith('@' + LOGIN_DOMAIN)) throw new AuthError('bad-email');
  const b = await need();
  try { await b.sendReset(email); } catch (e) {
    const err = toAuthError(e);
    if (err.code !== 'wrong-login') throw err;
  }
}

// Add or change the account's e-mail. Firebase mails a confirmation link; once confirmed, the account
// logs in with that e-mail (and, after one login with it, with the username again) and reset links go there.
// Returns true when the change is already in effect (local test mode).
export async function setEmail(email, currentPassword) {
  email = normEmail(email);
  if (!isEmail(email) || email.endsWith('@' + LOGIN_DOMAIN)) throw new AuthError('bad-email');
  const b = await need();
  if (!user) throw new AuthError('signed-out');
  let done;
  try { done = await b.setEmail(email, currentPassword); } catch (e) { throw toAuthError(e); }
  if (done) {
    raw = { ...raw, login: email };
    emit({ ...user, email });
  }
  return done;
}
export const setRecoveryEmail = setEmail; // older name

export async function setMyName(name) {
  name = String(name || '').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 60) throw new AuthError('bad-name');
  const b = await need();
  if (!user) throw new AuthError('signed-out');
  try { await b.setName(user.uid, name); } catch (e) { throw toAuthError(e); }
  raw = { ...raw, name };
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
