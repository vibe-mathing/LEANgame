// More reasons for the checker, added for the bagrut questions (the bagrut session, 2026-11-27):
// the angle between a tangent and a chord, the segment from a point to the centre between two
// tangents, the law of sines with the circumradius, chords and secants, and area ratios. Also named
// parameters in claims (r, α, S) and a numeric fallback for "חשבון".
//
// geo.js calls install() once, at the end of its module body, with its CHECKS table and helpers.
// Nothing here imports geo.js, so there is no import cycle. New reasons go into REASONS (data.js)
// from here too, so data.js and geo.js only carry the two hook lines.
import { addTo, factorsOf, keyOf, mulKeys, follows as algFollows } from './algebra.js';
//
// Lean: every new reason has a Lean name (`lean`); the statements are in ~/LeanGame (built 2026-11-27;
// scripts/check_axioms.py: 0 counterexamples). The checker's Catalog does not map these ids yet:
//   tangent_chord   → tangent_chord (∢PTX = ∢TYX), tangent_chord_central (2∢PTX = ∢TOX, O across TX
//                     from P), tangent_chord_central_same (= 360 − ∢TOX); IsTangent.rename lets P be
//                     any point of the tangent line (all L10_Circle)
//   tangents_center → tangents_center, tangents_center_O (L10, proved)
//   chords_product  → chords_product (L10, proved)
//   secant_tangent  → secant_tangent, secant_secant (L10, proved)
//   law_sines_2r    → law_sines_circum (Derived, proved)
//   arc_length, circumference → none needed: in Lean ⌒AB and P(O) are written as their formulas
//                     (π·r·∢AOB/180, 2π·r), so these steps are `ring` (no LeanGame statement yet)
//   area_split      → area_split (L06)
//   same_height     → area_same_height (L06, school axiom)
//   sim_area        → sim_area, sim_area_BC, sim_area_AC (Derived, proved)
// The numeric fallback for "חשבון" is browser-only: Lean accepts a calculation only when its own
// algebra proves it (agreed with the checker session).

const H = (he, en) => ({ he, en });
const R = (stage, kind, refs, lean, he, en, playable = true) => ({
  stage, kind, refs, lean, playable,
  short: H(he[0], en[0]), name: H(he[1] || he[0], en[1] || en[0]), statement: H(he[2], en[2]),
});

export const MORE_REASONS = {
  // L10 circles
  tangent_chord: R('L10', 'theorem', 0, 'tangent_chord',
    ['משיק ומיתר', 'הזווית בין משיק למיתר', 'הזווית בין משיק למיתר שווה לזווית ההיקפית הנשענת על המיתר מהצד השני, והיא חצי מהזווית המרכזית הנשענת על אותה קשת.'],
    ['Tangent and chord', 'Tangent–chord angle', 'The angle between a tangent and a chord equals the inscribed angle on that chord from the other side, and is half the central angle on the same arc.']),
  tangents_center: R('L10', 'theorem', 0, 'tangents_center',
    ['קטע מרכזים ומשיקים', 'הקטע מנקודה למרכז המעגל', 'אם מנקודה יוצאים שני משיקים למעגל, הקטע מהנקודה למרכז המעגל חוצה את הזווית שבין המשיקים ואת הזווית המרכזית שבין רדיוסי ההשקה. מכאן שמרכז המעגל החסום במשולש נמצא על חוצי הזוויות.'],
    ['Tangents and the centre', 'The segment to the centre', 'If two tangents leave a point, the segment from that point to the centre bisects the angle between the tangents and the central angle between the radii to the points of tangency. So the centre of the inscribed circle lies on the angle bisectors.']),
  chords_product: R('L10', 'theorem', 0, 'chords_product',
    ['מיתרים נחתכים', 'מכפלת קטעי מיתרים נחתכים', 'אם שני מיתרים $AB$ ו-$CD$ נחתכים בנקודה $E$, אז $AE·EB = CE·ED$.'],
    ['Intersecting chords', 'Intersecting chords', 'If chords $AB$ and $CD$ meet at $E$, then $AE·EB = CE·ED$.']),
  secant_tangent: R('L10', 'theorem', 0, 'secant_tangent',
    ['חותכים ומשיק', 'חותך ומשיק מנקודה חיצונית', 'אם מנקודה $P$ מחוץ למעגל יוצאים חותך הפוגש את המעגל ב-$A$ וב-$B$ ומשיק בנקודה $T$, אז $PT² = PA·PB$. לשני חותכים: $PA·PB = PC·PD$.'],
    ['Secant and tangent', 'Secant and tangent from a point', 'If a secant from an outside point $P$ meets the circle at $A$ and $B$, and a tangent touches it at $T$, then $PT² = PA·PB$. For two secants, $PA·PB = PC·PD$.']),
  arc_length: R('L10', 'theorem', 0, 'arc_length',
    ['אורך קשת', 'אורך קשת', 'במעגל שרדיוסו $r$, אורך קשת שהזווית המרכזית שלה $α$ הוא $2πr·\\frac{α}{360}$, כלומר החלק $\\frac{α}{360}$ מהיקף המעגל. כותבים $⌒AB$ לקשת הקטנה ו-$⌒ACB$ לקשת שעוברת דרך $C$ (או "קשת AB").'],
    ['Arc length', 'Arc length', 'In a circle of radius $r$, an arc whose central angle is $α$ has length $2πr·\\frac{α}{360}$, the part $\\frac{α}{360}$ of the circumference. Write $⌒AB$ for the minor arc and $⌒ACB$ for the arc through $C$.']),
  circumference: R('L10', 'theorem', 0, 'circumference',
    ['היקף מעגל', 'היקף מעגל', 'היקף מעגל שרדיוסו $r$ הוא $2πr$ (או $π$ כפול הקוטר). כותבים $P(O)$ להיקף המעגל שמרכזו $O$, או $P(OA)$ כשכמה מעגלים חולקים את המרכז $O$ (או "היקף המעגל O").'],
    ['Circumference', 'Circumference', 'A circle of radius $r$ has circumference $2πr$ ($π$ times the diameter). Write $P(O)$ for the circumference of the circle with centre $O$, or $P(OA)$ when several circles share the centre $O$.']),
  // L11 trigonometry and areas
  law_sines_2r: R('L11', 'theorem', 0, 'law_sines_circum',
    ['משפט הסינוסים (2R)', 'משפט הסינוסים עם רדיוס המעגל החוסם', 'במשולש החסום במעגל שרדיוסו $R$, כל צלע חלקי הסינוס של הזווית שמולה שווה ל-$2R$: $\\frac{a}{\\sin α} = 2R$.'],
    ['Law of sines (2R)', 'Law of sines with the circumradius', 'In a triangle inscribed in a circle of radius $R$, each side over the sine of the opposite angle is $2R$: $\\frac{a}{\\sin α} = 2R$.']),
  area_split: R('L11', 'theorem', 0, 'area_split',
    ['חיבור שטחים', 'חיבור שטחים של משולשים', 'אם $D$ נמצאת על הצלע $BC$, אז $S△ABC = S△ABD + S△ADC$.'],
    ['Area addition', 'Adding areas of triangles', 'If $D$ lies on side $BC$, then $S△ABC = S△ABD + S△ADC$.']),
  same_height: R('L11', 'theorem', 'many', 'area_same_height',
    ['גובה משותף', 'משולשים בעלי גובה משותף', 'משולשים שיש להם קודקוד משותף ובסיסים על אותו ישר הם בעלי גובה משותף, ויחס השטחים שלהם שווה ליחס הבסיסים. בבסיסים שווים (למשל תיכון) השטחים שווים.'],
    ['Same height', 'Triangles with the same height', 'Triangles with a common vertex and bases on one line have the same height, so their areas are in the ratio of the bases. Equal bases (a median, say) give equal areas.']),
  sim_area: R('L11', 'theorem', 'many', 'sim_area',
    ['יחס שטחים בדמיון', 'יחס השטחים של משולשים דומים', 'יחס השטחים של משולשים דומים שווה לריבוע יחס הדמיון.'],
    ['Area ratio of similar triangles', 'Areas of similar triangles', 'The ratio of the areas of similar triangles is the square of the ratio of similarity.']),
  // L06 quadrilaterals: how to recognise each one (the converse theorems)
  quad_props: R('L06', 'theorem', 1, 'quad_props',
    ['תכונות מרובע', 'תכונות של מלבן, מעוין, ריבוע וטרפז שווה שוקיים', 'במלבן כל הזוויות ישרות. במעוין כל הצלעות שוות. בריבוע גם וגם. בטרפז שווה שוקיים השוקיים שוות. (ראו גם צלעות נגדיות, זוויות נגדיות ואלכסונים.)'],
    ['Quadrilateral properties', 'Properties of rectangles, rhombi and squares', 'A rectangle\'s angles are all right angles. A rhombus\'s sides are all equal. A square has both. (See also opposite sides, opposite angles and diagonals.)']),
  quad_test: R('L06', 'theorem', 'many', 'quad_tests',
    ['זיהוי מרובע', 'משפטי זיהוי של מרובעים', 'מקבילית: שני זוגות צלעות נגדיות מקבילות או שוות, זוג צלעות נגדיות שוות ומקבילות, או אלכסונים חוצים זה את זה. מלבן: מקבילית עם זווית ישרה או עם אלכסונים שווים. מעוין: מקבילית עם שתי צלעות סמוכות שוות או עם אלכסונים מאונכים, או מרובע שכל צלעותיו שוות. ריבוע: מלבן עם צלעות סמוכות שוות, או מעוין עם זווית ישרה. טרפז: זוג צלעות נגדיות מקבילות והזוג השני לא. טרפז שווה שוקיים: טרפז עם שוקיים שוות, זוויות בסיס שוות או אלכסונים שווים. דלתון: שני זוגות של צלעות סמוכות שוות.'],
    ['Recognising a quadrilateral', 'Quadrilateral tests', 'Parallelogram: both pairs of opposite sides parallel or equal, one pair equal and parallel, or diagonals that bisect each other. Rectangle: a parallelogram with a right angle or equal diagonals. Rhombus: a parallelogram with two equal adjacent sides or perpendicular diagonals, or four equal sides. Square: a rectangle with equal adjacent sides, or a rhombus with a right angle. Trapezoid: one pair of opposite sides parallel and the other not. Isosceles trapezoid: a trapezoid with equal legs, equal base angles or equal diagonals. Kite: two pairs of equal adjacent sides.']),
  tangent_test: R('L10', 'theorem', 'many', 'tangent_of_perp',
    ['תנאי למשיק', 'מתי ישר משיק למעגל', 'ישר העובר בקצה רדיוס ומאונך לו משיק למעגל. גם ישר העובר בקצה מיתר ויוצר איתו זווית השווה לזווית ההיקפית הנשענת על המיתר מהצד השני משיק למעגל. (כותבים: "CL משיק למעגל".)'],
    ['When a line is tangent', 'Tangent tests', 'A line through the end of a radius and perpendicular to it is tangent to the circle. So is a line through the end of a chord that makes with it the inscribed angle on that chord from the other side. (Write: "CL is tangent", as "CL משיק למעגל".)']),
  // analytic geometry (claims about coordinates; the drawing's coordinates are the question's)
  coord_calc: R('L11', 'theorem', 'many', 'coord_calc',
    ['חישוב לפי שיעורים', 'חישוב לפי שיעורי נקודות', 'אורכים, שטחים וזוויות לפי שיעורי הנקודות: נוסחת המרחק $AB = \\sqrt{(x_B - x_A)^2 + (y_B - y_A)^2}$ וכל חישוב שנובע מהשיעורים.'],
    ['Calculation from coordinates', 'Calculation from coordinates', 'Lengths, areas and angles from the coordinates: the distance formula $AB = \\sqrt{(x_B - x_A)^2 + (y_B - y_A)^2}$ and any calculation that follows from the coordinates.']),
  coord_mid: R('L11', 'theorem', 'many', 'midpoint_coords',
    ['אמצע לפי שיעורים', 'שיעורי אמצע קטע', 'שיעורי אמצע הקטע $AB$ הם $(\\frac{x_A + x_B}{2}, \\frac{y_A + y_B}{2})$.'],
    ['Midpoint from coordinates', 'Midpoint formula', 'The midpoint of $AB$ is $(\\frac{x_A + x_B}{2}, \\frac{y_A + y_B}{2})$.']),
  coord_slope: R('L11', 'theorem', 'many', 'slope_coords',
    ['שיפוע לפי שיעורים', 'שיפוע ישר דרך שתי נקודות', 'שיפוע הישר $AB$ הוא $m = \\frac{y_B - y_A}{x_B - x_A}$. (כותבים: $m_{AB} = -3$.)'],
    ['Slope from coordinates', 'Slope through two points', 'The slope of line $AB$ is $m = \\frac{y_B - y_A}{x_B - x_A}$. (Write: $m_{AB} = -3$.)']),
  slope_perp: R('L11', 'theorem', 'many', 'slope_perp',
    ['שיפועי ישרים מאונכים', 'שיפועים של ישרים מאונכים', 'ישרים מאונכים זה לזה אם ורק אם מכפלת שיפועיהם היא $-1$.'],
    ['Perpendicular slopes', 'Slopes of perpendicular lines', 'Two lines are perpendicular exactly when the product of their slopes is $-1$.']),
  slope_par: R('L11', 'theorem', 'many', 'slope_par',
    ['שיפועי ישרים מקבילים', 'שיפועים של ישרים מקבילים', 'ישרים מקבילים אם ורק אם שיפועיהם שווים.'],
    ['Parallel slopes', 'Slopes of parallel lines', 'Two lines are parallel exactly when their slopes are equal.']),
  line_eq: R('L11', 'theorem', 'many', 'line_eq',
    ['משוואת ישר', 'משוואת ישר לפי שיפוע ונקודה', 'הישר ששיפועו $m$ ועובר דרך $(x_0, y_0)$ הוא $y - y_0 = m(x - x_0)$, וכך גם ישר דרך שתי נקודות. (כותבים: $AB: y = -3x + 162$.)'],
    ['Equation of a line', 'Line from a slope and a point', 'The line with slope $m$ through $(x_0, y_0)$ is $y - y_0 = m(x - x_0)$, and likewise the line through two points. (Write: $AB: y = -3x + 162$.)']),
  line_point: R('L11', 'theorem', 'many', 'line_point',
    ['שיעורי נקודה מתנאים', 'שיעורי נקודה לפי התנאים שהיא מקיימת', 'נקודה מקיימת את המשוואות של הישרים והמעגלים שהיא עליהם, את המרחקים הנתונים שלה מנקודות ידועות, ואם היא קצה של קטע שאמצעו ידוע, את נוסחת האמצע. שיעוריה הם פתרון המערכת, והשרטוט קובע איזה פתרון (למשל "על החלק החיובי של ציר x").'],
    ['A point on lines', 'Where lines meet', 'A point on two lines (or on a line and an axis) satisfies both equations, and its coordinates solve the system.']),
  circle_eq: R('L11', 'theorem', 'many', 'circle_eq',
    ['משוואת מעגל', 'משוואת מעגל', 'המעגל שמרכזו $(a, b)$ ורדיוסו $R$ הוא $(x - a)^2 + (y - b)^2 = R^2$.'],
    ['Equation of a circle', 'Equation of a circle', 'The circle with centre $(a, b)$ and radius $R$ is $(x - a)^2 + (y - b)^2 = R^2$.']),
  // L10: quadrilaterals and circles
  cyclic_test: R('L10', 'theorem', 'many', 'cyclic_tests',
    ['מרובע בר חסימה', 'תנאי למרובע בר חסימה', 'מרובע שבו סכום זוג זוויות נגדיות הוא $180°$, או ששתי זוויות הנשענות על אותה צלע מאותו צד שוות, הוא בר חסימה במעגל. גם מלבן, ריבוע וטרפז שווה שוקיים בני חסימה.'],
    ['Cyclic quadrilateral', 'When a quadrilateral is cyclic', 'A quadrilateral with a pair of opposite angles summing to $180°$, or with two equal angles on the same side looking at one side, is cyclic. Rectangles, squares and isosceles trapezoids are cyclic too.']),
  cyclic_props: R('L10', 'theorem', 1, 'cyclic_props',
    ['במרובע בר חסימה', 'זוויות במרובע בר חסימה', 'במרובע בר חסימה סכום כל זוג זוויות נגדיות הוא $180°$, וזוויות הנשענות על אותה צלע מאותו צד שוות.'],
    ['In a cyclic quadrilateral', 'Angles of a cyclic quadrilateral', 'In a cyclic quadrilateral opposite angles sum to $180°$, and angles on the same side looking at one side are equal.']),
  tangential_test: R('L10', 'theorem', 'many', 'tangential_test',
    ['מרובע חוסם מעגל', 'תנאי למרובע חוסם מעגל', 'מרובע קמור שבו סכומי זוגות הצלעות הנגדיות שווים חוסם מעגל (אפשר לחסום בו מעגל). גם מעוין, ריבוע ודלתון חוסמים מעגל.'],
    ['Tangential quadrilateral', 'When a circle fits inside', 'A convex quadrilateral whose two pairs of opposite sides have equal sums has an inscribed circle. So do rhombi, squares and kites.']),
  tangential_props: R('L10', 'theorem', 1, 'pitot',
    ['במרובע חוסם מעגל', 'סכומי צלעות נגדיות במרובע חוסם', 'במרובע החוסם מעגל סכומי זוגות הצלעות הנגדיות שווים.'],
    ['In a tangential quadrilateral', 'Pitot\'s theorem', 'In a quadrilateral with an inscribed circle, the two pairs of opposite sides have equal sums.']),
};

