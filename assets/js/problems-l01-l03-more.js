// More problems for geometry stages 1–3 (L01–L03), in the format of PROBLEMS in data.js.
// data.js appends them after the problems written there. Numbers are fixed (progress is saved
// per stage and number): L02 starts at 5 because 2.4 is the base-angles proof in data.js.
// Coordinates are math coordinates (y up); points on one line are placed exactly on it.

const on = (o, a, b) => ({
  type: 'between', a, o, b, lean: `Sbtw ℝ ${a} ${o} ${b}`,
  text: { he: `$${o}$ נמצאת על $${a}${b}$`, en: `$${o}$ lies on $${a}${b}$` },
});
const mid = (m, a, b) => ({
  claim: `${a}${m} = ${m}${b}`, also: ['midpoint_def'],
  text: { he: `$${m}$ אמצע $${a}${b}$`, en: `$${m}$ is the midpoint of $${a}${b}$` },
});
const H = (he, en) => ({ he, en });

// Segments AB and CD cross at their common midpoint O.
const bowtie = () => ({
  points: { O: [0, 0], A: [-3, 1], B: [3, -1], C: [-2, -2.5], D: [2, 2.5] },
  labelOffset: { O: [16, 4] },
  segments: ['AB', 'CD', 'AC', 'BD'],
  config: [on('O', 'A', 'B'), on('O', 'C', 'D')],
});

