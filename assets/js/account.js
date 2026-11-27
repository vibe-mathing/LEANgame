// LEANgame accounts UI: the topbar slot and the pages
//   #/login            log in
//   #/join             choose a track
//   #/join/<track>     sign up to a track: 3, 4, 5 or uni (the links the teacher hands out)
//   #/join/staff       staff sign-up (closed unless the admin opens it); the owner always signs up here
//   #/account          my account: progress, name, password, log out
//   #/admin            admin and teachers: sign-up links, students, progress, roles, block/delete
// Strings live here, not in i18n.js, so this module stays self-contained.

import { getLang, esc, L } from './i18n.js';
import { STAGES, problemList, stageNumber } from './data.js';
import * as auth from './auth.js';

// ---------------------------------------------------------------- strings

const S = {
  he: {
    'title.login': 'כניסה',
    'title.join': 'הרשמה',
    'title.me': 'החשבון שלי',
    'title.admin': 'ניהול',

    'track.3': '3 יח"ל',
    'track.4': '4 יח"ל',
    'track.5': '5 יח"ל',
    'track.uni': 'אוניברסיטה',
    'track.staff': 'צוות',
    'trackLong.3': '3 יחידות לימוד',
    'trackLong.4': '4 יחידות לימוד',
    'trackLong.5': '5 יחידות לימוד',
    'trackLong.uni': 'אוניברסיטה',
    'trackLong.staff': 'צוות האתר',
    'trackSub.3': 'מתמטיקה בתיכון',
    'trackSub.4': 'מתמטיקה בתיכון',
    'trackSub.5': 'מתמטיקה בתיכון',
    'trackSub.uni': 'קורסים לתואר',

    'role.student': 'תלמיד',
    'role.student_plus': 'תלמיד+',
    'role.student_premium': 'תלמיד פרימיום',
    'role.teacher': 'מורה',
    'role.admin': 'מנהל',

    'f.username': 'שם משתמש',
    'f.login': 'שם משתמש או אימייל',
    'f.password': 'סיסמה',
    'f.password2': 'סיסמה שוב',
    'f.name': 'שם מלא',
    'f.usernameHint': 'כל שם שתרצו, בכל שפה.',
    'f.passwordHint': 'לפחות {n} תווים.',
    'f.email': 'אימייל (לא חובה)',
    'f.emailHint': 'לשחזור סיסמה, ואפשר גם להיכנס איתו. פרטי: רק אתם וצוות האתר רואים אותו.',
    'f.nameHint': 'כך המורה יזהה אתכם.',
    'f.show': 'הצגת הסיסמה',

    'slot.login': 'כניסה',
    'slot.me': 'החשבון שלי',
    'slot.admin': 'ניהול',

    'login.kicker': 'כניסה',
    'login.title': 'ברוכים השבים',
    'login.lead': 'נכנסים עם שם המשתמש (או האימייל) והסיסמה. ההתקדמות נשמרת בחשבון, ומחכה לכם בכל מחשב.',
    'login.submit': 'כניסה',
    'login.forgot': 'שכחתי סיסמה',
    'reset.title': 'איפוס סיסמה',
    'reset.lead': 'כתבו את האימייל של החשבון, ונשלח אליו קישור לבחירת סיסמה חדשה.',
    'reset.email': 'אימייל',
    'reset.submit': 'שליחת קישור',
    'reset.sent': 'אם יש חשבון עם האימייל הזה, שלחנו אליו קישור. בדקו גם בספאם. אחרי שתבחרו סיסמה חדשה, היכנסו פעם אחת עם האימייל, ומאז גם שם המשתמש יעבוד עם הסיסמה החדשה.',
    'reset.sentLocal': 'במצב בדיקה מקומי לא נשלח מייל.',
    'reset.noEmail': 'נרשמתם עם שם משתמש בלי אימייל? אי אפשר לשחזר את הסיסמה במייל. פנו למורה.',
    'reset.back': 'חזרה לכניסה',
    'login.noAccount': 'אין לכם חשבון? נרשמים בקישור שקיבלתם מהמורה, או',
    'login.choose': 'בוחרים מסלול כאן',

    'join.kicker': 'הרשמה',
    'join.title': 'פתיחת חשבון',
    'join.lead': 'החשבון שומר את ההתקדמות שלכם, והמורה יכול לעקוב אחריה.',
    'join.trackLabel': 'המסלול שלכם',
    'join.submit': 'פתיחת חשבון',
    'join.have': 'כבר יש לכם חשבון?',
    'join.keep': 'כתבו לעצמכם את שם המשתמש והסיסמה. אין שחזור סיסמה במייל.',
    'join.closedTitle': 'ההרשמה סגורה',
    'join.closed': 'ההרשמה למסלול {track} סגורה כרגע. פנו למורה.',
    'join.chooseTitle': 'באיזה מסלול אתם לומדים?',
    'join.chooseLead': 'בדרך כלל המורה שולח קישור ישיר למסלול. אם לא קיבלתם קישור, בחרו כאן.',
    'join.unknown': 'הקישור לא מוכר. בחרו את המסלול שלכם:',
    'join.staffTitle': 'הרשמת צוות',
    'join.staffLead': 'למורים ולצוות האתר. אחרי ההרשמה המנהל מגדיר לכם תפקיד, ועד אז החשבון הוא חשבון תלמיד רגיל.',
    'join.staffClosed': 'הקישור הזה לבעל האתר ולצוות. הרשמת הצוות סגורה כרגע, ולכן רק בעל האתר, עם שם המשתמש שהאתר הגדיר לו, יכול להירשם כאן עכשיו.',
    'join.staffLocal': 'במצב הבדיקה המקומי שם המשתמש של המנהל הוא {u}.',

    'hello': 'שלום, {name}',
    'already': 'אתם מחוברים בתור {user} ({track}).',
    'alreadyHint': 'כדי לפתוח חשבון אחר, צאו קודם מהחשבון הזה.',
    'play': 'להמשיך לשחק',
    'logout': 'יציאה',
    'toLogin': 'לכניסה',
    'needLogin': 'צריך להיכנס כדי לראות את הדף הזה.',

    'me.kicker': 'החשבון שלי',
    'me.progress': 'ההתקדמות שלי',
    'me.solved': '{n} מתוך {total} שאלות נפתרו',
    'me.nameTitle': 'השם שלי',
    'me.save': 'שמירה',
    'me.saved': 'נשמר.',
    'me.pwTitle': 'החלפת סיסמה',
    'me.pwOld': 'הסיסמה הנוכחית',
    'me.pwNew': 'סיסמה חדשה',
    'me.pwSubmit': 'החלפת סיסמה',
    'me.pwDone': 'הסיסמה הוחלפה.',
    'me.recTitle': 'אימייל',
    'me.recLead': 'הוסיפו אימייל כדי לשחזר את הסיסמה אם תשכחו אותה. אחרי שתוסיפו אותו, נכנסים עם שם המשתמש או עם האימייל. האימייל פרטי: רק אתם וצוות האתר רואים אותו.',
    'me.recEmail': 'אימייל',
    'me.recPw': 'הסיסמה הנוכחית',
    'me.recSubmit': 'שמירה ושליחת אישור',
    'me.recSent': 'שלחנו קישור אישור אל {email}. אחרי שתאשרו, היכנסו פעם אחת עם האימייל והסיסמה. מאז אפשר להיכנס גם עם שם המשתמש.',
    'me.recLocal': 'במצב בדיקה מקומי האימייל נשמר מיד. היכנסו פעם אחת עם האימייל, ומאז גם שם המשתמש יעבוד.',
    'me.recNow': 'האימייל שלכם: {email}. נכנסים עם שם המשתמש או עם האימייל, וקישורי איפוס סיסמה נשלחים אליו. האימייל פרטי: רק אתם וצוות האתר רואים אותו.',
    'me.emailNote': '',
    'me.adminTitle': 'ניהול האתר',
    'me.adminText': 'קישורי הרשמה, רשימת התלמידים וההתקדמות שלהם.',
    'me.toAdmin': 'למסך הניהול',
    'badge.admin': 'מנהל',
    'badge.owner': 'בעל האתר',
    'badge.blocked': 'חסום',
    'badge.you': 'אתם',

    'adm.kicker': 'ניהול',
    'adm.title': 'תלמידים והרשמה',
    'adm.denied': 'הדף הזה למנהלים בלבד.',
    'adm.links': 'קישורי הרשמה',
    'adm.linksLead': 'שלחו לכל קבוצה את הקישור של המסלול שלה. מי שנרשם בקישור משויך למסלול שלו.',
    'adm.qbank': 'מאגר שאלות מורים',
    'adm.qbankLead': 'מוסיפים שאלה במילים ובשרטוט, והתוכנה ממלאת את כל הנתונים לבדיקה לפני השמירה.',
    'adm.qbankOpen': 'למאגר',
    'adm.qbankNew': 'שאלה חדשה',
    'adm.copy': 'העתקה',
    'adm.copied': 'הועתק',
    'adm.open': 'פתוחה',
    'adm.openLabel': 'הרשמה למסלול {track} פתוחה',
    'adm.nStudents': '{n} רשומים',
    'adm.students': 'תלמידים',
    'adm.search': 'חיפוש לפי שם או שם משתמש',
    'adm.all': 'כל המסלולים',
    'adm.export': 'ייצוא ל-CSV',
    'adm.refresh': 'רענון',
    'adm.col.name': 'שם',
    'adm.col.user': 'שם משתמש',
    'adm.col.track': 'מסלול',
    'adm.col.joined': 'נרשם',
    'adm.col.seen': 'פעילות אחרונה',
    'adm.col.solved': 'נפתרו',
    'adm.col.role': 'תפקיד',
    'adm.col.actions': 'פעולות',
    'adm.allRoles': 'כל התפקידים',
    'adm.roleOf': 'התפקיד של {name}',
    'adm.staffNote': 'קישור הצוות סגור כברירת מחדל. פתחו אותו כשמזמינים מורה. מי שנרשם בו מקבל חשבון תלמיד, עד שתגדירו לו תפקיד בטבלה.',
    'adm.teacherNote': 'כמורה, אתם רואים את כל התלמידים וההתקדמות שלהם, משנים מסלול וחוסמים. תפקידים, מחיקה והגדרות האתר בידי המנהל.',
    'adm.block': 'חסימה',
    'adm.unblock': 'ביטול חסימה',
    'adm.delete': 'מחיקה',
    'adm.deleteSure': 'למחוק?',
    'adm.makeAdmin': 'מינוי למנהל',
    'adm.unmakeAdmin': 'הסרת ניהול',
    'adm.none': 'עוד אין תלמידים. שלחו קישור הרשמה כדי להתחיל.',
    'adm.noMatch': 'אין תלמידים שמתאימים לחיפוש.',
    'adm.count': '{n} מתוך {total}',
    'adm.solvedList': 'ההתקדמות של {name}',
    'adm.loadFail': 'לא הצלחנו לטעון את רשימת התלמידים.',
    'adm.pwNote': 'תלמיד ששכח סיסמה: אי אפשר לאפס אותה מכאן. מוחקים את החשבון, והתלמיד נרשם מחדש בשם משתמש אחר.',
    'adm.trackOf': 'מסלול של {name}',
    'adm.stage': 'שלב {n}',

    'off.title': 'החשבונות בדרך',
    'off.lead': 'מערכת החשבונות עוד לא חוברה לאתר. בינתיים משחקים בלי חשבון, וההתקדמות נשמרת בדפדפן.',
    'local.banner': 'מצב בדיקה מקומי: החשבונות נשמרים רק בדפדפן הזה, ולא בשרת.',

    'err.username-taken': 'שם המשתמש הזה כבר תפוס. נסו שם אחר.',
    'err.wrong-login': 'שם המשתמש או הסיסמה לא נכונים.',
    'err.bad-username': 'כתבו שם משתמש, עד 64 תווים.',
    'err.bad-email': 'כתבו כתובת אימייל תקינה.',
    'err.owner-email-later': 'בעל האתר נרשם בלי אימייל, ומוסיף אותו אחר כך בדף "החשבון שלי".',
    'err.email-taken': 'האימייל הזה כבר משמש חשבון אחר.',
    'err.staff-closed': 'הקישור הזה לבעל האתר ולצוות, והרשמת הצוות סגורה כרגע. בעל האתר: בדקו ששם המשתמש הוא בדיוק השם שהאתר הגדיר.',
    'err.rules-denied': 'השרת סירב לשמור את החשבון. כנראה כללי האבטחה ב-Firebase לא מעודכנים. פנו למנהל האתר.',
    'err.bad-name': 'כתבו שם, עד 60 תווים.',
    'err.weak-password': 'הסיסמה צריכה לפחות {n} תווים.',
    'err.mismatch': 'שתי הסיסמאות לא זהות.',
    'err.too-many': 'היו יותר מדי ניסיונות. חכו כמה דקות ונסו שוב.',
    'err.network': 'אין חיבור לשרת. בדקו את האינטרנט ונסו שוב.',
    'err.signup-closed': 'ההרשמה למסלול הזה סגורה כרגע.',
    'err.not-owner': 'רק בעל האתר יכול לפתוח חשבון מנהל.',
    'err.blocked': 'החשבון חסום. פנו למורה.',
    'err.removed': 'החשבון הוסר. פנו למורה.',
    'err.not-enabled': 'כניסה עם שם משתמש וסיסמה עוד לא הופעלה ב-Firebase.',
    'err.denied': 'אין לכם הרשאה לפעולה הזו.',
    'err.not-configured': 'מערכת החשבונות עוד לא חוברה לאתר.',
    'err.unavailable': 'מערכת החשבונות לא זמינה כרגע. נסו שוב מאוחר יותר.',
    'err.reauth': 'צריך לצאת ולהיכנס מחדש לפני הפעולה הזו.',
    'err.old-password': 'הסיסמה הנוכחית לא נכונה.',
    'err.signed-out': 'החיבור נותק. היכנסו מחדש.',
    'err.bad-track': 'אין מסלול כזה.',
    'err.bad-role': 'אין תפקיד כזה.',
    'err.owner-staff': 'שם המשתמש הזה שמור לבעל האתר. בעל האתר נרשם בקישור הצוות.',
    'err.unknown': 'משהו השתבש. נסו שוב.',
  },
  en: {
    'title.login': 'Log in',
    'title.join': 'Sign up',
    'title.me': 'My account',
    'title.admin': 'Admin',

    'track.3': '3 units',
    'track.4': '4 units',
    'track.5': '5 units',
    'track.uni': 'University',
    'track.staff': 'Staff',
    'trackLong.3': '3 study units',
    'trackLong.4': '4 study units',
    'trackLong.5': '5 study units',
    'trackLong.uni': 'University',
    'trackLong.staff': 'Site staff',
    'trackSub.3': 'High school math',
    'trackSub.4': 'High school math',
    'trackSub.5': 'High school math',
    'trackSub.uni': 'Degree courses',

    'role.student': 'Student',
    'role.student_plus': 'Student+',
    'role.student_premium': 'Student Premium',
    'role.teacher': 'Teacher',
    'role.admin': 'Admin',

    'f.username': 'Username',
    'f.login': 'Username or e-mail',
    'f.password': 'Password',
    'f.password2': 'Password again',
    'f.name': 'Full name',
    'f.usernameHint': 'Any name you like, in any language.',
    'f.passwordHint': 'At least {n} characters.',
    'f.email': 'E-mail (optional)',
    'f.emailHint': 'For password recovery; you can log in with it too. Private: only you and the site staff see it.',
    'f.nameHint': 'So your teacher knows who you are.',
    'f.show': 'Show password',

    'slot.login': 'Log in',
    'slot.me': 'My account',
    'slot.admin': 'Admin',

    'login.kicker': 'Log in',
    'login.title': 'Welcome back',
    'login.lead': 'Log in with your username (or e-mail) and password. Your progress is saved to your account and waits for you on any computer.',
    'login.submit': 'Log in',
    'login.forgot': 'Forgot password',
    'reset.title': 'Reset password',
    'reset.lead': "Enter the account's e-mail and we'll send it a link to choose a new password.",
    'reset.email': 'E-mail',
    'reset.submit': 'Send link',
    'reset.sent': 'If an account uses this e-mail, we sent it a link. Check your spam folder too. After you choose a new password, log in once with the e-mail, and after that the username works with the new password too.',
    'reset.sentLocal': 'In local test mode no e-mail is sent.',
    'reset.noEmail': 'Signed up with a username and no e-mail? The password cannot be recovered by e-mail. Ask your teacher.',
    'reset.back': 'Back to log in',
    'login.noAccount': 'No account yet? Sign up with the link your teacher gave you, or',
    'login.choose': 'choose a track here',

    'join.kicker': 'Sign up',
    'join.title': 'Create an account',
    'join.lead': 'Your account saves your progress, and your teacher can follow it.',
    'join.trackLabel': 'Your track',
    'join.submit': 'Create account',
    'join.have': 'Already have an account?',
    'join.keep': 'Write down your username and password. There is no password recovery by e-mail.',
    'join.closedTitle': 'Sign-up is closed',
    'join.closed': 'Sign-up for {track} is closed right now. Ask your teacher.',
    'join.chooseTitle': 'Which track are you in?',
    'join.chooseLead': 'Usually your teacher sends a direct link to your track. If you did not get one, choose here.',
    'join.unknown': 'That link is not recognised. Choose your track:',
    'join.staffTitle': 'Staff sign-up',
    'join.staffLead': 'For teachers and site staff. After you sign up, the admin gives you a role; until then the account is a plain student account.',
    'join.staffClosed': 'This link is for the site owner and staff. Staff sign-up is closed right now, so only the site owner, with the username the site set for them, can sign up here now.',
    'join.staffLocal': 'In local test mode the admin username is {u}.',

    'hello': 'Hello, {name}',
    'already': 'You are logged in as {user} ({track}).',
    'alreadyHint': 'To create another account, log out of this one first.',
    'play': 'Keep playing',
    'logout': 'Log out',
    'toLogin': 'Log in',
    'needLogin': 'Log in to see this page.',

    'me.kicker': 'My account',
    'me.progress': 'My progress',
    'me.solved': '{n} of {total} problems solved',
    'me.nameTitle': 'My name',
    'me.save': 'Save',
    'me.saved': 'Saved.',
    'me.pwTitle': 'Change password',
    'me.pwOld': 'Current password',
    'me.pwNew': 'New password',
    'me.pwSubmit': 'Change password',
    'me.pwDone': 'Password changed.',
    'me.recTitle': 'E-mail',
    'me.recLead': 'Add an e-mail so you can recover your password if you forget it. Once added, you log in with the username or the e-mail. The e-mail is private: only you and the site staff see it.',
    'me.recEmail': 'E-mail',
    'me.recPw': 'Current password',
    'me.recSubmit': 'Save and send confirmation',
    'me.recSent': 'We sent a confirmation link to {email}. Once you confirm, log in once with the e-mail and password. After that the username works too.',
    'me.recLocal': 'In local test mode the e-mail is saved at once. Log in once with the e-mail, and after that the username works too.',
    'me.recNow': 'Your e-mail: {email}. You log in with the username or the e-mail, and password reset links go to it. The e-mail is private: only you and the site staff see it.',
    'me.emailNote': '',
    'me.adminTitle': 'Site admin',
    'me.adminText': 'Sign-up links, the student list and their progress.',
    'me.toAdmin': 'Open admin',
    'badge.admin': 'Admin',
    'badge.owner': 'Owner',
    'badge.blocked': 'Blocked',
    'badge.you': 'You',

    'adm.kicker': 'Admin',
    'adm.title': 'Students and sign-up',
    'adm.denied': 'This page is for admins only.',
    'adm.links': 'Sign-up links',
    'adm.linksLead': 'Send each group the link for its track. Whoever signs up through a link joins that track.',
    'adm.qbank': 'Teacher question bank',
    'adm.qbankLead': 'Add a question in words and a drawing; the editor fills in all the data for you to check before saving.',
    'adm.qbankOpen': 'Open the bank',
    'adm.qbankNew': 'New question',
    'adm.copy': 'Copy',
    'adm.copied': 'Copied',
    'adm.open': 'Open',
    'adm.openLabel': 'Sign-up for {track} is open',
    'adm.nStudents': '{n} signed up',
    'adm.students': 'Students',
    'adm.search': 'Search by name or username',
    'adm.all': 'All tracks',
    'adm.export': 'Export CSV',
    'adm.refresh': 'Refresh',
    'adm.col.name': 'Name',
    'adm.col.user': 'Username',
    'adm.col.track': 'Track',
    'adm.col.joined': 'Joined',
    'adm.col.seen': 'Last active',
    'adm.col.solved': 'Solved',
    'adm.col.role': 'Role',
    'adm.col.actions': 'Actions',
    'adm.allRoles': 'All roles',
    'adm.roleOf': 'Role of {name}',
    'adm.staffNote': 'The staff link is closed by default. Open it when you invite a teacher. Whoever signs up through it gets a student account until you give them a role in the table.',
    'adm.teacherNote': 'As a teacher you see all students and their progress, change tracks and block students. Roles, deleting accounts and site settings stay with the admin.',
    'adm.block': 'Block',
    'adm.unblock': 'Unblock',
    'adm.delete': 'Delete',
    'adm.deleteSure': 'Delete?',
    'adm.makeAdmin': 'Make admin',
    'adm.unmakeAdmin': 'Remove admin',
    'adm.none': 'No students yet. Send a sign-up link to get started.',
    'adm.noMatch': 'No students match the search.',
    'adm.count': '{n} of {total}',
    'adm.solvedList': "{name}'s progress",
    'adm.loadFail': 'Could not load the student list.',
    'adm.pwNote': 'A student who forgot their password: it cannot be reset here. Delete the account and have the student sign up again with another username.',
    'adm.trackOf': 'Track of {name}',
    'adm.stage': 'Stage {n}',

    'off.title': 'Accounts are on the way',
    'off.lead': 'The account system is not connected to the site yet. Meanwhile you can play without an account, and progress is saved in your browser.',
    'local.banner': 'Local test mode: accounts are kept in this browser only, not on a server.',

    'err.username-taken': 'That username is taken. Try another one.',
    'err.wrong-login': 'Wrong username or password.',
    'err.bad-username': 'Enter a username, up to 64 characters.',
    'err.bad-email': 'Enter a valid e-mail address.',
    'err.owner-email-later': 'The site owner signs up without an e-mail and adds it later on the "My account" page.',
    'err.email-taken': 'That e-mail is already used by another account.',
    'err.staff-closed': 'This link is for the site owner and staff, and staff sign-up is closed right now. Site owner: check that the username is exactly the one the site set.',
    'err.rules-denied': 'The server refused to save the account. The Firebase security rules are probably out of date. Tell the site admin.',
    'err.bad-name': 'Enter a name, up to 60 characters.',
    'err.weak-password': 'The password needs at least {n} characters.',
    'err.mismatch': 'The two passwords do not match.',
    'err.too-many': 'Too many attempts. Wait a few minutes and try again.',
    'err.network': 'No connection to the server. Check your internet and try again.',
    'err.signup-closed': 'Sign-up for this track is closed right now.',
    'err.not-owner': 'Only the site owner can open the admin account.',
    'err.blocked': 'This account is blocked. Ask your teacher.',
    'err.removed': 'This account was removed. Ask your teacher.',
    'err.not-enabled': 'Username and password sign-in is not enabled in Firebase yet.',
    'err.denied': 'You do not have permission to do that.',
    'err.not-configured': 'The account system is not connected to the site yet.',
    'err.unavailable': 'The account system is unavailable right now. Try again later.',
    'err.reauth': 'Log out and back in before doing that.',
    'err.old-password': 'The current password is wrong.',
    'err.signed-out': 'You were logged out. Log in again.',
    'err.bad-track': 'There is no such track.',
    'err.bad-role': 'There is no such role.',
    'err.owner-staff': 'That username is reserved for the site owner, who signs up through the staff link.',
    'err.unknown': 'Something went wrong. Try again.',
  },
};

