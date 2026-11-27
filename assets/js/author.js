// The teacher question editor and the teacher question bank.
//   #/bank          the bank: every published question (staff also see drafts), to solve, edit or delete
//   #/author        a new question: 1. the words and the drawing → 2. the review, filled in automatically
//                   from both, where the teacher checks every part → 3. saved in the bank
//   #/author/<id>   edit a question of the bank (its author, or an admin)
// The reading and checking is in qparse.js, the storage in qbank.js. Strings live here, like account.js.

import { getLang, esc, L, rich, mathSpan, t as siteT } from './i18n.js';
import { STAGES, REASONS, stageNumber } from './data.js';
import { parseClaim, leanClaim, prepareProblem } from './geo.js';
import { renderDiagram, claimToItems } from './diagram.js';
import { icon } from './icons.js';
import * as auth from './auth.js';
import * as bank from './qbank.js';
import * as Q from './qparse.js';
import { problemToLean, leanToQuestion } from './leanconv.js';

// ---------------------------------------------------------------- strings

const S = {
  he: {
    'bank.kicker': 'שאלות מורים',
    'bank.title': 'מאגר שאלות מורים',
    'bank.lead': 'שאלות שמורים ומנהלים הוסיפו. כל שאלה עברה את אותן בדיקות כמו שאלות המשחק: השרטוט מקיים את הנתונים, והצ"ל נכון בו.',
    'bank.new': 'שאלה חדשה',
    'bank.empty': 'עוד אין שאלות במאגר.',
    'bank.emptyStaff': 'עוד אין שאלות במאגר. הוסיפו את הראשונה.',
    'bank.search': 'חיפוש בכותרת או בשם המורה',
    'bank.allStages': 'כל השלבים',
    'bank.mine': 'רק שלי',
    'bank.play': 'פתרון',
    'bank.edit': 'עריכה',
    'bank.copy': 'העתקת קישור',
    'bank.copied': 'הועתק',
    'bank.delete': 'מחיקה',
    'bank.sure': 'למחוק? לחצו שוב',
    'bank.draft': 'טיוטה',
    'bank.count': '{n} שאלות',
    'bank.count1': 'שאלה אחת',
    'bank.stage': 'שלב {n} · {name}',

    'ed.kicker': 'מאגר שאלות מורים',
    'ed.titleNew': 'שאלה חדשה',
    'ed.titleEdit': 'עריכת שאלה',
    'ed.step1': 'כתיבה ושרטוט',
    'ed.step2': 'בדיקת הנתונים',
    'ed.step3': 'נשמר במאגר',
    'ed.text.h': 'נוסח השאלה',
    'ed.text.lead': 'כתבו כמו בדף עבודה: שורת תיאור, שורת "נתון:" ושורת "הוכיחו:". מקביל כותבים $∥$ (או ||), זווית $∢$ (או <).',
    'ed.text.ph': 'במשולש ABC הנקודה D נמצאת על הצלע BC.\nנתון: AB = AC, AD חוצה את זווית BAC.\nהוכיחו: BD = CD.',
    'ed.example': 'דוגמה',
    'lean.import': 'ייבוא מ-Lean',
    'lean.paste': 'הדביקו כאן משפט Lean',
    'lean.importLead': 'נקודות מסוג Point, והנחות באוצר המילים של המשחק: len, ang, Sbtw, Par, Perp, Cong, Sim, IsParallelogram, IsMidpoint, IsTangent ועוד. נבנים נוסח בעברית ושרטוט שבו כל הנתונים מתקיימים, ואפשר לשנות את שניהם לפני הבדיקה.',
    'lean.convert': 'המרה לשאלה',
    'lean.close': 'סגירה',
    'lean.done': 'הנוסח והשרטוט מוכנים. עברו עליהם והמשיכו כרגיל.',
    'lean.line': 'שורה {n}:',
    'lean.h': 'Lean',
    'lean.lead': 'השאלה כמשפט Lean עם sorry, באוצר המילים של הספרייה. הנוסח שלכם נשמר בהערות, כך שייבוא חוזר מחזיר אותו.',
    'lean.show': 'הצגת ה-Lean',
    'lean.hide': 'הסתרה',
    'lean.copy': 'העתקה',
    'lean.copied': 'הועתק',
    'lean.download': 'הורדת קובץ',
    'lean.fixFirst': 'קודם צריך לתקן את הבעיות שלמעלה.',
    'lean.added': 'נוספו מהשרטוט עובדות שהמשפט צריך: {list}.',
    'ed.chips.sym': 'סימנים',
    'ed.chips.words': 'מושגים',
    'ed.chips.parts': 'מבנה',
    'ed.live.givens': '{n} נתונים',
    'ed.live.given1': 'נתון אחד',
    'ed.live.goal': 'צ"ל: {c}',
    'ed.live.ask': 'חישוב: {c}',
    'ed.live.noGoal': 'חסרה שורת "הוכיחו:"',
    'ed.live.unknown': '{n} לא הובנו',
    'ed.live.missing': 'חסרות בשרטוט: {pts}',
    'ed.live.next': 'הנקודה הבאה תיקרא {p}',
    'ed.draw.h': 'שרטוט',
    'ed.next': 'לבדיקת הנתונים',
    'ed.needDrawing': 'שרטטו קודם את השאלה: לפחות שתי נקודות.',
    'ed.needText': 'כתבו קודם את נוסח השאלה.',
    'ed.restored': 'המשכתם מטיוטה שנשמרה בדפדפן הזה.',
    'ed.startOver': 'להתחיל מחדש',
    'ed.sureClear': 'לנקות את השרטוט? לחצו שוב',

    'tool.move': 'בחירה והזזה',
    'tool.point': 'נקודה',
    'tool.seg': 'קטע',
    'tool.circ': 'מעגל',
    'tool.del': 'מחיקה',
    'tool.ang': 'זווית',
    'tool.len': 'אורך',
    'hint.ang': 'לחצו על שלוש נקודות: שוק, קודקוד, שוק. אחר כך כתבו את גודל הזווית, או בחרו שאותה צריך לחשב.',
    'hint.len': 'לחצו על קטע. אחר כך כתבו את האורך שלו, או בחרו שאותו צריך לחשב.',
    'sel.askIt': 'חשבו את {x}',
    'sel.addIt': 'הוספה',
    'sel.cancel': 'ביטול',
    'tool.undo': 'ביטול',
    'tool.clear': 'ניקוי',
    'tool.grid': 'הצמדה לרשת',
    'hint.move': 'גררו נקודות. לחצו על קטעים, נקודות או מעגל כדי לבחור אותם ולהוסיף טענה. לחיצה כפולה על נקודה משנה את שמה.',
    'hint.point': 'לחצו כדי להוסיף נקודה. ליד קטע היא נצמדת אליו, בחיתוך של שני קטעים לחיתוך, וליד מעגל למעגל.',
    'hint.seg': 'לחצו על נקודת ההתחלה ואז על נקודת הסוף. לחיצה במקום ריק יוצרת נקודה.',
    'hint.seg2': 'עכשיו נקודת הסוף. Esc מבטל.',
    'hint.circ': 'לחצו על המרכז, ואז על נקודה שעל המעגל.',
    'hint.circ2': 'עכשיו נקודה שעל המעגל. Esc מבטל.',
    'hint.del': 'לחצו על נקודה, קטע או מעגל כדי למחוק.',
    'snap.seg': 'על {s}',
    'snap.x': 'החיתוך של {a} ו-{b}',
    'snap.circ': 'על המעגל',
    'sel.lead': 'הוספת טענה מהבחירה',
    'sel.toGiven': 'לנתונים',
    'sel.toGoal': 'לצ"ל',
    'sel.eq': 'שווים',
    'sel.par': 'מקבילים',
    'sel.perp': 'מאונכים',
    'sel.len': 'אורך…',
    'sel.mid': 'אמצע',
    'sel.ang': 'גודל…',
    'sel.right': 'ישרה',
    'sel.rename': 'שינוי שם',
    'sel.none': 'בחרו שני קטעים, קטע ונקודה, שלוש נקודות (זווית, הקודקוד באמצע) או ארבע נקודות (מרובע).',
    'sel.clear': 'ניקוי הבחירה',
    'sel.askLen': 'מה האורך של {s}?',
    'sel.askAng': 'כמה מעלות {a}?',
    'ren.label': 'שם חדש לנקודה {p}',
    'ren.taken': 'כבר יש נקודה {p}.',
    'ren.bad': 'שם של נקודה הוא אות לטינית אחת.',

    'rv.lead': 'התוכנה מילאה את כל הנתונים מהנוסח ומהשרטוט. עברו על כל חלק, תקנו אם צריך, וסמנו "בדקתי".',
    'rv.back': 'חזרה לכתיבה ולשרטוט',
    'rv.try': 'לנסות לפתור',
    'rv.save': 'שמירה במאגר',
    'rv.update': 'שמירת השינויים',
    'rv.saving': 'שומר…',
    'rv.checked': 'בדקתי',
    'rv.status': 'מי רואה',
    'rv.published': 'כולם (מפורסמת)',
    'rv.draftS': 'רק הצוות (טיוטה)',
    'rv.meta': 'פרטי השאלה',
    'rv.figure': 'השרטוט',
    'rv.givens': 'נתונים',
    'rv.goal': 'צריך להוכיח',
    'rv.goalAsk': 'מה מחשבים',
    'rv.marks': 'סימונים בשרטוט',
    'rv.hints': 'רמזים',
    'rv.optional': 'לא חובה',
    'rv.title': 'כותרת',
    'rv.stage': 'שלב',
    'rv.stageWhy': 'הוצע כי {why}. השלב קובע אילו נימוקים פתוחים לתלמיד.',
    'why.trig': 'יש סינוס, קוסינוס או טנגנס',
    'why.circle': 'יש מעגל',
    'why.sim': 'יש דמיון או יחס',
    'why.pyth': 'יש ריבועים של צלעות',
    'why.midseg': 'יש שני אמצעים',
    'why.quad': 'יש מרובע מיוחד',
    'why.ineq': 'יש אי-שוויון',
    'why.par': 'יש ישרים מקבילים',
    'why.iso': 'יש משולש שווה שוקיים',
    'why.cong': 'יש שוויון קטעים, כנראה בחפיפה',
    'why.angles': 'יש רק זוויות',
    'rv.intro': 'תיאור',
    'rv.introHint': 'מה שהתלמיד קורא מעל השרטוט. שמות נקודות בין סימני $, למשל $ABC$.',
    'rv.preview': 'כך זה ייראה:',
    'pub.needSolve': 'כדי לפרסם לכולם, פתרו את השאלה קודם: לחצו "לנסות לפתור" והשלימו הוכחה שהבודק מקבל. טיוטה אפשר לשמור גם בלי לפתור.',
    'pub.solved': 'פתרתם את השאלה, ואפשר לפרסם אותה.',
    'pub.draft': 'טיוטה אפשר לשמור גם בלי לפתור. כדי לפרסם לכולם, פתרו אותה קודם.',
    'be.unsolved': 'אי אפשר לפרסם שאלה שלא פתרתם. פתחו אותה בעורך, לחצו "לנסות לפתור" והשלימו הוכחה.',
    'rv.points': 'נקודות',
    'rv.pt.seg': 'על {s}',
    'rv.pt.x': 'חיתוך',
    'rv.pt.circ': 'על המעגל',
    'rv.config': 'עובדות מהשרטוט',
    'rv.configLead': 'התלמיד מקבל אותן בלי הוכחה, כמו בשאלות המשחק.',
    'rv.noConfig': 'אין עובדות מיקום: אף נקודה לא נמצאת על קטע או על מעגל.',
    'rv.textFacts': 'מה שהנוסח אומר על המיקום',
    'rv.straighten': 'יישור השרטוט לפי הנתונים',
    'rv.straightenLead': 'מזיז את הנקודות החופשיות מעט, עד שכל הנתונים מתקיימים בשרטוט בדיוק.',
    'rv.straightened': 'השרטוט יושר: כל הנתונים מתקיימים בו.',
    'rv.straightenFail': 'לא הצלחתי ליישר כך שכל הנתונים יתקיימו. ייתכן שהנתונים סותרים, או שצריך לשנות את השרטוט ביד.',
    'rv.unstraighten': 'החזרת השרטוט הקודם',
    'rv.scale': 'קנה המידה של השרטוט נקבע לפי {s}.',
    'rv.claimPh': 'למשל AB = AC',
    'rv.addGiven': 'הוספה',
    'rv.remove': 'הסרה',
    'rv.src': 'בנוסח: {s}',
    'rv.shown': 'התלמיד רואה: {t}',
    'rv.also': 'אפשר לצטט אותו גם כ"{r}"',
    'rv.ok': 'מתקיים בשרטוט',
    'rv.notOk': 'לא מתקיים בשרטוט',
    'rv.cant': 'אין קנה מידה לבדוק',
    'rv.askLead': 'השאלה מבקשת לחשב את {t}. מה התשובה?',
    'rv.askPh': 'למשל 40°',
    'rv.measured': 'בשרטוט: {v}',
    'rv.marksLead': 'הסימונים נוצרו מהנתונים ומהצ"ל. כבו סימון כדי להסתיר אותו.',
    'rv.noMarks': 'אין סימונים.',
    'mk.tick': 'קטעים שווים: {s}',
    'mk.arc': 'קשת: {a}',
    'mk.right': 'זווית ישרה: {a}',
    'mk.par': 'חץ מקביל: {s}',
    'rv.addHint': 'הוספת רמז',
    'rv.hintPh': 'רמז לתלמיד. נוסחאות בין סימני $.',
    'rv.problems': 'מה צריך לתקן',
    'rv.warnings': 'כדאי לבדוק',
    'rv.allGood': 'הכול תקין.',
    'rv.needChecks': 'נשאר לסמן "בדקתי" ב: {list}.',
    'rv.ready': 'הכול תקין ונבדק. אפשר לשמור.',
    'rv.dismiss': 'להתעלם',

    'e.givenBad': 'הנתון {c} לא נקרא. {err}',
    'e.goalBad': 'הצ"ל {c} לא נקרא. {err}',
    'e.noGoal': 'אין צ"ל. כתבו בנוסח שורה שמתחילה ב"הוכיחו:".',
    'e.goalNoValue': 'כתבו את התשובה לשאלה.',
    'e.goalIsGiven': 'הצ"ל כבר מופיע בנתונים.',
    'e.noDrawing': 'אין שרטוט.',
    'e.missingPoints': 'הנקודות {pts} מופיעות בשאלה אבל לא בשרטוט.',
    'e.unknown': 'לא הבנתי את "{src}". {err}',
    'e.unknownTip': 'נסחו את זה כטענה, למשל $AB = AC$, או התעלמו אם זה רק תיאור.',
    'e.factNotDrawn': 'בנוסח: {f}. בשרטוט זה לא כך.',
    'e.notWitness': 'השרטוט לא מקיים את כל הנתונים. לחצו "יישור השרטוט לפי הנתונים", או תקנו את השרטוט ביד.',
    'e.goalFalse': 'כל הנתונים מתקיימים בשרטוט, אבל הצ"ל לא ({m}). ייתכן שחסר נתון, או שהצ"ל לא נכון.',
    'e.answerWrong': 'בשרטוט המדויק {m}, וזה לא מתאים לתשובה שכתבתם.',
    'w.givenNotDrawn': 'הנתון {c} לא מתקיים בשרטוט.',
    'w.noGivens': 'אין נתונים. זה בסדר רק אם הכול נובע מהשרטוט.',
    'w.unusedPoints': 'הנקודות {pts} בשרטוט לא מוזכרות בשאלה.',
    'w.extraGoals': 'יש יותר מצ"ל אחד. המשחק בודק את הראשון. את האחרים ({c}) אפשר להוסיף כשאלות נפרדות.',
    'w.manyCircles': 'יש יותר ממעגל אחד. הבודק מכיר כרגע מעגל אחד בכל שאלה.',
    'w.isoAssumed': 'הנחתי שהקודקוד של המשולש שווה השוקיים הוא האות הראשונה: {c}. אם לא, תקנו את הנתון.',
    'w.rightAssumed': 'הנחתי שהזווית הישרה היא {c}. אם לא, תקנו את הנתון.',
    'w.tangentNotDrawn': 'המשיק {f} לא מאונך לרדיוס בשרטוט ({a}°).',
    'f.on': '${p}$ על ${a}{b}$',
    'f.ext': '${p}$ על המשך ${a}{b}$',
    'f.cross': '${l1}$ ו-${l2}$ נחתכים ב-${o}$',
    'f.circle': '${pts}$ על המעגל',
    'f.center': '${o}$ מרכז המעגל',
    'f.diam': '${a}{b}$ קוטר',
    'f.online': '${p}$ על הישר ${line}$',
    'f.tangent': '${a}{b}$ משיק',

    'done.title': 'השאלה נשמרה במאגר',
    'done.lead': 'היא נמצאת עכשיו במאגר שאלות המורים. אפשר לפתור אותה, לשלוח קישור לתלמידים או להמשיך לערוך.',
    'done.leadDraft': 'היא נשמרה כטיוטה: רק הצוות רואה אותה. כשתהיה מוכנה, שנו את "מי רואה" ל"כולם".',
    'done.play': 'לפתור את השאלה',
    'done.bank': 'למאגר',
    'done.new': 'שאלה חדשה',
    'done.copy': 'העתקת קישור לתלמידים',
    'done.edit': 'המשך עריכה',

    'be.denied': 'אין הרשאה. רק מורים ומנהלים מוסיפים שאלות, ורק מי שכתב שאלה או מנהל עורכים אותה.',
    'be.network': 'אין חיבור לשרת. נסו שוב.',
    'be.off': 'המאגר זמין כשחשבונות האתר פעילים.',
    'be.noTitle': 'חסרה כותרת לשאלה.',
    'be.tooBig': 'השאלה גדולה מדי לשמירה.',
    'be.unknown': 'משהו השתבש. נסו שוב.',
    'be.notFound': 'השאלה לא נמצאה במאגר.',
    'acc.login': 'כדי להוסיף שאלות צריך להיכנס לחשבון של מורה או מנהל.',
    'acc.staff': 'רק מורים ומנהלים מוסיפים שאלות למאגר.',
    'acc.loginBtn': 'כניסה',
    'acc.notYours': 'אפשר לערוך רק שאלות שכתבתם. מנהלים עורכים הכול.',
  },
  en: {
    'bank.kicker': 'Teacher questions',
    'bank.title': 'Teacher question bank',
    'bank.lead': 'Questions added by teachers and admins. Each one passed the same checks as the game’s own questions: the drawing satisfies the givens, and the goal holds in it.',
    'bank.new': 'New question',
    'bank.empty': 'No questions in the bank yet.',
    'bank.emptyStaff': 'No questions in the bank yet. Add the first one.',
    'bank.search': 'Search titles or teachers',
    'bank.allStages': 'All stages',
    'bank.mine': 'Mine only',
    'bank.play': 'Solve',
    'bank.edit': 'Edit',
    'bank.copy': 'Copy link',
    'bank.copied': 'Copied',
    'bank.delete': 'Delete',
    'bank.sure': 'Delete? Click again',
    'bank.draft': 'Draft',
    'bank.count': '{n} questions',
    'bank.count1': 'One question',
    'bank.stage': 'Stage {n} · {name}',

    'ed.kicker': 'Teacher question bank',
    'ed.titleNew': 'New question',
    'ed.titleEdit': 'Edit question',
    'ed.step1': 'Words and drawing',
    'ed.step2': 'Check the data',
    'ed.step3': 'Saved',
    'ed.text.h': 'The question',
    'ed.text.lead': 'Write it as on a worksheet: a line of setup, a "נתון:" (given) line and a "הוכיחו:" (prove) line. Parallel is $∥$ (or ||), angle is $∢$ (or <).',
    'ed.text.ph': 'במשולש ABC הנקודה D נמצאת על הצלע BC.\nנתון: AB = AC, AD חוצה את זווית BAC.\nהוכיחו: BD = CD.',
    'ed.example': 'Example',
    'lean.import': 'Import from Lean',
    'lean.paste': 'Paste a Lean theorem here',
    'lean.importLead': 'Points of type Point, and hypotheses in the game\'s vocabulary: len, ang, Sbtw, Par, Perp, Cong, Sim, IsParallelogram, IsMidpoint, IsTangent and more. You get Hebrew wording and a drawing where every given holds, and can change both before the review.',
    'lean.convert': 'Convert to a question',
    'lean.close': 'Close',
    'lean.done': 'The wording and the drawing are ready. Look them over and go on as usual.',
    'lean.line': 'Line {n}:',
    'lean.h': 'Lean',
    'lean.lead': 'The question as a Lean theorem with sorry, in the library\'s vocabulary. Your wording is kept in comments, so importing it again brings it back.',
    'lean.show': 'Show the Lean',
    'lean.hide': 'Hide',
    'lean.copy': 'Copy',
    'lean.copied': 'Copied',
    'lean.download': 'Download file',
    'lean.fixFirst': 'Fix the problems above first.',
    'lean.added': 'Facts from the picture that the theorem needs were added: {list}.',
    'ed.chips.sym': 'Symbols',
    'ed.chips.words': 'Words',
    'ed.chips.parts': 'Parts',
    'ed.live.givens': '{n} givens',
    'ed.live.given1': 'One given',
    'ed.live.goal': 'Prove: {c}',
    'ed.live.ask': 'Find: {c}',
    'ed.live.noGoal': 'No "הוכיחו:" line yet',
    'ed.live.unknown': '{n} not understood',
    'ed.live.missing': 'Not drawn yet: {pts}',
    'ed.live.next': 'The next point will be {p}',
    'ed.draw.h': 'Drawing',
    'ed.next': 'Check the data',
    'ed.needDrawing': 'Draw the question first: at least two points.',
    'ed.needText': 'Write the question first.',
    'ed.restored': 'You are continuing a draft saved in this browser.',
    'ed.startOver': 'Start over',
    'ed.sureClear': 'Clear the drawing? Click again',

    'tool.move': 'Select and move',
    'tool.point': 'Point',
    'tool.seg': 'Segment',
    'tool.circ': 'Circle',
    'tool.del': 'Delete',
    'tool.ang': 'Angle',
    'tool.len': 'Length',
    'hint.ang': 'Click three points: arm, vertex, arm. Then type the angle’s size, or choose to have it calculated.',
    'hint.len': 'Click a segment. Then type its length, or choose to have it calculated.',
    'sel.askIt': 'Find {x}',
    'sel.addIt': 'Add',
    'sel.cancel': 'Cancel',
    'tool.undo': 'Undo',
    'tool.clear': 'Clear',
    'tool.grid': 'Snap to grid',
    'hint.move': 'Drag points. Click segments, points or a circle to select them and add a claim. Double-click a point to rename it.',
    'hint.point': 'Click to add a point. Near a segment it sticks to it, at a crossing of two segments to the crossing, near a circle to the circle.',
    'hint.seg': 'Click the start point, then the end point. Clicking empty space makes a point.',
    'hint.seg2': 'Now the end point. Esc cancels.',
    'hint.circ': 'Click the center, then a point on the circle.',
    'hint.circ2': 'Now a point on the circle. Esc cancels.',
    'hint.del': 'Click a point, segment or circle to delete it.',
    'snap.seg': 'on {s}',
    'snap.x': 'where {a} and {b} cross',
    'snap.circ': 'on the circle',
    'sel.lead': 'Add a claim from the selection',
    'sel.toGiven': 'to givens',
    'sel.toGoal': 'as goal',
    'sel.eq': 'equal',
    'sel.par': 'parallel',
    'sel.perp': 'perpendicular',
    'sel.len': 'length…',
    'sel.mid': 'midpoint',
    'sel.ang': 'size…',
    'sel.right': 'right',
    'sel.rename': 'Rename',
    'sel.none': 'Select two segments, a segment and a point, three points (an angle, vertex in the middle) or four points (a quadrilateral).',
    'sel.clear': 'Clear selection',
    'sel.askLen': 'How long is {s}?',
    'sel.askAng': 'How many degrees is {a}?',
    'ren.label': 'New name for point {p}',
    'ren.taken': 'There is already a point {p}.',
    'ren.bad': 'A point’s name is one Latin letter.',

    'rv.lead': 'Everything below was filled in from the words and the drawing. Go over each part, fix what is needed, and tick "Checked".',
    'rv.back': 'Back to words and drawing',
    'rv.try': 'Try solving it',
    'rv.save': 'Save to the bank',
    'rv.update': 'Save changes',
    'rv.saving': 'Saving…',
    'rv.checked': 'Checked',
    'rv.status': 'Who sees it',
    'rv.published': 'Everyone (published)',
    'rv.draftS': 'Staff only (draft)',
    'rv.meta': 'About the question',
    'rv.figure': 'The drawing',
    'rv.givens': 'Givens',
    'rv.goal': 'To prove',
    'rv.goalAsk': 'To find',
    'rv.marks': 'Marks on the drawing',
    'rv.hints': 'Hints',
    'rv.optional': 'optional',
    'rv.title': 'Title',
    'rv.stage': 'Stage',
    'rv.stageWhy': 'Suggested because {why}. The stage decides which reasons the student can use.',
    'why.trig': 'there is a sine, cosine or tangent',
    'why.circle': 'there is a circle',
    'why.sim': 'there is a similarity or a ratio',
    'why.pyth': 'there are squared sides',
    'why.midseg': 'there are two midpoints',
    'why.quad': 'there is a special quadrilateral',
    'why.ineq': 'there is an inequality',
    'why.par': 'there are parallel lines',
    'why.iso': 'there is an isosceles triangle',
    'why.cong': 'segments are equal, probably by congruence',
    'why.angles': 'there are only angles',
    'rv.intro': 'Setup',
    'rv.introHint': 'What the student reads above the drawing. Put point names between $ signs, like $ABC$.',
    'rv.preview': 'It will look like this:',
    'pub.needSolve': 'To publish for everyone, solve the question first: press "Try solving it" and finish a proof the checker accepts. You can save a draft without solving.',
    'pub.solved': 'You solved the question, so it can be published.',
    'pub.draft': 'A draft can be saved without solving. To publish for everyone, solve it first.',
    'be.unsolved': 'You cannot publish a question you have not solved. Open it in the editor, press "Try solving it" and finish a proof.',
    'rv.points': 'Points',
    'rv.pt.seg': 'on {s}',
    'rv.pt.x': 'crossing',
    'rv.pt.circ': 'on the circle',
    'rv.config': 'Facts from the drawing',
    'rv.configLead': 'The student gets them without proof, as in the game’s questions.',
    'rv.noConfig': 'No position facts: no point lies on a segment or a circle.',
    'rv.textFacts': 'What the words say about positions',
    'rv.straighten': 'Straighten the drawing to fit the givens',
    'rv.straightenLead': 'Moves the free points a little until every given holds exactly.',
    'rv.straightened': 'Straightened: every given holds in the drawing.',
    'rv.straightenFail': 'I couldn’t make every given hold. The givens may contradict each other, or the drawing needs a change by hand.',
    'rv.unstraighten': 'Bring back the previous drawing',
    'rv.scale': 'The drawing’s scale is set by {s}.',
    'rv.claimPh': 'e.g. AB = AC',
    'rv.addGiven': 'Add',
    'rv.remove': 'Remove',
    'rv.src': 'In the words: {s}',
    'rv.shown': 'The student sees: {t}',
    'rv.also': 'Can also be cited as "{r}"',
    'rv.ok': 'holds in the drawing',
    'rv.notOk': 'does not hold in the drawing',
    'rv.cant': 'no scale to check',
    'rv.askLead': 'The question asks to find {t}. What is the answer?',
    'rv.askPh': 'e.g. 40°',
    'rv.measured': 'In the drawing: {v}',
    'rv.marksLead': 'The marks come from the givens and the goal. Switch one off to hide it.',
    'rv.noMarks': 'No marks.',
    'mk.tick': 'equal segments: {s}',
    'mk.arc': 'arc: {a}',
    'mk.right': 'right angle: {a}',
    'mk.par': 'parallel arrow: {s}',
    'rv.addHint': 'Add a hint',
    'rv.hintPh': 'A hint for the student. Math between $ signs.',
    'rv.problems': 'To fix',
    'rv.warnings': 'Worth a look',
    'rv.allGood': 'All good.',
    'rv.needChecks': 'Still to tick "Checked": {list}.',
    'rv.ready': 'All good and checked. Ready to save.',
    'rv.dismiss': 'Ignore',

    'e.givenBad': 'The given {c} can’t be read. {err}',
    'e.goalBad': 'The goal {c} can’t be read. {err}',
    'e.noGoal': 'There is no goal. Add a line that starts with "הוכיחו:".',
    'e.goalNoValue': 'Write the answer.',
    'e.goalIsGiven': 'The goal is already one of the givens.',
    'e.noDrawing': 'There is no drawing.',
    'e.missingPoints': 'Points {pts} are in the question but not in the drawing.',
    'e.unknown': 'I didn’t understand "{src}". {err}',
    'e.unknownTip': 'Write it as a claim, like $AB = AC$, or ignore it if it is only description.',
    'e.factNotDrawn': 'The words say: {f}. The drawing doesn’t.',
    'e.notWitness': 'The drawing doesn’t satisfy every given. Press "Straighten the drawing", or fix it by hand.',
    'e.goalFalse': 'Every given holds in the drawing, but the goal doesn’t ({m}). A given may be missing, or the goal is wrong.',
    'e.answerWrong': 'In the exact drawing {m}, which doesn’t match your answer.',
    'w.givenNotDrawn': 'The given {c} doesn’t hold in the drawing.',
    'w.noGivens': 'There are no givens. That’s fine only if everything follows from the drawing.',
    'w.unusedPoints': 'Points {pts} are drawn but not mentioned in the question.',
    'w.extraGoals': 'There is more than one goal. The game checks the first; the others ({c}) can be separate questions.',
    'w.manyCircles': 'There is more than one circle. The checker knows one circle per question for now.',
    'w.isoAssumed': 'I assumed the apex of the isosceles triangle is its first letter: {c}. Fix the given if not.',
    'w.rightAssumed': 'I assumed the right angle is {c}. Fix the given if not.',
    'w.tangentNotDrawn': 'The tangent {f} is not perpendicular to the radius in the drawing ({a}°).',
    'f.on': '${p}$ on ${a}{b}$',
    'f.ext': '${p}$ on ${a}{b}$ extended',
    'f.cross': '${l1}$ and ${l2}$ meet at ${o}$',
    'f.circle': '${pts}$ on the circle',
    'f.center': '${o}$ is the center',
    'f.diam': '${a}{b}$ is a diameter',
    'f.online': '${p}$ on line ${line}$',
    'f.tangent': '${a}{b}$ is a tangent',

    'done.title': 'The question is in the bank',
    'done.lead': 'It is now in the teacher question bank. Solve it, send students the link, or keep editing.',
    'done.leadDraft': 'It was saved as a draft: only staff see it. When it is ready, set "Who sees it" to "Everyone".',
    'done.play': 'Solve the question',
    'done.bank': 'To the bank',
    'done.new': 'New question',
    'done.copy': 'Copy the link for students',
    'done.edit': 'Keep editing',

    'be.denied': 'Not allowed. Only teachers and admins add questions, and only a question’s author or an admin edits it.',
    'be.network': 'No connection to the server. Try again.',
    'be.off': 'The bank works when site accounts are on.',
    'be.noTitle': 'The question needs a title.',
    'be.tooBig': 'The question is too big to save.',
    'be.unknown': 'Something went wrong. Try again.',
    'be.notFound': 'The question is not in the bank.',
    'acc.login': 'Log in with a teacher or admin account to add questions.',
    'acc.staff': 'Only teachers and admins add questions to the bank.',
    'acc.loginBtn': 'Log in',
    'acc.notYours': 'You can edit only the questions you wrote. Admins edit all of them.',
  },
};