// New kinds of quadrilateral claims: "ABCD בר חסימה" and "ABCD חוסם מעגל". The letter order is the
// order around the quadrilateral, so any rotation or reversal names the same one.
const D4 = [[0, 1, 2, 3], [1, 2, 3, 0], [2, 3, 0, 1], [3, 0, 1, 2], [3, 2, 1, 0], [2, 1, 0, 3], [1, 0, 3, 2], [0, 3, 2, 1]];
export const MORE_QUADS = {
  cyclic: { he: 'בר חסימה', en: 'cyclic', alt: ['בר חסימה במעגל', 'מרובע בר חסימה', 'בר-חסימה', 'חסום במעגל', 'cyclic quadrilateral'], lean: 'Cyclic4', sym: D4 },
  tangential: { he: 'חוסם מעגל', en: 'tangential', alt: ['מרובע חוסם מעגל', 'tangential quadrilateral'], lean: 'Tangential4', sym: D4 },
};

// ---------------------------------------------------------------- named parameters
// A question can name quantities: { r: 'OD', α: '∢OCD', S: 'S△MEO' }. A name is replaced by its term
// before a claim is parsed, so "CO = r/sinα" reads as "CO = OD/sin∢OCD". A name never shadows a
// point of the problem, and a Latin name is only replaced where it stands alone (not inside "sin", a
// segment "RA" or an area "S△…").

const GREEK = 'α-ωΑ-Ω';
export function expandNames(input, ctx) {
  if (typeof input !== 'string' || !input) return input;
  // arcs and circumferences in words: "קשת AB" → ⌒AB, "היקף המעגל O" → P(O) (see moreAtom)
  if (/קשת|היקף/.test(input)) {
    input = input.replace(/(?:אורך\s+)?ה?קשת\s+([A-Z]{2,3})(?![A-Z])/g, '⌒$1')
      .replace(/(?<!על\s+)היקף\s+(?:ה?מעגל\s+)?(?:שמרכזו\s+)?([A-Z])(?![A-Z])/g, 'P($1)');
  }
  // π is a number: 2π → 2*3.14159…, πr² → 3.14159…r²
  if (input.includes('π')) input = input.replace(/(\d)\s*π/g, '$1*π').replace(/π/g, String(Math.PI));
  const names = ctx && !Array.isArray(ctx) ? ctx.names : null;
  if (!names) return input;
  const pts = new Set(ctx.pointNames || []);
  let s = input.replace(/(sin|cos|tan)(?=[a-zα-ω])/gi, '$1 ');
  for (const [name, term] of Object.entries(names).sort((a, b) => b[0].length - a[0].length)) {
    if (!name || pts.has(name)) continue;
    const e = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const greek = new RegExp(`^[${GREEK}]`).test(name);
    const before = greek ? `(?<![${GREEK}])` : `(?<![A-Za-z${GREEK}])`;
    const after = greek ? `(?![${GREEK}])` : `(?![A-Za-z${GREEK}△□▱(])`;
    s = s.replace(new RegExp(before + e + after, 'g'), term);
  }
  return s;
}