function tt(key, vars) {
  let s = S[getLang()]?.[key] ?? S.he[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}
const errText = (e) => tt('err.' + (e && e.code ? e.code : 'unknown'), { n: auth.MIN_PASSWORD });
const trackName = (t) => tt('track.' + t);

// ---------------------------------------------------------------- icons (same drawing style as icons.js)

const IC = {
  user: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6L12 3z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  logout: '<path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14"/><path d="M10 8l-4 4 4 4M6 12h9.5"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6"/><path d="M4 4v4.6h4.6"/>',
  check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.1"/>',
  eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
};
const ic = (name, cls = '') => `<span class="ic${cls ? ' ' + cls : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${IC[name]}</svg></span>`;
const TRACK_MARK = { 3: '3', 4: '4', 5: '5', uni: '∫', staff: '★' };

// ---------------------------------------------------------------- topbar slot

let ready = false;
auth.authReady.then(() => { ready = true; updateSlot(); });

function slotInner() {
  if (auth.mode === 'off' || !ready) return '';
  const u = auth.currentUser();
  if (!u) return `<a class="tool acct-login" href="#/login" data-remember>${ic('user')}<span>${tt('slot.login')}</span></a>`;
  const first = String(u.name || u.username).trim().split(/\s+/)[0];
  return `${u.isStaff ? `<a class="tool" href="#/admin" title="${tt('slot.admin')}" aria-label="${tt('slot.admin')}">${ic('shield')}</a>` : ''}
    <a class="tool acct-me" href="#/account" title="${tt('slot.me')}" aria-label="${tt('slot.me')}"><span class="acct-avatar" aria-hidden="true">${esc(first.charAt(0).toUpperCase())}</span><span class="acct-me-name">${esc(first)}</span></a>`;
}

export const accountSlot = () => `<span class="acct-slot" id="acctSlot">${slotInner()}</span>`;

function updateSlot() {
  const el = document.getElementById('acctSlot');
  if (el) el.innerHTML = slotInner();
}

// Remember where the student was, so logging in brings them back there.
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[data-remember]');
  if (!a) return;
  const here = location.hash || '#/';
  if (!/^#\/?(login|join|account|admin)\b/.test(here)) sessionStorage.setItem('lg.returnTo', here);
});