function tt(key, vars) {
  let s = S[getLang()]?.[key] ?? S.he[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}
// Teacher text with $math$: everything outside $…$ escaped, $…$ typeset (and escaped there).
const srich = (s) => rich(Q.escRich(s));
// A string of this module with variables that may be teacher text.
const tr = (key, vars) => srich(tt(key, vars));
const errText = (e) => tt('be.' + (e && e.code ? e.code : 'unknown'));
const geoErr = (err) => (err ? rich(siteT('err.' + err.key, err.vars || {})) : '');

// ---------------------------------------------------------------- styles

let cssReady = null;
function ensureCss() {
  if (!cssReady) {
    cssReady = new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = new URL('../css/author.css', import.meta.url).href;
      link.onload = resolve;
      link.onerror = resolve;
      document.head.append(link);
    });
  }
  return cssReady;
}

const TOOL_IC = {
  move: '<path d="M6 3.5l12 6.2-5.3 1.6-2.2 5.2z"/><path d="M12.7 11.3l5 5"/>',
  point: '<circle cx="12" cy="12" r="3.2" fill="currentColor"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/>',
  seg: '<path d="M5 18L19 6"/><circle cx="5" cy="18" r="2" fill="currentColor"/><circle cx="19" cy="6" r="2" fill="currentColor"/>',
  circ: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
  ang: '<path d="M4 19h16M4 19L15 5"/><path d="M10 19a6 6 0 0 0-2.2-4.7"/>',
  len: '<path d="M4 17h16M4 14v6M20 14v6"/><path d="M8 9h8M8 9l2-2M8 9l2 2M16 9l-2-2M16 9l-2 2"/>',
  grid: '<path d="M4 9h16M4 15h16M9 4v16M15 4v16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  wand: '<path d="M4 20L15 9"/><path d="M15 4v3M19 9h-3M18.2 5.8l-2 2M13 4.5l.6 1.6M20 11l-1.6-.6"/>',
};
// The angle and length tools: arcs for the angles the question names, and the value field of the
// selection bar (instead of a browser prompt). Styled here so author.css stays as it is.
function angStyle() {
  if (document.getElementById('au-ang-style')) return;
  const st = document.createElement('style');
  st.id = 'au-ang-style';
  st.textContent = `
.au-svg .au-arc { fill: none; stroke: var(--pen); stroke-width: 2; }
.au-svg .au-arc.is-goal { stroke: var(--amber); stroke-dasharray: 4 3; }
.au-svg .au-arc.is-sel { stroke: var(--pen); stroke-width: 3.5; opacity: .55; }
.au-svg .au-arclabel { font: 700 13px var(--font-math); fill: var(--pen); text-anchor: middle; dominant-baseline: middle; paint-order: stroke; stroke: var(--card); stroke-width: 4px; }
.au-svg .au-arclabel.is-goal { fill: var(--amber); }
.au-askrow { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 8px; }
.au-askrow label { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-math); font-size: 1.05rem; direction: ltr; }
.au-askrow input { width: 84px; height: 36px; border-radius: 8px; border: 1.5px solid var(--pen); background: var(--paper); color: var(--ink); font: inherit; text-align: center; }
.au-askrow input:focus-visible { outline: 2.5px solid var(--pen); outline-offset: 1px; }
`;
  document.head.append(st);
}
// The arc of angle XVY in pixels, and where its label goes.
function arcAt(V, X, Y, r) {
  const a1 = Math.atan2(X[1] - V[1], X[0] - V[0]);
  let d = Math.atan2(Y[1] - V[1], Y[0] - V[0]) - a1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  const p = (t, rr = r) => [V[0] + rr * Math.cos(t), V[1] + rr * Math.sin(t)];
  const [p1, p2] = [p(a1), p(a1 + d)];
  return { path: `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}A${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`, label: p(a1 + d / 2, r + 15) };
}

