# LEANgame — אתר

משחק הוכחות לתיכון: בונים הוכחה בטבלת **טענה | נימוק**, ו-Lean בודק כל שורה.
הנושא הראשון הוא גאומטריה. נושאים נוספים (טריגונומטריה, גאומטריה אנליטית, ובהמשך אוניברסיטה) יתווספו לאותו מבנה.

> **אב-טיפוס.** באתר הזה הבדיקה מדומה בדפדפן (`assets/js/geo.js`) לפי אותם כללים של קטלוג הנימוקים. בגרסה המלאה כל שורה נשלחת לשירות בדיקה שמריץ את Lean ו-Mathlib.

## מה יש באתר

- **דף הבית:** הסבר על המשחק, הדגמה מונפשת של הוכחה, נושאים לפי מסלול (תיכון / אוניברסיטה), ומפת דרכים.
- **גאומטריה:** מסע של 11 שלבים, התקדמות אישית (נשמרת בדפדפן), וארגז הכלים: קטלוג הנימוקים עם השמות ב-Lean.
- **שאלות לשחק:** שלב 1 (זוויות קודקודיות, זוויות צמודות) ושלב 2 (חפיפה: צ.ז.צ, צ.צ.צ, ז.צ.ז). שרטוט חי שמדגיש את מה שכותבים, משוב בעברית לכל שורה, רמזים, ותצוגת קוד Lean לכל שורה ולהוכחה המלאה.
- **שדה הנימוק:** רק "נתון" ו"חשבון" מופיעים ככפתורים. את שאר הנימוקים מקלידים, ומקבלים השלמות מתוך 62 נימוקים לכל 11 השלבים (נימוקים משלבים מאוחרים מופיעים נעולים). נימוק שהדמו עוד לא יודע לבדוק (מסומן בארגז הכלים) נדחה תמיד.
- **נימוקים פשוטים מוצעים לבד:** נתון, צלע משותפת, זווית משותפת (גם כשאותה זווית נקראת בשמות שונים, כמו $∢ABD$ ו-$∢ABC$ כש-$D$ על $BC$) וחישוב מהשורות הקודמות.
- **הקלדה נוחה:** `<` או `>` בתחילת איבר הופכים ל-$∢$, ואותיות קטנות הופכות לגדולות.
- **בדיקה ב-Lean:** כשהאתר רץ מקומית ושירות הבדיקה של פרויקט ה-Lean פועל (`assets/js/lean-service.js`), Lean הוא שבודק כל שורה. באתר הציבורי הבדיקה נשארת בדפדפן.
- עברית (ימין לשמאל) ואנגלית, ערכת "מחברת" בהירה וערכת "לוח" כהה.

## מבנה

```text
index.html
assets/
  css/styles.css     עיצוב
  js/app.js          ניתוב ותצוגות
  js/data.js         נושאים, שלבים, קטלוג נימוקים, שאלות
  js/geo.js          ניתוח טענות, נרמול, בדיקה ויצירת Lean
  js/diagram.js      שרטוט SVG והדגשות
  js/i18n.js         מחרוזות בעברית ובאנגלית
  js/icons.js        אייקונים ולוגו
  js/auth.js         חשבונות: Firebase, סנכרון התקדמות, פעולות מנהל
  js/account.js      דפי כניסה, הרשמה, החשבון שלי וניהול
  js/firebase-config.js  הגדרות Firebase ושם המשתמש של בעל האתר
  css/account.css    עיצוב דפי החשבון
firebase/firestore.rules  כללי האבטחה של Firestore
```

אין שלב בנייה: קבצים סטטיים בלבד, ומתאים ל-GitHub Pages.

## הרצה מקומית

```powershell
python -m http.server 5180
```

ואז לפתוח את `http://localhost:5180`.

## חשבונות תלמידים

תלמידים פותחים חשבון עם שם משתמש וסיסמה, וההתקדמות שלהם נשמרת בענן (Firebase Auth + Firestore). המשחק עצמו פתוח גם בלי חשבון.