function afterLogin(u) {
  const back = sessionStorage.getItem('lg.returnTo');
  sessionStorage.removeItem('lg.returnTo');
  if (back) return back;
  return u.isStaff ? '#/admin' : '#/hs/geometry';
}

// Called once by app.js. Re-renders home/topic when logging in or out changed the saved progress.
export function initAccounts({ rerender, routeName }) {
  let pv = auth.progressVersion();
  auth.onAuthChange(() => {
    updateSlot();
    const now = auth.progressVersion();
    if (now === pv) return;
    pv = now;
    const r = routeName();
    if (r === 'home' || r === 'topic') rerender();
  });
}

// ---------------------------------------------------------------- routes

const PAGES = { login: pageLogin, join: pageJoin, me: pageMe, admin: pageAdmin };

export function accountRoute(parts) {
  if (parts[0] === 'login') return { name: 'acct', page: 'login' };
  if (parts[0] === 'join') return { name: 'acct', page: 'join', track: parts[1] ? parts[1].toLowerCase() : null };
  if (parts[0] === 'account') return { name: 'acct', page: 'me' };
  if (parts[0] === 'admin') return { name: 'acct', page: 'admin' };
  return null;
}

export const accountTitle = (route) => `${tt('title.' + route.page)} · LEANgame`;