const tic = (name) => `<span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${TOOL_IC[name]}</svg></span>`;

// ---------------------------------------------------------------- routes

export function authorTitle(parts) {
  return `${parts[0] === 'bank' ? tt('bank.title') : parts[1] ? tt('ed.titleEdit') : tt('ed.titleNew')} · LEANgame`;
}

// Mount the page for #/bank, #/author or #/author/<id>. Returns the cleanup function.
export function bindAuthor(root, parts) {
  let alive = true;
  const cleanups = [];
  root.innerHTML = `<section class="au"><div class="wrap au-wrap"><div class="acct-wait" aria-busy="true"></div></div></section>`;
  const host = root.querySelector('.au-wrap');
  document.title = authorTitle(parts);
  (async () => {
    await ensureCss();
    await auth.authReady;
    if (!alive) return;
    const run = parts[0] === 'bank' ? pageBank : pageEditor;
    const off = await run(host, parts, () => alive);
    if (typeof off === 'function') { if (alive) cleanups.push(off); else off(); }
  })().catch((e) => { console.error(e); if (alive) host.innerHTML = `<p class="au-msg is-err">${esc(tt('be.unknown'))}</p>`; });
  return () => { alive = false; cleanups.forEach((f) => f()); };
}

const stageName = (id) => { const s = STAGES.find((x) => x.id === id); return s ? tt('bank.stage', { n: stageNumber(id), name: L(s.name) }) : id; };
const fmtDate = (ms) => (ms ? new Intl.DateTimeFormat(getLang() === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' }).format(new Date(ms)) : '');
const linkFor = (id) => `${location.origin}${location.pathname}#/tq/${id}`;

async function copyText(s) {
  try { await navigator.clipboard.writeText(s); return true; } catch { return false; }
}

// ---------------------------------------------------------------- #/bank

async function pageBank(host, parts, alive) {
  const staff = auth.isStaff();
  const st = { list: null, q: '', stage: 'all', mine: false, error: null, armed: null };
  host.innerHTML = `
    <header class="au-head">
      <p class="kicker">${esc(tt('bank.kicker'))}</p>
      <h1 class="acct-h">${esc(tt('bank.title'))}</h1>
      <p class="acct-lead">${esc(tt('bank.lead'))}</p>
      ${staff ? `<div class="au-head-actions"><a class="btn btn-primary btn-small" href="#/author">${tic('plus')} ${esc(tt('bank.new'))}</a></div>` : ''}
    </header>
    <div class="au-bank-bar">
      <label class="adm-search">${icon('search')}<input type="search" id="bkQ" placeholder="${esc(tt('bank.search'))}" aria-label="${esc(tt('bank.search'))}"></label>
      <select id="bkStage" class="adm-select" aria-label="${esc(tt('rv.stage'))}">
        <option value="all">${esc(tt('bank.allStages'))}</option>
        ${STAGES.map((s) => `<option value="${s.id}">${esc(stageName(s.id))}</option>`).join('')}
      </select>
      ${staff ? `<label class="switch"><input type="checkbox" id="bkMine"><span class="switch-ui" aria-hidden="true"></span><span>${esc(tt('bank.mine'))}</span></label>` : ''}
      <span class="muted au-count" id="bkCount"></span>
    </div>
    <div class="au-bank" id="bkList"><div class="acct-wait"></div></div>`;
  const $ = (s) => host.querySelector(s);

  function visible() {
    const q = st.q.trim().toLowerCase();
    const me = auth.currentUser();
    return (st.list || []).filter((x) => (st.stage === 'all' || x.stage === st.stage)
      && (!st.mine || (me && x.authorUid === me.uid))
      && (!q || x.title.toLowerCase().includes(q) || x.authorName.toLowerCase().includes(q)));
  }

  function draw() {
    if (!alive()) return;
    const list = $('#bkList');
    if (st.error) { list.innerHTML = `<p class="au-msg is-err">${esc(st.error)}</p>`; return; }
    if (!st.list) return;
    const items = visible();
    $('#bkCount').textContent = items.length === 1 ? tt('bank.count1') : tt('bank.count', { n: items.length });
    if (!items.length) {
      list.innerHTML = `<div class="au-empty paper"><p>${esc(st.list.length ? '—' : staff ? tt('bank.emptyStaff') : tt('bank.empty'))}</p>${staff && !st.list.length ? `<a class="btn btn-primary btn-small" href="#/author">${tic('plus')} ${esc(tt('bank.new'))}</a>` : ''}</div>`;
      return;
    }
    list.innerHTML = items.map((x) => `
      <article class="au-card paper" data-id="${esc(x.id)}">
        <div class="au-card-fig" data-fig="${esc(x.id)}"></div>
        <div class="au-card-body">
          <p class="au-card-stage">${esc(stageName(x.stage))}${x.status === 'draft' ? ` <span class="badge au-draft">${esc(tt('bank.draft'))}</span>` : ''}</p>
          <h2 class="au-card-title">${esc(x.title)}</h2>
          <p class="muted au-card-by">${esc(x.authorName)}${x.updatedAt ? ` · ${esc(fmtDate(x.updatedAt))}` : ''}</p>
          <div class="au-card-actions">
            <a class="btn btn-primary btn-small" href="#/tq/${encodeURIComponent(x.id)}">${icon('play')} ${esc(tt('bank.play'))}</a>
            ${bank.canEdit(x) ? `<a class="tool-btn" href="#/author/${encodeURIComponent(x.id)}">${icon('edit')} ${esc(tt('bank.edit'))}</a>` : ''}
            <button type="button" class="tool-btn" data-copy="${esc(x.id)}">${tic('copy')} <span>${esc(tt('bank.copy'))}</span></button>
            ${bank.canEdit(x) ? `<button type="button" class="tool-btn au-del${st.armed === x.id ? ' armed' : ''}" data-del="${esc(x.id)}">${icon('trash')} <span>${esc(st.armed === x.id ? tt('bank.sure') : tt('bank.delete'))}</span></button>` : ''}
          </div>
        </div>
      </article>`).join('');
    // small diagrams
    for (const x of items) {
      const el = list.querySelector(`[data-fig="${CSS.escape(x.id)}"]`);
      try {
        const p = Q.playable(x, x.id);
        prepareProblem(p, x.stage);
        el.append(renderDiagram(p, { width: 300, height: 190, pad: 28, animate: false, label: x.title }).el);
      } catch (e) { console.warn('[bank] diagram', e); }
    }
  }

  host.addEventListener('input', (e) => { if (e.target.id === 'bkQ') { st.q = e.target.value; draw(); } });
  host.addEventListener('change', (e) => {
    if (e.target.id === 'bkStage') { st.stage = e.target.value; draw(); }
    if (e.target.id === 'bkMine') { st.mine = e.target.checked; draw(); }
  });
  let armTimer = 0;
  host.addEventListener('click', async (e) => {
    const cp = e.target.closest('[data-copy]');
    if (cp) {
      const ok = await copyText(linkFor(cp.dataset.copy));
      const span = cp.querySelector('span');
      if (span && ok) { span.textContent = tt('bank.copied'); setTimeout(() => { if (span.isConnected) span.textContent = tt('bank.copy'); }, 1500); }
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      const id = del.dataset.del;
      if (st.armed !== id) {
        st.armed = id; clearTimeout(armTimer);
        armTimer = setTimeout(() => { st.armed = null; draw(); }, 4000);
        draw();
        return;
      }
      clearTimeout(armTimer);
      st.armed = null;
      try {
        await bank.deleteQuestion(st.list.find((x) => x.id === id));
        st.list = st.list.filter((x) => x.id !== id);
      } catch (err) { st.error = errText(err); }
      draw();
    }
  });

  if (auth.mode === 'off') { st.error = tt('be.off'); draw(); return; }
  try { st.list = await bank.listQuestions(); } catch (err) { st.error = errText(err); }
  draw();
  return () => clearTimeout(armTimer);
}

// ---------------------------------------------------------------- the editor's state

const W = 640;
const H = 440;
const U = 40; // pixels per unit
const toPx = ([x, y]) => [W / 2 + x * U, H / 2 - y * U];
const toMath = ([px, py]) => [(px - W / 2) / U, (H / 2 - py) / U];
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const param = (A, B, P) => { const d = [B[0] - A[0], B[1] - A[1]]; const L2 = d[0] * d[0] + d[1] * d[1] || 1; return ((P[0] - A[0]) * d[0] + (P[1] - A[1]) * d[1]) / L2; };
const lerp = (A, B, t) => [A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1])];
const emptyDrawing = () => ({ pts: [], segs: [], circs: [] });
const sig = (text, drawing) => JSON.stringify([text, drawing]);

const EXAMPLE = {
  text: 'במשולש ABC הנקודה D נמצאת על הצלע BC.\nנתון: AB = AC, AD חוצה את זווית BAC.\nהוכיחו: BD = CD.',
  drawing: {
    pts: [{ id: 'A', x: 0.2, y: 3.6, c: null }, { id: 'B', x: -3.2, y: -1.6, c: null }, { id: 'C', x: 3.4, y: -1.4, c: null }, { id: 'D', x: 0, y: -1.5, c: { k: 'seg', a: 'B', b: 'C', t: 0.47 } }],
    segs: [['A', 'B'], ['B', 'C'], ['C', 'A'], ['A', 'D']],
    circs: [],
  },
};

// One editor state per question; it survives language and theme redraws, and is kept in
// localStorage so "try solving it" and a reload come back to the same place.
let ED = null;
const draftKey = (key) => `lg.authorDraft.${key}`;
function newState(key) {
  return { key, id: key === 'new' ? null : key, baseUpdatedAt: null, step: 1, text: '', drawing: emptyDrawing(), review: null, reviewFor: '', checked: {}, status: 'published', savedId: null, restored: false, prevDrawing: null, straightenMsg: null };
}
function persist() {
  if (!ED || ED.step === 3) return; // a saved question is in the bank, not a draft
  try {
    const { key, id, baseUpdatedAt, step, text, drawing, review, reviewFor, checked, status } = ED;
    localStorage.setItem(draftKey(key), JSON.stringify({ key, id, baseUpdatedAt, step: step === 3 ? 1 : step, text, drawing, review, reviewFor, checked, status, at: Date.now() }));
  } catch { /* ignore */ }
}
function dropDraft(key) { try { localStorage.removeItem(draftKey(key)); } catch { /* ignore */ } }
function readDraft(key) { try { return JSON.parse(localStorage.getItem(draftKey(key))); } catch { return null; } }