export const PROBLEMS_L01_L03_MORE = {
  L01: [
    {
      n: 3,
      title: H('זווית כפולה מצמודתה', 'Twice its neighbor'),
      intro: H('הישרים $AB$ ו-$CD$ נחתכים בנקודה $O$, ו-$∢AOC$ גדולה פי 2 מ-$∢COB$.', 'Lines $AB$ and $CD$ meet at $O$, and $∢AOC$ is twice $∢COB$.'),
      points: { A: [-4, 0], B: [4, 0], O: [0, 0], C: [2, 3.46], D: [-2, -3.46] },
      labelOffset: { O: [12, 20] },
      segments: ['AB', 'CD'],
      config: [on('O', 'A', 'B'), on('O', 'C', 'D')],
      givens: [{ claim: '∢AOC = 2∢COB' }],
      goal: '∢AOD = 60°',
      marks: [{ type: 'arc', ang: 'COB', r: 26 }, { type: 'arc', ang: 'AOD', r: 26, label: '?', goal: true }],
      hints: [
        H('כתבו את הנתון. "פי 2" כותבים כך: $∢AOC = 2∢COB$.', 'Write the given. "Twice" is written $∢AOC = 2∢COB$.'),
        H('$∢AOC$ ו-$∢COB$ צמודות: $∢AOC + ∢COB = 180°$. מכאן בחישוב $∢COB = 60°$.', '$∢AOC$ and $∢COB$ are adjacent: $∢AOC + ∢COB = 180°$. So by calculation $∢COB = 60°$.'),
        H('$∢AOD$ ו-$∢COB$ קודקודיות.', '$∢AOD$ and $∢COB$ are vertical angles.'),
      ],
    },
    {
      n: 4,
      title: H('חוצה זווית צמודה', 'Bisecting the neighbor'),
      intro: H('הנקודה $O$ על הישר $AB$. הקרן $OD$ חוצה את הזווית $∢COB$.', 'Point $O$ is on line $AB$. Ray $OD$ bisects $∢COB$.'),
      points: { A: [-4, 0], B: [4, 0], O: [0, 0], C: [0.7, 3.97], D: [3.06, 2.57] },
      labelOffset: { O: [0, 22] },
      segments: ['AB', 'OC', 'OD'],
      config: [on('O', 'A', 'B')],
      givens: [{ claim: '∢AOC = 100°' }, { claim: '∢COD = ∢DOB', text: H('$OD$ חוצה את $∢COB$', '$OD$ bisects $∢COB$'), also: ['bisector_def'] }],
      goal: '∢DOB = 40°',
      marks: [{ type: 'arc', ang: 'AOC', r: 22, label: '100°' }, { type: 'arc', ang: 'COD', n: 1, r: 34 }, { type: 'arc', ang: 'DOB', n: 1, r: 34, label: '?', goal: true }],
      hints: [
        H('כתבו את שני הנתונים.', 'Write both givens.'),
        H('$∢AOC$ ו-$∢COB$ צמודות, ולכן $∢COB = 80°$.', '$∢AOC$ and $∢COB$ are adjacent, so $∢COB = 80°$.'),
        H('חיבור זוויות: $∢COD + ∢DOB = ∢COB$. ושתי הזוויות שוות, אז כל אחת $40°$.', 'Angle addition: $∢COD + ∢DOB = ∢COB$. The two are equal, so each is $40°$.'),
      ],
    },
    {
      n: 5,
      title: H('שלוש זוויות על ישר', 'Three angles on a line'),
      intro: H('הנקודה $O$ על הישר $AB$, והקרניים $OC$ ו-$OD$ באותו צד שלו.', 'Point $O$ is on line $AB$, and rays $OC$ and $OD$ are on the same side of it.'),
      points: { A: [-4, 0], B: [4, 0], O: [0, 0], C: [-2.57, 3.06], D: [2, 3.46] },
      labelOffset: { O: [0, 22] },
      segments: ['AB', 'OC', 'OD'],
      config: [on('O', 'A', 'B')],
      givens: [{ claim: '∢AOC = 50°' }, { claim: '∢DOB = 60°' }],
      goal: '∢COD = 70°',
      marks: [{ type: 'arc', ang: 'AOC', r: 26, label: '50°' }, { type: 'arc', ang: 'DOB', r: 26, label: '60°' }, { type: 'arc', ang: 'COD', r: 36, label: '?', goal: true }],
      hints: [
        H('כתבו את שני הנתונים.', 'Write both givens.'),
        H('$∢AOC$ ו-$∢COB$ צמודות: $∢AOC + ∢COB = 180°$.', '$∢AOC$ and $∢COB$ are adjacent: $∢AOC + ∢COB = 180°$.'),
        H('חיבור זוויות: $∢COD + ∢DOB = ∢COB$. השלימו בחישוב.', 'Angle addition: $∢COD + ∢DOB = ∢COB$. Then calculate.'),
      ],
    },
  ],

  L02: [
    {
      n: 5,
      title: H('אמצע משותף', 'A shared midpoint'),
      intro: H('הקטעים $AB$ ו-$CD$ חוצים זה את זה בנקודה $O$.', 'Segments $AB$ and $CD$ bisect each other at $O$.'),
      ...bowtie(),
      givens: [{ claim: 'AO = OB' }, { claim: 'CO = OD' }],
      goal: 'AC = BD',
      marks: [{ type: 'tick', seg: 'AO', n: 1 }, { type: 'tick', seg: 'OB', n: 1 }, { type: 'tick', seg: 'CO', n: 2 }, { type: 'tick', seg: 'OD', n: 2 }],
      hints: [
        H('כתבו את שני הנתונים.', 'Write both givens.'),
        H('$∢AOC$ ו-$∢BOD$ קודקודיות.', '$∢AOC$ and $∢BOD$ are vertical angles.'),
        H('שתי צלעות והזווית שביניהן: $△AOC ≅ △BOD$, ומהחפיפה $AC = BD$.', 'Two sides and the angle between them: $△AOC ≅ △BOD$, and so $AC = BD$.'),
      ],
    },
    {
      n: 6,
      title: H('זווית, צלע, זווית', 'Angle, side, angle'),
      intro: H('הקטעים $AB$ ו-$CD$ נחתכים בנקודה $O$, ו-$O$ אמצע $AB$.', 'Segments $AB$ and $CD$ meet at $O$, and $O$ is the midpoint of $AB$.'),
      ...bowtie(),
      givens: [{ claim: '∢CAO = ∢DBO' }, { claim: 'AO = OB' }],
      goal: 'CO = OD',
      marks: [{ type: 'tick', seg: 'AO', n: 1 }, { type: 'tick', seg: 'OB', n: 1 }, { type: 'arc', ang: 'CAO', n: 1, r: 26 }, { type: 'arc', ang: 'DBO', n: 1, r: 26 }],
      hints: [
        H('כתבו את שני הנתונים, ואת הזוויות הקודקודיות $∢AOC = ∢BOD$.', 'Write both givens and the vertical angles $∢AOC = ∢BOD$.'),
        H('צלע ושתי הזוויות שלידה: $△AOC ≅ △BOD$.', 'A side and the two angles next to it: $△AOC ≅ △BOD$.'),
        H('ומהחפיפה $CO = OD$.', 'And from the congruence, $CO = OD$.'),
      ],
    },
    {
      n: 7,
      title: H('זווית ישרה מחפיפה', 'A right angle from congruence'),
      intro: H('במשולש $ABC$ מתקיים $AB = AC$, ו-$D$ אמצע $BC$.', 'In triangle $ABC$, $AB = AC$ and $D$ is the midpoint of $BC$.'),
      points: { A: [0, 4], B: [-3, 0], C: [3, 0], D: [0, 0] },
      segments: ['AB', 'AC', 'BC', 'AD'],
      config: [on('D', 'B', 'C')],
      givens: [{ claim: 'AB = AC' }, mid('D', 'B', 'C')],
      goal: '∢ADB = 90°',
      marks: [{ type: 'tick', seg: 'AB', n: 1 }, { type: 'tick', seg: 'AC', n: 1 }, { type: 'tick', seg: 'BD', n: 2 }, { type: 'tick', seg: 'DC', n: 2 }, { type: 'right', ang: 'ADB', goal: true }],
      hints: [
        H('כתבו את שני הנתונים, ואת הצלע המשותפת $AD = AD$.', 'Write both givens and the common side $AD = AD$.'),
        H('שלוש צלעות: $△ABD ≅ △ACD$, ומהחפיפה $∢ADB = ∢ADC$.', 'Three sides: $△ABD ≅ △ACD$, and so $∢ADB = ∢ADC$.'),
        H('$∢ADB$ ו-$∢ADC$ צמודות. שתי זוויות שוות שסכומן $180°$: כל אחת $90°$.', '$∢ADB$ and $∢ADC$ are adjacent. Two equal angles summing to $180°$: each is $90°$.'),
      ],
    },
    {
      n: 8,
      title: H('זוויות הבסיס, עם בנייה', 'The base angles, with a construction'),
      intro: H('במשולש $ABC$ מתקיים $AB = AC$. הוכיחו שזוויות הבסיס שוות. בשרטוט אין עוד קטע שיעזור: בנו אותו.', 'In triangle $ABC$, $AB = AC$. Prove that the base angles are equal. The diagram has no helpful segment yet: construct one.'),
      points: { A: [0, 4], B: [-2.5, 0], C: [2.5, 0] },
      segments: ['AB', 'AC', 'BC'],
      config: [],
      givens: [{ claim: 'AB = AC' }],
      goal: '∢ABC = ∢ACB',
      marks: [{ type: 'tick', seg: 'AB', n: 1 }, { type: 'tick', seg: 'AC', n: 1 }, { type: 'arc', ang: 'ABC', r: 30, goal: true }, { type: 'arc', ang: 'ACB', r: 30, goal: true }],
      hints: [
        H('לחצו על "בנייה" ובחרו "חוצה זווית": העבירו את חוצה הזווית $∢BAC$ עד הצלע $BC$, ותנו לנקודה החדשה את השם $D$.', 'Press "Construct" and choose "Angle bisector": draw the bisector of $∢BAC$ to side $BC$, and name the new point $D$.'),
        H('הבנייה נותנת שורה: $∢BAD = ∢DAC$. כתבו גם את הנתון ואת הצלע המשותפת $AD = AD$.', 'The construction gives a row: $∢BAD = ∢DAC$. Also write the given and the common side $AD = AD$.'),
        H('צ.ז.צ: $△ABD ≅ △ACD$, ומהחפיפה $∢ABD = ∢ACD$. זו בדיוק הטענה: $D$ על $BC$.', 'SAS: $△ABD ≅ △ACD$, and so $∢ABD = ∢ACD$. That is exactly the claim, since $D$ is on $BC$.'),
      ],
    },
    {
      n: 9,
      title: H('אלכסון בדלתון', 'A diagonal in a kite'),
      intro: H('במרובע $ABCD$ מתקיים $AB = AD$ ו-$CB = CD$.', 'In quadrilateral $ABCD$, $AB = AD$ and $CB = CD$.'),
      points: { A: [0, 4], B: [-2.5, 1], C: [0, -3], D: [2.5, 1] },
      segments: ['AB', 'BC', 'CD', 'DA'],
      config: [],
      givens: [{ claim: 'AB = AD' }, { claim: 'CB = CD' }],
      goal: '∢ABC = ∢ADC',
      marks: [{ type: 'tick', seg: 'AB', n: 1 }, { type: 'tick', seg: 'AD', n: 1 }, { type: 'tick', seg: 'CB', n: 2 }, { type: 'tick', seg: 'CD', n: 2 },
        { type: 'arc', ang: 'ABC', r: 26, goal: true }, { type: 'arc', ang: 'ADC', r: 26, goal: true }],
      hints: [
        H('לחצו על "בנייה" ובחרו "קטע": העבירו את האלכסון $AC$. עכשיו יש שני משולשים.', 'Press "Construct" and choose "Segment": draw the diagonal $AC$. Now there are two triangles.'),
        H('כתבו את שני הנתונים ואת הצלע המשותפת $AC = AC$.', 'Write both givens and the common side $AC = AC$.'),
        H('צ.צ.צ: $△ABC ≅ △ADC$, ומהחפיפה $∢ABC = ∢ADC$.', 'SSS: $△ABC ≅ △ADC$, and so $∢ABC = ∢ADC$.'),
      ],
    },
  ],

  L03: [
    {
      // question 3 since 2026-11-28 (before "from the inside out"); its progress keeps "L03-4"
      n: 3,
      key: 'L03-4',
      title: H('זוויות חיצוניות שוות', 'Equal exterior angles'),
      intro: H('במשולש $ABC$ מתקיים $AB = AC$. הצלע $BC$ מוארכת לשני הצדדים, עד $D$ ועד $E$.', 'In triangle $ABC$, $AB = AC$. Side $BC$ is extended both ways, to $D$ and to $E$.'),
      points: { A: [0, 4], B: [-2, 0], C: [2, 0], D: [-4.5, 0], E: [4.5, 0] },
      segments: ['AB', 'AC', 'DE'],
      config: [on('B', 'D', 'C'), on('C', 'B', 'E')],
      givens: [{ claim: 'AB = AC' }],
      goal: '∢ABD = ∢ACE',
      marks: [{ type: 'tick', seg: 'AB', n: 1 }, { type: 'tick', seg: 'AC', n: 1 }, { type: 'arc', ang: 'ABD', r: 22, goal: true }, { type: 'arc', ang: 'ACE', r: 22, goal: true }],
      hints: [
        H('זוויות הבסיס שוות: $∢ABC = ∢ACB$.', 'The base angles are equal: $∢ABC = ∢ACB$.'),
        H('כל זווית בסיס צמודה לזווית החיצונית שלידה: $∢ABD + ∢ABC = 180°$, וכך גם ב-$C$.', 'Each base angle is adjacent to the exterior angle next to it: $∢ABD + ∢ABC = 180°$, and the same at $C$.'),
        H('מכאן בחישוב $∢ABD = ∢ACE$.', 'So $∢ABD = ∢ACE$ by calculation.'),
      ],
    },
    {
      n: 5,
      title: H('מהזוויות אל חוצה הזווית', 'From the angles to the bisector'),
      intro: H('במשולש $ABC$ מתקיים $∢ABC = ∢ACB$, ו-$D$ אמצע $BC$.', 'In triangle $ABC$, $∢ABC = ∢ACB$ and $D$ is the midpoint of $BC$.'),
      points: { A: [0, 4], B: [-3, 0], C: [3, 0], D: [0, 0] },
      segments: ['AB', 'AC', 'BC', 'AD'],
      config: [on('D', 'B', 'C')],
      givens: [{ claim: '∢ABC = ∢ACB' }, mid('D', 'B', 'C')],
      goal: '∢BAD = ∢CAD',
      marks: [{ type: 'arc', ang: 'ABC', n: 1, r: 24 }, { type: 'arc', ang: 'ACB', n: 1, r: 24 }, { type: 'tick', seg: 'BD', n: 2 }, { type: 'tick', seg: 'DC', n: 2 },
        { type: 'arc', ang: 'BAD', r: 30, goal: true }, { type: 'arc', ang: 'CAD', r: 30, goal: true }],
      hints: [
        H('משולש עם שתי זוויות שוות הוא שווה שוקיים: $AB = AC$.', 'A triangle with two equal angles is isosceles: $AB = AC$.'),
        H('כתבו את נקודת האמצע $BD = DC$.', 'Write the midpoint $BD = DC$.'),
        H('במשולש שווה שוקיים התיכון לבסיס חוצה גם את זווית הראש.', 'In an isosceles triangle the median to the base also bisects the apex angle.'),
      ],
    },
    {
      n: 6,
      title: H('הגובה חוצה את הבסיס', 'The altitude halves the base'),
      intro: H('במשולש $ABC$ מתקיים $AB = AC$. הנקודה $D$ על $BC$, ו-$AD ⊥ BC$.', 'In triangle $ABC$, $AB = AC$. Point $D$ is on $BC$, and $AD ⊥ BC$.'),
      points: { A: [0, 6], B: [-5, 0], C: [5, 0], D: [0, 0] },
      segments: ['AB', 'AC', 'BC', 'AD'],
      config: [on('D', 'B', 'C')],
      givens: [{ claim: 'AB = AC' }, { claim: 'AD ⊥ BC' }, { claim: 'BC = 10' }],
      goal: 'BD = 5',
      marks: [{ type: 'tick', seg: 'AB', n: 1 }, { type: 'tick', seg: 'AC', n: 1 }, { type: 'right', ang: 'ADC' }],
      hints: [
        H('כתבו את $AB = AC$ ואת $AD ⊥ BC$.', 'Write $AB = AC$ and $AD ⊥ BC$.'),
        H('במשולש שווה שוקיים הגובה לבסיס הוא גם תיכון: $BD = DC$.', 'In an isosceles triangle the altitude to the base is also a median: $BD = DC$.'),
        H('חיבור קטעים: $BD + DC = BC$. עם $BC = 10$, החישוב נותן $BD = 5$.', 'Segment addition: $BD + DC = BC$. With $BC = 10$, the calculation gives $BD = 5$.'),
      ],
    },
  ],
};