// ---------------------------------------------------------------- arcs and circumferences
// The circles of the drawing: circle facts with the same centre and the same drawn radius (2%) are one
// circle, and a tangent's point of contact is on its circle. { o, r, on: [points, sorted] }.
export function circleGroups(problem) {
  const P = (problem && problem.points) || {};
  const out = [];
  const add = (o, x) => {
    if (!P[o] || !P[x] || o === x) return;
    const r = Math.hypot(P[o][0] - P[x][0], P[o][1] - P[x][1]);
    let g = out.find((c) => c.o === o && Math.abs(c.r - r) <= 0.02 * Math.max(c.r, r));
    if (!g) out.push((g = { o, r, on: [] }));
    if (!g.on.includes(x)) g.on.push(x);
  };
  for (const c of (problem && problem.config) || []) {
    if (c.type === 'circle') (c.on || []).forEach((x) => add(c.o, x));
    if (c.type === 'tangent') add(c.o, c.t);
  }
  out.forEach((g) => g.on.sort());
  return out;
}

const pfail = (key, vars) => ({ ok: false, error: { key, vars } });
const sideOfPts = (P, A, B, X) => {
  const c = (P[B][0] - P[A][0]) * (P[X][1] - P[A][1]) - (P[B][1] - P[A][1]) * (P[X][0] - P[A][0]);
  return Math.abs(c) < 1e-9 * (1 + Math.abs(P[B][0] - P[A][0]) + Math.abs(P[B][1] - P[A][1])) ? 0 : Math.sign(c);
};

// Atoms that geo.js's parseAtom asks for first:
//   ⌒AB   the minor arc AB of the circle through A and B (a half circle when AB is a diameter);
//   ⌒ACB  the arc from A to B through C (minor or major, as the drawing shows);
//   P(O)  the circumference of the circle with centre O; P(OA) the one through A, when several
//         circles share the centre O.
// A term carries its key (k: minor arc, K: major arc, P: circumference, each with the centre and the
// circle's first point, then the arc's ends), its dimension, how it is shown and its Lean form (the
// formula: an arc is r·θ, a circumference 2πr), so geo.js, qparse.js and leanconv.js need no more.
export function moreAtom(body, points, ctx) {
  let m;
  if ((m = body.match(/^⌒([A-Z])([A-Z])([A-Z])?$/))) {
    const [A, X, Y] = [m[1], m[2], m[3]];
    const [B, C] = Y ? [Y, X] : [X, null];
    const pts = [A, B, C].filter(Boolean);
    const bad = pts.find((x) => !points.includes(x));
    if (bad) return pfail('unknownPoint', { p: `$${bad}$` });
    if (new Set(pts).size < pts.length) return pfail('repeatPoint');
    const groups = circleGroups(ctx).filter((g) => pts.every((x) => g.on.includes(x)));
    if (!groups.length) return pfail('arcNoCircle', { a: `$${body}$` });
    if (groups.length > 1) return pfail('arcAmbiguous', { a: `$${body}$` });
    const g = groups[0];
    const P = ctx.points;
    const [E1, E2] = [A, B].sort();
    const o = g.o;
    const R = g.on[0];
    // a half circle when the centre is on AB; else C on the minor arc when C and O are on opposite sides of AB
    const half = sideOfPts(P, A, B, o) === 0;
    const major = !half && C != null && sideOfPts(P, A, B, C) === sideOfPts(P, A, B, o);
    const key = `${major ? 'K' : 'k'}:${o}${R}:${E1}${E2}`;
    const r = `len ${o} ${R}`;
    const lean = half ? `(Real.pi * ${r})` : major ? `(Real.pi * ${r} * (360 - ang ${A} ${o} ${B}) / 180)` : `(Real.pi * ${r} * ang ${A} ${o} ${B} / 180)`;
    return { ok: true, term: { kind: 'arc', p: [A, ...(C ? [C] : []), B], o, rp: R, major, half, key, dim: 'L1', str: `⌒${A}${C || ''}${B}`, lean } };
  }
  if ((m = body.match(/^P(?:\(([A-Z])([A-Z])?\)|⊙([A-Z])([A-Z])?)$/))) { // P(O), P(OA); P⊙O from the editor's text
    const [o, X] = m[1] ? [m[1], m[2]] : [m[3], m[4]];
    for (const x of [o, X].filter(Boolean)) if (!points.includes(x)) return pfail('unknownPoint', { p: `$${x}$` });
    const around = circleGroups(ctx).filter((g) => g.o === o);
    const groups = X ? around.filter((g) => g.on.includes(X)) : around;
    if (!groups.length) return pfail('circNoCircle', { o: `$${o}$` });
    if (groups.length > 1) return pfail('circAmbiguous', { o: `$${o}$`, ex: `$P(${o}${groups[0].on[0]})$` });
    const R = groups[0].on[0];
    return { ok: true, term: { kind: 'circum', p: [o, R], o, rp: R, key: `P:${o}${R}`, dim: 'L1', str: around.length > 1 ? `P(${o}${X || R})` : `P(${o})`, lean: `(2 * Real.pi * len ${o} ${R})` } };
  }
  return null;
}

// The value of an arc or circumference key in a drawing (atomValue, below).
function arcValue(points, atom) {
  const m = atom.match(/^([kKP]):([A-Z])([A-Z])(?::([A-Z])([A-Z]))?$/);
  if (!m) return null;
  const [, kind, o, R, A, B] = m;
  if (!points[o] || !points[R]) return null;
  const r = Math.hypot(points[o][0] - points[R][0], points[o][1] - points[R][1]);
  if (kind === 'P') return 2 * Math.PI * r;
  if (!points[A] || !points[B]) return null;
  const th = (angleAt(points, A, o, B) * Math.PI) / 180;
  return r * (kind === 'K' ? 2 * Math.PI - th : th);
}

// ---------------------------------------------------------------- more claim types
// geo.js's parseClaim asks moreClaim first, with the normalized input (no spaces, upper case). A claim
// it returns carries its own extKey / extStr / extLean (geo.js), extErrs (qparse.js, the drawing as a
// witness) and extItems (diagram.js highlight).
//
// "CL משיק למעגל", "CL משיק למעגל שמרכזו K", "CL משיק למעגל בנקודה C": line CL touches the circle at
// C (the one of its two letters that lies on the circle).
let API = null; // set by install()
const TANGENT_RE = /^([A-Z])([A-Z])(?:הוא|היא)?משיקה?(?:ל(?:ה)?מעגל)?(?:ש?מרכזו([A-Z]))?(?:ב(?:נקודה)?-?([A-Z]))?$/;

export function moreClaim(s, ctx) {
  if (!API || !ctx || Array.isArray(ctx) || !ctx.points) return null;
  const an = analyticClaim(s, ctx);
  if (an) return an;
  const m = s.match(TANGENT_RE);
  if (!m || !ctx.config) return null;
  const [, a, b, o0, t0] = m;
  const pts = ctx.pointNames || [];
  const bad = [a, b, o0, t0].filter(Boolean).find((x) => !pts.includes(x));
  if (bad) return { ok: false, error: { key: 'unknownPoint', vars: { p: `$${bad}$` } } };
  const circs = ctx.config.filter((c) => c.type === 'circle' && (!o0 || c.o === o0));
  let found = null;
  for (const c of circs) {
    for (const t of t0 ? [t0] : [a, b]) {
      if (c.on.includes(t) && (t === a || t === b)) { found = { o: c.o, t, p: t === a ? b : a }; break; }
    }
    if (found) break;
  }
  if (!found) return { ok: false, error: { key: 'unknownTerm', vars: { t: `$${a}${b}$` } } };
  const { o, t, p } = found;
  const line = API.lineKey(ctx.points, t, p);
  return {
    ok: true,
    claim: {
      type: 'tangentc', o, t, p, a: [t, p],
      extKey: `tangent:${o}:${t}:${line}`,
      extStr: `${t}${p} משיק למעגל שמרכזו ${o}`,
      extLean: `IsTangent ${p} ${t} ${o} (len ${o} ${t})`,
      extItems: [{ kind: 'seg', p: [t, p], tone: 'a' }],
      extErrs: (pos) => {
        const u = [pos[o][0] - pos[t][0], pos[o][1] - pos[t][1]]; const v = [pos[p][0] - pos[t][0], pos[p][1] - pos[t][1]];
        const ang = Math.atan2(Math.abs(u[0] * v[1] - u[1] * v[0]), u[0] * v[0] + u[1] * v[1]) / DEG;
        return [{ v: Math.abs(90 - ang), tol: 0.5 }];
      },
    },
  };
}

// ---------------------------------------------------------------- analytic geometry
// The drawing's coordinates are the question's coordinates (the origin is (0, 0)). Claims, after
// normalizeInput (no spaces, upper case, ':' read as '/'):
//   C(45;27) or C=(45;27)                a point's coordinates (';' or ',' between them)
//   M_AB=-3 or שיפועAB=-3                the slope of line AB
//   AB/Y=-3X+162 ("AB: y = −3x + 162")   the line through A and B; AB/X=5 for a vertical line
//   (X-22.5)²+(Y-19.5)²=562.5            a circle (its centre is the drawing's point there)
// Numbers may be whole, decimal, a/b, √n or a√n, with a sign.

const NUM = '-?(?:\\d+(?:\\.\\d+)?)?(?:√\\d+(?:\\.\\d+)?)?(?:/\\d+(?:\\.\\d+)?)?';
function num(str) {
  const m = String(str).match(/^(-?)(\d+(?:\.\d+)?)?(?:√(\d+(?:\.\d+)?))?(?:\/(\d+(?:\.\d+)?))?$/);
  if (!m || (!m[2] && !m[3])) return null;
  let v = (m[2] ? parseFloat(m[2]) : 1) * (m[3] ? Math.sqrt(parseFloat(m[3])) : 1);
  if (m[4]) v /= parseFloat(m[4]);
  return m[1] ? -v : v;
}
const close = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
const fnum = (v) => { const r = Math.round(v * 1e6) / 1e6; return String(r); };
// For display: a simple fraction when the number is one (−4/3 rather than −1.333333).
const frac = (v) => { for (let q = 1; q <= 12; q++) { const p = Math.round(v * q); if (Math.abs(v - p / q) < 1e-9) return q === 1 ? String(p) : `${p}/${q}`; } return fnum(v); };
// "−3X+162" → { m: −3, b: 162 } (a linear expression in X)
function linearX(str, V = 'X') {
  const terms = str.replace(/-/g, '+-').split('+').filter(Boolean);
  let m = 0; let b = 0;
  for (const t of terms) {
    if (t.endsWith(V)) {
      const c = t.slice(0, -1);
      const v = c === '' ? 1 : c === '-' ? -1 : num(c.replace(/\*$/, ''));
      if (v == null) return null;
      m += v;
    } else if (t.includes(V)) {
      const [c, d] = t.split(V); // "X/2" style
      const v = (c === '' ? 1 : c === '-' ? -1 : num(c)) / (d && d.startsWith('/') ? num(d.slice(1)) : 1);
      if (!Number.isFinite(v)) return null;
      m += v;
    } else {
      const v = num(t);
      if (v == null) return null;
      b += v;
    }
  }
  return { m, b };
}