// Letters the words mention, in order, so new points take the names the question uses.
const STOP = new Set(['THAT', 'SHOW', 'FIND', 'GIVEN', 'PROVE', 'THE', 'AND', 'IS', 'OF']);
function textLetters(text) {
  const out = [];
  for (const w of Q.normalizeText(text).match(/[A-Z]+/g) || []) {
    if (w.length > 4 || STOP.has(w)) continue;
    for (const ch of w) if (!out.includes(ch)) out.push(ch);
  }
  return out;
}

// ---------------------------------------------------------------- #/author

async function pageEditor(host, parts, alive) {
  const key = parts[1] ? decodeURIComponent(parts[1]) : 'new';
  if (auth.mode === 'off') { host.innerHTML = `<div class="acct-card paper acct-narrow"><p class="au-msg">${esc(tt('be.off'))}</p></div>`; return; }
  const me = auth.currentUser();
  if (!me || !auth.isStaff()) {
    host.innerHTML = `<div class="acct-card paper acct-narrow au-gate">
      <p class="kicker">${esc(tt('ed.kicker'))}</p>
      <h1 class="acct-h">${icon('lock')} ${esc(tt('ed.titleNew'))}</h1>
      <p class="acct-lead">${esc(me ? tt('acc.staff') : tt('acc.login'))}</p>
      ${me ? '' : `<div class="acct-actions"><a class="btn btn-primary btn-small" href="#/login" data-remember>${esc(tt('acc.loginBtn'))}</a></div>`}
    </div>`;
    return;
  }
  if (ED && ED.step === 3) ED = null; // after a save, coming back starts over
  if (!ED || ED.key !== key) {
    ED = newState(key);
    const draft = readDraft(key);
    if (key !== 'new') {
      let q = null;
      try { q = await bank.getQuestion(key); } catch (e) { host.innerHTML = `<p class="au-msg is-err">${esc(errText(e))}</p>`; ED = null; return; }
      if (!alive()) return;
      if (!q) { host.innerHTML = `<p class="au-msg is-err">${esc(tt('be.notFound'))}</p>`; ED = null; return; }
      if (!bank.canEdit(q)) { host.innerHTML = `<div class="acct-card paper acct-narrow"><p class="au-msg">${esc(tt('acc.notYours'))}</p></div>`; ED = null; return; }
      let src = {};
      try { src = JSON.parse(q.source || '{}'); } catch { src = {}; }
      Object.assign(ED, { baseUpdatedAt: q.updatedAt, text: src.text || '', drawing: src.drawing || emptyDrawing(), review: src.review || null, status: q.status, saved: { data: q.data, solution: q.solution } });
      if (src.review) ED.reviewFor = sig(ED.text, ED.drawing);
      if (draft && draft.baseUpdatedAt === q.updatedAt) Object.assign(ED, draft, { key, restored: true });
    } else if (draft && (draft.text || (draft.drawing && draft.drawing.pts.length))) {
      Object.assign(ED, draft, { key: 'new', id: null, restored: true });
    }
  }
  let off = null;
  let shownStep = null;
  const draw = () => {
    if (typeof off === 'function') off();
    off = null;
    if (!alive() || !ED) return;
    host.innerHTML = shellHTML();
    if (shownStep !== null && shownStep !== ED.step) window.scrollTo(0, 0);
    shownStep = ED.step;
    const so = host.querySelector('#auStartOver');
    if (so) {
      so.addEventListener('click', () => {
        const back = ED.id ? `#/author/${encodeURIComponent(ED.id)}` : '#/author';
        dropDraft(ED.key);
        ED = null;
        if (location.hash === back) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = back;
      });
    }
    const body = host.querySelector('#auBody');
    if (ED.step === 1) off = stepWrite(body, alive, draw);
    else if (ED.step === 2) off = stepReview(body, alive, draw);
    else off = stepDone(body, draw);
  };
  draw();
  return () => { if (typeof off === 'function') off(); persist(); };
}

function shellHTML() {
  const steps = [1, 2, 3].map((n) => `<li class="${ED.step === n ? 'is-on' : ED.step > n ? 'is-done' : ''}"><span class="au-stepn">${ED.step > n ? icon('check') : n}</span>${esc(tt('ed.step' + n))}</li>`).join('');
  return `
    <header class="au-head">
      <p class="kicker"><a href="#/bank">${esc(tt('ed.kicker'))}</a></p>
      <h1 class="acct-h">${esc(ED.id ? tt('ed.titleEdit') : tt('ed.titleNew'))}</h1>
      <ol class="au-steps" aria-label="steps">${steps}</ol>
      ${ED.restored && ED.step !== 3 ? `<p class="au-restored">${icon('info')} <span>${esc(tt('ed.restored'))}</span> <button type="button" class="linkish" id="auStartOver">${esc(tt('ed.startOver'))}</button></p>` : ''}
    </header>
    <div id="auBody"></div>`;
}

// ---------------------------------------------------------------- step 1: words and drawing

const CHIPS = {
  sym: [['∢', '∢'], ['△', '△'], ['∥', ' ∥ '], ['⊥', ' ⊥ '], ['≅', ' ≅ '], ['∼', ' ∼ '], ['°', '°'], ['=', ' = ']],
  words: [['אמצע', ' אמצע '], ['חוצה את זווית', ' חוצה את זווית '], ['תיכון לצלע', ' תיכון לצלע '], ['גובה לצלע', ' גובה לצלע '],
    ['שווה שוקיים', ' שווה שוקיים '], ['ישר זווית ב-', ' ישר זווית ב-'], ['נמצאת על הצלע', ' נמצאת על הצלע '], ['על המשך', ' על המשך '],
    ['נחתכים בנקודה', ' נחתכים בנקודה '], ['מקבילית', ' מקבילית'], ['מלבן', ' מלבן'], ['מעוין', ' מעוין'], ['ריבוע', ' ריבוע'], ['דלתון', ' דלתון'], ['טרפז', ' טרפז'],
    ['על מעגל שמרכזו', ' על מעגל שמרכזו '], ['קוטר', ' קוטר'], ['משיק בנקודה', ' משיק בנקודה ']],
  parts: [['נתון:', '\nנתון: '], ['הוכיחו:', '\nהוכיחו: '], ['חשבו את', '\nחשבו את ']],
};