- **קישורי הרשמה לפי מסלול:** `#/join/3`, `#/join/4`, `#/join/5`, `#/join/uni`. מי שנרשם בקישור משויך למסלול שלו. `#/join` מציג את ארבעת המסלולים לבחירה.
- **כניסה:** `#/login`. **החשבון שלי:** `#/account` (התקדמות, שינוי שם, החלפת סיסמה, יציאה).
- **ניהול:** `#/admin`, למנהלים בלבד. העתקת קישורי ההרשמה, פתיחה וסגירה של הרשמה לכל מסלול, טבלת תלמידים עם חיפוש וסינון, ההתקדמות של כל תלמיד, שינוי מסלול, חסימה, מחיקה, ייצוא ל-CSV. בעל האתר יכול גם למנות מנהלים נוספים.
- **חשבון המנהל** נפתח ב-`#/join/staff`, רק עם שם המשתמש שמוגדר כבעל האתר.
- אין שחזור סיסמה במייל: שם המשתמש נשמר ב-Firebase ככתובת `<שם>@leangame.example`, שלא מקבלת דואר.
- ההרשאות נאכפות בשרת, ב-`firebase/firestore.rules`, ולא רק בדף.
- **מצב בדיקה מקומי:** כל עוד `FIREBASE_CONFIG` ריק, האתר ב-`localhost` שומר חשבונות בדפדפן בלבד, ושם המשתמש של המנהל הוא `admin`. באתר הציבורי אין חשבונות עד שמחברים Firebase.

### חיבור Firebase (פעם אחת)

1. ב-[Firebase console](https://console.firebase.google.com) יוצרים פרויקט חדש (בלי Google Analytics).
2. **Authentication → Get started → Sign-in method:** מפעילים **Email/Password**.
3. **Firestore Database → Create database:** מצב production, אזור `eur3` (אירופה).
4. **Project settings → General → Your apps:** מוסיפים אפליקציית Web, ומעתיקים את אובייקט ה-`firebaseConfig` אל `FIREBASE_CONFIG` ב-`assets/js/firebase-config.js`.
5. בוחרים שם משתמש לבעל האתר. כותבים אותו ב-`OWNER_USERNAME` (אותו קובץ), ובמקום `OWNER_LOGIN` ב-`firebase/firestore.rules`.
6. **Firestore Database → Rules:** מדביקים את `firebase/firestore.rules` ולוחצים Publish.
7. **Authentication → Settings → Authorized domains:** מוסיפים את `trigonomather-design.github.io`.
8. נכנסים ל-`#/join/staff` באתר ונרשמים עם שם המשתמש של בעל האתר.

## הוספת שאלה

מוסיפים אובייקט ל-`PROBLEMS` ב-`assets/js/data.js`: נקודות עם קואורדינטות, קטעים, עובדות מהשרטוט, נתונים, מה צריך להוכיח, סימונים, הנימוקים המותרים ורמזים. הפורמט עוקב אחרי פורמט השאלות במדריך (`LEAN information/LEAN_GUIDE_he.md`, סעיף 8.4).

---

## English

A proof game for high school: build a proof in a **claim | reason** table, and Lean checks every row. Geometry is the first topic. The site is static (no build step) and is served by GitHub Pages. In this prototype the checking runs in the browser using the same catalog rules; the full version will send each row to a Lean + Mathlib checking service. Hebrew is the primary language; English is a toggle.

**Student accounts.** Students sign up with a username and password through a link per track (`#/join/3`, `#/join/4`, `#/join/5`, `#/join/uni`), and their progress syncs to Firebase (Auth + Firestore). Admins manage sign-up links, students and progress at `#/admin`. Access is enforced by `firebase/firestore.rules`. Setup steps are in the Hebrew section "חיבור Firebase" above. Until `FIREBASE_CONFIG` is set, accounts work only on localhost, stored in the browser.