export const viewAccount = (route) => `
  <section class="acct">
    <div class="wrap acct-wrap page-${route.page}"><div class="acct-wait" aria-busy="true"></div></div>
  </section>`;

let quiet = false; // true while this module itself is signing in/out, so the page does not redraw mid-action

export function bindAccount(root, route) {
  const host = root.querySelector('.acct-wrap');
  let alive = true;
  const draw = async () => {
    if (!alive || quiet) return;
    try { await PAGES[route.page](host, route, () => alive); } catch (e) { console.error(e); }
  };
  const off = auth.onAuthChange(draw);
  return () => { alive = false; off(); };
}

// ---------------------------------------------------------------- building blocks

const banner = () => (auth.mode === 'local' ? `<p class="acct-banner">${ic('info')}<span>${tt('local.banner')}</span></p>` : '');

function field(name, label, opts = {}) {
  const { type = 'text', hint = '', autocomplete = 'off', value = '', reveal = false } = opts;
  // 'ltr' for passwords and e-mails; 'auto' for usernames, which may be Hebrew or an e-mail.
  const ltr = opts.ltr ? 'ltr' : opts.auto ? 'auto' : '';
  const id = 'f-' + name;
  return `<div class="acct-field">
    <label for="${id}">${label}</label>
    <div class="acct-input-wrap">
      <input class="acct-input" id="${id}" name="${name}" type="${type}" autocomplete="${autocomplete}" value="${esc(value)}"
        ${ltr ? `dir="${ltr}" autocapitalize="none" spellcheck="false"` : ''} ${hint ? `aria-describedby="${id}-hint"` : ''} ${opts.optional ? '' : 'required'}>
      ${reveal ? `<button type="button" class="acct-reveal" data-reveal="${id}" aria-label="${tt('f.show')}" title="${tt('f.show')}" aria-pressed="false">${ic('eye')}</button>` : ''}
    </div>
    ${hint ? `<p class="acct-hint" id="${id}-hint">${hint}</p>` : ''}
  </div>`;
}

const msgBox = (text = '', kind = 'err') => `<p class="acct-msg ${kind}" role="${kind === 'err' ? 'alert' : 'status'}" ${text ? '' : 'hidden'}>${text ? esc(text) : ''}</p>`;

function showMsg(form, text, kind = 'err') {
  const m = form.querySelector('.acct-msg');
  if (!m) return;
  m.className = 'acct-msg ' + kind;
  m.setAttribute('role', kind === 'err' ? 'alert' : 'status');
  m.textContent = text || '';
  m.hidden = !text;
}

function bindReveal(host) {
  host.querySelectorAll('[data-reveal]').forEach((b) => b.addEventListener('click', () => {
    const inp = host.querySelector('#' + b.dataset.reveal);
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    b.setAttribute('aria-pressed', String(show));
  }));
}

// Runs an async form action with the button disabled and the error shown in the form.
async function run(form, fn) {
  const btn = form.querySelector('[type="submit"]');
  if (btn && btn.disabled) return;
  if (btn) { btn.disabled = true; btn.classList.add('is-busy'); }
  showMsg(form, '');
  try { await fn(); } catch (e) {
    if (!(e instanceof auth.AuthError)) console.error(e);
    showMsg(form, errText(e));
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('is-busy'); }
  }
}

async function quietly(fn) {
  quiet = true;
  try { return await fn(); } finally { quiet = false; }
}

function offCard() {
  return `<div class="acct-card paper acct-narrow">
    <p class="kicker">LEANgame</p>
    <h1 class="acct-h">${tt('off.title')}</h1>
    <p class="acct-lead">${tt('off.lead')}</p>
    <div class="acct-actions"><a class="btn btn-primary" href="#/hs/geometry">${tt('play')} ${ic('arrow', 'dir')}</a></div>
  </div>`;
}