function stepWrite(body, alive, redraw) {
  body.innerHTML = `
    <div class="au-grid">
      <section class="au-text paper">
        <div class="au-sec-h"><h2 class="acct-h2">${esc(tt('ed.text.h'))}</h2><span class="au-sec-btns"><button type="button" class="tool-btn" id="auExample">${icon('bulb')} ${esc(tt('ed.example'))}</button><button type="button" class="tool-btn" id="auLeanImport" aria-expanded="false" aria-controls="auLean">${icon('code')} ${esc(tt('lean.import'))}</button></span></div>
        <p class="acct-hint">${srich(tt('ed.text.lead'))}</p>
        ${Object.entries(CHIPS).map(([g, list]) => `<div class="au-chips" role="group" aria-label="${esc(tt('ed.chips.' + g))}"><span class="au-chips-l">${esc(tt('ed.chips.' + g))}</span>${list.map(([label, ins]) => `<button type="button" class="${g === 'sym' ? 'symkey' : 'qchip'}" data-ins="${esc(ins)}">${esc(label)}</button>`).join('')}</div>`).join('')}
        <textarea id="auText" class="au-textarea" rows="7" dir="auto" spellcheck="false" placeholder="${esc(tt('ed.text.ph'))}">${esc(ED.text)}</textarea>
        <div class="au-live" id="auLive" aria-live="polite"></div>
        <div class="au-lean" id="auLean" hidden>
          <label class="au-field"><span>${esc(tt('lean.paste'))}</span>
            <textarea id="auLeanSrc" class="acct-input au-lean-src" rows="8" dir="ltr" spellcheck="false" placeholder="theorem t (A B C D : Point) (h : Sbtw ℝ B D C) (g : len A B = len A C) : …"></textarea></label>
          <p class="acct-hint">${esc(tt('lean.importLead'))}</p>
          <div class="au-lean-actions"><button type="button" class="btn btn-primary btn-small" id="auLeanGo">${icon('arrow', 'dir')} ${esc(tt('lean.convert'))}</button><button type="button" class="linkish" id="auLeanClose">${esc(tt('lean.close'))}</button></div>
          <div class="au-lean-msgs" id="auLeanMsg" aria-live="polite"></div>
        </div>
      </section>
      <section class="au-draw paper">
        <div class="au-sec-h"><h2 class="acct-h2">${esc(tt('ed.draw.h'))}</h2></div>
        <div class="au-dtools" role="toolbar">
          ${['move', 'point', 'seg', 'circ', 'ang', 'len'].map((x) => `<button type="button" class="au-tool" data-tool="${x}" title="${esc(tt('tool.' + x))}" aria-label="${esc(tt('tool.' + x))}" aria-pressed="false">${tic(x)}<span>${esc(tt('tool.' + x))}</span></button>`).join('')}
          <button type="button" class="au-tool" data-tool="del" title="${esc(tt('tool.del'))}" aria-label="${esc(tt('tool.del'))}" aria-pressed="false">${icon('trash')}<span>${esc(tt('tool.del'))}</span></button>
          <span class="au-tsep"></span>
          <button type="button" class="au-tool" id="auUndo" title="${esc(tt('tool.undo'))}" aria-label="${esc(tt('tool.undo'))}">${icon('reset')}</button>
          <button type="button" class="au-tool" id="auGrid" title="${esc(tt('tool.grid'))}" aria-label="${esc(tt('tool.grid'))}" aria-pressed="false">${tic('grid')}</button>
          <button type="button" class="au-tool" id="auClear" title="${esc(tt('tool.clear'))}" aria-label="${esc(tt('tool.clear'))}">${icon('x')}<span id="auClearL">${esc(tt('tool.clear'))}</span></button>
        </div>
        <div class="au-canvas">
          <svg class="au-svg" id="auSvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(tt('ed.draw.h'))}">
            <defs><pattern id="auGridP" width="${U / 2}" height="${U / 2}" patternUnits="userSpaceOnUse" x="${W / 2}" y="${H / 2}"><path d="M${U / 2} 0H0V${U / 2}" class="au-gridline"/></pattern></defs>
            <rect class="au-bg" width="${W}" height="${H}" fill="url(#auGridP)"/>
            <g class="au-circs"></g><g class="au-segs"></g><g class="au-angs"></g><g class="au-ghost"></g><g class="au-pts"></g>
          </svg>
          <div class="au-rename" id="auRename" hidden><label><span id="auRenameL"></span><input id="auRenameI" maxlength="1" dir="ltr" autocomplete="off"></label><span class="au-rename-err" id="auRenameE"></span></div>
        </div>
        <p class="acct-hint au-dhint" id="auDHint"></p>
        <div class="au-selbar" id="auSel"></div>
      </section>
    </div>
    <div class="au-foot">
      <p class="au-msg is-err" id="auStepErr" hidden></p>
      <button type="button" class="btn btn-primary" id="auNext">${esc(tt('ed.next'))} ${icon('arrow', 'dir')}</button>
    </div>`;

  const $ = (s) => body.querySelector(s);
  const svg = $('#auSvg');
  const G = { circs: svg.querySelector('.au-circs'), segs: svg.querySelector('.au-segs'), angs: svg.querySelector('.au-angs'), ghost: svg.querySelector('.au-ghost'), pts: svg.querySelector('.au-pts') };
  angStyle();
  const textEl = $('#auText');
  const ui = { tool: 'move', pending: null, hover: null, cursor: null, drag: null, sel: [], grid: false, target: 'given', clearArmed: false, asking: null };
  const history = [];
  const pushHistory = () => { history.push(JSON.stringify(ED.drawing)); if (history.length > 60) history.shift(); };
  const changed = () => { persist(); draw(); live(); };

  // ---- geometry in pixels
  const posPx = () => { const pos = Q.solveDrawing(ED.drawing); const out = {}; for (const [n, p] of Object.entries(pos)) out[n] = toPx(p); return out; };
  const ptById = (id) => ED.drawing.pts.find((p) => p.id === id);
  const svgPoint = (e) => {
    const m = svg.getScreenCTM();
    if (!m) return [0, 0];
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  };
  function hitPoint(px, P, tol = 12) {
    let best = null;
    for (const p of ED.drawing.pts) { const d = dist(px, P[p.id]); if (d <= tol && (!best || d < best.d)) best = { id: p.id, d }; }
    return best && best.id;
  }
  function hitSeg(px, P, tol = 8) {
    let best = null;
    for (const s of ED.drawing.segs) {
      const [A, B] = [P[s[0]], P[s[1]]];
      if (!A || !B) continue;
      const t = Math.max(0, Math.min(1, param(A, B, px)));
      const d = dist(px, lerp(A, B, t));
      if (d <= tol && (!best || d < best.d)) best = { s, d };
    }
    return best && best.s;
  }
  function hitCirc(px, P, tol = 8) {
    for (const c of ED.drawing.circs) {
      if (!P[c.o] || !P[c.r]) continue;
      if (Math.abs(dist(px, P[c.o]) - dist(P[c.o], P[c.r])) <= tol) return c;
    }
    return null;
  }
  const gridSnap = (px) => { if (!ui.grid) return px; const m = toMath(px); return toPx([Math.round(m[0] * 2) / 2, Math.round(m[1] * 2) / 2]); };

  // Where a new point would go: an existing point, a crossing of two segments, on a segment,
  // on a circle, or free.
  function snap(px) {
    const P = posPx();
    const id = hitPoint(px, P);
    if (id) return { id, at: P[id] };
    const segs = ED.drawing.segs;
    let best = null;
    for (let i = 0; i < segs.length; i++) {
      for (let j = i + 1; j < segs.length; j++) {
        const [a, b] = segs[i]; const [c, d] = segs[j];
        if (a === c || a === d || b === c || b === d) continue;
        const X = Q.lineIntersect(P[a], P[b], P[c], P[d]);
        if (!X) continue;
        const ti = param(P[a], P[b], X); const tj = param(P[c], P[d], X);
        if (ti < 0.001 || ti > 0.999 || tj < 0.001 || tj > 0.999) continue;
        const dd = dist(px, X);
        if (dd <= 12 && (!best || dd < best.d)) best = { d: dd, at: X, c: { k: 'x', a, b, c, d }, label: tt('snap.x', { a: a + b, b: c + d }) };
      }
    }
    if (best) return best;
    for (const [a, b] of segs) {
      const t = param(P[a], P[b], px);
      if (t <= 0.03 || t >= 0.97) continue;
      const F = lerp(P[a], P[b], t);
      const dd = dist(px, F);
      if (dd <= 9 && (!best || dd < best.d)) best = { d: dd, at: F, c: { k: 'seg', a, b, t: r4(t) }, label: tt('snap.seg', { s: a + b }) };
    }
    if (best) return best;
    for (const c of ED.drawing.circs) {
      const O = P[c.o]; const R = dist(O, P[c.r]);
      if (R < 2) continue;
      const dd = Math.abs(dist(px, O) - R);
      if (dd <= 9) {
        const th = Math.atan2(-(px[1] - O[1]), px[0] - O[0]);
        return { d: dd, at: [O[0] + R * Math.cos(th), O[1] - R * Math.sin(th)], c: { k: 'circ', o: c.o, r: c.r, th: r4(th) }, label: tt('snap.circ') };
      }
    }
    return { at: gridSnap(px), c: null };
  }

  // The words name the points: follow them. A circle's center takes the center the words name.
  function nextName(prefer) {
    const used = new Set(ED.drawing.pts.map((p) => p.id));
    if (prefer && !used.has(prefer)) return prefer;
    for (const l of textLetters(ED.text)) if (!used.has(l)) return l;
    for (const l of 'ABCDEFGHIJKLMNPQRSTUVWXYZO') if (!used.has(l)) return l;
    return null;
  }
  function makePoint(s, prefer) {
    if (s.id) return s.id;
    const id = nextName(prefer);
    if (!id) return null;
    const m = toMath(s.at);
    ED.drawing.pts.push({ id, x: r4(m[0]), y: r4(m[1]), c: s.c || null });
    return id;
  }
  const hasSeg = (a, b) => ED.drawing.segs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

  // A point whose constraint names something that is gone stays where it is, free.
  function freeDangling(pos) {
    const d = ED.drawing;
    const ids = new Set(d.pts.map((p) => p.id));
    const hasCirc = (o, r) => d.circs.some((c) => c.o === o && c.r === r);
    for (const p of d.pts) {
      const c = p.c;
      if (!c) continue;
      const ok = c.k === 'seg' ? hasSeg(c.a, c.b) : c.k === 'x' ? hasSeg(c.a, c.b) && hasSeg(c.c, c.d) : c.k === 'circ' ? hasCirc(c.o, c.r) && ids.has(c.o) && ids.has(c.r) : false;
      if (!ok) { p.x = r4(pos[p.id][0]); p.y = r4(pos[p.id][1]); p.c = null; }
    }
  }
  function deleteAt(px) {
    const P = posPx();
    const pos = Q.solveDrawing(ED.drawing);
    const d = ED.drawing;
    const id = hitPoint(px, P);
    if (id) {
      pushHistory();
      d.segs = d.segs.filter((s) => !s.includes(id));
      d.circs = d.circs.filter((c) => c.o !== id && c.r !== id);
      d.pts = d.pts.filter((p) => p.id !== id);
      freeDangling(pos);
      ui.sel = ui.sel.filter((x) => !(x.kind === 'pt' && x.id === id));
      return true;
    }
    const s = hitSeg(px, P);
    if (s) { pushHistory(); d.segs = d.segs.filter((x) => x !== s); freeDangling(pos); ui.sel = []; return true; }
    const c = hitCirc(px, P);
    if (c) { pushHistory(); d.circs = d.circs.filter((x) => x !== c); freeDangling(pos); ui.sel = []; return true; }
    return false;
  }
  function renamePoint(old, nu) {
    const d = ED.drawing;
    for (const p of d.pts) {
      if (p.id === old) p.id = nu;
      if (p.c) for (const k of ['a', 'b', 'c', 'd', 'o', 'r']) if (p.c[k] === old) p.c[k] = nu;
    }
    d.segs = d.segs.map((s) => s.map((x) => (x === old ? nu : x)));
    for (const c of d.circs) { if (c.o === old) c.o = nu; if (c.r === old) c.r = nu; }
    ui.sel = ui.sel.map((x) => (x.kind === 'pt' && x.id === old ? { ...x, id: nu } : x));
  }

  // The angles the words name, for the arcs: [{ ang: 'ABC', label: '40°' | '?' | '', cls }]. Read again only
  // when the words or the point names change.
  let angCache = { key: null, list: [] };
  function angMarks() {
    const d = ED.drawing;
    const key = `${ED.text}|${d.pts.map((p) => p.id).join('')}`;
    if (angCache.key !== key) {
      const list = [];
      const seen = new Set();
      const add = (ang, label, cls) => { const k = ang[1] + [ang[0], ang[2]].sort().join(''); if (!seen.has(k)) { seen.add(k); list.push({ ang, label, cls }); } };
      try {
        const r = Q.parseText(ED.text, { pos: Q.solveDrawing(d), segs: d.segs });
        if (r.goal && r.goal.ask && /^∢[A-Z]{3}$/.test(r.goal.ask)) add(r.goal.ask.slice(1), '?', 'is-goal');
        for (const g of r.givens) {
          const m = g.claim.replace(/\s/g, '').match(/^∢([A-Z]{3})=(\d+(?:[.,]\d+)?)°?$/);
          if (m) add(m[1], `${m[2]}°`, '');
          else for (const a of g.claim.matchAll(/∢([A-Z]{3})/g)) add(a[1], '', '');
        }
        if (r.goal && r.goal.claim) for (const a of r.goal.claim.matchAll(/∢([A-Z]{3})/g)) add(a[1], '', 'is-goal');
      } catch { /* half-written words */ }
      angCache = { key, list };
    }
    return angCache.list.map((a) => ({ ...a }));
  }

  // ---- drawing
  function draw() {
    const P = posPx();
    const d = ED.drawing;
    const isSel = (kind, k) => ui.sel.some((x) => x.kind === kind && x.k === k);
    const sk = (s) => [...s].sort().join('');
    G.circs.innerHTML = d.circs.filter((c) => P[c.o] && P[c.r]).map((c) => {
      const [x, y] = P[c.o];
      return `<circle class="au-c${isSel('circ', c.o + c.r) ? ' is-sel' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${dist(P[c.o], P[c.r]).toFixed(1)}"/>`;
    }).join('');
    G.segs.innerHTML = d.segs.filter(([a, b]) => P[a] && P[b]).map(([a, b]) => `<line class="au-s${isSel('seg', sk(a + b)) ? ' is-sel' : ''}" x1="${P[a][0].toFixed(1)}" y1="${P[a][1].toFixed(1)}" x2="${P[b][0].toFixed(1)}" y2="${P[b][1].toFixed(1)}"/>`).join('');
    // arcs: the angles the words name (with their size, "?" for the one to find), and the angle being picked
    const arcs = angMarks();
    const selPts = ui.sel.filter((x) => x.kind === 'pt').map((x) => x.k);
    if (ui.tool === 'ang' && selPts.length === 3) arcs.push({ ang: selPts.join(''), label: '', cls: 'is-sel' });
    G.angs.innerHTML = arcs.filter((a) => [...a.ang].every((x) => P[x])).map((a) => {
      const [X, V, Y] = [...a.ang].map((x) => P[x]);
      const r = Math.max(12, Math.min(26, 0.4 * Math.min(dist(V, X), dist(V, Y))));
      const g = arcAt(V, X, Y, r);
      return `<path class="au-arc ${a.cls}" d="${g.path}"/>${a.label ? `<text class="au-arclabel ${a.cls}" x="${g.label[0].toFixed(1)}" y="${g.label[1].toFixed(1)}">${esc(a.label)}</text>` : ''}`;
    }).join('');
    const offs = Q.labelOffsets(Q.solveDrawing(d), d.segs, d.circs);
    G.pts.innerHTML = d.pts.map((p) => {
      const [x, y] = P[p.id];
      const off = offs[p.id] || [14, -14];
      const selIdx = ui.sel.findIndex((s) => s.kind === 'pt' && s.k === p.id);
      return `<g class="au-p${p.c ? ' is-on' : ''}${selIdx >= 0 ? ' is-sel' : ''}${p.c && p.c.k === 'x' ? ' is-fixed' : ''}">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"/>
        <text x="${(x + off[0]).toFixed(1)}" y="${(y + off[1]).toFixed(1)}">${esc(p.id)}</text>
        ${selIdx >= 0 ? `<text class="au-selno" x="${(x - off[0] * 0.9).toFixed(1)}" y="${(y - off[1] * 0.9).toFixed(1)}">${selIdx + 1}</text>` : ''}
      </g>`;
    }).join('');
    // ghost: the segment or circle being made, and where a click would snap
    let ghost = '';
    const cur = ui.cursor;
    if (cur && (ui.tool === 'point' || ui.tool === 'seg' || ui.tool === 'circ')) {
      const s = snap(cur);
      if (ui.pending && P[ui.pending]) {
        if (ui.tool === 'seg') ghost += `<line class="au-ghostline" x1="${P[ui.pending][0]}" y1="${P[ui.pending][1]}" x2="${s.at[0]}" y2="${s.at[1]}"/>`;
        if (ui.tool === 'circ') ghost += `<circle class="au-ghostline" cx="${P[ui.pending][0]}" cy="${P[ui.pending][1]}" r="${dist(P[ui.pending], s.at)}"/>`;
      }
      ghost += `<circle class="au-snap${s.id ? ' on-pt' : s.c ? ' on-obj' : ''}" cx="${s.at[0]}" cy="${s.at[1]}" r="${s.id ? 9 : 6}"/>`;
      if (s.label) ghost += `<text class="au-snaplabel" x="${s.at[0] + 10}" y="${s.at[1] + 22}">${esc(s.label)}</text>`;
    }
    if (ui.tool === 'move' && ui.hover) ghost += ui.hover;
    G.ghost.innerHTML = ghost;
    // the hint under the canvas
    const hk = ui.tool === 'seg' && ui.pending ? 'hint.seg2' : ui.tool === 'circ' && ui.pending ? 'hint.circ2' : 'hint.' + ui.tool;
    $('#auDHint').textContent = tt(hk);
    body.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === ui.tool)));
    $('#auGrid').setAttribute('aria-pressed', String(ui.grid));
    svg.classList.toggle('show-grid', ui.grid);
    svg.dataset.tool = ui.tool;
    drawSel();
  }

  // ---- the selection bar: claims made from what is selected
  function selItems() {
    const pts = ui.sel.filter((x) => x.kind === 'pt').map((x) => x.k);
    const segs = ui.sel.filter((x) => x.kind === 'seg').map((x) => x.name);
    return { pts, segs, circs: ui.sel.filter((x) => x.kind === 'circ') };
  }
  function relations() {
    const { pts, segs, circs } = selItems();
    const out = [];
    if (circs.length) return out;
    if (segs.length === 2 && !pts.length) {
      const [s1, s2] = segs;
      out.push({ label: `${s1} = ${s2}`, text: `${s1} = ${s2}`, hint: tt('sel.eq') }, { label: `${s1} ∥ ${s2}`, text: `${s1} ∥ ${s2}`, hint: tt('sel.par') }, { label: `${s1} ⊥ ${s2}`, text: `${s1} ⊥ ${s2}`, hint: tt('sel.perp') });
    } else if (segs.length === 1 && !pts.length) {
      out.push({ label: `${segs[0]} = …`, ask: tt('sel.askLen', { s: segs[0] }), pre: `${segs[0]} =`, unit: '', make: (v) => `${segs[0]} = ${v}`, hint: tt('sel.len') },
        { label: tt('sel.askIt', { x: segs[0] }), goalAsk: segs[0] });
    } else if (segs.length === 1 && pts.length === 1 && !segs[0].includes(pts[0])) {
      out.push({ label: `${pts[0]} ${tt('sel.mid')} ${segs[0]}`, text: `${pts[0]} אמצע ${segs[0]}`, hint: tt('sel.mid') });
    } else if (pts.length === 3 && !segs.length) {
      const a = `∢${pts.join('')}`;
      out.push({ label: `${a} = …°`, ask: tt('sel.askAng', { a }), pre: `${a} =`, unit: '°', make: (v) => `${a} = ${String(v).replace(/°$/, '')}°`, hint: tt('sel.ang') }, { label: `${a} = 90°`, text: `${a} = 90°`, hint: tt('sel.right') },
        { label: tt('sel.askIt', { x: a }), goalAsk: a });
    } else if (pts.length === 4 && !segs.length) {
      const q = pts.join('');
      for (const w of ['מקבילית', 'מלבן', 'מעוין', 'ריבוע', 'דלתון', 'טרפז']) out.push({ label: `${q} ${w}`, text: `${q} ${w}` });
    }
    return out;
  }
  let selHTML = '';
  function drawSel() {
    const el = $('#auSel');
    if (!ui.sel.length) { el.innerHTML = ''; selHTML = ''; el.hidden = true; return; }
    el.hidden = false;
    const rels = relations();
    const one = ui.sel.length === 1 && ui.sel[0].kind === 'pt' ? ui.sel[0].k : null;
    const html = `
      <div class="au-selhead">
        <span class="au-selwhat" dir="ltr">${ui.sel.map((x) => esc(x.kind === 'pt' ? x.k : x.kind === 'seg' ? x.name : '◯' + x.o)).join(' · ')}</span>
        ${rels.length ? `<span class="au-seg2" role="group" aria-label="${esc(tt('sel.lead'))}">
          <button type="button" class="qchip" data-target="given" aria-pressed="${ui.target === 'given'}">${esc(tt('sel.toGiven'))}</button>
          <button type="button" class="qchip" data-target="goal" aria-pressed="${ui.target === 'goal'}">${esc(tt('sel.toGoal'))}</button>
        </span>` : ''}
        <button type="button" class="linkish" id="auSelClear">${esc(tt('sel.clear'))}</button>
      </div>
      ${rels.length ? `<div class="au-rels">${rels.map((r, i) => `<button type="button" class="au-rel" data-rel="${i}" title="${esc(r.hint || '')}"><span dir="ltr">${esc(r.label)}</span></button>`).join('')}</div>`
        : one ? '' : `<p class="acct-hint">${esc(tt('sel.none'))}</p>`}
      ${ui.asking != null && rels[ui.asking] && rels[ui.asking].ask ? `<div class="au-askrow">
        <label for="auAskI"><span>${esc(rels[ui.asking].pre)}</span><input id="auAskI" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="${esc(rels[ui.asking].ask)}" placeholder="${rels[ui.asking].unit ? '40' : '5'}"><span>${esc(rels[ui.asking].unit)}</span></label>
        <button type="button" class="btn btn-primary btn-small" id="auAskOk">${esc(tt('sel.addIt'))}</button>
        <button type="button" class="linkish" id="auAskX">${esc(tt('sel.cancel'))}</button>
      </div>` : ''}
      ${one ? `<button type="button" class="tool-btn" id="auSelRename">${icon('edit')} ${esc(tt('sel.rename'))} ${esc(one)}</button>` : ''}`;
    // redraws (dragging, the live summary) leave the bar alone unless it changed, so a value
    // being typed in its field keeps its text and focus
    if (html === selHTML) return;
    selHTML = html;
    el.innerHTML = html;
  }
  function focusAsk() {
    const inp = $('#auAskI');
    if (inp) inp.focus();
  }
  function submitAsk() {
    const r = relations()[ui.asking];
    const inp = $('#auAskI');
    const v = inp ? inp.value.trim() : '';
    if (!r || !r.make || !v) { if (inp) inp.focus(); return; }
    addStatement(r.make(v));
    ui.sel = [];
    ui.asking = null;
    draw();
  }
  // "חשבו את ∢ABC": the question's goal becomes finding this angle or length
  function addAskGoal(x) {
    const lines = ED.text.split('\n');
    const gi = lines.findIndex((l) => /^\s*(?:ו)?(?:הוכיחו|הוכח|הוכיחי|צ["״]ל|חשבו|מצאו)/.test(l));
    if (gi >= 0) lines[gi] = `חשבו את ${x}.`; else lines.push(`חשבו את ${x}.`);
    ED.text = lines.filter((l, i) => l.trim() || i < lines.length - 1).join('\n').replace(/^\n+/, '');
    textEl.value = ED.text;
    persist();
    live();
  }

  // Add a claim to the words: to the "נתון:" line, or as the "הוכיחו:" line.
  function addStatement(stmt) {
    const lines = ED.text.split('\n');
    const isGoal = (l) => /^\s*(?:ו)?(?:הוכיחו|הוכח|הוכיחי|צ["״]ל|חשבו|מצאו)/.test(l);
    const gi = lines.findIndex(isGoal);
    if (ui.target === 'goal') {
      if (gi >= 0) lines[gi] = `הוכיחו: ${stmt}.`; else lines.push(`הוכיחו: ${stmt}.`);
    } else {
      const ni = lines.findIndex((l) => /^\s*נתון/.test(l));
      if (ni >= 0) lines[ni] = `${lines[ni].replace(/[.\s]*$/, '')}, ${stmt}.`;
      else if (gi >= 0) lines.splice(gi, 0, `נתון: ${stmt}.`);
      else lines.push(`נתון: ${stmt}.`);
    }
    ED.text = lines.filter((l, i) => l.trim() || i < lines.length - 1).join('\n').replace(/^\n+/, '');
    textEl.value = ED.text;
    persist();
    live();
  }

  // ---- live summary under the words
  let liveTimer = 0;
  function live() {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      if (!alive()) return;
      const pos = Q.solveDrawing(ED.drawing);
      const r = Q.parseText(ED.text, { pos, segs: ED.drawing.segs });
      const drawn = new Set(ED.drawing.pts.map((p) => p.id));
      const missing = textLetters(ED.text).filter((l) => !drawn.has(l));
      const chips = [];
      if (ED.text.trim()) {
        chips.push(`<span class="au-pill">${esc(r.givens.length === 1 ? tt('ed.live.given1') : tt('ed.live.givens', { n: r.givens.length }))}</span>`);
        if (r.goal && r.goal.ask) chips.push(`<span class="au-pill is-ok">${tt('ed.live.ask', { c: mathSpan(r.goal.ask) })}</span>`);
        else if (r.goal) chips.push(`<span class="au-pill is-ok">${tt('ed.live.goal', { c: mathSpan(r.goal.claim) })}</span>`);
        else chips.push(`<span class="au-pill is-warn">${esc(tt('ed.live.noGoal'))}</span>`);
        if (r.unknown.length) chips.push(`<span class="au-pill is-warn" title="${esc(r.unknown.map((u) => u.src).join(' | '))}">${esc(tt('ed.live.unknown', { n: r.unknown.length }))}</span>`);
      }
      if (missing.length) chips.push(`<span class="au-pill is-warn">${tt('ed.live.missing', { pts: mathSpan(missing.join(', ')) })}</span>`);
      const nx = nextName();
      if (nx && (ui.tool === 'point' || ui.tool === 'seg' || ui.tool === 'circ')) chips.push(`<span class="au-pill is-soft">${tt('ed.live.next', { p: mathSpan(nx) })}</span>`);
      $('#auLive').innerHTML = chips.join('');
      draw(); // the arcs follow the words
    }, 200);
  }

  // ---- pointer
  let down = null;
  const onDown = (e) => {
    if (e.button !== 0) return;
    const px = svgPoint(e);
    down = { px, moved: false };
    if (ui.tool === 'move') {
      const P = posPx();
      const id = hitPoint(px, P);
      if (id) {
        const p = ptById(id);
        if (!p.c || p.c.k !== 'x') { ui.drag = { id, started: false }; svg.setPointerCapture(e.pointerId); }
      }
    }
  };
  const onMove = (e) => {
    const px = svgPoint(e);
    ui.cursor = px;
    if (down && dist(px, down.px) > 3) down.moved = true;
    if (ui.drag && down && down.moved) {
      if (!ui.drag.started) { pushHistory(); ui.drag.started = true; }
      const p = ptById(ui.drag.id);
      if (!p.c) { const m = toMath(gridSnap(px)); p.x = r4(m[0]); p.y = r4(m[1]); }
      else if (p.c.k === 'seg') { const P = posPx(); p.c.t = r4(Math.max(0.02, Math.min(0.98, param(P[p.c.a], P[p.c.b], px)))); }
      else if (p.c.k === 'circ') { const P = posPx(); const O = P[p.c.o]; p.c.th = r4(Math.atan2(-(px[1] - O[1]), px[0] - O[0])); }
      draw();
      return;
    }
    if (ui.tool === 'move') {
      const P = posPx();
      const id = hitPoint(px, P);
      const s = !id && hitSeg(px, P);
      const c = !id && !s && hitCirc(px, P);
      svg.style.cursor = id ? (ptById(id).c && ptById(id).c.k === 'x' ? 'pointer' : 'grab') : s || c ? 'pointer' : 'default';
      ui.hover = s ? `<line class="au-hover" x1="${P[s[0]][0]}" y1="${P[s[0]][1]}" x2="${P[s[1]][0]}" y2="${P[s[1]][1]}"/>` : '';
    }
    draw();
  };
  const onUp = (e) => {
    const px = svgPoint(e);
    const wasDrag = ui.drag && ui.drag.started;
    ui.drag = null;
    if (!down) return;
    const click = !down.moved;
    down = null;
    if (wasDrag) { changed(); return; }
    if (!click) return;
    clickAt(px, e);
  };
  function toggleSel(item) {
    const i = ui.sel.findIndex((x) => x.kind === item.kind && x.k === item.k);
    if (i >= 0) ui.sel.splice(i, 1); else ui.sel.push(item);
  }
  function clickAt(px) {
    const P = posPx();
    if (ui.tool === 'move') {
      const id = hitPoint(px, P);
      if (id) toggleSel({ kind: 'pt', k: id });
      else {
        const s = hitSeg(px, P);
        if (s) toggleSel({ kind: 'seg', k: [...s].sort().join(''), name: s.join('') });
        else {
          const c = hitCirc(px, P);
          if (c) toggleSel({ kind: 'circ', k: c.o + c.r, o: c.o });
          else ui.sel = [];
        }
      }
      draw();
      return;
    }
    if (ui.tool === 'del') { if (deleteAt(px)) changed(); return; }
    // the angle tool: three points (arm, vertex, arm), then its size in the bar under the drawing
    if (ui.tool === 'ang') {
      const id = hitPoint(px, P);
      if (!id) { ui.sel = []; ui.asking = null; draw(); return; }
      if (ui.sel.length >= 3 || ui.sel.some((x) => x.kind !== 'pt')) ui.sel = [];
      if (!ui.sel.some((x) => x.k === id)) ui.sel.push({ kind: 'pt', k: id });
      ui.asking = ui.sel.length === 3 ? 0 : null;
      draw();
      focusAsk();
      return;
    }
    // the length tool: a segment, then its length
    if (ui.tool === 'len') {
      const s = hitSeg(px, P);
      ui.sel = s ? [{ kind: 'seg', k: [...s].sort().join(''), name: s.join('') }] : [];
      ui.asking = s ? 0 : null;
      draw();
      focusAsk();
      return;
    }
    if (ui.tool === 'point') {
      const s = snap(px);
      if (s.id) { toggleSel({ kind: 'pt', k: s.id }); draw(); return; }
      pushHistory();
      makePoint(s);
      changed();
      return;
    }
    if (ui.tool === 'seg') {
      const s = snap(px);
      if (!ui.pending) {
        if (!s.id) pushHistory();
        ui.pending = makePoint(s);
        changed();
        return;
      }
      if (s.id === ui.pending) return;
      pushHistory();
      const end = makePoint(s);
      if (end && !hasSeg(ui.pending, end)) ED.drawing.segs.push([ui.pending, end]);
      ui.pending = null;
      changed();
      return;
    }
    if (ui.tool === 'circ') {
      const s = snap(px);
      if (!ui.pending) {
        if (!s.id) pushHistory();
        ui.pending = makePoint(s, Q.parseText(ED.text).center || 'O');
        changed();
        return;
      }
      if (s.id === ui.pending) return;
      pushHistory();
      const r = makePoint(s);
      if (r && !ED.drawing.circs.some((c) => c.o === ui.pending)) ED.drawing.circs.push({ o: ui.pending, r });
      ui.pending = null;
      changed();
    }
  }

  // ---- renaming a point
  let renaming = null;
  function openRename(id) {
    const P = posPx();
    const box = $('#auRename');
    const rect = svg.getBoundingClientRect();
    const k = rect.width / W;
    renaming = id;
    box.hidden = false;
    box.style.left = `${Math.min(rect.width - 170, Math.max(0, P[id][0] * k - 80))}px`;
    box.style.top = `${Math.max(0, P[id][1] * k - 64)}px`;
    $('#auRenameL').textContent = tt('ren.label', { p: id });
    $('#auRenameE').textContent = '';
    const inp = $('#auRenameI');
    inp.value = id;
    inp.focus();
    inp.select();
  }
  function closeRename() { renaming = null; $('#auRename').hidden = true; }
  $('#auRenameI').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeRename(); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const nu = e.target.value.trim().toUpperCase();
    if (!/^[A-Z]$/.test(nu)) { $('#auRenameE').textContent = tt('ren.bad'); return; }
    if (nu !== renaming && ptById(nu)) { $('#auRenameE').textContent = tt('ren.taken', { p: nu }); return; }
    if (nu !== renaming) { pushHistory(); renamePoint(renaming, nu); }
    closeRename();
    changed();
  });
  $('#auRenameI').addEventListener('blur', () => setTimeout(() => { if (renaming) closeRename(); }, 150));

  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointerleave', () => { ui.cursor = null; ui.hover = ''; draw(); });
  svg.addEventListener('dblclick', (e) => {
    const id = hitPoint(svgPoint(e), posPx());
    if (id) { ui.sel = ui.sel.filter((x) => !(x.kind === 'pt' && x.k === id)); openRename(id); }
  });

  const onKey = (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === 'Escape') { ui.pending = null; ui.sel = []; draw(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  };
  document.addEventListener('keydown', onKey);
  // the value field of the selection bar: Enter adds, Esc closes
  $('#auSel').addEventListener('keydown', (e) => {
    if (e.target.id !== 'auAskI') return;
    if (e.key === 'Enter') { e.preventDefault(); submitAsk(); } else if (e.key === 'Escape') { e.preventDefault(); ui.asking = null; drawSel(); }
  });
  function undo() {
    const last = history.pop();
    if (!last) return;
    ED.drawing = JSON.parse(last);
    ui.pending = null;
    ui.sel = ui.sel.filter((x) => x.kind !== 'pt' || ptById(x.k));
    changed();
  }

  // ---- buttons
  let clearTimer = 0;
  body.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.tool) { ui.tool = b.dataset.tool; ui.pending = null; ui.asking = null; if (ui.tool === 'ang' || ui.tool === 'len') ui.sel = []; draw(); live(); return; }
    if (b.dataset.ins) {
      const ins = b.dataset.ins;
      const s = textEl.selectionStart ?? textEl.value.length;
      const en = textEl.selectionEnd ?? s;
      textEl.value = textEl.value.slice(0, s) + ins + textEl.value.slice(en);
      textEl.focus();
      textEl.selectionStart = textEl.selectionEnd = s + ins.length;
      ED.text = textEl.value;
      persist(); live();
      return;
    }
    if (b.dataset.target) { ui.target = b.dataset.target; drawSel(); return; }
    if (b.dataset.rel) {
      const r = relations()[+b.dataset.rel];
      if (!r) return;
      // a value to type: a field opens in the bar (no browser prompt)
      if (r.ask) { ui.asking = +b.dataset.rel; drawSel(); focusAsk(); return; }
      if (r.goalAsk) addAskGoal(r.goalAsk); else addStatement(r.text);
      ui.sel = [];
      ui.asking = null;
      draw();
      return;
    }
    if (b.id === 'auAskOk') { submitAsk(); return; }
    if (b.id === 'auAskX') { ui.asking = null; drawSel(); return; }
    switch (b.id) {
      case 'auUndo': undo(); break;
      case 'auGrid': ui.grid = !ui.grid; draw(); break;
      case 'auClear':
        if (!ui.clearArmed) {
          ui.clearArmed = true; $('#auClearL').textContent = tt('ed.sureClear'); b.classList.add('armed');
          clearTimer = setTimeout(() => { ui.clearArmed = false; if (b.isConnected) { $('#auClearL').textContent = tt('tool.clear'); b.classList.remove('armed'); } }, 3000);
        } else {
          clearTimeout(clearTimer); ui.clearArmed = false; pushHistory(); ED.drawing = emptyDrawing(); ui.sel = []; ui.pending = null;
          $('#auClearL').textContent = tt('tool.clear'); b.classList.remove('armed'); changed();
        }
        break;
      case 'auSelClear': ui.sel = []; draw(); break;
      case 'auSelRename': { const id = ui.sel[0] && ui.sel[0].k; ui.sel = []; draw(); if (id) openRename(id); break; }
      case 'auExample':
        ED.text = EXAMPLE.text; textEl.value = ED.text;
        if (ED.drawing.pts.length) pushHistory(); // undo brings the previous drawing back
        ED.drawing = JSON.parse(JSON.stringify(EXAMPLE.drawing));
        ui.sel = []; ui.pending = null;
        changed();
        break;
      case 'auLeanImport': case 'auLeanClose': {
        const panel = $('#auLean');
        panel.hidden = b.id === 'auLeanClose' || !panel.hidden;
        $('#auLeanImport').setAttribute('aria-expanded', String(!panel.hidden));
        if (!panel.hidden) $('#auLeanSrc').focus();
        break;
      }
      case 'auLeanGo': {
        // a Lean theorem → the words and a drawing that witnesses it; the teacher goes on as usual
        const res = leanToQuestion($('#auLeanSrc').value);
        const msgs = (list, cls) => (list || []).map((m) => `<p class="au-msg ${cls}">${m.line ? `<b>${esc(tt('lean.line', { n: m.line }))}</b> ` : ''}${esc(L(m.msg || m))}${m.src ? ` <code dir="ltr">${esc(m.src)}</code>` : ''}</p>`).join('');
        if (!res.ok) { $('#auLeanMsg').innerHTML = msgs(res.errors, 'is-err') + msgs(res.notes, 'is-warn'); break; }
        if (ED.drawing.pts.length) pushHistory(); // undo brings the previous drawing back
        ED.text = res.text; textEl.value = ED.text;
        ED.drawing = res.drawing;
        ED.review = res.title || res.stage ? { text: null, title: res.title || '', titleSet: !!res.title, stage: res.stage, stageSet: !!res.stage, hints: [], marksOff: [] } : null;
        ED.reviewFor = '';
        ui.sel = []; ui.pending = null;
        $('#auLeanMsg').innerHTML = `<p class="au-msg is-ok">${esc(tt('lean.done'))}</p>${msgs(res.notes, 'is-warn')}`;
        changed();
        break;
      }
      case 'auNext': {
        const err = !ED.text.trim() ? tt('ed.needText') : ED.drawing.pts.length < 2 ? tt('ed.needDrawing') : '';
        const el = $('#auStepErr');
        el.hidden = !err; el.textContent = err;
        if (err) return;
        ED.step = 2; persist(); redraw();
        break;
      }
      default: break;
    }
  });
  textEl.addEventListener('input', () => { ED.text = textEl.value; persist(); live(); });

  draw();
  live();
  return () => { document.removeEventListener('keydown', onKey); clearTimeout(liveTimer); clearTimeout(clearTimer); };
}

