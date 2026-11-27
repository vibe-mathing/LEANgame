// Content for the LEANgame site: tracks, topics, the geometry levels, the reason
// catalog and the playable demo problems. Text is Hebrew-first with an English twin.
// Math inside strings is wrapped in $...$ so it renders left-to-right.

export const TRACKS = [
  { id: 'hs', status: 'open', name: { he: 'תיכון', en: 'High school' } },
  { id: 'uni', status: 'later', name: { he: 'אוניברסיטה', en: 'University' } },
];

export const TOPICS = [
  {
    id: 'geometry', track: 'hs', status: 'open', glyph: 'geometry', levels: 11,
    name: { he: 'גאומטריה', en: 'Geometry' },
    blurb: {
      he: 'זוויות, חפיפה, מרובעים, דמיון ומעגל. הוכחות בטבלת טענה ונימוק, עם שרטוט חי.',
      en: 'Angles, congruence, quadrilaterals, similarity and circles. Two-column proofs with a live diagram.',
    },
  },
  {
    id: 'trigonometry', track: 'hs', status: 'next', glyph: 'trig',
    name: { he: 'טריגונומטריה', en: 'Trigonometry' },
    blurb: { he: 'פונקציות טריגונומטריות, זהויות, ומשפטי הסינוסים והקוסינוסים.', en: 'sin, cos and tan, identities, and the laws of sines and cosines.' },
  },
  {
    id: 'analytic', track: 'hs', status: 'planned', glyph: 'analytic',
    name: { he: 'גאומטריה אנליטית', en: 'Analytic geometry' },
    blurb: { he: 'ישרים, מעגלים ומרחקים במערכת צירים.', en: 'Lines, circles and distances on coordinate axes.' },
  },
  {
    id: 'algebra', track: 'hs', status: 'planned', glyph: 'algebra',
    name: { he: 'אלגברה ופונקציות', en: 'Algebra and functions' },
    blurb: { he: 'משוואות, אי-שוויונים וחקירת פונקציות.', en: 'Equations, inequalities and analyzing functions.' },
  },
  {
    id: 'sequences', track: 'hs', status: 'planned', glyph: 'sequences',
    name: { he: 'סדרות', en: 'Sequences' },
    blurb: { he: 'סדרות חשבוניות והנדסיות, סכומים ואינדוקציה.', en: 'Arithmetic and geometric sequences, sums and induction.' },
  },
  {
    id: 'calculus', track: 'hs', status: 'planned', glyph: 'calculus',
    name: { he: 'חשבון דיפרנציאלי ואינטגרלי', en: 'Calculus' },
    blurb: { he: 'גבולות, נגזרות ואינטגרלים ברמת 5 יחידות.', en: 'Limits, derivatives and integrals at the 5-unit level.' },
  },
  {
    id: 'linear-algebra', track: 'uni', status: 'planned', glyph: 'matrix',
    name: { he: 'אלגברה לינארית', en: 'Linear algebra' },
    blurb: { he: 'מרחבים וקטוריים, מטריצות, דטרמיננטות וערכים עצמיים.', en: 'Vector spaces, matrices, determinants and eigenvalues.' },
  },
  {
    id: 'calculus-uni', track: 'uni', status: 'planned', glyph: 'integral',
    name: { he: 'חדו״א', en: 'Calculus' },
    blurb: { he: 'גבולות, רציפות, נגזרות ואינטגרלים, בהוכחות מלאות.', en: 'Limits, continuity, derivatives and integrals, fully proved.' },
  },
  {
    id: 'abstract-algebra', track: 'uni', status: 'planned', glyph: 'hexagon',
    name: { he: 'מבנים אלגבריים', en: 'Abstract algebra' },
    blurb: { he: 'חבורות, חוגים ושדות.', en: 'Groups, rings and fields.' },
  },
  {
    id: 'discrete', track: 'uni', status: 'planned', glyph: 'graph',
    name: { he: 'מתמטיקה בדידה', en: 'Discrete math' },
    blurb: { he: 'לוגיקה, קבוצות, קומבינטוריקה וגרפים.', en: 'Logic, sets, combinatorics and graphs.' },
  },
];

// ---------------------------------------------------------------- reason catalog
// Each reason: kind, the stage that unlocks it (null = always open), how many rows it
// cites (0, a number, or 'many'), the Lean name, and Hebrew/English names and statement.
// `playable` reasons are checked by the in-browser demo; the others are listed so the
// student has to pick the right tool from the whole box.

const R = (stage, kind, refs, lean, he, en, playable = false) => ({
  stage, kind, refs, lean, playable,
  short: { he: he[0], en: en[0] },
  name: { he: he[1] || he[0], en: en[1] || en[0] },
  statement: { he: he[2], en: en[2] },
});