async function guardAvailable(host) {
  if (auth.mode === 'off') { host.innerHTML = offCard(); return false; }
  if (!(await auth.accountsAvailable())) {
    host.innerHTML = `<div class="acct-card paper acct-narrow"><h1 class="acct-h">${tt('title.login')}</h1><p class="acct-lead">${tt('err.unavailable')}</p></div>`;
    return false;
  }
  return true;
}

const trackPill = (t, big = false) => `<span class="track-pill t-${esc(t)}${big ? ' big' : ''}"><b>${TRACK_MARK[t] || '?'}</b>${esc(trackName(t))}</span>`;

function alreadyCard(u) {
  return `<div class="acct-card paper acct-narrow">
    <p class="kicker">${tt('slot.me')}</p>
    <h1 class="acct-h">${esc(tt('hello', { name: u.name }))}</h1>
    <p class="acct-lead">${esc(tt('already', { user: u.username, track: trackName(u.track) }))}</p>
    <p class="acct-hint">${tt('alreadyHint')}</p>
    <div class="acct-actions">
      <a class="btn btn-primary" href="#/hs/geometry">${tt('play')} ${ic('arrow', 'dir')}</a>
      <a class="btn btn-ghost" href="#/account">${tt('slot.me')}</a>
      <button type="button" class="btn btn-ghost" data-logout>${ic('logout')} ${tt('logout')}</button>
    </div>
  </div>`;
}

function needLoginCard() {
  return `<div class="acct-card paper acct-narrow">
    <p class="kicker">LEANgame</p>
    <h1 class="acct-h">${tt('title.login')}</h1>
    <p class="acct-lead">${tt('needLogin')}</p>
    <div class="acct-actions"><a class="btn btn-primary" href="#/login">${ic('user')} ${tt('toLogin')}</a></div>
  </div>`;
}

function bindLogout(host) {
  host.querySelectorAll('[data-logout]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    try { await quietly(() => auth.signOut()); } catch (e) { console.error(e); }
    location.hash = '#/';
  }));
}

// ---------------------------------------------------------------- #/login

async function pageLogin(host) {
  if (!(await guardAvailable(host))) return;
  const u = auth.currentUser();
  if (u) { host.innerHTML = alreadyCard(u); bindLogout(host); return; }
  const notice = auth.takeNotice();
  host.innerHTML = `${banner()}
    <div class="acct-card paper acct-narrow">
      <p class="kicker">${tt('login.kicker')}</p>
      <h1 class="acct-h">${tt('login.title')}</h1>
      <p class="acct-lead">${tt('login.lead')}</p>
      <form class="acct-form" id="loginForm" novalidate>
        ${field('username', tt('f.login'), { autocomplete: 'username', auto: true })}
        ${field('password', tt('f.password'), { type: 'password', autocomplete: 'current-password', ltr: true, reveal: true })}
        ${msgBox(notice ? tt('err.' + notice) : '')}
        <div class="acct-row">
          <button class="btn btn-primary acct-submit" type="submit">${tt('login.submit')}</button>
          <button type="button" class="acct-link" id="forgotBtn">${tt('login.forgot')}</button>
        </div>
      </form>
      <form class="acct-form acct-reset" id="resetForm" novalidate hidden>
        <h2 class="acct-h2">${tt('reset.title')}</h2>
        <p class="acct-hint">${tt('reset.lead')}</p>
        ${field('email', tt('reset.email'), { type: 'email', autocomplete: 'email', ltr: true })}
        <p class="acct-note">${ic('info')}<span>${tt('reset.noEmail')}</span></p>
        ${msgBox()}
        <div class="acct-row">
          <button class="btn btn-primary btn-small acct-submit" type="submit">${tt('reset.submit')}</button>
          <button type="button" class="acct-link" id="resetBack">${tt('reset.back')}</button>
        </div>
      </form>
      <p class="acct-foot">${tt('login.noAccount')} <a href="#/join">${tt('login.choose')}</a>.</p>
    </div>`;
  bindReveal(host);
  const form = host.querySelector('#loginForm');
  const reset = host.querySelector('#resetForm');
  form.username.focus();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run(form, async () => {
      const user = await quietly(() => auth.signIn(form.username.value, form.password.value));
      location.hash = afterLogin(user);
    });
  });
  host.querySelector('#forgotBtn').addEventListener('click', () => {
    form.hidden = true;
    reset.hidden = false;
    if (auth.isEmail(form.username.value)) reset.email.value = form.username.value.trim();
    reset.email.focus();
  });
  host.querySelector('#resetBack').addEventListener('click', () => {
    reset.hidden = true;
    form.hidden = false;
    form.username.focus();
  });
  reset.addEventListener('submit', (e) => {
    e.preventDefault();
    run(reset, async () => {
      await auth.sendPasswordReset(reset.email.value);
      showMsg(reset, auth.mode === 'local' ? tt('reset.sentLocal') : tt('reset.sent'), 'ok');
    });
  });
}

// ---------------------------------------------------------------- #/join and #/join/<track>

function chooser(host, unknown) {
  host.innerHTML = `${banner()}
    <div class="acct-head">
      <p class="kicker">${tt('join.kicker')}</p>
      <h1 class="acct-h">${tt('join.chooseTitle')}</h1>
      <p class="acct-lead">${unknown ? tt('join.unknown') : tt('join.chooseLead')}</p>
    </div>
    <div class="track-grid">
      ${auth.TRACKS.map((t) => `<a class="track-card paper t-${t}" href="#/join/${t}">
        <span class="track-mark" aria-hidden="true">${TRACK_MARK[t]}</span>
        <span class="track-card-name">${tt('trackLong.' + t)}</span>
        <span class="track-card-sub">${tt('trackSub.' + t)}</span>
      </a>`).join('')}
    </div>
    <p class="acct-foot center">${tt('join.have')} <a href="#/login">${tt('toLogin')}</a></p>`;
}

async function pageJoin(host, route) {
  if (!(await guardAvailable(host))) return;
  const track = route.track;
  const staff = track === auth.STAFF;
  if (!track) { chooser(host, false); return; }
  if (!staff && !auth.TRACKS.includes(track)) { chooser(host, true); return; }

  const u = auth.currentUser();
  if (u) { host.innerHTML = alreadyCard(u); bindLogout(host); return; }

  let open = !staff;
  try { open = (await auth.getSignupOpen())[track]; } catch (e) { console.warn(e); }
  // The staff form stays visible when closed, because the owner signs up there.
  if (!staff) {
    if (!open) {
      host.innerHTML = `<div class="acct-card paper acct-narrow">
        <div class="join-track">${trackPill(track, true)}</div>
        <h1 class="acct-h">${tt('join.closedTitle')}</h1>
        <p class="acct-lead">${esc(tt('join.closed', { track: tt('trackLong.' + track) }))}</p>
        <div class="acct-actions"><a class="btn btn-ghost" href="#/login">${tt('toLogin')}</a></div>
      </div>`;
      return;
    }
  }

  host.innerHTML = `${banner()}
    <div class="acct-card paper acct-narrow">
      <div class="join-track">
        <span class="join-track-label">${staff ? tt('join.staffTitle') : tt('join.trackLabel')}</span>
        ${trackPill(track, true)}
      </div>
      <p class="kicker">${tt('join.kicker')}</p>
      <h1 class="acct-h">${staff ? tt('join.staffTitle') : tt('join.title')}</h1>
      <p class="acct-lead">${staff ? tt('join.staffLead') : tt('join.lead')}</p>
      ${staff && !open ? `<p class="acct-note">${ic('lock')}<span>${tt('join.staffClosed')}</span></p>` : ''}
      ${staff && auth.mode === 'local' ? `<p class="acct-hint">${esc(tt('join.staffLocal', { u: auth.ownerUsername() }))}</p>` : ''}
      <form class="acct-form" novalidate>
        ${field('name', tt('f.name'), { autocomplete: 'name', hint: tt('f.nameHint') })}
        ${field('username', tt('f.username'), { autocomplete: 'username', auto: true, hint: tt('f.usernameHint') })}
        ${staff ? '' : field('email', tt('f.email'), { type: 'email', autocomplete: 'email', ltr: true, hint: tt('f.emailHint'), optional: true })}
        ${field('password', tt('f.password'), { type: 'password', autocomplete: 'new-password', ltr: true, reveal: true, hint: tt('f.passwordHint', { n: auth.MIN_PASSWORD }) })}
        ${field('password2', tt('f.password2'), { type: 'password', autocomplete: 'new-password', ltr: true })}
        <p class="acct-note">${ic('info')}<span>${tt('join.keep')}</span></p>
        ${msgBox()}
        <button class="btn btn-primary acct-submit" type="submit">${tt('join.submit')}</button>
      </form>
      <p class="acct-foot">${tt('join.have')} <a href="#/login">${tt('toLogin')}</a></p>
    </div>`;
  bindReveal(host);
  const form = host.querySelector('form');
  form.name.focus();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run(form, async () => {
      if (form.password.value !== form.password2.value) throw new auth.AuthError('mismatch');
      const user = await quietly(() => auth.signUp({
        name: form.name.value, username: form.username.value, email: form.email ? form.email.value : '', password: form.password.value, track,
      }));
      sessionStorage.removeItem('lg.returnTo');
      location.hash = user.isStaff ? '#/admin' : '#/hs/geometry';
    });
  });
}