// ---------------------------------------------------------------- step 2: the review

const SECTIONS = ['meta', 'figure', 'givens', 'goal', 'marks'];

// The question as a Lean theorem (leanconv.js), kept until the question changes: the search for
// facts the picture adds takes a moment.
let leanCache = { key: '', out: null };
function leanOf(rv) {
  const problem = Q.buildProblem(rv, ED.drawing);
  const opts = { title: rv.title, text: ED.text, ask: rv.goal && rv.goal.ask ? rv.goal.ask : null, name: `tq_${ED.id || 'new'}` };
  const key = JSON.stringify([problem, rv.stage, opts, getLang()]);
  if (leanCache.key === key) return leanCache.out;
  let out = null;
  try {
    out = problemToLean({ ...problem, stage: rv.stage }, opts);
    const en = getLang() === 'en';
    out.added = [
      ...out.triangles.map((T) => (en ? `${T.join('')} is a triangle` : `${T.join('')} משולש`)),
      ...out.sides.map((s) => (en ? `${s.a}, ${s.b} on ${s.same ? 'the same side of' : 'opposite sides of'} ${s.p}${s.q}` : `${s.a} ו-${s.b} ${s.same ? 'באותו צד של' : 'משני צדי'} ${s.p}${s.q}`)),
    ].join('; ');
  } catch (e) { console.warn('[author] lean', e); }
  leanCache = { key, out };
  return out;
}