function analyticClaim(s, ctx) {
  const pts = ctx.pointNames || [];
  const P = ctx.points;
  let m;
  const err = (key, vars) => ({ ok: false, error: { key, vars } });
  const unknown = (x) => err('unknownPoint', { p: `$${x}$` });
  // a point's coordinates
  if ((m = s.match(new RegExp(`^([A-Z])=?\\((${NUM})[;,](${NUM})\\)$`)))) {
    const [, A, xs, ys] = m;
    if (!pts.includes(A)) return unknown(A);
    const x = num(xs); const y = num(ys);
    if (x == null || y == null) return null;
    return { ok: true, claim: {
      type: 'coord', P: [A], x, y, extKey: `coord:${A}:${fnum(x)}:${fnum(y)}`, extStr: `${A}(${frac(x)}, ${frac(y)})`,
      extLean: `${A} = ![${fnum(x)}, ${fnum(y)}]`, extItems: [],
      extErrs: (pos) => [{ v: Math.hypot(pos[A][0] - x, pos[A][1] - y), tol: 1e-3 }],
    } };
  }
  // a slope
  if ((m = s.match(new RegExp(`^(?:M_|שיפוע(?:הישר)?)([A-Z])([A-Z])=(${NUM})$`)))) {
    const [, A, B, vs] = m;
    for (const x of [A, B]) if (!pts.includes(x)) return unknown(x);
    const v = num(vs);
    if (v == null) return null;
    const line = API.lineKey(P, A, B);
    return { ok: true, claim: {
      type: 'slope', a: [A, B], m: v, extKey: `slope:${line}:${fnum(v)}`, extStr: `m_${A}${B} = ${frac(v)}`,
      extLean: `slope ${A} ${B} = ${fnum(v)}`, extItems: [{ kind: 'seg', p: [A, B], tone: 'a' }],
      extErrs: (pos) => [{ v: Math.abs((pos[B][1] - pos[A][1]) - v * (pos[B][0] - pos[A][0])), tol: 1e-3 * Math.max(1, Math.abs(pos[B][0] - pos[A][0])) }],
    } };
  }
  // a line equation
  if ((m = s.match(/^(?:ישר)?([A-Z])([A-Z])\/(Y|X)=(.+)$/))) {
    const [, A, B, V, rhs] = m;
    for (const x of [A, B]) if (!pts.includes(x)) return unknown(x);
    const line = API.lineKey(P, A, B);
    if (V === 'X') {
      const c = num(rhs);
      if (c == null) return null;
      return { ok: true, claim: {
        type: 'lineq', a: [A, B], vertical: true, c, extKey: `lineq:${line}:x=${fnum(c)}`, extStr: `${A}${B}: x = ${fnum(c)}`,
        extLean: `∀ p ∈ line[ℝ, ${A}, ${B}], p 0 = ${fnum(c)}`, extItems: [{ kind: 'seg', p: [A, B], tone: 'a' }],
        extErrs: (pos) => [A, B].map((q) => ({ v: Math.abs(pos[q][0] - c), tol: 1e-3 })),
      } };
    }
    const lin = linearX(rhs);
    if (!lin) return null;
    const sgn = lin.b < 0 ? '−' : '+';
    return { ok: true, claim: {
      type: 'lineq', a: [A, B], vertical: false, m: lin.m, b: lin.b,
      extKey: `lineq:${line}:${fnum(lin.m)}:${fnum(lin.b)}`, extStr: `${A}${B}: y = ${[close(lin.m, 0) ? '' : close(lin.m, 1) ? 'x' : close(lin.m, -1) ? '−x' : `${frac(lin.m)}x`, close(lin.b, 0) && !close(lin.m, 0) ? '' : close(lin.m, 0) ? frac(lin.b) : `${sgn} ${frac(Math.abs(lin.b))}`].filter(Boolean).join(' ')}`,
      extLean: `∀ p ∈ line[ℝ, ${A}, ${B}], p 1 = ${fnum(lin.m)} * p 0 + ${fnum(lin.b)}`, extItems: [{ kind: 'seg', p: [A, B], tone: 'a' }],
      extErrs: (pos) => [A, B].map((q) => ({ v: Math.abs(pos[q][1] - (lin.m * pos[q][0] + lin.b)), tol: 1e-3 })),
    } };
  }
  // a circle equation; x² or y² stands for a centre on that axis: (x + 24)² + y² = 100
  if ((m = s.replace(/^X²/, '(X)²').replace(/\+Y²=/, '+(Y)²=').match(new RegExp(`^\\(X([+-]${NUM.slice(2)})?\\)²\\+\\(Y([+-]${NUM.slice(2)})?\\)²=(${NUM})$`)))) {
    const a = m[1] ? -num(m[1].replace(/^\+/, '')) : 0;
    const b = m[2] ? -num(m[2].replace(/^\+/, '')) : 0;
    const r2 = num(m[3]);
    if (![a, b, r2].every(Number.isFinite)) return null;
    const O = pts.find((q) => Math.hypot(P[q][0] - a, P[q][1] - b) < 1e-6);
    const name = O ? `${O}` : `(${fnum(a)}, ${fnum(b)})`;
    return { ok: true, claim: {
      type: 'circeq', o: O || null, cx: a, cy: b, r2, extKey: `circeq:${fnum(a)}:${fnum(b)}:${fnum(r2)}`,
      extStr: `(x ${a < 0 ? '+' : '−'} ${fnum(Math.abs(a))})² + (y ${b < 0 ? '+' : '−'} ${fnum(Math.abs(b))})² = ${fnum(r2)}`,
      extLean: `circle ${name} ${fnum(r2)}`, extItems: [], extErrs: () => [],
    } };
  }
  return null;
}

// ---------------------------------------------------------------- numbers off the drawing

const DEG = Math.PI / 180;
const dist2 = (P, Q) => Math.hypot(P[0] - Q[0], P[1] - Q[1]);
function angleAt(points, X, V, Y) {
  const u = [points[X][0] - points[V][0], points[X][1] - points[V][1]];
  const v = [points[Y][0] - points[V][0], points[Y][1] - points[V][1]];
  return Math.atan2(Math.abs(u[0] * v[1] - u[1] * v[0]), u[0] * v[0] + u[1] * v[1]) / DEG;
}
const triArea = (points, A, B, C) => Math.abs((points[B][0] - points[A][0]) * (points[C][1] - points[A][1]) - (points[B][1] - points[A][1]) * (points[C][0] - points[A][0])) / 2;

// The value of a basic atom key in the drawing: s:AB, a:V:XY, S:ABC. null if unknown.
function atomValue(points, atom) {
  let m;
  if ((m = atom.match(/^s:([A-Z])([A-Z])$/))) return points[m[1]] && points[m[2]] ? dist2(points[m[1]], points[m[2]]) : null;
  if ((m = atom.match(/^a:([A-Z]):([A-Z])([A-Z])$/))) return points[m[1]] && points[m[2]] && points[m[3]] ? angleAt(points, m[2], m[1], m[3]) : null;
  if ((m = atom.match(/^S:([A-Z])([A-Z])([A-Z])$/))) return points[m[1]] && points[m[2]] && points[m[3]] ? triArea(points, m[1], m[2], m[3]) : null;
  // S□ABCD (geo.js keys it 'Q:' + its vertices in an order around it): the shoelace formula
  if ((m = atom.match(/^Q:([A-Z]{4})$/))) {
    const q = [...m[1]].map((x) => points[x]);
    if (q.some((x) => !x)) return null;
    let s = 0;
    for (let i = 0; i < 4; i++) s += q[i][0] * q[(i + 1) % 4][1] - q[(i + 1) % 4][0] * q[i][1];
    return Math.abs(s) / 2;
  }
  return arcValue(points, atom); // ⌒AB, ⌒ACB, P(O)
}

// ---------------------------------------------------------------- numeric calculation check
// Does `target` = 0 follow from `polys` = 0 near the drawing? Each polynomial is a Map from monomial
// keys (atoms joined by *, with ^e, as in algebra.js) to coefficients, '1' for the constant. The
// variables are the basic atoms (lengths, angles in degrees, areas); sin/cos/tan of an angle is a
// function of the angle. The claim must hold at the drawing, and at points near it moved onto the
// set where every cited row holds. That is a calculation from the cited rows (substituting, solving,
// squaring, trig identities), with the branch the drawing shows. Browser-only: not a Lean proof.

function factors(key) {
  const f = [];
  if (key === '1') return f;
  for (const part of key.split('*')) {
    const i = part.lastIndexOf('^');
    f.push(i < 0 ? [part, 1] : [part.slice(0, i), Number(part.slice(i + 1))]);
  }
  return f;
}
const trigOf = (atom) => atom.match(/^t:(sin|cos|tan)\((.+)\)$/);

function makeSystem(polys, target, points) {
  const vars = [];
  const index = new Map();
  const add = (a) => {
    if (index.has(a)) return true;
    const v = atomValue(points, a);
    if (v == null || !Number.isFinite(v)) return false;
    index.set(a, vars.length);
    vars.push({ atom: a, v0: v, angle: a.startsWith('a:') });
    return true;
  };
  const compile = (p) => {
    const terms = [];
    for (const [key, c] of p) {
      const fs = [];
      for (const [atom, e] of factors(key)) {
        const t = trigOf(atom);
        if (t) { if (!add(t[2])) return null; fs.push({ i: index.get(t[2]), fn: t[1], e }); } else { if (!add(atom)) return null; fs.push({ i: index.get(atom), fn: null, e }); }
      }
      terms.push({ c, fs });
    }
    return terms;
  };
  const F = polys.map(compile);
  const G = compile(target);
  if (!G || F.some((x) => !x)) return null;
  return { vars, F, G };
}

function evalTerms(terms, x) {
  let sum = 0;
  let mag = 0;
  for (const { c, fs } of terms) {
    let m = c;
    for (const { i, fn, e } of fs) {
      let v = x[i];
      if (fn === 'sin') v = Math.sin(v * DEG); else if (fn === 'cos') v = Math.cos(v * DEG); else if (fn === 'tan') v = Math.tan(v * DEG);
      m *= v ** e;
    }
    sum += m;
    mag += Math.abs(m);
  }
  return { v: sum, mag };
}

// Seeded random numbers, so a check gives the same answer every time.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