// ---------------------------------------------------------------- #/account

function readProgress() {
  try { return JSON.parse(localStorage.getItem('lg.progress')) || {}; } catch { return {}; }
}
const solvedCount = (progress) => problemList().filter((x) => progress[`${x.stage}-${x.n}`]?.solved).length;

function progressBlocks(progress) {
  return STAGES.map((s) => {
    const items = problemList().filter((x) => x.stage === s.id);
    if (!items.length) return '';
    return `<div class="prog-stage">
      <span class="prog-stage-name">${esc(tt('adm.stage', { n: stageNumber(s.id) }))} · ${esc(L(s.name))}</span>
      <span class="prog-pips">${items.map((x) => {
        const done = progress[`${x.stage}-${x.n}`]?.solved;
        return `<span class="prog-pip${done ? ' done' : ''}" title="${esc(L(x.problem.title))}">${done ? ic('check') : x.n}</span>`;
      }).join('')}</span>
    </div>`;
  }).join('');
}

async function pageMe(host) {
  if (!(await guardAvailable(host))) return;
  const u = auth.currentUser();
  if (!u) { host.innerHTML = needLoginCard(); return; }
  const progress = readProgress();
  const total = problemList().length;
  const solved = solvedCount(progress);
  const pct = total ? Math.round((solved / total) * 100) : 0;

  host.innerHTML = `${banner()}
    <div class="me-head">
      <span class="me-avatar" aria-hidden="true">${esc(String(u.name || u.username).trim().charAt(0).toUpperCase())}</span>
      <div>
        <p class="kicker">${tt('me.kicker')}</p>
        <h1 class="acct-h">${esc(u.name)}</h1>
        <p class="me-meta"><span dir="auto" class="mono">${esc(u.username)}</span>${trackPill(u.track)}<span class="role-pill role-${u.role}">${esc(tt('role.' + u.role))}</span>${u.isOwner ? `<span class="badge b-open">${tt('badge.owner')}</span>` : ''}</p>
      </div>
      <button type="button" class="btn btn-ghost btn-small me-logout" data-logout>${ic('logout')} ${tt('logout')}</button>
    </div>

    <div class="me-grid">
      <section class="acct-card paper me-progress">
        <h2 class="acct-h2">${tt('me.progress')}</h2>
        <p class="me-solved"><b>${solved}</b> ${esc(tt('me.solved', { n: '', total }).replace(/^\s+/, ''))}</p>
        <div class="me-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${solved}"><span style="width:${pct}%"></span></div>
        <div class="prog-list">${progressBlocks(progress)}</div>
        <div class="acct-actions"><a class="btn btn-primary btn-small" href="#/hs/geometry">${tt('play')} ${ic('arrow', 'dir')}</a></div>
      </section>

      <div class="me-side">
        ${u.isStaff ? `<section class="acct-card paper me-admin">
          <h2 class="acct-h2">${ic('shield')} ${tt('me.adminTitle')}</h2>
          <p class="acct-hint">${tt('me.adminText')}</p>
          <div class="acct-actions"><a class="btn btn-primary btn-small" href="#/admin">${tt('me.toAdmin')} ${ic('arrow', 'dir')}</a></div>
        </section>` : ''}

        <section class="acct-card paper">
          <h2 class="acct-h2">${tt('me.nameTitle')}</h2>
          <form class="acct-form" id="nameForm" novalidate>
            ${field('name', tt('f.name'), { autocomplete: 'name', value: u.name })}
            ${msgBox()}
            <button class="btn btn-ghost btn-small acct-submit" type="submit">${tt('me.save')}</button>
          </form>
        </section>

        <section class="acct-card paper">
          <h2 class="acct-h2">${tt('me.pwTitle')}</h2>
          <form class="acct-form" id="pwForm" novalidate>
            <input type="text" name="username" autocomplete="username" value="${esc(u.username)}" hidden>
            ${field('oldpw', tt('me.pwOld'), { type: 'password', autocomplete: 'current-password', ltr: true })}
            ${field('newpw', tt('me.pwNew'), { type: 'password', autocomplete: 'new-password', ltr: true, reveal: true, hint: tt('f.passwordHint', { n: auth.MIN_PASSWORD }) })}
            ${msgBox()}
            <button class="btn btn-ghost btn-small acct-submit" type="submit">${tt('me.pwSubmit')}</button>
          </form>
        </section>

        <section class="acct-card paper">
          <h2 class="acct-h2">${tt('me.recTitle')}</h2>
          ${u.email ? `<p class="acct-hint" id="recNow">${esc(tt('me.recNow', { email: u.email }))}</p>` : `<p class="acct-hint">${tt('me.recLead')}</p>`}
          <form class="acct-form" id="recForm" novalidate>
            ${field('recemail', tt('me.recEmail'), { type: 'email', autocomplete: 'email', ltr: true, value: u.email || '' })}
            ${field('recpw', tt('me.recPw'), { type: 'password', autocomplete: 'current-password', ltr: true })}
            ${msgBox()}
            <button class="btn btn-ghost btn-small acct-submit" type="submit">${tt('me.recSubmit')}</button>
          </form>
        </section>
      </div>
    </div>`;

  bindReveal(host);
  bindLogout(host);
  const nameForm = host.querySelector('#nameForm');
  nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    run(nameForm, async () => {
      await quietly(() => auth.setMyName(nameForm.name.value));
      host.querySelector('.me-head .acct-h').textContent = auth.currentUser().name;
      showMsg(nameForm, tt('me.saved'), 'ok');
    });
  });
  const pwForm = host.querySelector('#pwForm');
  pwForm.addEventListener('submit', (e) => {
    e.preventDefault();
    run(pwForm, async () => {
      try { await auth.changePassword(pwForm.oldpw.value, pwForm.newpw.value); } catch (err) {
        throw err.code === 'wrong-login' ? new auth.AuthError('old-password') : err;
      }
      pwForm.reset();
      showMsg(pwForm, tt('me.pwDone'), 'ok');
    });
  });
  const recForm = host.querySelector('#recForm');
  if (recForm) {
    recForm.addEventListener('submit', (e) => {
      e.preventDefault();
      run(recForm, async () => {
        const email = recForm.recemail.value.trim().toLowerCase();
        const done = await quietly(() => auth.setEmail(email, recForm.recpw.value));
        recForm.recpw.value = '';
        showMsg(recForm, done ? tt('me.recLocal') : tt('me.recSent', { email }), 'ok');
      });
    });
  }
}