export const REASONS = {
  // always open
  given: R(null, 'given', 0, 'g', ['נתון', 'נתון', 'הטענה מופיעה בנתוני השאלה.'], ['Given', 'Given', 'The claim is one of the givens.'], true),
  from_diagram: R(null, 'given', 0, 'cfg', ['מהשרטוט', 'מהשרטוט', 'עובדת מיקום שרואים בשרטוט, למשל ש-$D$ נמצאת על $BC$.'], ['From the diagram', 'From the diagram', 'A position fact read off the diagram, such as $D$ lying on $BC$.']),
  common_side: R(null, 'basic', 0, 'rfl', ['צלע משותפת', 'צלע משותפת', 'כל קטע שווה לעצמו.'], ['Common side', 'Common side', 'Every segment equals itself.'], true),
  common_angle: R(null, 'basic', 0, 'rfl', ['זווית משותפת', 'זווית משותפת', 'כל זווית שווה לעצמה.'], ['Common angle', 'Common angle', 'Every angle equals itself.'], true),
  algebra: R(null, 'algebra', 'many', 'by linarith', ['חשבון', 'חשבון: הצבה והעברת אגפים', 'הצבה, העברת אגפים וחישוב, על סמך השורות שציינתם בלבד. כשהמשחק מזהה חישוב, הוא משלים את הנימוק לבד.'], ['Algebra', 'Algebra and substitution', 'Substitution, rearranging and arithmetic, using only the rows you cite. When the game spots a calculation, it fills this in for you.'], true),

  // L01 angles
  adj_angles: R('L01', 'theorem', 0, 'adj_angles_sum', ['זוויות צמודות', 'סכום זוויות צמודות', 'סכום זוויות צמודות הוא $180°$.'], ['Adjacent angles', 'Adjacent angles', 'Adjacent angles sum to $180°$.'], true),
  vert_angles: R('L01', 'theorem', 0, 'vert_angles_eq', ['זוויות קודקודיות', 'זוויות קודקודיות שוות', 'זוויות קודקודיות שוות זו לזו.'], ['Vertical angles', 'Vertical angles are equal', 'Vertical angles are equal.'], true),
  around_point: R('L01', 'theorem', 0, 'around_point_sum', ['זוויות סביב נקודה', 'זוויות סביב נקודה', 'סכום הזוויות סביב נקודה הוא $360°$.'], ['Angles around a point', 'Angles around a point', 'The angles around a point sum to $360°$.']),
  bisector_def: R('L01', 'definition', 0, 'bisector_def', ['חוצה זווית', 'הגדרת חוצה זווית', 'חוצה זווית מחלק אותה לשתי זוויות שוות.'], ['Angle bisector', 'Definition of angle bisector', 'An angle bisector splits an angle into two equal angles.'], true),
  midpoint_def: R('L01', 'definition', 0, 'midpoint_def', ['אמצע קטע', 'הגדרת אמצע קטע', 'אמצע קטע מחלק אותו לשני קטעים שווים.'], ['Midpoint', 'Definition of midpoint', 'A midpoint splits a segment into two equal parts.']),
  perp_def: R('L01', 'definition', 0, 'perp_def', ['ישרים מאונכים', 'הגדרת ישרים מאונכים', 'ישרים מאונכים יוצרים זווית של $90°$.'], ['Perpendicular lines', 'Definition of perpendicular', 'Perpendicular lines form a $90°$ angle.']),

  // L02 congruence
  SAS: R('L02', 'theorem', 3, 'cong_SAS', ['צ.ז.צ', 'משפט חפיפה צ.ז.צ', 'שתי צלעות והזווית שביניהן שוות לשתי צלעות והזווית שביניהן, ולכן המשולשים חופפים.'], ['SAS', 'SAS congruence', 'Two sides and the angle between them match, so the triangles are congruent.'], true),
  ASA: R('L02', 'theorem', 3, 'cong_ASA', ['ז.צ.ז', 'משפט חפיפה ז.צ.ז', 'צלע ושתי הזוויות שלידה שוות לצלע ושתי הזוויות שלידה, ולכן המשולשים חופפים.'], ['ASA', 'ASA congruence', 'A side and the two angles next to it match, so the triangles are congruent.'], true),
  SSS: R('L02', 'theorem', 3, 'cong_SSS', ['צ.צ.צ', 'משפט חפיפה צ.צ.צ', 'שלוש הצלעות של משולש אחד שוות לשלוש הצלעות של האחר, ולכן המשולשים חופפים.'], ['SSS', 'SSS congruence', 'All three sides match, so the triangles are congruent.'], true),
  SSA: R('L02', 'theorem', 3, 'cong_SSA', ['צ.צ.ז', 'משפט חפיפה צ.צ.ז', 'שתי צלעות והזווית שמול הגדולה מביניהן שוות, ולכן המשולשים חופפים.'], ['SSA', 'SSA congruence', 'Two sides and the angle opposite the longer one match, so the triangles are congruent.'], true),
  cpct_side: R('L02', 'theorem', 1, 'cong_side', ['צלעות מתאימות', 'צלעות מתאימות במשולשים חופפים', 'במשולשים חופפים, צלעות מתאימות שוות.'], ['Corresponding sides', 'Corresponding sides of congruent triangles', 'In congruent triangles, corresponding sides are equal.'], true),
  cpct_angle: R('L02', 'theorem', 1, 'cong_angle', ['זוויות מתאימות בחפיפה', 'זוויות מתאימות במשולשים חופפים', 'במשולשים חופפים, זוויות מתאימות שוות.'], ['Corresponding angles', 'Corresponding angles of congruent triangles', 'In congruent triangles, corresponding angles are equal.'], true),

  // L03 isosceles
  iso_base: R('L03', 'theorem', 1, 'iso_base_angles', ['זוויות הבסיס', 'זוויות הבסיס במשולש שווה שוקיים', 'במשולש שווה שוקיים זוויות הבסיס שוות.'], ['Base angles', 'Base angles of an isosceles triangle', 'The base angles of an isosceles triangle are equal.']),
  iso_converse: R('L03', 'theorem', 1, 'iso_of_angles', ['שתי זוויות שוות', 'משולש עם שתי זוויות שוות', 'משולש שיש בו שתי זוויות שוות הוא שווה שוקיים.'], ['Two equal angles', 'Triangle with two equal angles', 'A triangle with two equal angles is isosceles.']),
  iso_median: R('L03', 'theorem', 1, 'iso_median', ['תיכון לבסיס', 'הקטע המיוחד במשולש שווה שוקיים', 'במשולש שווה שוקיים התיכון לבסיס הוא גם הגובה לבסיס וגם חוצה את זווית הראש.'], ['Median to the base', 'The special segment of an isosceles triangle', 'In an isosceles triangle the median to the base is also the altitude and the apex angle bisector.']),

  // L04 parallel lines
  alt_angles: R('L04', 'theorem', 1, 'par_alt_angles', ['זוויות מתחלפות', 'זוויות מתחלפות בין מקבילים', 'זוויות מתחלפות בין ישרים מקבילים שוות.'], ['Alternate angles', 'Alternate angles between parallels', 'Alternate angles between parallel lines are equal.']),
  corr_angles: R('L04', 'theorem', 1, 'par_corr_angles', ['זוויות מתאימות בין מקבילים', 'זוויות מתאימות בין מקבילים', 'זוויות מתאימות בין ישרים מקבילים שוות.'], ['Corresponding angles (parallels)', 'Corresponding angles between parallels', 'Corresponding angles between parallel lines are equal.']),
  cointerior: R('L04', 'theorem', 1, 'par_cointerior', ['זוויות חד-צדדיות', 'זוויות חד-צדדיות בין מקבילים', 'סכום זוויות חד-צדדיות בין ישרים מקבילים הוא $180°$.'], ['Co-interior angles', 'Co-interior angles between parallels', 'Co-interior angles between parallel lines sum to $180°$.']),
  par_converse: R('L04', 'theorem', 1, 'par_of_alt', ['תנאי להקבלה', 'משפט הפוך לישרים מקבילים', 'אם זוויות מתחלפות או מתאימות שוות, הישרים מקבילים.'], ['Test for parallels', 'Converse for parallel lines', 'If alternate or corresponding angles are equal, the lines are parallel.']),
  tri_sum: R('L04', 'theorem', 0, 'tri_angle_sum', ['סכום זוויות במשולש', 'סכום הזוויות במשולש', 'סכום הזוויות במשולש הוא $180°$.'], ['Triangle angle sum', 'Triangle angle sum', 'The angles of a triangle sum to $180°$.']),
  ext_angle: R('L04', 'theorem', 0, 'ext_angle', ['זווית חיצונית', 'זווית חיצונית למשולש', 'זווית חיצונית למשולש שווה לסכום שתי הזוויות הפנימיות שאינן צמודות לה.'], ['Exterior angle', 'Exterior angle of a triangle', 'An exterior angle equals the sum of the two remote interior angles.']),

  // L05 inequalities
  side_angle: R('L05', 'theorem', 1, 'larger_side_larger_angle', ['מול צלע גדולה', 'מול צלע גדולה זווית גדולה', 'מול הצלע הגדולה במשולש מונחת הזווית הגדולה.'], ['Larger side', 'Larger side, larger angle', 'The larger side of a triangle faces the larger angle.']),
  angle_side: R('L05', 'theorem', 1, 'larger_angle_larger_side', ['מול זווית גדולה', 'מול זווית גדולה צלע גדולה', 'מול הזווית הגדולה במשולש מונחת הצלע הגדולה.'], ['Larger angle', 'Larger angle, larger side', 'The larger angle of a triangle faces the larger side.']),
  tri_ineq: R('L05', 'theorem', 0, 'tri_ineq', ['אי-שוויון המשולש', 'אי-שוויון המשולש', 'סכום שתי צלעות במשולש גדול מהצלע השלישית.'], ['Triangle inequality', 'Triangle inequality', 'Any two sides of a triangle add up to more than the third.']),

  // L06 quadrilaterals
  para_def: R('L06', 'definition', 0, 'parallelogram_def', ['הגדרת מקבילית', 'הגדרת מקבילית', 'מקבילית היא מרובע שבו כל זוג צלעות נגדיות מקבילות.'], ['Parallelogram', 'Definition of parallelogram', 'A parallelogram is a quadrilateral with both pairs of opposite sides parallel.']),
  para_sides: R('L06', 'theorem', 1, 'para_opp_sides', ['צלעות נגדיות במקבילית', 'צלעות נגדיות במקבילית', 'במקבילית כל זוג צלעות נגדיות שוות.'], ['Opposite sides', 'Opposite sides of a parallelogram', 'Opposite sides of a parallelogram are equal.']),
  para_angles: R('L06', 'theorem', 1, 'para_opp_angles', ['זוויות נגדיות במקבילית', 'זוויות נגדיות במקבילית', 'במקבילית כל זוג זוויות נגדיות שוות.'], ['Opposite angles', 'Opposite angles of a parallelogram', 'Opposite angles of a parallelogram are equal.']),
  para_diag: R('L06', 'theorem', 1, 'para_diagonals', ['אלכסוני מקבילית', 'האלכסונים במקבילית', 'במקבילית האלכסונים חוצים זה את זה.'], ['Parallelogram diagonals', 'Diagonals of a parallelogram', 'The diagonals of a parallelogram bisect each other.']),
  para_test: R('L06', 'theorem', 2, 'para_of_opp_sides', ['זיהוי מקבילית', 'משפט זיהוי למקבילית', 'מרובע שבו כל זוג צלעות נגדיות שוות הוא מקבילית.'], ['Parallelogram test', 'Test for a parallelogram', 'A quadrilateral with both pairs of opposite sides equal is a parallelogram.']),
  rect_diag: R('L06', 'theorem', 1, 'rect_diagonals', ['אלכסוני מלבן', 'האלכסונים במלבן', 'במלבן האלכסונים שווים.'], ['Rectangle diagonals', 'Diagonals of a rectangle', 'The diagonals of a rectangle are equal.']),
  rhombus_diag: R('L06', 'theorem', 1, 'rhombus_diagonals', ['אלכסוני מעוין', 'האלכסונים במעוין', 'במעוין האלכסונים מאונכים זה לזה וחוצים את זוויות המעוין.'], ['Rhombus diagonals', 'Diagonals of a rhombus', 'The diagonals of a rhombus are perpendicular and bisect its angles.']),
  kite_diag: R('L06', 'theorem', 1, 'kite_main_diagonal', ['אלכסון ראשי בדלתון', 'האלכסון הראשי בדלתון', 'בדלתון האלכסון הראשי חוצה את זוויות הראש ומאונך לאלכסון המשני.'], ['Kite diagonal', 'Main diagonal of a kite', 'In a kite the main diagonal bisects the apex angles and is perpendicular to the other diagonal.']),
  trap_iso: R('L06', 'theorem', 1, 'iso_trapezoid_angles', ['טרפז שווה שוקיים', 'זוויות בטרפז שווה שוקיים', 'בטרפז שווה שוקיים זוויות הבסיס שוות.'], ['Isosceles trapezoid', 'Angles of an isosceles trapezoid', 'The base angles of an isosceles trapezoid are equal.']),

  // L07 midsegments
  midseg_tri: R('L07', 'theorem', 2, 'midsegment_tri', ['קטע אמצעים במשולש', 'קטע אמצעים במשולש', 'קטע אמצעים במשולש מקביל לצלע השלישית ושווה למחציתה.'], ['Triangle midsegment', 'Midsegment of a triangle', 'A triangle midsegment is parallel to the third side and half as long.']),
  midseg_trap: R('L07', 'theorem', 2, 'midsegment_trap', ['קטע אמצעים בטרפז', 'קטע אמצעים בטרפז', 'קטע אמצעים בטרפז מקביל לבסיסים ושווה לחצי סכומם.'], ['Trapezoid midsegment', 'Midsegment of a trapezoid', 'A trapezoid midsegment is parallel to the bases and equals half their sum.']),
  median_hyp: R('L07', 'theorem', 1, 'median_hypotenuse', ['תיכון ליתר', 'התיכון ליתר', 'במשולש ישר זווית התיכון ליתר שווה למחצית היתר.'], ['Median to hypotenuse', 'Median to the hypotenuse', 'In a right triangle the median to the hypotenuse is half the hypotenuse.']),
  tri_30: R('L07', 'theorem', 1, 'leg_opposite_30', ['משולש 30-60-90', 'הניצב שמול זווית של 30 מעלות', 'במשולש ישר זווית, הניצב שמול זווית של $30°$ שווה למחצית היתר.'], ['30-60-90 triangle', 'Leg opposite 30 degrees', 'In a right triangle, the leg opposite a $30°$ angle is half the hypotenuse.']),

  // L08 Pythagoras
  pythagoras: R('L08', 'theorem', 1, 'pythagoras', ['פיתגורס', 'משפט פיתגורס', 'במשולש ישר זווית סכום ריבועי הניצבים שווה לריבוע היתר.'], ['Pythagoras', 'Pythagorean theorem', 'In a right triangle, the squares of the legs add up to the square of the hypotenuse.']),
  pyth_conv: R('L08', 'theorem', 1, 'pythagoras_converse', ['הפוך לפיתגורס', 'המשפט ההפוך לפיתגורס', 'אם סכום ריבועי שתי צלעות שווה לריבוע השלישית, המשולש ישר זווית.'], ['Converse of Pythagoras', 'Converse of the Pythagorean theorem', 'If two sides squared add up to the third side squared, the triangle is right-angled.']),

  // L09 similarity
  thales: R('L09', 'theorem', 1, 'intercept_thm', ['משפט תאלס', 'משפט תאלס', 'ישרים מקבילים חותכים על שוקי זווית קטעים פרופורציוניים.'], ['Intercept theorem', 'Intercept theorem', 'Parallel lines cut proportional segments on the arms of an angle.']),
  sim_aa: R('L09', 'theorem', 2, 'sim_AA', ['דמיון ז.ז', 'משפט דמיון ז.ז', 'שתי זוויות שוות בשני משולשים, ולכן המשולשים דומים.'], ['AA similarity', 'AA similarity', 'Two equal angles, so the triangles are similar.']),
  sim_sas: R('L09', 'theorem', 2, 'sim_SAS', ['דמיון צ.ז.צ', 'משפט דמיון צ.ז.צ', 'שתי צלעות פרופורציוניות והזווית שביניהן שווה, ולכן המשולשים דומים.'], ['SAS similarity', 'SAS similarity', 'Two proportional sides with an equal angle between them, so the triangles are similar.']),
  sim_sss: R('L09', 'theorem', 1, 'sim_SSS', ['דמיון צ.צ.צ', 'משפט דמיון צ.צ.צ', 'שלוש צלעות פרופורציוניות, ולכן המשולשים דומים.'], ['SSS similarity', 'SSS similarity', 'Three proportional sides, so the triangles are similar.']),
  bis_ratio: R('L09', 'theorem', 1, 'angle_bisector_ratio', ['חוצה זווית ויחס', 'משפט חוצה הזווית', 'חוצה זווית במשולש מחלק את הצלע שמולה ביחס הצלעות הכולאות את הזווית.'], ['Angle bisector theorem', 'Angle bisector theorem', 'An angle bisector divides the opposite side in the ratio of the adjacent sides.']),

  // L10 circles
  inscribed_central: R('L10', 'theorem', 0, 'inscribed_half_central', ['היקפית ומרכזית', 'זווית היקפית וזווית מרכזית', 'זווית היקפית שווה למחצית הזווית המרכזית הנשענת על אותה קשת.'], ['Inscribed and central', 'Inscribed and central angles', 'An inscribed angle is half the central angle on the same arc.']),
  inscribed_same: R('L10', 'theorem', 0, 'inscribed_same_arc', ['היקפיות על אותה קשת', 'זוויות היקפיות על אותה קשת', 'זוויות היקפיות הנשענות על אותה קשת שוות.'], ['Same arc', 'Inscribed angles on the same arc', 'Inscribed angles on the same arc are equal.']),
  semicircle: R('L10', 'theorem', 0, 'angle_in_semicircle', ['זווית על קוטר', 'זווית היקפית על קוטר', 'זווית היקפית הנשענת על קוטר היא זווית ישרה.'], ['Angle on a diameter', 'Angle in a semicircle', 'An inscribed angle on a diameter is a right angle.']),
  tangent_radius: R('L10', 'theorem', 0, 'tangent_perp_radius', ['משיק ורדיוס', 'משיק ורדיוס', 'משיק למעגל מאונך לרדיוס בנקודת ההשקה.'], ['Tangent and radius', 'Tangent and radius', 'A tangent is perpendicular to the radius at the point of contact.']),
  tangents_eq: R('L10', 'theorem', 0, 'tangents_equal', ['שני משיקים', 'שני משיקים מנקודה', 'שני משיקים למעגל היוצאים מאותה נקודה שווים.'], ['Two tangents', 'Two tangents from a point', 'The two tangents from a point to a circle are equal.']),
  cyclic_quad: R('L10', 'theorem', 0, 'cyclic_opp_angles', ['מרובע חסום', 'מרובע חסום במעגל', 'במרובע חסום במעגל סכום כל זוג זוויות נגדיות הוא $180°$.'], ['Cyclic quadrilateral', 'Cyclic quadrilateral', 'Opposite angles of a cyclic quadrilateral sum to $180°$.']),

  // L11 trigonometry in the triangle
  sin_def: R('L11', 'definition', 0, 'sin_def', ['הגדרת סינוס', 'הגדרת סינוס', 'במשולש ישר זווית, סינוס של זווית חדה הוא הניצב שמולה חלקי היתר.'], ['Sine', 'Definition of sine', 'In a right triangle, the sine of an acute angle is the opposite leg over the hypotenuse.']),
  cos_def: R('L11', 'definition', 0, 'cos_def', ['הגדרת קוסינוס', 'הגדרת קוסינוס', 'במשולש ישר זווית, קוסינוס של זווית חדה הוא הניצב שלידה חלקי היתר.'], ['Cosine', 'Definition of cosine', 'In a right triangle, the cosine of an acute angle is the adjacent leg over the hypotenuse.']),
  tan_def: R('L11', 'definition', 0, 'tan_def', ['הגדרת טנגנס', 'הגדרת טנגנס', 'במשולש ישר זווית, טנגנס של זווית חדה הוא הניצב שמולה חלקי הניצב שלידה.'], ['Tangent', 'Definition of tangent', 'In a right triangle, the tangent of an acute angle is the opposite leg over the adjacent leg.']),
  law_sines: R('L11', 'theorem', 0, 'law_sines', ['משפט הסינוסים', 'משפט הסינוסים', 'במשולש, היחס בין צלע לסינוס הזווית שמולה קבוע ושווה לקוטר המעגל החוסם.'], ['Law of sines', 'Law of sines', 'Each side over the sine of the opposite angle is constant, equal to the circumcircle diameter.']),
  law_cosines: R('L11', 'theorem', 0, 'law_cosines', ['משפט הקוסינוסים', 'משפט הקוסינוסים', 'ריבוע צלע שווה לסכום ריבועי שתי האחרות, פחות פעמיים מכפלתן בקוסינוס הזווית שביניהן.'], ['Law of cosines', 'Law of cosines', 'A side squared equals the other two squared, minus twice their product times the cosine of the angle between them.']),
  tri_area: R('L11', 'theorem', 0, 'tri_area_sin', ['שטח משולש', 'שטח משולש בעזרת סינוס', 'שטח משולש הוא חצי מכפלת שתי צלעות בסינוס הזווית שביניהן.'], ['Triangle area', 'Triangle area with sine', 'The area of a triangle is half the product of two sides times the sine of the angle between them.']),
};