// Move x onto { F = 0 } with minimum-norm Gauss–Newton steps (scaled by each variable's size).
function project(sys, x0, scale) {
  const x = [...x0];
  const m = sys.F.length;
  if (!m) return x;
  for (let it = 0; it < 60; it++) {
    const r = sys.F.map((f) => evalTerms(f, x));
    const worst = Math.max(...r.map((q) => Math.abs(q.v) / Math.max(q.mag, 1e-12)));
    if (worst < 1e-13) return x;
    // Jacobian in scaled variables (central differences)
    const J = sys.F.map(() => new Array(x.length).fill(0));
    for (let j = 0; j < x.length; j++) {
      const h = 1e-6 * scale[j];
      const xp = [...x]; xp[j] += h;
      const xm = [...x]; xm[j] -= h;
      sys.F.forEach((f, i) => { J[i][j] = ((evalTerms(f, xp).v - evalTerms(f, xm).v) / (2 * h)) * scale[j]; });
    }
    const JJ = J.map((row) => J.map((row2) => row.reduce((s, v, k) => s + v * row2[k], 0)));
    const tr = JJ.reduce((s, row, i) => s + row[i], 0) || 1;
    for (let i = 0; i < m; i++) JJ[i][i] += 1e-12 * tr;
    const y = solveLinear(JJ, r.map((q) => -q.v));
    if (!y) return null;
    for (let j = 0; j < x.length; j++) x[j] += scale[j] * y.reduce((s, yi, i) => s + yi * J[i][j], 0);
    if (x.some((v) => !Number.isFinite(v))) return null;
  }
  const r = sys.F.map((f) => evalTerms(f, x));
  return r.every((q) => Math.abs(q.v) <= 1e-9 * Math.max(q.mag, 1e-12)) ? x : null;
}

export function numericFollows(polys, target, points, { samples = 8, seed = 12345 } = {}) {
  if (!target || !target.size) return true;
  const sys = makeSystem(polys, target, points);
  if (!sys || !sys.vars.length) return false;
  const x0 = sys.vars.map((v) => v.v0);
  const holds = (x) => { const g = evalTerms(sys.G, x); return Math.abs(g.v) <= 1e-7 * Math.max(g.mag, 1e-9); };
  if (!holds(x0)) return false;
  if (sys.F.some((f) => { const q = evalTerms(f, x0); return Math.abs(q.v) > 1e-6 * Math.max(q.mag, 1e-9); })) return false;
  const scale = x0.map((v) => Math.max(Math.abs(v), 1e-3));
  const rand = rng(seed);
  let tried = 0;
  for (let s = 0; s < samples * 3 && tried < samples; s++) {
    // a random direction; if Gauss–Newton does not converge from that far, try closer (with many cited
    // rows the set where they all hold can be curved enough that 8% is too far)
    const dir = x0.map(() => rand() * 2 - 1);
    let x = null;
    for (const step of [0.08, 0.02, 0.005]) {
      const start = x0.map((v, j) => {
        const y = v + dir[j] * step * scale[j];
        return sys.vars[j].angle ? Math.min(179.9, Math.max(0.1, y)) : y;
      });
      x = project(sys, start, scale);
      if (x) break;
    }
    if (!x) continue;
    if (sys.vars.some((v, j) => (v.angle ? x[j] <= 0 || x[j] >= 180 : v.atom.startsWith('s:') || v.atom.startsWith('S:') ? x[j] <= 0 : false))) continue;
    tried++;
    if (!holds(x)) return false;
  }
  return tried > 0;
}

// ---------------------------------------------------------------- the install hook