function ensureReview() {
  const s = sig(ED.text, ED.drawing);
  if (ED.review && ED.reviewFor === s) return;
  const fresh = Q.buildReview(ED.drawing, ED.text);
  const old = ED.review;
  if (old && old.text === ED.text) {
    // only the drawing changed: keep the teacher's edits, refresh what the drawing decides
    ED.review = { ...old, tangents: fresh.tangents };
  } else {
    ED.review = { ...fresh, text: ED.text };
    if (old) {
      if (old.titleSet) Object.assign(ED.review, { title: old.title, titleSet: true });
      if (old.stageSet) Object.assign(ED.review, { stage: old.stage, stageSet: true });
      ED.review.hints = old.hints || [];
      ED.review.marksOff = old.marksOff || [];
    }
  }
  ED.reviewFor = s;
  ED.checked = {};
}

function stepReview(body, alive, redraw) {
  ensureReview();
  const rv = ED.review;
  let rep = Q.reviewReport(rv, ED.drawing);
  let saving = false;
  let saveErr = '';
  const uncheck = (sec) => { ED.checked[sec] = false; };

  const isReady = () => !rep.errors.length && SECTIONS.every((s) => ED.checked[s]);
  // Solved before published: the author's accepted proof for exactly this version of the problem (qbank.js).
  const solution = () => {
    if (rep.errors.length) return null;
    try { return bank.solvedFor(Q.buildProblem(rv, ED.drawing), ED.saved); } catch { return null; }
  };
  const canSave = () => isReady() && !saving && (ED.status !== 'published' || !!solution());
  const pubNoteHTML = () => {
    const solved = !!solution();
    const key = solved ? 'pub.solved' : ED.status === 'published' ? 'pub.needSolve' : 'pub.draft';
    return `<p class="au-msg au-pubnote ${solved ? 'is-ok' : ED.status === 'published' ? 'is-err' : ''}">${esc(tt(key))}</p>`;
  };
  const statusHTML = () => {
    const ctxRep = rep;
    const errs = ctxRep.errors.map((e) => `<li class="is-err">${icon('x')}<span>${errHTML(e)}</span>${e.key === 'unknown' ? ` <button type="button" class="linkish" data-dismiss="${esc(e.src)}">${esc(tt('rv.dismiss'))}</button>` : ''}${e.key === 'notWitness' ? ` <button type="button" class="tool-btn" data-act="straighten">${tic('wand')} ${esc(tt('rv.straighten'))}</button>` : ''}</li>`).join('');
    const warns = ctxRep.warnings.map((w) => `<li class="is-warn">${icon('info')}<span>${errHTML(w)}</span></li>`).join('');
    const missingChecks = SECTIONS.filter((s) => !ED.checked[s]).map((s) => tt('rv.' + s));
    const ready = isReady();
    return `
      <div class="au-status paper ${ctxRep.errors.length ? 'is-err' : ready ? 'is-ok' : 'is-pending'}" role="status">
        ${ctxRep.errors.length ? `<h2 class="au-status-h">${icon('x')} ${esc(tt('rv.problems'))}</h2><ul class="au-issues">${errs}</ul>` : `<p class="au-status-h">${icon('check')} ${esc(ready ? tt('rv.ready') : tt('rv.allGood'))}${ready ? '' : ` ${esc(tt('rv.needChecks', { list: missingChecks.join(', ') }))}`}</p>`}
        ${warns ? `<h3 class="au-status-h2">${esc(tt('rv.warnings'))}</h3><ul class="au-issues">${warns}</ul>` : ''}
      </div>`;
  };
  // ticking "Checked" updates the section, the status and the save button, nothing else
  const syncChecks = () => {
    body.querySelectorAll('[data-sec]').forEach((s) => s.classList.toggle('is-checked', !!ED.checked[s.dataset.sec]));
    const st = body.querySelector('.au-status');
    if (st) st.outerHTML = statusHTML();
    const save = body.querySelector('[data-act="save"]');
    if (save) save.disabled = !canSave();
    const note = body.querySelector('.au-pubnote');
    if (note) note.outerHTML = pubNoteHTML();
  };

  const html = () => {
    const ctxRep = rep;
    const sec = (id, title, inner, opt) => `
      <section class="au-sec paper${ED.checked[id] ? ' is-checked' : ''}" data-sec="${id}">
        <header class="au-sec-h">
          <h2 class="acct-h2">${esc(title)}${opt ? ` <small class="muted">(${esc(tt('rv.optional'))})</small>` : ''}</h2>
          ${opt ? '' : `<label class="au-check"><input type="checkbox" data-check="${id}" ${ED.checked[id] ? 'checked' : ''}><span>${esc(tt('rv.checked'))}</span></label>`}
        </header>
        ${inner}
      </section>`;

    const ready = isReady();
    const status = statusHTML();

    // meta
    const meta = sec('meta', tt('rv.meta'), `
      <label class="au-field"><span>${esc(tt('rv.title'))}</span><input class="acct-input" id="rvTitle" value="${esc(rv.title)}" maxlength="120"></label>
      <label class="au-field"><span>${esc(tt('rv.stage'))}</span>
        <select class="acct-input" id="rvStage">${STAGES.map((s) => `<option value="${s.id}" ${s.id === rv.stage ? 'selected' : ''}>${esc(stageName(s.id))}</option>`).join('')}</select>
        <small class="acct-hint">${esc(tt('rv.stageWhy', { why: tt('why.' + (rv.stageWhy || 'angles')) }))}</small>
      </label>
      <label class="au-field"><span>${esc(tt('rv.intro'))}</span><textarea class="acct-input au-ta" id="rvIntro" rows="2">${esc(rv.intro)}</textarea>
        <small class="acct-hint">${esc(tt('rv.introHint'))}</small></label>
      ${rv.intro ? `<p class="au-preview"><span class="muted">${esc(tt('rv.preview'))}</span> ${srich(rv.intro)}</p>` : ''}`);

    // figure
    const pos = ctxRep.pos;
    const ptChips = ED.drawing.pts.map((p) => {
      const how = !p.c ? '' : p.c.k === 'seg' ? tt('rv.pt.seg', { s: p.c.a + p.c.b }) : p.c.k === 'x' ? tt('rv.pt.x') : tt('rv.pt.circ');
      return `<span class="au-ptchip">${mathSpan(p.id)}${how ? ` <small class="muted">${esc(how)}</small>` : ''}</span>`;
    }).join('');
    const config = ctxRep.config.length ? `<ul class="au-facts">${ctxRep.config.map((c) => `<li>${srich(L(c.text))} <code dir="ltr">${esc(c.lean)}</code></li>`).join('')}</ul>` : `<p class="muted">${esc(tt('rv.noConfig'))}</p>`;
    const textFacts = ctxRep.facts.length ? `<h3 class="au-h3">${esc(tt('rv.textFacts'))}</h3><ul class="au-facts">${ctxRep.facts.map((f) => `<li class="${f.ok === false ? 'is-err' : f.ok ? 'is-ok' : ''}">${f.ok === false ? icon('x') : f.ok ? icon('check') : icon('info')} ${factHTML(f)}</li>`).join('')}</ul>` : '';
    const figure = sec('figure', tt('rv.figure'), `
      <h3 class="au-h3">${esc(tt('rv.points'))}</h3><div class="au-ptchips">${ptChips}</div>
      <h3 class="au-h3">${esc(tt('rv.config'))} <small class="muted">${esc(tt('rv.configLead'))}</small></h3>${config}
      ${textFacts}
      ${ctxRep.scaleBy ? `<p class="acct-hint">${tr('rv.scale', { s: `$${ctxRep.scaleBy}$` })}</p>` : ''}`);

    // givens
    const givenRows = ctxRep.givens.map((g, i) => {
      const lean = g.parsed ? leanClaim(g.parsed) : '';
      const hold = g.err ? '' : g.holds === true ? `<span class="au-hold is-ok" title="${esc(tt('rv.ok'))}">${icon('check')}<span class="sr">${esc(tt('rv.ok'))}</span></span>`
        : g.holds === false ? `<span class="au-hold is-err" title="${esc(tt('rv.notOk'))}">${icon('x')}<span>${esc(tt('rv.notOk'))}</span></span>`
          : `<span class="au-hold is-soft" title="${esc(tt('rv.cant'))}">${icon('info')}</span>`;
      return `
      <li class="au-given${g.err ? ' is-bad' : ''}" data-gi="${i}">
        <span class="au-gn">${i + 1}</span>
        <div class="au-gmain">
          <div class="au-grow">
            <input class="acct-input au-claim" dir="ltr" spellcheck="false" value="${esc(g.claim)}" data-given="${i}" aria-label="${esc(tt('rv.givens'))} ${i + 1}">
            ${hold}
            <button type="button" class="au-x" data-remove="${i}" title="${esc(tt('rv.remove'))}" aria-label="${esc(tt('rv.remove'))}">${icon('trash')}</button>
          </div>
          <p class="au-gerr" ${g.err ? '' : 'hidden'}>${g.err ? geoErr(g.err) : ''}</p>
          <div class="au-gmeta">
            ${g.text ? `<span>${tr('rv.shown', { t: '' })}${srich(L(g.text))}</span>` : ''}
            ${(g.also || []).map((r) => `<span>${esc(tt('rv.also', { r: L(REASONS[r] && REASONS[r].short) }))}</span>`).join('')}
            ${g.src && g.src.replace(/\s/g, '') !== g.claim.replace(/\s/g, '') ? `<span class="muted">${esc(tt('rv.src', { s: g.src }))}</span>` : ''}
            ${lean ? `<code dir="ltr">${esc(lean)}</code>` : ''}
            ${g.measured && g.measured.length && g.holds !== true ? `<span class="muted" dir="ltr">${esc(g.measured.join(', '))}</span>` : ''}
          </div>
        </div>
      </li>`;
    }).join('');
    const givens = sec('givens', tt('rv.givens'), `
      <ol class="au-givens">${givenRows}</ol>
      <div class="au-addrow"><input class="acct-input au-claim" id="rvAdd" dir="ltr" spellcheck="false" placeholder="${esc(tt('rv.claimPh'))}"><button type="button" class="tool-btn" id="rvAddBtn">${tic('plus')} ${esc(tt('rv.addGiven'))}</button></div>
      <p class="au-gerr" id="rvAddErr" hidden></p>`);

    // goal
    const gl = rv.goal || { claim: '' };
    const g = ctxRep.goal;
    const goalHold = g && g.parsed ? (g.holds === true ? `<span class="au-hold is-ok">${icon('check')}<span>${esc(tt('rv.ok'))}</span></span>` : g.holds === false ? `<span class="au-hold is-err">${icon('x')}<span>${esc(tt('rv.notOk'))}</span></span>` : '') : '';
    const goal = sec('goal', gl.ask ? tt('rv.goalAsk') : tt('rv.goal'), gl.ask ? `
      <p>${tr('rv.askLead', { t: `$${gl.ask}$` })}</p>
      <div class="au-grow"><span class="math au-asklhs" dir="ltr">${esc(gl.ask)} =</span><input class="acct-input au-claim au-value" id="rvValue" dir="ltr" value="${esc(gl.value || '')}" placeholder="${esc(tt('rv.askPh'))}">${goalHold}</div>
      ${g && g.measured && g.holds !== true ? `<p class="acct-hint" dir="ltr">${esc(g.measured.join(', '))}</p>` : ''}
      ${g && g.err ? `<p class="au-gerr">${geoErr(g.err)}</p>` : ''}` : `
      <div class="au-grow"><input class="acct-input au-claim" id="rvGoal" dir="ltr" spellcheck="false" value="${esc(gl.claim || '')}" placeholder="${esc(tt('rv.claimPh'))}">${goalHold}</div>
      ${g && g.err ? `<p class="au-gerr">${geoErr(g.err)}</p>` : ''}
      ${g && g.parsed ? `<div class="au-gmeta"><code dir="ltr">${esc(leanClaim(g.parsed))}</code>${g.measured && g.holds !== true ? `<span class="muted" dir="ltr">${esc(g.measured.join(', '))}</span>` : ''}</div>` : ''}`);

    // marks
    const allMarks = ctxRep.marks;
    const off = new Set(rv.marksOff || []);
    const marks = sec('marks', tt('rv.marks'), allMarks.length ? `
      <p class="acct-hint">${esc(tt('rv.marksLead'))}</p>
      <div class="au-marks">${allMarks.map((m) => {
        const id = Q.markId(m);
        const label = m.type === 'tick' ? tt('mk.tick', { s: m.seg }) : m.type === 'par' ? tt('mk.par', { s: m.seg }) : m.type === 'right' ? tt('mk.right', { a: '∢' + m.ang }) : tt('mk.arc', { a: '∢' + m.ang }) + (m.label ? ` (${m.label})` : '');
        return `<label class="switch au-mark"><input type="checkbox" data-mark="${esc(id)}" ${off.has(id) ? '' : 'checked'}><span class="switch-ui" aria-hidden="true"></span><span dir="auto">${esc(label)}</span></label>`;
      }).join('')}</div>` : `<p class="muted">${esc(tt('rv.noMarks'))}</p>`);

    // hints
    const hints = sec('hints', tt('rv.hints'), `
      <ol class="au-hints">${(rv.hints || []).map((h, i) => `<li><textarea class="acct-input au-ta" rows="2" data-hint="${i}" placeholder="${esc(tt('rv.hintPh'))}">${esc(h)}</textarea><button type="button" class="au-x" data-unhint="${i}" aria-label="${esc(tt('rv.remove'))}">${icon('trash')}</button></li>`).join('')}</ol>
      <button type="button" class="tool-btn" id="rvAddHint">${icon('bulb')} ${esc(tt('rv.addHint'))}</button>`, true);

    // Lean: the question as a theorem, worked out only when opened
    let leanBody = `<button type="button" class="tool-btn" data-act="leanShow">${icon('code')} ${esc(tt('lean.show'))}</button>`;
    if (ED.leanOpen) {
      const out = ctxRep.errors.length ? null : leanOf(rv);
      leanBody = !out ? `<p class="au-msg is-warn">${esc(tt('lean.fixFirst'))}</p>` : `
        ${out.added ? `<p class="acct-hint">${esc(tt('lean.added', { list: out.added }))}</p>` : ''}
        ${out.warnings.map((w) => `<p class="au-msg is-warn">${esc(L(w))}</p>`).join('')}
        <pre class="lean au-lean-pre" dir="ltr">${esc(out.lean)}</pre>
        <div class="au-lean-actions">
          <button type="button" class="tool-btn" data-act="leanCopy">${tic('copy')} <span>${esc(tt('lean.copy'))}</span></button>
          <button type="button" class="tool-btn" data-act="leanDownload">${icon('code')} ${esc(tt('lean.download'))}</button>
          <button type="button" class="linkish" data-act="leanHide">${esc(tt('lean.hide'))}</button>
        </div>`;
    }
    const lean = sec('lean', tt('lean.h'), `<p class="acct-hint">${esc(tt('lean.lead'))}</p>${leanBody}`, true);

    return `
      <p class="acct-lead au-rvlead">${esc(tt('rv.lead'))}</p>
      <div class="au-rv">
        <aside class="au-rvfig">
          <div class="paper au-figcard">
            <div class="diagram-card" id="rvFig"></div>
            <button type="button" class="tool-btn au-wide" data-act="straighten" title="${esc(tt('rv.straightenLead'))}">${tic('wand')} ${esc(tt('rv.straighten'))}</button>
            ${ED.straightenMsg ? `<p class="au-msg ${ED.straightenMsg === 'ok' ? 'is-ok' : 'is-err'}">${esc(tt(ED.straightenMsg === 'ok' ? 'rv.straightened' : 'rv.straightenFail'))}</p>` : ''}
            ${ED.prevDrawing ? `<button type="button" class="linkish" data-act="unstraighten">${esc(tt('rv.unstraighten'))}</button>` : ''}
            <button type="button" class="tool-btn au-wide" data-act="back">${tic('back')} ${esc(tt('rv.back'))}</button>
          </div>
        </aside>
        <div class="au-rvmain">
          ${status}
          ${meta}${figure}${givens}${goal}${marks}${hints}${lean}
          <div class="au-foot au-savebar paper">
            <label class="au-field au-inline"><span>${esc(tt('rv.status'))}</span>
              <select class="acct-input" id="rvStatus"><option value="published" ${ED.status === 'published' ? 'selected' : ''}>${esc(tt('rv.published'))}</option><option value="draft" ${ED.status === 'draft' ? 'selected' : ''}>${esc(tt('rv.draftS'))}</option></select></label>
            <span class="au-grow-1"></span>
            <button type="button" class="btn btn-ghost btn-small" data-act="try" ${ctxRep.errors.length ? 'disabled' : ''}>${icon('play')} ${esc(tt('rv.try'))}</button>
            <button type="button" class="btn btn-primary" data-act="save" ${canSave() ? '' : 'disabled'}>${icon('check')} ${esc(saving ? tt('rv.saving') : ED.id ? tt('rv.update') : tt('rv.save'))}</button>
          </div>
          ${pubNoteHTML()}
          ${saveErr ? `<p class="au-msg is-err">${esc(saveErr)}</p>` : ''}
        </div>
      </div>`;
  };

  let dg = null;
  function render() {
    if (!alive()) return;
    const y = window.scrollY;
    rep = Q.reviewReport(rv, ED.drawing);
    body.innerHTML = html();
    // the diagram exactly as the student will see it
    try {
      const prob = Q.playable({ data: Q.buildProblem(rv, ED.drawing) }, 'preview');
      prepareProblem(prob, rv.stage);
      dg = renderDiagram(prob, { animate: false, label: rv.title });
      body.querySelector('#rvFig').append(dg.el);
    } catch (e) { console.warn('[author] preview', e); dg = null; }
    window.scrollTo(0, y);
  }
  const commit = (sec) => { if (sec) uncheck(sec); persist(); render(); };

  body.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.check) { ED.checked[el.dataset.check] = el.checked; persist(); syncChecks(); return; }
    if (el.dataset.given !== undefined) {
      const i = +el.dataset.given;
      const g = rv.givens[i];
      const ctx = Q.claimContext(Q.solveDrawing(ED.drawing));
      const before = parseClaim(g.claim, ctx);
      const after = parseClaim(el.value, ctx);
      const same = before.ok && after.ok && Q.canonClaim(before.claim) === Q.canonClaim(after.claim);
      g.claim = after.ok ? Q.canonClaim(after.claim) : el.value.trim();
      // a different claim no longer means what the words said
      if (!same) { g.text = null; g.also = []; g.note = null; }
      if (!g.claim) rv.givens.splice(i, 1);
      commit('givens');
      return;
    }
    if (el.dataset.mark) {
      const off = new Set(rv.marksOff || []);
      if (el.checked) off.delete(el.dataset.mark); else off.add(el.dataset.mark);
      rv.marksOff = [...off];
      commit('marks');
      return;
    }
    if (el.dataset.hint !== undefined) { rv.hints[+el.dataset.hint] = el.value; persist(); return; }
    switch (el.id) {
      case 'rvTitle': rv.title = el.value.trim(); rv.titleSet = true; commit('meta'); break;
      case 'rvStage': rv.stage = el.value; rv.stageSet = true; commit('meta'); break;
      case 'rvIntro': rv.intro = el.value.trim(); commit('meta'); break;
      case 'rvGoal': {
        const ctx = Q.claimContext(Q.solveDrawing(ED.drawing));
        const r = parseClaim(el.value, ctx);
        rv.goal = { ...(rv.goal || {}), claim: r.ok ? Q.canonClaim(r.claim) : el.value.trim(), ask: undefined };
        commit('goal');
        break;
      }
      case 'rvValue': {
        let v = el.value.trim();
        if (rv.goal && rv.goal.ask && rv.goal.ask.startsWith('∢') && /^\d+(?:[.,]\d+)?$/.test(v)) v += '°';
        rv.goal.value = v;
        commit('goal');
        break;
      }
      case 'rvStatus': ED.status = el.value; persist(); syncChecks(); break;
      default: break;
    }
  });
  // live parse errors while typing a claim
  body.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.classList.contains('au-claim') || el.id === 'rvValue') return;
    const ctx = Q.claimContext(Q.solveDrawing(ED.drawing));
    const r = el.value.trim() ? parseClaim(el.value, ctx) : { ok: true };
    const errEl = el.id === 'rvAdd' ? body.querySelector('#rvAddErr') : el.closest('.au-gmain, .au-sec') && el.closest('.au-gmain, .au-sec').querySelector('.au-gerr');
    if (errEl) { errEl.hidden = r.ok; errEl.innerHTML = r.ok ? '' : geoErr(r.error); }
    if (dg && r.ok && r.claim) dg.highlight(claimToItems(r.claim));
  });
  body.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'rvAdd') { e.preventDefault(); body.querySelector('#rvAddBtn').click(); }
  });
  // hovering a given lights it up in the diagram
  body.addEventListener('mouseover', (e) => {
    const li = e.target.closest('[data-gi]');
    if (!dg) return;
    const g = li && rep.givens[+li.dataset.gi];
    dg.highlight(g && g.parsed ? claimToItems(g.parsed) : []);
  });

  body.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.remove !== undefined) { rv.givens.splice(+b.dataset.remove, 1); commit('givens'); return; }
    if (b.dataset.unhint !== undefined) { rv.hints.splice(+b.dataset.unhint, 1); commit(); return; }
    if (b.dataset.dismiss !== undefined) {
      for (const u of rv.unknown || []) if (u.src === b.dataset.dismiss) u.dismissed = true;
      commit();
      return;
    }
    if (b.id === 'rvAddBtn') {
      const inp = body.querySelector('#rvAdd');
      const ctx = Q.claimContext(Q.solveDrawing(ED.drawing));
      const r = parseClaim(inp.value, ctx);
      if (!inp.value.trim()) return;
      if (!r.ok) { const er = body.querySelector('#rvAddErr'); er.hidden = false; er.innerHTML = geoErr(r.error); return; }
      rv.givens.push({ claim: Q.canonClaim(r.claim), text: null, also: [], note: null, src: '' });
      commit('givens');
      return;
    }
    if (b.id === 'rvAddHint') { rv.hints = [...(rv.hints || []), '']; commit(); body.querySelector(`[data-hint="${rv.hints.length - 1}"]`)?.focus(); return; }
    switch (b.dataset.act) {
      case 'back': ED.step = 1; persist(); redraw(); break;
      case 'straighten': {
        const ctx = Q.claimContext(Q.solveDrawing(ED.drawing));
        const claims = rv.givens.map((g) => parseClaim(g.claim, ctx)).filter((r) => r.ok).map((r) => r.claim);
        const extra = (rv.tangents || []).map((t) => ({ type: 'tangent', ...t }));
        const res = Q.straighten(ED.drawing, claims, { extra });
        ED.prevDrawing = JSON.parse(JSON.stringify(ED.drawing));
        ED.drawing = res.drawing;
        ED.reviewFor = sig(ED.text, ED.drawing);
        ED.straightenMsg = res.ok ? 'ok' : 'fail';
        SECTIONS.forEach(uncheck);
        commit();
        break;
      }
      case 'unstraighten':
        if (ED.prevDrawing) { ED.drawing = ED.prevDrawing; ED.prevDrawing = null; ED.reviewFor = sig(ED.text, ED.drawing); ED.straightenMsg = null; commit(); }
        break;
      case 'try': {
        const problem = Q.buildProblem(rv, ED.drawing);
        bank.setTryDraft(rv.stage, problem, ED.id ? `#/author/${encodeURIComponent(ED.id)}` : '#/author');
        persist();
        location.hash = '#/tq/draft';
        break;
      }
      case 'save': {
        if (saving) return;
        saving = true; saveErr = ''; render();
        try {
          const problem = Q.buildProblem(rv, ED.drawing);
          const id = await bank.saveQuestion({ id: ED.id, title: rv.title, stage: rv.stage, status: ED.status, data: problem, source: { v: 1, text: ED.text, drawing: ED.drawing, review: rv }, solution: bank.solvedFor(problem, ED.saved) });
          dropDraft(ED.key);
          ED.savedId = id;
          ED.step = 3;
          saving = false;
          redraw();
        } catch (err) {
          saving = false; saveErr = errText(err); render();
        }
        break;
      }
      case 'leanShow': case 'leanHide': ED.leanOpen = b.dataset.act === 'leanShow'; render(); break;
      case 'leanCopy': {
        const out = leanCache.out;
        if (out && await copyText(out.lean)) { const s = b.querySelector('span'); if (s) s.textContent = tt('lean.copied'); }
        break;
      }
      case 'leanDownload': {
        const out = leanCache.out;
        if (!out) break;
        const url = URL.createObjectURL(new Blob([out.lean], { type: 'text/plain;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url; a.download = `${out.name}.lean`;
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        break;
      }
      default: break;
    }
  });

  render();
}

