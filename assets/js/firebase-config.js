// Firebase settings for LEANgame accounts.
//
// FIREBASE_CONFIG is the web-app config from the Firebase console:
//   Project settings → General → Your apps → Web app → "SDK setup and configuration" → Config.
// It is public by design. The data is protected by firebase/firestore.rules, not by this key.
// Never put a service-account key or any password in this file: the site is public.
//
// While FIREBASE_CONFIG is null, the public site has no accounts. On localhost a local
// test backend stands in, so the account pages can still be tried.
export const FIREBASE_CONFIG = null;

// The site owner's username. The owner is always an admin and is the only one who can
// appoint more admins. It must match OWNER_LOGIN in firebase/firestore.rules.
export const OWNER_USERNAME = '';