// The proposed order of geometry levels (to be aligned with the curriculum).
// Each level unlocks the reasons in REASONS whose `stage` is its id.
export const STAGES = [
  {
    id: 'L01', glyph: 'angles', status: 'open',
    name: { he: 'זוויות', en: 'Angles' },
    blurb: { he: 'צמודות, קודקודיות וזוויות סביב נקודה. כאן לומדים איך כותבים שורה.', en: 'Adjacent, vertical and around a point. This is where you learn how a row works.' },
  },
  {
    id: 'L02', glyph: 'congruence', status: 'open',
    name: { he: 'חפיפת משולשים', en: 'Triangle congruence' },
    blurb: { he: 'ארבעת משפטי החפיפה, והכלי החזק ביותר בגאומטריה: צלעות וזוויות מתאימות.', en: 'The four congruence theorems, and the strongest tool in geometry: corresponding parts.' },
  },
  {
    id: 'L03', glyph: 'isosceles', status: 'soon',
    name: { he: 'משולש שווה שוקיים', en: 'Isosceles triangle' },
    blurb: { he: 'זוויות הבסיס, המשפט ההפוך, והקטע שהוא גם תיכון, גם גובה וגם חוצה זווית.', en: 'Base angles, the converse, and the segment that is median, altitude and bisector at once.' },
  },
  {
    id: 'L04', glyph: 'parallel', status: 'soon',
    name: { he: 'ישרים מקבילים', en: 'Parallel lines' },
    blurb: { he: 'זוויות מתחלפות, מתאימות וחד-צדדיות, ומשם סכום הזוויות במשולש.', en: 'Alternate, corresponding and co-interior angles, and from there the triangle angle sum.' },
  },
  {
    id: 'L05', glyph: 'inequality', status: 'soon',
    name: { he: 'אי-שוויונים במשולש', en: 'Triangle inequalities' },
    blurb: { he: 'מול הצלע הגדולה הזווית הגדולה, ואי-שוויון המשולש.', en: 'The larger side faces the larger angle, and the triangle inequality.' },
  },
  {
    id: 'L06', glyph: 'quad', status: 'soon',
    name: { he: 'מרובעים', en: 'Quadrilaterals' },
    blurb: { he: 'מקבילית, מלבן, מעוין, ריבוע, דלתון וטרפז: תכונות ומשפטי זיהוי.', en: 'Parallelogram, rectangle, rhombus, square, kite and trapezoid: properties and tests.' },
  },
  {
    id: 'L07', glyph: 'midsegment', status: 'soon',
    name: { he: 'קטע אמצעים', en: 'Midsegments' },
    blurb: { he: 'קטע אמצעים במשולש ובטרפז, התיכון ליתר והמשולש $30°$-$60°$-$90°$.', en: 'Midsegments in triangles and trapezoids, the median to the hypotenuse, the $30°$-$60°$-$90°$ triangle.' },
  },
  {
    id: 'L08', glyph: 'pythagoras', status: 'soon',
    name: { he: 'משפט פיתגורס', en: 'Pythagoras' },
    blurb: { he: 'המשפט המפורסם ביותר בגאומטריה, וגם המשפט ההפוך.', en: 'The most famous theorem in geometry, and its converse.' },
  },
  {
    id: 'L09', glyph: 'similarity', status: 'soon',
    name: { he: 'דמיון משולשים', en: 'Similarity' },
    blurb: { he: 'משפט תאלס, משפטי הדמיון ומשפט חוצה הזווית.', en: 'The intercept theorem, the similarity tests and the angle bisector theorem.' },
  },
  {
    id: 'L10', glyph: 'circle', status: 'soon',
    name: { he: 'מעגל', en: 'Circles' },
    blurb: { he: 'מיתרים, זוויות מרכזיות והיקפיות, משיקים, ומרובעים חסומים וחוסמים.', en: 'Chords, central and inscribed angles, tangents, cyclic and tangential quadrilaterals.' },
  },
  {
    id: 'L11', glyph: 'trigtri', status: 'soon',
    name: { he: 'טריגונומטריה במשולש', en: 'Trigonometry in the triangle' },
    blurb: { he: 'סינוס, קוסינוס וטנגנס, משפט הסינוסים ומשפט הקוסינוסים. הגשר לנושא הבא.', en: 'sin, cos and tan, the laws of sines and cosines. The bridge to the next topic.' },
  },
];