// ---------------------------------------------------------------- #/admin

const fmtDate = (ms) => {
  if (!ms) return '—';
  return new Intl.DateTimeFormat(getLang() === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
};
const joinUrl = (t) => `${location.origin}${location.pathname}#/join/${t}`;

async function pageAdmin(host, route, alive) {
  if (!(await guardAvailable(host))) return;
  const me = auth.currentUser();
  if (!me) { host.innerHTML = needLoginCard(); return; }
  if (!me.isStaff) {
    host.innerHTML = `<div class="acct-card paper acct-narrow"><p class="kicker">${tt('adm.kicker')}</p><h1 class="acct-h">${ic('lock')} ${tt('title.admin')}</h1><p class="acct-lead">${tt('adm.denied')}</p></div>`;
    return;
  }
  const isAdm = me.isAdmin;

  const st = { users: null, open: null, q: '', track: 'all', role: 'all', expanded: null, armed: null, error: null };
  let armTimer = null;

  host.innerHTML = `${banner()}
    <div class="acct-head">
      <p class="kicker">${tt('adm.kicker')} · ${esc(tt('role.' + me.role))}</p>
      <h1 class="acct-h">${tt('adm.title')}</h1>
      ${isAdm ? '' : `<p class="acct-note">${ic('info')}<span>${tt('adm.teacherNote')}</span></p>`}
    </div>
    <section class="adm-sec">
      <h2 class="acct-h2">${tt('adm.links')}</h2>
      <p class="acct-hint">${tt('adm.linksLead')}</p>
      <div class="adm-links" id="admLinks"><div class="acct-wait"></div></div>
    </section>
    <section class="adm-sec" id="admQbank">
      <h2 class="acct-h2">${tt('adm.qbank')}</h2>
      <p class="acct-hint">${tt('adm.qbankLead')}</p>
      <div class="acct-actions"><a class="btn btn-primary btn-small" href="#/author">${tt('adm.qbankNew')}</a><a class="btn btn-ghost btn-small" href="#/bank">${tt('adm.qbankOpen')} ${ic('arrow', 'dir')}</a></div>
    </section>
    ${isAdm ? '<section class="adm-sec" id="admTools"></section>' : ''}
    <section class="adm-sec">
      <div class="adm-sec-head">
        <h2 class="acct-h2">${tt('adm.students')}</h2>
        <div class="adm-toolbar">
          <label class="adm-search">${ic('search')}<input type="search" id="admQ" placeholder="${tt('adm.search')}" aria-label="${tt('adm.search')}"></label>
          <select id="admTrack" class="adm-select" aria-label="${tt('adm.col.track')}">
            <option value="all">${tt('adm.all')}</option>
            ${[...auth.TRACKS, auth.STAFF].map((t) => `<option value="${t}">${esc(trackName(t))}</option>`).join('')}
          </select>
          <select id="admRole" class="adm-select" aria-label="${tt('adm.col.role')}">
            <option value="all">${tt('adm.allRoles')}</option>
            ${auth.ROLES.map((r) => `<option value="${r}">${esc(tt('role.' + r))}</option>`).join('')}
          </select>
          <button type="button" class="tool-btn" id="admRefresh">${ic('reset')} ${tt('adm.refresh')}</button>
          <button type="button" class="tool-btn" id="admExport">${ic('download')} ${tt('adm.export')}</button>
        </div>
      </div>
      <p class="adm-count muted" id="admCount"></p>
      <div class="adm-table-wrap" id="admTable"><div class="acct-wait"></div></div>
      <p class="acct-note">${ic('info')}<span>${tt('adm.pwNote')}</span></p>
    </section>`;

  const $ = (s) => host.querySelector(s);
  const total = problemList().length;
  const counts = () => {
    const c = {};
    for (const u of st.users || []) c[u.track] = (c[u.track] || 0) + 1;
    return c;
  };

  function drawLinks() {
    const c = counts();
    const links = isAdm ? [...auth.TRACKS, auth.STAFF] : auth.TRACKS;
    $('#admLinks').innerHTML = links.map((t) => {
      const on = st.open ? !!st.open[t] : t !== auth.STAFF;
      return `
      <div class="adm-link paper${t === auth.STAFF ? ' adm-link-staff' : ''}">
        <div class="adm-link-top">${trackPill(t)}<span class="muted">${st.users ? esc(tt('adm.nStudents', { n: c[t] || 0 })) : ''}</span></div>
        <div class="adm-link-row">
          <input class="acct-input adm-url" readonly dir="ltr" value="${esc(joinUrl(t))}" aria-label="${esc(tt('trackLong.' + t))}">
          <button type="button" class="tool-btn" data-copy="${t}">${ic('copy')} <span>${tt('adm.copy')}</span></button>
        </div>
        <label class="switch adm-open"><input type="checkbox" data-open="${t}" ${on ? 'checked' : ''} ${st.open && isAdm ? '' : 'disabled'} aria-label="${esc(tt('adm.openLabel', { track: tt('trackLong.' + t) }))}"><span class="switch-ui" aria-hidden="true"></span><span>${tt('adm.open')}</span></label>
        ${t === auth.STAFF ? `<p class="acct-hint">${tt('adm.staffNote')}</p>` : ''}
      </div>`;
    }).join('');
  }

  function visibleUsers() {
    const q = st.q.trim().toLowerCase();
    return (st.users || [])
      .filter((u) => st.track === 'all' || u.track === st.track)
      .filter((u) => st.role === 'all' || u.role === st.role)
      .filter((u) => !q || String(u.name).toLowerCase().includes(q) || String(u.username).includes(q) || String(u.login).includes(q))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), getLang()));
  }

  function rowHTML(u) {
    const solved = solvedCount(u.progress || {});
    const self = u.uid === me.uid;
    const armed = st.armed === u.uid;
    const isTier = auth.TIERS.includes(u.role);
    // Same limits as firestore.rules: teachers edit students only; only the owner touches admins.
    const canEdit = !self && !u.isOwner && (me.isOwner || (isAdm && u.role !== 'admin') || (me.isTeacher && isTier));
    const trackOpts = isAdm ? [...auth.TRACKS, auth.STAFF] : auth.TRACKS;
    const trackCell = canEdit && trackOpts.includes(u.track)
      ? `<select class="adm-select small" data-track="${u.uid}" aria-label="${esc(tt('adm.trackOf', { name: u.name }))}">${trackOpts.map((t) => `<option value="${t}" ${u.track === t ? 'selected' : ''}>${esc(trackName(t))}</option>`).join('')}</select>`
      : trackPill(u.track);
    const roleOpts = me.isOwner ? auth.ROLES : auth.ROLES.filter((r) => r !== 'admin');
    const roleCell = isAdm && canEdit
      ? `<select class="adm-select small role-${u.role}" data-role="${u.uid}" aria-label="${esc(tt('adm.roleOf', { name: u.name }))}">${roleOpts.map((r) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${esc(tt('role.' + r))}</option>`).join('')}</select>`
      : `<span class="role-pill role-${u.role}">${esc(tt('role.' + u.role))}</span>`;
    const actions = self ? `<span class="badge">${tt('badge.you')}</span>` : !canEdit ? '' : `
      <button type="button" class="tool-btn" data-block="${u.uid}">${u.blocked ? tt('adm.unblock') : tt('adm.block')}</button>
      ${isAdm ? `<button type="button" class="tool-btn${armed ? ' armed' : ''}" data-del="${u.uid}">${armed ? tt('adm.deleteSure') : tt('adm.delete')}</button>` : ''}`;
    return `<tr class="${u.blocked ? 'is-blocked' : ''}${st.expanded === u.uid ? ' is-open' : ''}">
        <td><button type="button" class="adm-name" data-expand="${u.uid}" aria-expanded="${st.expanded === u.uid}">${esc(u.name)}</button>
          ${u.isOwner ? `<span class="badge b-open">${tt('badge.owner')}</span>` : ''}
          ${u.blocked ? `<span class="badge b-blocked">${tt('badge.blocked')}</span>` : ''}</td>
        <td><span dir="auto" class="mono">${esc(u.username)}</span>${u.login && !u.login.endsWith('@' + auth.LOGIN_DOMAIN) && u.login !== u.username ? `<br><span dir="ltr" class="mono muted small">${esc(u.login)}</span>` : ''}</td>
        <td>${roleCell}</td>
        <td>${trackCell}</td>
        <td class="nowrap"><span dir="ltr">${fmtDate(u.createdAt)}</span></td>
        <td class="nowrap"><span dir="ltr">${fmtDate(u.lastSeen)}</span></td>
        <td class="num"><span dir="ltr"><b>${solved}</b><span class="muted">/${total}</span></span></td>
        <td><div class="adm-actions">${actions}</div></td>
      </tr>
      ${st.expanded === u.uid ? `<tr class="adm-detail"><td colspan="8">
        <p class="adm-detail-title">${esc(tt('adm.solvedList', { name: u.name }))}</p>
        <div class="prog-list">${progressBlocks(u.progress || {})}</div>
        ${isAdm ? `<div class="adm-stools" data-stools="${u.uid}"></div>` : ''}
      </td></tr>` : ''}`;
  }

  function drawTable() {
    const box = $('#admTable');
    if (st.error) { box.innerHTML = `<p class="acct-msg err">${esc(st.error)}</p>`; $('#admCount').textContent = ''; return; }
    if (!st.users) { box.innerHTML = '<div class="acct-wait"></div>'; return; }
    const list = visibleUsers();
    $('#admCount').textContent = st.users.length ? tt('adm.count', { n: list.length, total: st.users.length }) : '';
    if (!st.users.length) { box.innerHTML = `<p class="adm-empty">${tt('adm.none')}</p>`; return; }
    if (!list.length) { box.innerHTML = `<p class="adm-empty">${tt('adm.noMatch')}</p>`; return; }
    box.innerHTML = `<table class="adm-table">
      <thead><tr>
        <th>${tt('adm.col.name')}</th><th>${tt('adm.col.user')}</th><th>${tt('adm.col.role')}</th><th>${tt('adm.col.track')}</th>
        <th>${tt('adm.col.joined')}</th><th>${tt('adm.col.seen')}</th><th>${tt('adm.col.solved')}</th><th>${tt('adm.col.actions')}</th>
      </tr></thead>
      <tbody>${list.map(rowHTML).join('')}</tbody>
    </table>`;
    // Per-student tool settings (admin only), rendered by tools.js inside the expanded row.
    const slot = isAdm && st.expanded ? box.querySelector(`[data-stools="${st.expanded}"]`) : null;
    const target = slot && findUser(st.expanded);
    if (target) {
      import('./tools.js')
        .then((m) => { if (alive() && slot.isConnected && typeof m.mountStudentTools === 'function') m.mountStudentTools(slot, target); })
        .catch((e) => console.warn('[accounts] student tools not loaded', e));
    }
  }

  async function load() {
    st.error = null;
    drawTable();
    const [users, open] = await Promise.allSettled([auth.admin.listUsers(), auth.getSignupOpen()]);
    if (!alive()) return;
    if (users.status === 'fulfilled') st.users = users.value;
    else { st.users = null; st.error = tt('adm.loadFail') + ' ' + errText(users.reason); }
    st.open = open.status === 'fulfilled' ? open.value : null;
    drawLinks();
    drawTable();
  }

  const findUser = (uid) => (st.users || []).find((u) => u.uid === uid);
  async function act(fn) {
    try { await fn(); } catch (e) { st.error = errText(e); drawTable(); setTimeout(() => { st.error = null; drawTable(); }, 4000); }
  }

  host.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b || !host.contains(b)) return;
    if (b.dataset.copy) {
      const url = joinUrl(b.dataset.copy);
      try { await navigator.clipboard.writeText(url); } catch {
        const inp = b.parentElement.querySelector('input'); inp.select(); document.execCommand('copy');
      }
      const span = b.querySelector('span:last-child');
      span.textContent = tt('adm.copied');
      b.classList.add('is-done');
      setTimeout(() => { span.textContent = tt('adm.copy'); b.classList.remove('is-done'); }, 1600);
    } else if (b.dataset.expand) {
      st.expanded = st.expanded === b.dataset.expand ? null : b.dataset.expand;
      drawTable();
    } else if (b.dataset.block) {
      const u = findUser(b.dataset.block);
      b.disabled = true;
      await act(async () => { await auth.admin.setBlocked(u.uid, !u.blocked); u.blocked = !u.blocked; });
      drawTable();
    } else if (b.dataset.del) {
      const uid = b.dataset.del;
      if (st.armed !== uid) {
        st.armed = uid;
        clearTimeout(armTimer);
        armTimer = setTimeout(() => { st.armed = null; drawTable(); }, 3000);
        drawTable();
        return;
      }
      clearTimeout(armTimer);
      st.armed = null;
      b.disabled = true;
      await act(async () => { await auth.admin.remove(uid); st.users = st.users.filter((u) => u.uid !== uid); });
      drawLinks();
      drawTable();
    } else if (b.id === 'admRefresh') {
      st.users = null;
      load();
    } else if (b.id === 'admExport') {
      exportCSV(visibleUsers());
    }
  });

  host.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.dataset.track) {
      const u = findUser(el.dataset.track);
      const prev = u.track;
      el.disabled = true;
      await act(async () => { await auth.admin.setTrack(u.uid, el.value); u.track = el.value; });
      if (u.track === prev) el.value = prev;
      drawLinks();
      drawTable();
    } else if (el.dataset.role) {
      const u = findUser(el.dataset.role);
      el.disabled = true;
      await act(async () => {
        await auth.admin.setRole(u.uid, el.value);
        u.role = el.value;
        u.isAdmin = el.value === 'admin';
        u.isTeacher = el.value === 'teacher';
      });
      drawTable();
    } else if (el.id === 'admRole') {
      st.role = el.value;
      drawTable();
    } else if (el.dataset.open) {
      const t = el.dataset.open;
      el.disabled = true;
      try { await auth.admin.setSignupOpen(t, el.checked); st.open[t] = el.checked; } catch (err) { el.checked = !el.checked; st.error = errText(err); drawTable(); }
      el.disabled = false;
    } else if (el.id === 'admTrack') {
      st.track = el.value;
      drawTable();
    }
  });
  $('#admQ').addEventListener('input', (e) => { st.q = e.target.value; drawTable(); });

  // Proof-tool settings per track (admin only): rendered by tools.js, which owns that section.
  if (isAdm) {
    import('./tools.js')
      .then((m) => { if (alive() && typeof m.mountToolSettings === 'function') m.mountToolSettings($('#admTools')); })
      .catch((e) => console.warn('[accounts] tool settings not loaded', e));
  }

  drawLinks();
  await load();
}

function exportCSV(users) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const iso = (ms) => (ms ? new Date(ms).toISOString().replace('T', ' ').slice(0, 16) : '');
  const head = [tt('adm.col.name'), tt('adm.col.user'), tt('adm.col.role'), tt('adm.col.track'), tt('adm.col.joined'), tt('adm.col.seen'), tt('adm.col.solved'), tt('badge.blocked')];
  const rows = users.map((u) => [u.name, u.username, tt('role.' + u.role), trackName(u.track), iso(u.createdAt), iso(u.lastSeen), solvedCount(u.progress || {}), u.blocked ? '1' : '']);
  const csv = '﻿' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `leangame-students-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}