function factHTML(f) {
  const v = { ...f, pts: (f.pts || []).join('$, $'), line: f.line || '', l1: f.l1 || '', l2: f.l2 || '' };
  return tr('f.' + f.fact, v);
}

function errHTML(e) {
  const list = (a) => (a || []).map((x) => `$${x}$`).join(', ');
  switch (e.key) {
    case 'givenBad': case 'goalBad': return `${tr('e.' + e.key, { c: `$${e.claim || '…'}$` })} ${geoErr(e.err)}`;
    case 'missingPoints': return tr('e.missingPoints', { pts: list(e.pts) });
    case 'unusedPoints': return tr('w.unusedPoints', { pts: list(e.pts) });
    case 'unknown': return `${tr('e.unknown', { src: e.src, err: '' })} ${e.err ? geoErr(e.err) : srich(tt('e.unknownTip'))}`;
    case 'factNotDrawn': return tt('e.factNotDrawn', { f: factHTML(e.fact) });
    case 'goalFalse': case 'answerWrong': return tr('e.' + e.key, { m: (e.measured || []).join(', ') });
    case 'givenNotDrawn': return tr('w.givenNotDrawn', { c: `$${e.claim}$` });
    case 'extraGoals': return tr('w.extraGoals', { c: (e.claims || []).map((c) => `$${c}$`).join(', ') });
    case 'isoAssumed': case 'rightAssumed': return tr('w.' + e.key, { c: `$${e.claim}$` });
    case 'tangentNotDrawn': return tr('w.tangentNotDrawn', { f: `$${e.fact.p}${e.fact.t}$`, a: e.angle });
    default: {
      const k = S.he['e.' + e.key] ? 'e.' + e.key : 'w.' + e.key;
      return srich(tt(k));
    }
  }
}

// ---------------------------------------------------------------- step 3: saved

function stepDone(body, redraw) {
  const id = ED.savedId;
  body.innerHTML = `
    <div class="acct-card paper au-done">
      <div class="au-done-stamp">${icon('check')}</div>
      <h2 class="acct-h">${esc(tt('done.title'))}</h2>
      <p class="acct-lead">${esc(ED.status === 'draft' ? tt('done.leadDraft') : tt('done.lead'))}</p>
      <div class="acct-actions au-done-actions">
        <a class="btn btn-primary" href="#/tq/${encodeURIComponent(id)}">${icon('play')} ${esc(tt('done.play'))}</a>
        <button type="button" class="btn btn-ghost btn-small" id="doneCopy">${tic('copy')} <span>${esc(tt('done.copy'))}</span></button>
        <a class="btn btn-ghost btn-small" href="#/bank">${icon('map')} ${esc(tt('done.bank'))}</a>
        <a class="btn btn-ghost btn-small" href="#/author/${encodeURIComponent(id)}" id="doneEdit">${icon('edit')} ${esc(tt('done.edit'))}</a>
        <button type="button" class="btn btn-ghost btn-small" id="doneNew">${tic('plus')} ${esc(tt('done.new'))}</button>
      </div>
    </div>`;
  body.querySelector('#doneCopy').addEventListener('click', async (e) => {
    const ok = await copyText(linkFor(id));
    if (ok) e.currentTarget.querySelector('span').textContent = tt('bank.copied');
  });
  body.querySelector('#doneNew').addEventListener('click', () => {
    dropDraft('new');
    ED = null;
    if (location.hash === '#/author') window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = '#/author';
  });
  body.querySelector('#doneEdit').addEventListener('click', () => { ED = null; });
}