export function install(api) {
  const { CHECKS, REASONS, matches, fail2, gives, refNames, circles, tangents, triples, sideOf, between, degenerate, eqVec, parseClaim, QUADS, claimKey } = api;
  API = api;
  Object.assign(REASONS, MORE_REASONS);
  if (QUADS) Object.assign(QUADS, MORE_QUADS);

  const pn = (problem) => problem.pointNames;
  const onLineOf = (problem, P, Q) => pn(problem).filter((X) => X !== P && X !== Q && sideOf(problem, P, Q, X) === 0);

  // The claim matches one of the theorem's claims, or follows from one of them together with the
  // cited equations (so "S△MOA = 2.25S△OEA" works when MO = 1.5OE is cited).
  function fits(problem, claim, strs, refRows) {
    if (!strs.length) return false;
    if (matches(problem, claim, strs)) return true;
    const extra = refRows.filter((r) => r.claim.type === 'eq').map((r) => eqVec(r.claim));
    if (!extra.length || claim.type !== 'eq') return false;
    for (const s of strs) {
      const r = parseClaim(s, problem);
      if (r.ok && r.claim.type === 'eq' && numericFollows([eqVec(r.claim), ...extra], eqVec(claim), problem.points)) return true;
    }
    return false;
  }
  const done = (ok, rid, strs, proof) => (ok ? { ok: true, proof } : strs.length ? gives(rid, strs[0], proof) : fail2('reasonNoFit', proof, { rid }));

  // The area terms of a claim: S△ABC on its own or inside a product.
  // The terms of one kind in a claim (arcs, circumferences), on their own or inside a product.
  function termsOf(claim, kind) {
    if (!claim || (claim.type !== 'eq' && claim.type !== 'ineq')) return [];
    const out = new Map();
    const take = (t) => { if (t.kind === kind) out.set(t.key, t); else if (t.kind === 'mono') t.f.forEach((x) => take(x.t)); };
    for (const { t } of [...claim.L.terms, ...claim.R.terms]) take(t);
    return [...out.values()];
  }
  function areaTris(claim) {
    if (!claim || (claim.type !== 'eq' && claim.type !== 'ineq')) return [];
    const out = new Map();
    const take = (t) => { if (t.kind === 'area') out.set(t.key, t.p); else if (t.kind === 'mono') t.f.forEach((x) => take(x.t)); };
    for (const { t } of [...claim.L.terms, ...claim.R.terms]) take(t);
    return [...out.values()];
  }

  Object.assign(CHECKS, {
    tangent_chord(claim, refRows, problem) {
      const proof = 'tangent_chord';
      const strs = [];
      for (const tg of tangents(problem)) {
        const c = circles(problem).find((x) => x.o === tg.o && x.on.includes(tg.t));
        if (!c) continue;
        const T = tg.t;
        const onTangent = [tg.p, ...onLineOf(problem, T, tg.p)].filter((X, i, a) => X !== T && a.indexOf(X) === i);
        for (const X of c.on) {
          if (X === T) continue;
          for (const P of onTangent) {
            const sp = sideOf(problem, T, X, P);
            if (!sp) continue;
            for (const Y of c.on) if (Y !== T && Y !== X && sideOf(problem, T, X, Y) * sp < 0) strs.push(`∢${P}${T}${X}=∢${T}${Y}${X}`);
            if (sideOf(problem, T, X, c.o) * sp < 0) strs.push(`2∢${P}${T}${X}=∢${T}${c.o}${X}`);
            else if (sideOf(problem, T, X, c.o) * sp > 0) strs.push(`2∢${P}${T}${X}=360-∢${T}${c.o}${X}`);
          }
        }
      }
      return done(fits(problem, claim, strs, refRows), 'tangent_chord', strs, proof);
    },
    tangents_center(claim, refRows, problem) {
      const proof = 'tangents_center';
      const strs = [];
      for (const t1 of tangents(problem)) {
        for (const t2 of tangents(problem)) {
          if (t1.t < t2.t && t1.p === t2.p && t1.o === t2.o) {
            const P = t1.p; const O = t1.o;
            strs.push(`∢${O}${P}${t1.t}=∢${O}${P}${t2.t}`, `∢${P}${O}${t1.t}=∢${P}${O}${t2.t}`);
          }
        }
      }
      return done(fits(problem, claim, strs, refRows), 'tangents_center', strs, proof);
    },
    chords_product(claim, refRows, problem) {
      const proof = 'chords_product';
      const strs = [];
      for (const c of circles(problem)) {
        for (const [A, B] of triples(c.on)) {
          if (A > B) continue;
          for (const E of pn(problem)) {
            if (!between(problem, A, E, B)) continue;
            for (const C of c.on) for (const D of c.on) if (C < D && C !== A && C !== B && D !== A && D !== B && between(problem, C, E, D)) strs.push(`${A}${E}*${E}${B}=${C}${E}*${E}${D}`);
          }
        }
      }
      return done(fits(problem, claim, strs, refRows), 'chords_product', strs, proof);
    },
    secant_tangent(claim, refRows, problem) {
      const proof = 'secant_tangent';
      const strs = [];
      for (const c of circles(problem)) {
        const outside = pn(problem).filter((P) => !c.on.includes(P) && P !== c.o);
        for (const P of outside) {
          const secants = [];
          for (const A of c.on) for (const B of c.on) if (A < B && sideOf(problem, A, B, P) === 0 && !between(problem, A, P, B)) secants.push([A, B]);
          for (const [A, B] of secants) {
            for (const tg of tangents(problem)) if (tg.p === P && tg.o === c.o) strs.push(`${P}${tg.t}²=${P}${A}*${P}${B}`);
            for (const [C, D] of secants) if (C + D > A + B) strs.push(`${P}${A}*${P}${B}=${P}${C}*${P}${D}`);
          }
        }
      }
      return done(fits(problem, claim, strs, refRows), 'secant_tangent', strs, proof);
    },
    law_sines_2r(claim, refRows, problem) {
      const proof = 'law_sines_circum';
      const strs = [];
      for (const c of circles(problem)) {
        for (const [X, Y, Z] of triples(c.on)) {
          if (X > Y || degenerate(problem, [X, Y, Z])) continue;
          for (const W of c.on) strs.push(`${X}${Y}/sin∢${X}${Z}${Y}=2${c.o}${W}`);
        }
      }
      return done(fits(problem, claim, strs, refRows), 'law_sines_2r', strs, proof);
    },
    // ⌒AB = π·r·∢AOB/180 (a major arc π·r·(360 − ∢AOB)/180, a half circle π·r), with r any radius of
    // its circle, or as a part of the circumference: ⌒AB = P(O)·∢AOB/360.
    arc_length(claim, refRows, problem) {
      const proof = 'arc_length';
      const strs = [];
      for (const t of termsOf(claim, 'arc')) {
        const g = circleGroups(problem).find((c) => c.o === t.o && c.on.includes(t.rp));
        if (!g) continue;
        const [A, B] = [t.p[0], t.p[t.p.length - 1]];
        const o = t.o;
        const circ = `P(${o}${t.rp})`;
        for (const X of g.on) {
          const r = `${o}${X}`;
          strs.push(t.half ? `${t.str}=π*${r}` : t.major ? `${t.str}=2π*${r}-π*${r}*∢${A}${o}${B}/180` : `${t.str}=π*${r}*∢${A}${o}${B}/180`);
        }
        strs.push(t.half ? `${t.str}=${circ}/2` : t.major ? `${t.str}=${circ}-${circ}*∢${A}${o}${B}/360` : `${t.str}=${circ}*∢${A}${o}${B}/360`);
      }
      return done(fits(problem, claim, strs, refRows), 'arc_length', strs, proof);
    },
    // P(O) = 2π·r for any radius r of the circle, or π times a diameter.
    circumference(claim, refRows, problem) {
      const proof = 'circumference';
      const strs = [];
      for (const t of termsOf(claim, 'circum')) {
        const g = circleGroups(problem).find((c) => c.o === t.o && c.on.includes(t.rp));
        if (!g) continue;
        const circ = `P(${t.o}${t.rp})`;
        for (const X of g.on) strs.push(`${circ}=2π*${t.o}${X}`);
        for (const X of g.on) for (const Y of g.on) if (X < Y && between(problem, X, t.o, Y)) strs.push(`${circ}=π*${X}${Y}`);
      }
      return done(fits(problem, claim, strs, refRows), 'circumference', strs, proof);
    },
    area_split(claim, refRows, problem) {
      const proof = 'area_split';
      const tris = areaTris(claim);
      const strs = [];
      for (const T of tris) {
        for (let k = 0; k < 3; k++) {
          const A = T[k]; const B = T[(k + 1) % 3]; const C = T[(k + 2) % 3];
          for (const D of pn(problem)) if (between(problem, B, D, C)) strs.push(`S△${A}${B}${C}=S△${A}${B}${D}+S△${A}${D}${C}`);
        }
      }
      return done(fits(problem, claim, strs, refRows), 'area_split', strs, proof);
    },
    same_height(claim, refRows, problem) {
      const proof = `area_same_height ${refNames(refRows)}`.trim();
      const tris = areaTris(claim);
      const strs = [];
      for (const T1 of tris) {
        for (const T2 of tris) {
          if (T1 === T2) continue;
          for (const A of T1) {
            if (!T2.includes(A)) continue;
            const [X, Y] = T1.filter((p) => p !== A);
            const [Z, W] = T2.filter((p) => p !== A);
            if (sideOf(problem, X, Y, Z) !== 0 || sideOf(problem, X, Y, W) !== 0 || sideOf(problem, X, Y, A) === 0) continue;
            strs.push(`S△${A}${X}${Y}*${Z}${W}=S△${A}${Z}${W}*${X}${Y}`);
          }
        }
      }
      return done(fits(problem, claim, strs, refRows), 'same_height', strs, proof);
    },
    sim_area(claim, refRows, problem) {
      const proof = `sim_area ${refNames(refRows)}`.trim();
      const sim = refRows.find((r) => r.claim.type === 'sim');
      if (!sim) return fail2('reasonNoFit', proof, { rid: 'sim_area' });
      const { P, Q } = sim.claim;
      const strs = [[0, 1], [1, 2], [0, 2]].map(([i, j]) => `S△${P.join('')}*${Q[i]}${Q[j]}²=S△${Q.join('')}*${P[i]}${P[j]}²`);
      return done(fits(problem, claim, strs, refRows.filter((r) => r !== sim)), 'sim_area', strs, proof);
    },
  });

  // ---- quadrilaterals: tests (the converse theorems) and the two new kinds
  // A fact the cited rows give: the same claim, or (for an equation) one that follows from the cited
  // equations by calculation. A rectangle, rhombus or square row also counts as a parallelogram row.
  function hasFact(problem, refRows, s) {
    const r = parseClaim(s, problem);
    if (!r.ok) return false;
    const k = claimKey(r.claim);
    if (refRows.some((x) => claimKey(x.claim) === k)) return true;
    if (r.claim.type === 'quad') {
      const wider = { parallelogram: ['rectangle', 'rhombus', 'square'], rectangle: ['square'], rhombus: ['square'], trapezoid: ['isoTrapezoid'] }[r.claim.kind] || [];
      return wider.some((kind) => refRows.some((x) => claimKey(x.claim) === claimKey({ ...r.claim, kind })));
    }
    if (r.claim.type === 'eq') {
      const eqs = refRows.filter((x) => x.claim.type === 'eq').map((x) => eqVec(x.claim));
      return !!eqs.length && numericFollows(eqs, eqVec(r.claim), problem.points);
    }
    return false;
  }
  const notParallel = (problem, P, Q, X, Y) => {
    const a = problem.points; const u = [a[Q][0] - a[P][0], a[Q][1] - a[P][1]]; const v = [a[Y][0] - a[X][0], a[Y][1] - a[X][1]];
    return Math.abs(u[0] * v[1] - u[1] * v[0]) > 1e-6 * Math.hypot(...u) * Math.hypot(...v);
  };
  const convex = (problem, [A, B, C, D]) => {
    const s = [[A, B, C], [B, C, D], [C, D, A], [D, A, B]].map(([X, Y, Z]) => sideOf(problem, X, Y, Z));
    return s.every((x) => x === s[0] && x !== 0);
  };
  const quadClaim = (claim, kinds) => claim.type === 'quad' && kinds.includes(claim.kind);

  Object.assign(CHECKS, {
    quad_test(claim, refRows, problem) {
      const proof = `quad_tests ${refNames(refRows)}`.trim();
      if (!quadClaim(claim, ['parallelogram', 'rectangle', 'rhombus', 'square', 'trapezoid', 'isoTrapezoid', 'kite'])) return fail2('reasonNoFit', proof, { rid: 'quad_test' });
      const [A, B, C, D] = claim.P;
      const P = claim.P.join('');
      const has = (s) => hasFact(problem, refRows, s);
      const kind = (k) => has(`${P} ${QUADS[k].he}`);
      const pg = kind('parallelogram');
      const right = [`∢${D}${A}${B}=90`, `∢${A}${B}${C}=90`, `∢${B}${C}${D}=90`, `∢${C}${D}${A}=90`].some(has);
      const adjEq = [`${A}${B}=${B}${C}`, `${B}${C}=${C}${D}`, `${C}${D}=${D}${A}`, `${D}${A}=${A}${B}`].some(has);
      const allEq = has(`${A}${B}=${B}${C}`) && has(`${B}${C}=${C}${D}`) && has(`${C}${D}=${D}${A}`);
      const diagEq = has(`${A}${C}=${B}${D}`);
      const diagPerp = has(`${A}${C}⊥${B}${D}`);
      const parAB = has(`${A}${B}∥${D}${C}`); const parAD = has(`${A}${D}∥${B}${C}`);
      const eqAB = has(`${A}${B}=${D}${C}`); const eqAD = has(`${A}${D}=${B}${C}`);
      const mid = problem.pointNames.find((M) => between(problem, A, M, C) && between(problem, B, M, D));
      const bisect = mid && has(`${A}${mid}=${mid}${C}`) && has(`${B}${mid}=${mid}${D}`);
      let ok = false;
      switch (claim.kind) {
        case 'parallelogram': ok = (parAB && parAD) || (eqAB && eqAD) || (parAB && eqAB) || (parAD && eqAD) || bisect; break;
        case 'rectangle': ok = (pg && (right || diagEq)) || ([`∢${D}${A}${B}=90`, `∢${A}${B}${C}=90`, `∢${B}${C}${D}=90`].every(has)); break;
        case 'rhombus': ok = (pg && (adjEq || diagPerp)) || allEq; break;
        case 'square': ok = (kind('rectangle') && adjEq) || (kind('rhombus') && right); break;
        case 'trapezoid': ok = parAB && notParallel(problem, A, D, B, C); break;
        case 'isoTrapezoid': ok = (parAB || kind('trapezoid')) && notParallel(problem, A, D, B, C)
          && (has(`${A}${D}=${B}${C}`) || has(`∢${D}${A}${B}=∢${A}${B}${C}`) || has(`∢${A}${D}${C}=∢${B}${C}${D}`) || diagEq); break;
        case 'kite': ok = has(`${A}${B}=${A}${D}`) && has(`${C}${B}=${C}${D}`); break;
        default: ok = false;
      }
      return ok ? { ok: true, proof } : fail2('reasonNoFit', proof, { rid: 'quad_test' });
    },
    quad_props(claim, refRows, problem) {
      const proof = `quad_props ${refNames(refRows)}`.trim();
      const q = refRows.find((r) => quadClaim(r.claim, ['rectangle', 'rhombus', 'square', 'isoTrapezoid']));
      if (!q) return fail2('reasonNoFit', proof, { rid: 'quad_props' });
      const [A, B, C, D] = q.claim.P;
      const strs = [];
      // an isosceles trapezoid ABCD (bases AB and DC): its legs are equal
      if (q.claim.kind === 'isoTrapezoid') strs.push(`${A}${D}=${B}${C}`);
      else if (q.claim.kind !== 'rhombus') strs.push(`∢${D}${A}${B}=90`, `∢${A}${B}${C}=90`, `∢${B}${C}${D}=90`, `∢${C}${D}${A}=90`);
      if (q.claim.kind === 'rhombus' || q.claim.kind === 'square') strs.push(`${A}${B}=${B}${C}`, `${B}${C}=${C}${D}`, `${C}${D}=${D}${A}`, `${D}${A}=${A}${B}`, `${A}${B}=${C}${D}`, `${B}${C}=${D}${A}`);
      return done(fits(problem, claim, strs, refRows.filter((r) => r !== q)), 'quad_props', strs, proof);
    },
    cyclic_test(claim, refRows, problem) {
      const proof = `cyclic_tests ${refNames(refRows)}`.trim();
      if (!quadClaim(claim, ['cyclic'])) return fail2('reasonNoFit', proof, { rid: 'cyclic_test' });
      const [A, B, C, D] = claim.P;
      const P = claim.P.join('');
      const has = (s) => hasFact(problem, refRows, s);
      let ok = ['rectangle', 'square', 'isoTrapezoid'].some((k) => has(`${P} ${QUADS[k].he}`))
        || has(`∢${D}${A}${B}+∢${B}${C}${D}=180`) || has(`∢${A}${B}${C}+∢${C}${D}${A}=180`);
      if (!ok) {
        // two angles looking at one side from the same side of it
        for (const [X, Y, Z, W] of [[A, B, C, D], [B, C, D, A], [C, D, A, B], [D, A, B, C], [A, C, B, D], [B, D, A, C]]) {
          if (sideOf(problem, X, Y, Z) * sideOf(problem, X, Y, W) > 0 && has(`∢${X}${Z}${Y}=∢${X}${W}${Y}`)) { ok = true; break; }
        }
      }
      return ok ? { ok: true, proof } : fail2('reasonNoFit', proof, { rid: 'cyclic_test' });
    },
    cyclic_props(claim, refRows, problem) {
      const proof = `cyclic_props ${refNames(refRows)}`.trim();
      const cyc = refRows.find((r) => r.claim.type === 'quad' && r.claim.kind === 'cyclic');
      if (!cyc) return fail2('reasonNoFit', proof, { rid: 'cyclic_props' });
      const [A, B, C, D] = cyc.claim.P;
      const strs = [`∢${D}${A}${B}+∢${B}${C}${D}=180`, `∢${A}${B}${C}+∢${C}${D}${A}=180`];
      for (const [X, Y, Z, W] of [[A, B, C, D], [B, C, D, A], [C, D, A, B], [D, A, B, C]]) strs.push(`∢${X}${Z}${Y}=∢${X}${W}${Y}`);
      return done(fits(problem, claim, strs, refRows.filter((r) => r !== cyc)), 'cyclic_props', strs, proof);
    },
    tangential_test(claim, refRows, problem) {
      const proof = `tangential_test ${refNames(refRows)}`.trim();
      if (!quadClaim(claim, ['tangential'])) return fail2('reasonNoFit', proof, { rid: 'tangential_test' });
      const [A, B, C, D] = claim.P;
      const P = claim.P.join('');
      const has = (s) => hasFact(problem, refRows, s);
      const ok = ['rhombus', 'square', 'kite'].some((k) => has(`${P} ${QUADS[k].he}`)) || (convex(problem, claim.P) && has(`${A}${B}+${C}${D}=${A}${D}+${B}${C}`));
      return ok ? { ok: true, proof } : fail2('reasonNoFit', proof, { rid: 'tangential_test' });
    },
    tangential_props(claim, refRows, problem) {
      const proof = `pitot ${refNames(refRows)}`.trim();
      const tq = refRows.find((r) => r.claim.type === 'quad' && r.claim.kind === 'tangential');
      if (!tq) return fail2('reasonNoFit', proof, { rid: 'tangential_props' });
      const [A, B, C, D] = tq.claim.P;
      const strs = [`${A}${B}+${C}${D}=${A}${D}+${B}${C}`];
      return done(fits(problem, claim, strs, refRows.filter((r) => r !== tq)), 'tangential_props', strs, proof);
    },
  });

  // ---- analytic geometry: every check works only from the cited rows (coordinates, slopes, lines)
  const coordsOf = (refRows) => {
    const c = {};
    for (const r of refRows) if (r.claim.type === 'coord') c[r.claim.P[0]] = [r.claim.x, r.claim.y];
    return c;
  };
  const sameLine = (problem, X, Y, Z, W) => API.lineKey(problem.points, X, Y) === API.lineKey(problem.points, Z, W);
  const onLineXY = (problem, [A, B], Q) => Q === A || Q === B || sideOf(problem, A, B, Q) === 0;
  const anFail = (rid, proof) => fail2('reasonNoFit', proof, { rid });
  Object.assign(CHECKS, {
    // lengths, areas and angles computed from the cited coordinates (distance formula and the like)
    coord_calc(claim, refRows, problem) {
      const proof = `by coord_calc ${refNames(refRows)}`.trim();
      const c = coordsOf(refRows);
      if (claim.type !== 'eq' || !Object.keys(c).length) return anFail('coord_calc', proof);
      // An angle is keyed by one point on each of its rays (a:V:XY); any cited point on the same ray
      // gives the same angle, so name the ray by a cited point.
      const onRay = (V, X) => (c[X] ? X : Object.keys(c).find((Y) => Y !== V && problem.rays[V] && problem.rays[V][Y] === problem.rays[V][X]));
      const target = new Map();
      for (const [key, v] of eqVec(claim)) {
        const k2 = key.replace(/a:([A-Z]):([A-Z])([A-Z])/g, (m, V, X, Y) => {
          const X2 = onRay(V, X); const Y2 = onRay(V, Y);
          return X2 && Y2 ? `a:${V}:${X2}${Y2}` : m;
        });
        target.set(k2, (target.get(k2) || 0) + v);
      }
      const sys = makeSystem([], target, c);
      if (!sys) return anFail('coord_calc', proof);
      const g = evalTerms(sys.G, sys.vars.map((v) => v.v0));
      return Math.abs(g.v) <= 1e-7 * Math.max(g.mag, 1e-9) ? { ok: true, proof } : anFail('coord_calc', proof);
    },
    coord_mid(claim, refRows, problem) {
      const proof = `midpoint_coords ${refNames(refRows)}`.trim();
      if (claim.type !== 'coord') return anFail('coord_mid', proof);
      const M = claim.P[0];
      const c = coordsOf(refRows);
      for (const A of Object.keys(c)) {
        for (const B of Object.keys(c)) {
          if (A >= B || !between(problem, A, M, B)) continue;
          const isMid = hasFact(problem, refRows, `${A}${M}=${M}${B}`);
          if (isMid && close(claim.x, (c[A][0] + c[B][0]) / 2) && close(claim.y, (c[A][1] + c[B][1]) / 2)) return { ok: true, proof };
        }
      }
      return anFail('coord_mid', proof);
    },
    coord_slope(claim, refRows, problem) {
      const proof = `slope_coords ${refNames(refRows)}`.trim();
      if (claim.type !== 'slope') return anFail('coord_slope', proof);
      const c = coordsOf(refRows);
      const on = Object.keys(c).filter((Q) => onLineXY(problem, claim.a, Q));
      for (const X of on) for (const Y of on) {
        if (X >= Y || close(c[X][0], c[Y][0])) continue;
        if (close(claim.m, (c[Y][1] - c[X][1]) / (c[Y][0] - c[X][0]))) return { ok: true, proof };
      }
      // read off a cited equation of the same line, y = mx + b
      if (refRows.some((r) => r.claim.type === 'lineq' && !r.claim.vertical && sameLine(problem, ...r.claim.a, ...claim.a) && close(r.claim.m, claim.m))) return { ok: true, proof };
      return anFail('coord_slope', proof);
    },
    slope_perp(claim, refRows, problem) {
      const proof = `slope_perp ${refNames(refRows)}`.trim();
      const slopes = refRows.filter((r) => r.claim.type === 'slope').map((r) => r.claim);
      if (claim.type === 'slope') {
        for (const s of slopes) {
          const perp = hasFact(problem, refRows, `${s.a.join('')}⊥${claim.a.join('')}`);
          if (perp && close(s.m * claim.m, -1)) return { ok: true, proof };
        }
      } else if (claim.type === 'perp') {
        for (const s1 of slopes) for (const s2 of slopes) {
          if (sameLine(problem, ...s1.a, ...claim.a) && sameLine(problem, ...s2.a, ...claim.b) && close(s1.m * s2.m, -1)) return { ok: true, proof };
        }
      }
      return anFail('slope_perp', proof);
    },
    slope_par(claim, refRows, problem) {
      const proof = `slope_par ${refNames(refRows)}`.trim();
      const slopes = refRows.filter((r) => r.claim.type === 'slope').map((r) => r.claim);
      if (claim.type === 'slope') {
        for (const s of slopes) if (hasFact(problem, refRows, `${s.a.join('')}∥${claim.a.join('')}`) && close(s.m, claim.m)) return { ok: true, proof };
      } else if (claim.type === 'par') {
        for (const s1 of slopes) for (const s2 of slopes) {
          if (sameLine(problem, ...s1.a, ...claim.a) && sameLine(problem, ...s2.a, ...claim.b) && close(s1.m, s2.m)) return { ok: true, proof };
        }
      }
      return anFail('slope_par', proof);
    },
    line_eq(claim, refRows, problem) {
      const proof = `line_eq ${refNames(refRows)}`.trim();
      if (claim.type !== 'lineq') return anFail('line_eq', proof);
      const c = coordsOf(refRows);
      const on = Object.keys(c).filter((Q) => onLineXY(problem, claim.a, Q));
      // Is a cited line horizontal or vertical? From its equation, its slope, or two cited points on it.
      const kindOf = (a) => {
        for (const r of refRows) {
          const l = r.claim;
          if (l.type === 'lineq' && sameLine(problem, ...l.a, ...a)) return l.vertical ? 'v' : close(l.m, 0) ? 'h' : null;
          if (l.type === 'slope' && sameLine(problem, ...l.a, ...a) && close(l.m, 0)) return 'h';
        }
        const pts = Object.keys(c).filter((Q) => onLineXY(problem, a, Q));
        for (const X of pts) for (const Y of pts) {
          if (X >= Y) continue;
          if (close(c[X][1], c[Y][1])) return 'h';
          if (close(c[X][0], c[Y][0])) return 'v';
        }
        if (a.every((Q) => Math.abs(problem.points[Q][1]) < 1e-9)) return 'h'; // the x-axis in the drawing
        if (a.every((Q) => Math.abs(problem.points[Q][0]) < 1e-9)) return 'v'; // the y-axis
        return null;
      };
      // a line perpendicular to a horizontal line is vertical (and the other way), parallel keeps it
      const turned = () => {
        for (const r of refRows) {
          const l = r.claim;
          if (l.type !== 'perp' && l.type !== 'par') continue;
          const other = sameLine(problem, ...l.a, ...claim.a) ? l.b : sameLine(problem, ...l.b, ...claim.a) ? l.a : null;
          if (!other) continue;
          const k = kindOf(other);
          if (k) return l.type === 'par' ? k : k === 'h' ? 'v' : 'h';
        }
        return null;
      };
      if (claim.vertical) {
        if (on.length >= 2 && on.every((Q) => close(c[Q][0], claim.c))) return { ok: true, proof };
        return turned() === 'v' && on.some((Q) => close(c[Q][0], claim.c)) ? { ok: true, proof } : anFail('line_eq', proof);
      }
      if (close(claim.m, 0) && turned() === 'h' && on.some((Q) => close(c[Q][1], claim.b))) return { ok: true, proof };
      const fitsPt = (Q) => close(c[Q][1], claim.m * c[Q][0] + claim.b);
      const slope = refRows.find((r) => r.claim.type === 'slope' && sameLine(problem, ...r.claim.a, ...claim.a));
      if (slope && close(slope.claim.m, claim.m) && on.some(fitsPt)) return { ok: true, proof };
      if (on.length >= 2 && on.every(fitsPt) && on.some((X) => on.some((Y) => !close(c[X][0], c[Y][0])))) return { ok: true, proof };
      return anFail('line_eq', proof);
    },
    // A point's coordinates from the conditions it meets (cited): the lines it lies on (equations), the
    // axes it lies on (read off the drawing), its distance from a point whose coordinates are cited
    // (a row "QD = 16"), a circle it lies on (an equation row), or being the far end of a segment whose
    // midpoint and other end are cited (a row "AE = EF" with E between A and F). The claimed point must be
    // the drawing's point (the drawing picks the branch, e.g. "on the positive x-axis"), it must meet every
    // condition, and the conditions must pin it down (two independent ones at that point).
    line_point(claim, refRows, problem) {
      const proof = `coord_point ${refNames(refRows)}`.trim();
      if (claim.type !== 'coord') return anFail('line_point', proof);
      const Q = claim.P[0];
      const { x, y } = claim;
      const p = problem.points[Q];
      if (Math.hypot(p[0] - x, p[1] - y) > 1e-6 * Math.max(1, Math.hypot(x, y))) return anFail('line_point', proof);
      const c = coordsOf(refRows);
      const conds = []; // { f: value at (x, y), g: gradient [gx, gy] }
      const lin = (a, b, k) => conds.push({ f: a * x + b * y - k, g: [a, b], s: Math.max(1, Math.abs(k)) });
      for (const r of refRows) {
        const l = r.claim;
        if (l.type === 'lineq' && onLineXY(problem, l.a, Q)) { if (l.vertical) lin(1, 0, l.c); else lin(-l.m, 1, l.b); }
        if (l.type === 'circeq' && Math.abs((p[0] - l.cx) ** 2 + (p[1] - l.cy) ** 2 - l.r2) < 1e-6 * Math.max(1, l.r2)) {
          conds.push({ f: (x - l.cx) ** 2 + (y - l.cy) ** 2 - l.r2, g: [2 * (x - l.cx), 2 * (y - l.cy)], s: Math.max(1, l.r2) });
        }
        if (l.type === 'eq' && l.left && l.right) {
          const [seg, val] = l.left.kind === 'seg' && l.right.kind === 'num' ? [l.left, l.right] : l.right.kind === 'seg' && l.left.kind === 'num' ? [l.right, l.left] : [null, null];
          if (seg && seg.p.includes(Q)) {
            const other = seg.p.find((v) => v !== Q);
            if (c[other]) {
              const [a, b] = c[other];
              conds.push({ f: (x - a) ** 2 + (y - b) ** 2 - val.v ** 2, g: [2 * (x - a), 2 * (y - b)], s: Math.max(1, val.v ** 2) });
            }
          }
          // the far end of a segment from its midpoint: AE = EF with E between A and F, A and E cited
          if (l.left.kind === 'seg' && l.right.kind === 'seg') {
            for (const [s1, s2] of [[l.left.p, l.right.p], [l.right.p, l.left.p]]) {
              const E = s1.find((v) => s2.includes(v));
              if (!E || !s2.includes(Q)) continue;
              const A = s1.find((v) => v !== E);
              if (!c[A] || !c[E] || !between(problem, A, E, Q)) continue;
              lin(1, 0, 2 * c[E][0] - c[A][0]);
              lin(0, 1, 2 * c[E][1] - c[A][1]);
            }
          }
        }
      }
      if (Math.abs(p[1]) < 1e-9) lin(0, 1, 0); // on the x-axis
      if (Math.abs(p[0]) < 1e-9) lin(1, 0, 0); // on the y-axis
      if (!conds.length || !conds.every((k) => Math.abs(k.f) <= 1e-6 * k.s)) return anFail('line_point', proof);
      const rank2 = conds.some((k1) => conds.some((k2) => Math.abs(k1.g[0] * k2.g[1] - k1.g[1] * k2.g[0]) > 1e-9 * Math.max(1, Math.hypot(...k1.g) * Math.hypot(...k2.g))));
      return rank2 ? { ok: true, proof } : anFail('line_point', proof);
    },
    circle_eq(claim, refRows, problem) {
      const proof = `circle_eq ${refNames(refRows)}`.trim();
      if (claim.type !== 'circeq') return anFail('circle_eq', proof);
      const c = coordsOf(refRows);
      const centre = Object.keys(c).find((Q) => close(c[Q][0], claim.cx) && close(c[Q][1], claim.cy));
      if (!centre) return anFail('circle_eq', proof);
      const onPt = Object.keys(c).some((Q) => Q !== centre && close((c[Q][0] - claim.cx) ** 2 + (c[Q][1] - claim.cy) ** 2, claim.r2));
      const radiusRow = refRows.some((r) => {
        if (r.claim.type !== 'eq' || !r.claim.left || r.claim.left.kind !== 'seg' || !r.claim.right || r.claim.right.kind !== 'num') return false;
        return r.claim.left.p.includes(centre) && close(r.claim.right.v ** 2, claim.r2);
      });
      return onPt || radiusRow ? { ok: true, proof } : anFail('circle_eq', proof);
    },
  });

  // A line is tangent: perpendicular to the radius at its end, or (the converse of tangent–chord) it
  // makes with a chord the inscribed angle on that chord from the other side.
  CHECKS.tangent_test = (claim, refRows, problem) => {
    const proof = `tangent_of_perp ${refNames(refRows)}`.trim();
    if (claim.type !== 'tangentc') return fail2('reasonNoFit', proof, { rid: 'tangent_test' });
    const { o, t, p } = claim;
    const has = (s) => hasFact(problem, refRows, s);
    let ok = has(`${o}${t}⊥${t}${p}`) || has(`∢${o}${t}${p}=90`);
    const c = circles(problem).find((x) => x.o === o);
    if (!ok && c) {
      for (const X of c.on) {
        if (X === t) continue;
        const sp = sideOf(problem, t, X, p);
        for (const Y of c.on) if (Y !== t && Y !== X && sideOf(problem, t, X, Y) * sp < 0 && has(`∢${p}${t}${X}=∢${t}${Y}${X}`)) ok = true;
        if (sideOf(problem, t, X, o) * sp < 0 && has(`2∢${p}${t}${X}=∢${t}${o}${X}`)) ok = true;
      }
    }
    return ok ? { ok: true, proof } : fail2('reasonNoFit', proof, { rid: 'tangent_test' });
  };

  // "חשבון": when the linear check says no, try the numeric check (browser-only, see above), and in
  // a question with `rounding: { min: m }` a rounded answer (see roundedFollows).
  const linear = CHECKS.algebra;
  if (linear) {
    CHECKS.algebra = (claim, refRows, problem) => {
      const out = linear(claim, refRows, problem);
      if (!out.ok && claim.type === 'ineq' && ratioIneq(claim, refRows, eqVec)) return { ok: true, proof: out.proof.replace('linarith', 'nlinarith') };
      if (out.ok || claim.type !== 'eq' || !refRows.length) return out;
      const polys = refRows.filter((r) => r.claim.type === 'eq').map((r) => eqVec(r.claim));
      if (!polys.length) return out;
      if (numericFollows(polys, eqVec(claim), problem.points)) return { ok: true, proof: out.proof, numeric: true };
      if (problem.rounding && roundedFollows(polys, eqVec(claim), problem)) return { ok: true, proof: out.proof, numeric: true, rounded: true };
      return out;
    };
  }
}

