// LEANgame for Android: the download strip on the home page and a footer link.
//
// The app (android-app/, next to this repo; not in it) is a WebView shell around this site, so new
// questions reach it without a new APK. Its user agent ends with "LEANgameApp/<versionCode>".
// Inside the app the strip and the link are hidden; the strip becomes an "update available" notice
// only when the installed app is older than APP_CODE. Nothing is fetched for that check.

import { getLang } from './i18n.js';

// Keep in step with VERSION_CODE / VERSION_NAME in android-app/build.sh.
export const APP_CODE = 1;
export const APP_VERSION = '1.0';
const APP_FILE = 'downloads/LEANgame.apk';

const ua = /\bLEANgameApp\/(\d+)/.exec(navigator.userAgent || '');
export const IN_APP = !!ua;
const installed = ua ? Number(ua[1]) : 0;

const S = {
  he: {
    aria: 'אפליקציית LEANgame לאנדרואיד',
    title: 'LEANgame לאנדרואיד',
    sub: 'אותו משחק, מהטלפון. נכנסים כאורח או נרשמים, ומתחברים עם אותו חשבון כמו באתר.',
    btn: 'הורדת האפליקציה',
    meta: 'גרסה {v} · קובץ APK',
    how: 'איך מתקינים?',
    s1: 'בטלפון האנדרואיד, לוחצים על "הורדת האפליקציה".',
    s2: 'פותחים את הקובץ LEANgame.apk מההתראה או מתיקיית ההורדות.',
    s3: 'אם הטלפון שואל, מאשרים התקנה מהדפדפן הזה (״התקנת אפליקציות לא מוכרות״). אם Play Protect מזהיר, בוחרים ״פרטים נוספים״ ואז ״להתקין בכל זאת״.',
    s4: 'פותחים את LEANgame ובוחרים: כניסה כאורח, הרשמה או התחברות.',
    foot: 'אפליקציה לאנדרואיד',
    upd: 'יש גרסה חדשה של האפליקציה ({v}).',
    updBtn: 'עדכון',
  },
  en: {
    aria: 'LEANgame app for Android',
    title: 'LEANgame for Android',
    sub: 'The same game, on your phone. Continue as a guest or sign up, and log in with the same account as on the site.',
    btn: 'Download the app',
    meta: 'Version {v} · APK file',
    how: 'How to install',
    s1: 'On your Android phone, tap “Download the app”.',
    s2: 'Open LEANgame.apk from the notification or your Downloads folder.',
    s3: 'If the phone asks, allow installs from this browser (“Install unknown apps”). If Play Protect warns, choose “More details”, then “Install anyway”.',
    s4: 'Open LEANgame and choose: continue as a guest, sign up, or log in.',
    foot: 'Android app',
    upd: 'A new version of the app is available ({v}).',
    updBtn: 'Update',
  },
};

function tt(key, vars) {
  let s = S[getLang()]?.[key] ?? S.he[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}

const svg = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
const PHONE = svg('<rect x="6.5" y="2.5" width="11" height="19" rx="2.6"/><path d="M10.6 18.4h2.8"/>');
const DOWN = `<span class="ic">${svg('<path d="M12 4v10.5M7.2 10l4.8 4.8 4.8-4.8M5 19.5h14"/>')}</span>`;

// Home page, right after the hero.
export function appStrip() {
  if (IN_APP) {
    if (installed >= APP_CODE) return '';
    return `<div class="wrap"><div class="app-update paper" role="status">
      <span>${tt('upd', { v: APP_VERSION })}</span>
      <a class="btn btn-primary btn-small" href="${APP_FILE}" download="LEANgame.apk">${DOWN} ${tt('updBtn')}</a>
    </div></div>`;
  }
  return `<section class="app-strip-sec" id="getapp" aria-label="${tt('aria')}">
    <div class="wrap">
      <div class="app-strip paper">
        <span class="app-ic">${PHONE}</span>
        <div class="app-copy">
          <h2 class="app-title">${tt('title')}</h2>
          <p>${tt('sub')}</p>
        </div>
        <div class="app-get">
          <a class="btn btn-primary" href="${APP_FILE}" download="LEANgame.apk">${DOWN} ${tt('btn')}</a>
          <span class="app-meta">${tt('meta', { v: APP_VERSION })}</span>
        </div>
        <details class="app-how">
          <summary>${tt('how')}</summary>
          <ol>${['s1', 's2', 's3', 's4'].map((k) => `<li>${tt(k)}</li>`).join('')}</ol>
        </details>
      </div>
    </div>
  </section>`;
}

// Footer, in the "game" column. app.js scrolls to #getapp (via data-scroll).
export const appFootLink = () => (IN_APP ? '' : `<a href="#/" data-scroll="getapp">${tt('foot')}</a>`);
