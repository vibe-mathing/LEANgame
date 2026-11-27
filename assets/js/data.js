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

// The reason catalog. `refs` is how many earlier rows the reason cites
// (0, a fixed number, or 'many'). `playable` reasons are checked by the demo.
export const REASONS = {
  given: {
    kind: 'given', stage: null, refs: 0, playable: true, lean: 'g',
    short: { he: 'נתון', en: 'Given' },
    name: { he: 'נתון', en: 'Given' },
    statement: { he: 'הטענה מופיעה בנתוני השאלה.', en: 'The claim is one of the givens.' },
  },
  from_diagram: {
    kind: 'given', stage: null, refs: 0, playable: false, lean: 'cfg',
    short: { he: 'מהשרטוט', en: 'From the diagram' },
    name: { he: 'מהשרטוט', en: 'From the diagram' },
    statement: { he: 'עובדת מיקום שרואים בשרטוט, למשל ש-$D$ נמצאת על $BC$.', en: 'A position fact read off the diagram, such as $D$ lying on $BC$.' },
  },
  common_side: {
    kind: 'basic', stage: null, refs: 0, playable: true, lean: 'rfl',
    short: { he: 'צלע משותפת', en: 'Common side' },
    name: { he: 'צלע משותפת', en: 'Common side' },
    statement: { he: 'כל קטע שווה לעצמו.', en: 'Every segment equals itself.' },
  },
  common_angle: {
    kind: 'basic', stage: null, refs: 0, playable: true, lean: 'rfl',
    short: { he: 'זווית משותפת', en: 'Common angle' },
    name: { he: 'זווית משותפת', en: 'Common angle' },
    statement: { he: 'כל זווית שווה לעצמה.', en: 'Every angle equals itself.' },
  },
  algebra: {
    kind: 'algebra', stage: null, refs: 'many', playable: true, lean: 'by linarith',
    short: { he: 'חשבון', en: 'Algebra' },
    name: { he: 'חשבון, העברת אגפים, הצבה', en: 'Algebra and substitution' },
    statement: { he: 'הצבה וחישוב, על סמך השורות שציינתם בלבד.', en: 'Substitution and arithmetic, using only the rows you cite.' },
  },
  adj_angles: {
    kind: 'theorem', stage: 'L01', refs: 0, playable: false, lean: 'adj_angles_sum',
    short: { he: 'זוויות צמודות', en: 'Adjacent angles' },
    name: { he: 'סכום זוויות צמודות', en: 'Adjacent angles' },
    statement: { he: 'סכום זוויות צמודות הוא $180°$.', en: 'Adjacent angles sum to $180°$.' },
  },
  vert_angles: {
    kind: 'theorem', stage: 'L01', refs: 0, playable: true, lean: 'vert_angles_eq',
    short: { he: 'זוויות קודקודיות', en: 'Vertical angles' },
    name: { he: 'זוויות קודקודיות שוות', en: 'Vertical angles are equal' },
    statement: { he: 'זוויות קודקודיות שוות זו לזו.', en: 'Vertical angles are equal.' },
  },
  bisector_def: {
    kind: 'definition', stage: 'L01', refs: 1, playable: false, lean: 'bisector_def',
    short: { he: 'חוצה זווית', en: 'Angle bisector' },
    name: { he: 'הגדרת חוצה זווית', en: 'Definition of angle bisector' },
    statement: { he: 'חוצה זווית מחלק אותה לשתי זוויות שוות.', en: 'An angle bisector splits an angle into two equal angles.' },
  },
  midpoint_def: {
    kind: 'definition', stage: 'L01', refs: 1, playable: false, lean: 'midpoint_def',
    short: { he: 'אמצע קטע', en: 'Midpoint' },
    name: { he: 'הגדרת אמצע קטע', en: 'Definition of midpoint' },
    statement: { he: 'אמצע קטע מחלק אותו לשני קטעים שווים.', en: 'A midpoint splits a segment into two equal parts.' },
  },
  SAS: {
    kind: 'theorem', stage: 'L02', refs: 3, playable: true, lean: 'cong_SAS',
    short: { he: 'צ.ז.צ', en: 'SAS' },
    name: { he: 'משפט חפיפה צ.ז.צ', en: 'SAS congruence' },
    statement: {
      he: 'שתי צלעות והזווית שביניהן שוות לשתי צלעות והזווית שביניהן, ולכן המשולשים חופפים.',
      en: 'Two sides and the angle between them match, so the triangles are congruent.',
    },
  },
  ASA: {
    kind: 'theorem', stage: 'L02', refs: 3, playable: true, lean: 'cong_ASA',
    short: { he: 'ז.צ.ז', en: 'ASA' },
    name: { he: 'משפט חפיפה ז.צ.ז', en: 'ASA congruence' },
    statement: {
      he: 'צלע ושתי הזוויות שלידה שוות לצלע ושתי הזוויות שלידה, ולכן המשולשים חופפים.',
      en: 'A side and the two angles next to it match, so the triangles are congruent.',
    },
  },
  SSS: {
    kind: 'theorem', stage: 'L02', refs: 3, playable: true, lean: 'cong_SSS',
    short: { he: 'צ.צ.צ', en: 'SSS' },
    name: { he: 'משפט חפיפה צ.צ.צ', en: 'SSS congruence' },
    statement: {
      he: 'שלוש הצלעות של משולש אחד שוות לשלוש הצלעות של האחר, ולכן המשולשים חופפים.',
      en: 'All three sides match, so the triangles are congruent.',
    },
  },
  SSA: {
    kind: 'theorem', stage: 'L02', refs: 3, playable: false, lean: 'cong_SSA',
    short: { he: 'צ.צ.ז', en: 'SSA' },
    name: { he: 'משפט חפיפה צ.צ.ז', en: 'SSA congruence' },
    statement: {
      he: 'שתי צלעות והזווית שמול הגדולה מביניהן שוות, ולכן המשולשים חופפים.',
      en: 'Two sides and the angle opposite the longer one match, so the triangles are congruent.',
    },
  },
  cpct_side: {
    kind: 'theorem', stage: 'L02', refs: 1, playable: true, lean: 'cong_side',
    short: { he: 'צלעות מתאימות', en: 'Corresponding sides' },
    name: { he: 'צלעות מתאימות במשולשים חופפים', en: 'Corresponding sides of congruent triangles' },
    statement: { he: 'במשולשים חופפים, צלעות מתאימות שוות.', en: 'In congruent triangles, corresponding sides are equal.' },
  },
  cpct_angle: {
    kind: 'theorem', stage: 'L02', refs: 1, playable: true, lean: 'cong_angle',
    short: { he: 'זוויות מתאימות', en: 'Corresponding angles' },
    name: { he: 'זוויות מתאימות במשולשים חופפים', en: 'Corresponding angles of congruent triangles' },
    statement: { he: 'במשולשים חופפים, זוויות מתאימות שוות.', en: 'In congruent triangles, corresponding angles are equal.' },
  },
};