// Playable demo problems. Coordinates are math coordinates (y up); they are a
// witness that the givens are consistent, as in the question format of the guide.
// Every reason unlocked up to the problem's level is offered; a given can list
// extra reasons (`also`) that may cite it, such as the definition of a bisector.
export const PROBLEMS = {
  L01: [
    {
      n: 1,
      title: { he: 'זוויות קודקודיות', en: 'Vertical angles' },
      intro: { he: 'הישרים $AB$ ו-$CD$ נחתכים בנקודה $O$.', en: 'Lines $AB$ and $CD$ meet at point $O$.' },
      points: { A: [-3.76, 1.37], B: [3.76, -1.37], C: [-3.76, -1.37], D: [3.76, 1.37], O: [0, 0] },
      labelOffset: { O: [0, 24] },
      segments: ['AB', 'CD'],
      config: [
        { type: 'between', a: 'A', o: 'O', b: 'B', lean: 'Sbtw ℝ A O B', text: { he: '$O$ נמצאת על $AB$', en: '$O$ lies on $AB$' } },
        { type: 'between', a: 'C', o: 'O', b: 'D', lean: 'Sbtw ℝ C O D', text: { he: '$O$ נמצאת על $CD$', en: '$O$ lies on $CD$' } },
      ],
      givens: [{ claim: '∢AOC = 40°' }],
      goal: '∢BOD = 40°',
      marks: [
        { type: 'arc', ang: 'AOC', r: 54, label: '40°' },
        { type: 'arc', ang: 'BOD', r: 54, label: '?', goal: true },
      ],
      hints: [
        { he: 'התחילו ממה שנתון: $∢AOC = 40°$. הנימוק: נתון.', en: 'Start from the given: $∢AOC = 40°$. Reason: given.' },
        { he: '$∢AOC$ ו-$∢BOD$ הן זוויות קודקודיות. כתבו $∢AOC = ∢BOD$ ומצאו את הנימוק בארגז הכלים.', en: '$∢AOC$ and $∢BOD$ are vertical angles. Write $∢AOC = ∢BOD$ and find the reason in the toolbox.' },
        { he: 'עכשיו כתבו $∢BOD = 40°$. זה חישוב משתי השורות, והמשחק ישלים את הנימוק לבד.', en: 'Now write $∢BOD = 40°$. It is a calculation from the two rows, so the game fills in the reason.' },
      ],
    },
    {
      n: 2,
      title: { he: 'זוויות צמודות', en: 'Adjacent angles' },
      intro: { he: 'הנקודה $O$ נמצאת על הישר $AB$, והקרן $OC$ יוצאת ממנה.', en: 'Point $O$ lies on line $AB$, and ray $OC$ starts at $O$.' },
      points: { A: [-4, 0], B: [4, 0], O: [0, 0], C: [2.25, 2.68] },
      labelOffset: { O: [0, 22] },
      segments: ['AB', 'OC'],
      config: [
        { type: 'between', a: 'A', o: 'O', b: 'B', lean: 'Sbtw ℝ A O B', text: { he: '$O$ נמצאת על $AB$', en: '$O$ lies on $AB$' } },
      ],
      givens: [{ claim: '∢AOC = 130°' }],
      goal: '∢COB = 50°',
      marks: [
        { type: 'arc', ang: 'AOC', r: 34, label: '130°' },
        { type: 'arc', ang: 'COB', r: 50, label: '?', goal: true },
      ],
      hints: [
        { he: 'כתבו את הנתון: $∢AOC = 130°$.', en: 'Write the given: $∢AOC = 130°$.' },
        { he: '$∢AOC$ ו-$∢COB$ הן זוויות צמודות. כתבו את הסכום שלהן: $∢AOC + ∢COB = 180°$.', en: '$∢AOC$ and $∢COB$ are adjacent angles. Write their sum: $∢AOC + ∢COB = 180°$.' },
        { he: 'מכאן $∢COB = 50°$ בחישוב. כתבו את הטענה, והנימוק יושלם לבד.', en: 'So $∢COB = 50°$ by calculation. Write the claim and the reason fills itself in.' },
      ],
    },
  ],
  L02: [
    {
      n: 1,
      title: { he: 'שווה שוקיים וחוצה זווית', en: 'Isosceles with a bisector' },
      intro: { he: 'במשולש $ABC$ הנקודה $D$ נמצאת על הצלע $BC$.', en: 'In triangle $ABC$, point $D$ lies on side $BC$.' },
      points: { A: [0, 4], B: [-3, 0], C: [3, 0], D: [0, 0] },
      segments: ['AB', 'AC', 'BC', 'AD'],
      config: [
        { type: 'between', a: 'B', o: 'D', b: 'C', lean: 'Sbtw ℝ B D C', text: { he: '$D$ נמצאת על $BC$', en: '$D$ lies on $BC$' } },
      ],
      givens: [
        { claim: 'AB = AC' },
        { claim: '∢BAD = ∢CAD', text: { he: '$AD$ חוצה את $∢BAC$', en: '$AD$ bisects $∢BAC$' }, also: ['bisector_def'] },
      ],
      goal: 'BD = CD',
      marks: [
        { type: 'tick', seg: 'AB', n: 1 }, { type: 'tick', seg: 'AC', n: 1 },
        { type: 'arc', ang: 'BAD', n: 1, r: 30 }, { type: 'arc', ang: 'CAD', n: 1, r: 30 },
      ],
      hints: [
        { he: 'שני הנתונים הם כבר שתי שורות: $AB = AC$ ו-$∢BAD = ∢CAD$.', en: 'The two givens are already two rows: $AB = AC$ and $∢BAD = ∢CAD$.' },
        { he: 'למשולשים $△ABD$ ו-$△ACD$ יש צלע משותפת: $AD = AD$.', en: 'Triangles $△ABD$ and $△ACD$ share a side: $AD = AD$.' },
        { he: 'יש שתי צלעות והזווית שביניהן. איזה משפט חפיפה מתאים? כתבו $△ABD ≅ △ACD$.', en: 'Two sides and the angle between them. Which congruence theorem fits? Write $△ABD ≅ △ACD$.' },
        { he: 'ומהחפיפה, צלעות מתאימות: $BD = CD$.', en: 'And from the congruence, corresponding sides: $BD = CD$.' },
      ],
    },
    {
      n: 2,
      title: { he: 'צ.צ.צ במרובע', en: 'SSS in a quadrilateral' },
      intro: { he: 'במרובע $ABCD$ העבירו את האלכסון $AC$.', en: 'In quadrilateral $ABCD$, the diagonal $AC$ is drawn.' },
      points: { A: [0, 4], B: [-2.5, 1], C: [0, -3], D: [2.5, 1] },
      segments: ['AB', 'BC', 'CD', 'DA', 'AC'],
      config: [],
      givens: [{ claim: 'AB = AD' }, { claim: 'CB = CD' }],
      goal: '∢BAC = ∢DAC',
      marks: [
        { type: 'tick', seg: 'AB', n: 1 }, { type: 'tick', seg: 'AD', n: 1 },
        { type: 'tick', seg: 'CB', n: 2 }, { type: 'tick', seg: 'CD', n: 2 },
        { type: 'arc', ang: 'BAC', r: 34, goal: true }, { type: 'arc', ang: 'DAC', r: 34, goal: true },
      ],
      hints: [
        { he: 'כתבו את שני הנתונים.', en: 'Write down both givens.' },
        { he: 'הצלע $AC$ משותפת למשולשים $△ABC$ ו-$△ADC$.', en: 'Side $AC$ is shared by triangles $△ABC$ and $△ADC$.' },
        { he: 'שלוש צלעות שוות, ולכן $△ABC ≅ △ADC$. שימו לב לסדר: $B$ מתאימה ל-$D$.', en: 'Three equal sides, so $△ABC ≅ △ADC$. Mind the order: $B$ matches $D$.' },
        { he: 'מהחפיפה, זוויות מתאימות: $∢BAC = ∢DAC$.', en: 'From the congruence, corresponding angles: $∢BAC = ∢DAC$.' },
      ],
    },
    {
      n: 3,
      title: { he: 'ז.צ.ז עם אלכסון', en: 'ASA with a diagonal' },
      intro: { he: 'במרובע $ABCD$ האלכסון $AC$ חוצה את $∢BAD$ ואת $∢BCD$.', en: 'In quadrilateral $ABCD$, the diagonal $AC$ bisects $∢BAD$ and $∢BCD$.' },
      points: { A: [0, 3.4], B: [-3, 0.4], C: [0, -2.2], D: [3, 0.4] },
      segments: ['AB', 'BC', 'CD', 'DA', 'AC'],
      config: [],
      givens: [
        { claim: '∢BAC = ∢DAC', text: { he: '$AC$ חוצה את $∢BAD$', en: '$AC$ bisects $∢BAD$' }, also: ['bisector_def'] },
        { claim: '∢BCA = ∢DCA', text: { he: '$AC$ חוצה את $∢BCD$', en: '$AC$ bisects $∢BCD$' }, also: ['bisector_def'] },
      ],
      goal: 'AB = AD',
      marks: [
        { type: 'arc', ang: 'BAC', n: 1, r: 30 }, { type: 'arc', ang: 'DAC', n: 1, r: 30 },
        { type: 'arc', ang: 'BCA', n: 2, r: 30 }, { type: 'arc', ang: 'DCA', n: 2, r: 30 },
      ],
      hints: [
        { he: 'כתבו את שני הנתונים כשוויונות של זוויות.', en: 'Write both givens as angle equalities.' },
        { he: 'הצלע $AC$ משותפת, והיא בדיוק הצלע שבין שתי הזוויות.', en: 'Side $AC$ is shared, and it is exactly the side between the two angles.' },
        { he: 'צלע ושתי הזוויות שלידה: איזה משפט חפיפה זה? כתבו $△ABC ≅ △ADC$.', en: 'A side and the two angles next to it: which congruence theorem is that? Write $△ABC ≅ △ADC$.' },
        { he: 'ומהחפיפה: $AB = AD$.', en: 'And from the congruence: $AB = AD$.' },
      ],
    },
  ],
};

export function stageById(id) { return STAGES.find((s) => s.id === id); }
export function stageNumber(id) { return STAGES.findIndex((s) => s.id === id) + 1; }

// Every playable problem in order, as { stage, n, problem }.
export function problemList() {
  const out = [];
  for (const s of STAGES) for (const p of PROBLEMS[s.id] || []) out.push({ stage: s.id, n: p.n, problem: p });
  return out;
}