// An inequality through a ratio of positive quantities, which the linear check cannot do: from
// S△FBK/S△FKC = KB/KC, KB/KC = FB/FC and FB > FC, S△FBK > S△FKC. The claim a > b follows when a
// cited row says c > d and the cited equations give a/b = c/d, where a, b, c, d are each one term
// with a positive coefficient made of lengths, areas and angles (all positive) or a positive number.
// (a/b = c/d > 1 and b > 0 give a > b.) sin/cos/tan are left out: a cosine may be negative.
const posMono = (side, eqVec) => {
  const v = eqVec({ type: 'eq', L: side, R: { terms: [], k: 0 } });
  if (v.size !== 1) return null;
  const [[key, c]] = [...v];
  if (!(c > 0) || (key !== '1' && !key.split('*').every((f) => /^(s|S|Q|a|k|K|P):/.test(f)))) return null;
  return { key, c };
};
const invKey = (k) => { const f = factorsOf(k); for (const [a, e] of f) f.set(a, -e); return keyOf(f); };
export function ratioIneq(claim, refRows, eqVec) {
  const [hi, lo] = claim.op === '>' ? [claim.L, claim.R] : [claim.R, claim.L];
  const a = posMono(hi, eqVec);
  const b = posMono(lo, eqVec);
  if (!a || !b) return false;
  const eqs = refRows.filter((r) => r.claim.type === 'eq').map((r) => eqVec(r.claim));
  for (const r of refRows) {
    const g = r.claim;
    if (g.type !== 'ineq') continue;
    const [gh, gl] = g.op === '>' ? [g.L, g.R] : [g.R, g.L];
    const c = posMono(gh, eqVec);
    const d = posMono(gl, eqVec);
    if (!c || !d) continue;
    // a/b − c/d = 0 or b/a − d/c = 0, as ratios (linear in the ratios the rows name, whichever way
    // up they are written), or multiplied out (a·d − b·c)
    for (const [x, y, u, w] of [[a, b, c, d], [b, a, d, c]]) {
      const ratio = new Map();
      addTo(ratio, mulKeys(x.key, invKey(y.key)), x.c / y.c);
      addTo(ratio, mulKeys(u.key, invKey(w.key)), -u.c / w.c);
      if (!ratio.size || algFollows(eqs, ratio)) return true;
    }
    const cross = new Map();
    addTo(cross, mulKeys(a.key, d.key), a.c * d.c);
    addTo(cross, mulKeys(b.key, c.key), -b.c * c.c);
    if (eqs.length && algFollows(eqs, cross)) return true;
  }
  return false;
}

// A rounded answer (the user's rule, high school/README_he.md "תשובות מעוגלות"): a row "AC = 15.32"
// whose number has d ≥ m decimals is right when the exact value x of its left side follows from the
// cited rows and |15.32 − x| ≤ 10⁻ᵈ (one unit in the last digit), so every valid rounding counts.
const decimals = (v) => { const s = Math.abs(v).toFixed(9).replace(/0+$/, ''); const i = s.indexOf('.'); return i < 0 || i === s.length - 1 ? 0 : s.length - i - 1; };
export function roundedFollows(polys, target, problem) {
  const min = (problem.rounding && problem.rounding.min) || 0;
  if (!target.has('1')) return false;
  const w = -target.get('1');
  const d = decimals(w);
  if (d < min) return false;
  const rest = new Map([...target].filter(([k]) => k !== '1'));
  if (!rest.size) return false;
  const sys = makeSystem([], rest, problem.points);
  if (!sys) return false;
  const exact = evalTerms(sys.G, sys.vars.map((v) => v.v0)).v;
  if (Math.abs(w - exact) > 10 ** -d + 1e-12) return false;
  const exactClaim = new Map(rest);
  exactClaim.set('1', -exact);
  return numericFollows(polys, exactClaim, problem.points);
}