// The proposed order of geometry levels (to be aligned with the curriculum).
export const STAGES = [
  {
    id: 'L01', glyph: 'angles', status: 'open',
    name: { he: 'זוויות', en: 'Angles' },
    blurb: { he: 'צמודות, קודקודיות וזוויות סביב נקודה. כאן לומדים איך כותבים שורה.', en: 'Adjacent, vertical and around a point. This is where you learn how a row works.' },
    unlocks: [
      { he: 'זוויות צמודות', en: 'Adjacent angles' }, { he: 'זוויות קודקודיות', en: 'Vertical angles' },
      { he: 'זוויות סביב נקודה', en: 'Angles around a point' }, { he: 'חוצה זווית', en: 'Angle bisector' },
    ],
  },
  {
    id: 'L02', glyph: 'congruence', status: 'open',
    name: { he: 'חפיפת משולשים', en: 'Triangle congruence' },
    blurb: { he: 'ארבעת משפטי החפיפה, והכלי החזק ביותר בגאומטריה: צלעות וזוויות מתאימות.', en: 'The four congruence theorems, and the strongest tool in geometry: corresponding parts.' },
    unlocks: [
      { he: 'צ.ז.צ', en: 'SAS' }, { he: 'ז.צ.ז', en: 'ASA' }, { he: 'צ.צ.צ', en: 'SSS' }, { he: 'צ.צ.ז', en: 'SSA' },
      { he: 'צלעות מתאימות', en: 'Corresponding sides' }, { he: 'זוויות מתאימות', en: 'Corresponding angles' },
    ],
  },
  {
    id: 'L03', glyph: 'isosceles', status: 'soon',
    name: { he: 'משולש שווה שוקיים', en: 'Isosceles triangle' },
    blurb: { he: 'זוויות הבסיס, המשפט ההפוך, והקטע שהוא גם תיכון, גם גובה וגם חוצה זווית.', en: 'Base angles, the converse, and the segment that is median, altitude and bisector at once.' },
    unlocks: [{ he: 'זוויות הבסיס', en: 'Base angles' }, { he: 'המשפט ההפוך', en: 'The converse' }, { he: 'תיכון לבסיס', en: 'Median to the base' }],
  },
  {
    id: 'L04', glyph: 'parallel', status: 'soon',
    name: { he: 'ישרים מקבילים', en: 'Parallel lines' },
    blurb: { he: 'זוויות מתחלפות, מתאימות וחד-צדדיות, ומשם סכום הזוויות במשולש.', en: 'Alternate, corresponding and co-interior angles, and from there the triangle angle sum.' },
    unlocks: [
      { he: 'זוויות מתחלפות', en: 'Alternate angles' }, { he: 'זוויות מתאימות', en: 'Corresponding angles' },
      { he: 'סכום זוויות במשולש', en: 'Angle sum' }, { he: 'זווית חיצונית', en: 'Exterior angle' },
    ],
  },
  {
    id: 'L05', glyph: 'inequality', status: 'soon',
    name: { he: 'אי-שוויונים במשולש', en: 'Triangle inequalities' },
    blurb: { he: 'מול הצלע הגדולה הזווית הגדולה, ואי-שוויון המשולש.', en: 'The larger side faces the larger angle, and the triangle inequality.' },
    unlocks: [{ he: 'צלע מול זווית', en: 'Side faces angle' }, { he: 'אי-שוויון המשולש', en: 'Triangle inequality' }],
  },
  {
    id: 'L06', glyph: 'quad', status: 'soon',
    name: { he: 'מרובעים', en: 'Quadrilaterals' },
    blurb: { he: 'מקבילית, מלבן, מעוין, ריבוע, דלתון וטרפז: תכונות ומשפטי זיהוי.', en: 'Parallelogram, rectangle, rhombus, square, kite and trapezoid: properties and tests.' },
    unlocks: [
      { he: 'מקבילית', en: 'Parallelogram' }, { he: 'מלבן', en: 'Rectangle' }, { he: 'מעוין', en: 'Rhombus' },
      { he: 'דלתון', en: 'Kite' }, { he: 'טרפז', en: 'Trapezoid' },
    ],
  },
  {
    id: 'L07', glyph: 'midsegment', status: 'soon',
    name: { he: 'קטע אמצעים', en: 'Midsegments' },
    blurb: { he: 'קטע אמצעים במשולש ובטרפז, התיכון ליתר והמשולש $30°$-$60°$-$90°$.', en: 'Midsegments in triangles and trapezoids, the median to the hypotenuse, the $30°$-$60°$-$90°$ triangle.' },
    unlocks: [{ he: 'קטע אמצעים', en: 'Midsegment' }, { he: 'תיכון ליתר', en: 'Median to hypotenuse' }],
  },
  {
    id: 'L08', glyph: 'pythagoras', status: 'soon',
    name: { he: 'משפט פיתגורס', en: 'Pythagoras' },
    blurb: { he: 'המשפט המפורסם ביותר בגאומטריה, וגם המשפט ההפוך.', en: 'The most famous theorem in geometry, and its converse.' },
    unlocks: [{ he: 'פיתגורס', en: 'Pythagoras' }, { he: 'המשפט ההפוך', en: 'The converse' }],
  },
  {
    id: 'L09', glyph: 'similarity', status: 'soon',
    name: { he: 'דמיון משולשים', en: 'Similarity' },
    blurb: { he: 'משפט תאלס, משפטי הדמיון ומשפט חוצה הזווית.', en: 'The intercept theorem, the similarity tests and the angle bisector theorem.' },
    unlocks: [{ he: 'משפט תאלס', en: 'Intercept theorem' }, { he: 'משפטי דמיון', en: 'Similarity tests' }],
  },
  {
    id: 'L10', glyph: 'circle', status: 'soon',
    name: { he: 'מעגל', en: 'Circles' },
    blurb: { he: 'מיתרים, זוויות מרכזיות והיקפיות, משיקים, ומרובעים חסומים וחוסמים.', en: 'Chords, central and inscribed angles, tangents, cyclic and tangential quadrilaterals.' },
    unlocks: [{ he: 'זווית היקפית', en: 'Inscribed angle' }, { he: 'משיק', en: 'Tangent' }, { he: 'מרובע חסום', en: 'Cyclic quadrilateral' }],
  },
  {
    id: 'L11', glyph: 'trigtri', status: 'soon',
    name: { he: 'טריגונומטריה במשולש', en: 'Trigonometry in the triangle' },
    blurb: { he: 'סינוס, קוסינוס וטנגנס, משפט הסינוסים ומשפט הקוסינוסים. הגשר לנושא הבא.', en: 'sin, cos and tan, the laws of sines and cosines. The bridge to the next topic.' },
    unlocks: [{ he: 'משפט הסינוסים', en: 'Law of sines' }, { he: 'משפט הקוסינוסים', en: 'Law of cosines' }],
  },
];

// Playable demo problems. Coordinates are math coordinates (y up); they are a
// witness that the givens are consistent, as in the question format of the guide.
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
      allowed: ['given', 'vert_angles', 'algebra'],
      hints: [
        { he: 'התחילו ממה שנתון: $∢AOC = 40°$. הנימוק: נתון.', en: 'Start from the given: $∢AOC = 40°$. Reason: given.' },
        { he: '$∢AOC$ ו-$∢BOD$ הן זוויות קודקודיות. כתבו $∢AOC = ∢BOD$ ובחרו "זוויות קודקודיות".', en: '$∢AOC$ and $∢BOD$ are vertical angles. Write $∢AOC = ∢BOD$ and pick "Vertical angles".' },
        { he: 'משתי השורות האלה "חשבון" מסיק ש-$∢BOD = 40°$. סמנו את שתיהן.', en: 'From those two rows, "Algebra" gives $∢BOD = 40°$. Cite both.' },
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
        { claim: '∢BAD = ∢CAD', text: { he: '$AD$ חוצה את $∢BAC$', en: '$AD$ bisects $∢BAC$' } },
      ],
      goal: 'BD = CD',
      marks: [
        { type: 'tick', seg: 'AB', n: 1 }, { type: 'tick', seg: 'AC', n: 1 },
        { type: 'arc', ang: 'BAD', n: 1, r: 30 }, { type: 'arc', ang: 'CAD', n: 1, r: 30 },
      ],
      allowed: ['given', 'common_side', 'common_angle', 'vert_angles', 'algebra', 'SAS', 'ASA', 'SSS', 'cpct_side', 'cpct_angle'],
      hints: [
        { he: 'שני הנתונים הם כבר שתי שורות: $AB = AC$ ו-$∢BAD = ∢CAD$.', en: 'The two givens are already two rows: $AB = AC$ and $∢BAD = ∢CAD$.' },
        { he: 'למשולשים $△ABD$ ו-$△ACD$ יש צלע משותפת: $AD = AD$.', en: 'Triangles $△ABD$ and $△ACD$ share a side: $AD = AD$.' },
        { he: 'יש שתי צלעות והזווית שביניהן, אז צ.ז.צ (1, 2, 3) נותן $△ABD ≅ △ACD$.', en: 'Two sides and the angle between them: SAS (1, 2, 3) gives $△ABD ≅ △ACD$.' },
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
      allowed: ['given', 'common_side', 'common_angle', 'vert_angles', 'algebra', 'SAS', 'ASA', 'SSS', 'cpct_side', 'cpct_angle'],
      hints: [
        { he: 'כתבו את שני הנתונים.', en: 'Write down both givens.' },
        { he: 'הצלע $AC$ משותפת למשולשים $△ABC$ ו-$△ADC$.', en: 'Side $AC$ is shared by triangles $△ABC$ and $△ADC$.' },
        { he: 'שלוש צלעות שוות: צ.צ.צ נותן $△ABC ≅ △ADC$. שימו לב לסדר: $B$ מתאימה ל-$D$.', en: 'Three equal sides: SSS gives $△ABC ≅ △ADC$. Mind the order: $B$ matches $D$.' },
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
        { claim: '∢BAC = ∢DAC', text: { he: '$AC$ חוצה את $∢BAD$', en: '$AC$ bisects $∢BAD$' } },
        { claim: '∢BCA = ∢DCA', text: { he: '$AC$ חוצה את $∢BCD$', en: '$AC$ bisects $∢BCD$' } },
      ],
      goal: 'AB = AD',
      marks: [
        { type: 'arc', ang: 'BAC', n: 1, r: 30 }, { type: 'arc', ang: 'DAC', n: 1, r: 30 },
        { type: 'arc', ang: 'BCA', n: 2, r: 30 }, { type: 'arc', ang: 'DCA', n: 2, r: 30 },
      ],
      allowed: ['given', 'common_side', 'common_angle', 'vert_angles', 'algebra', 'SAS', 'ASA', 'SSS', 'cpct_side', 'cpct_angle'],
      hints: [
        { he: 'כתבו את שני הנתונים כשוויונות של זוויות.', en: 'Write both givens as angle equalities.' },
        { he: 'הצלע $AC$ משותפת, והיא בדיוק הצלע שבין שתי הזוויות.', en: 'Side $AC$ is shared, and it is exactly the side between the two angles.' },
        { he: 'ז.צ.ז נותן $△ABC ≅ △ADC$.', en: 'ASA gives $△ABC ≅ △ADC$.' },
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
