// Where the geometry game sits in the Ministry of Education's new curriculum (3, 4 and 5
// study units), and what is left out of the תשפ"ז (2026–27) Bagrut. Read in the toolbox,
// on the stage cards and on the home page. The summaries this is built from are in
// `high school/תוכנית הלימודים החדשה/` (outside this repo).
//
// Sources:
// - The list of 106 geometry theorems with where each is taught (5 units, grade 10
//   curriculum, appendix 3), and the 4- and 5-unit curricula.
// - "הנושאים שלא יילמדו בתשפ"ז" (topics not taught or examined in 2026–27).
// - "עקרונות והנחיות לבדיקת בגרות תשפ"ז", p. 7: at 4 and 5 units a student may cite any
//   theorem of the curriculum or of the middle-school summary, and need not write
//   "every segment equals itself" or the addition rules.
// - "תמצית הנלמד בגאומטריה בחט"ב" (2015): the middle-school theorems, among them SSA
//   (the fourth congruence theorem) and hypotenuse-leg.

export const LEVELS = [3, 4, 5];
export const MINISTRY = {
  page: 'https://pop.education.gov.il/tchumey_daat/matmatika/chativa-elyona/teaching-mathematics/new-curriculum/',
  notTaught: 'https://meyda.education.gov.il/files/Pop/0files/matmatika/Chativa-Elyona/mafmar/Topics-not-be-taught-in-Tashpaz.pdf',
  examRules: 'https://meyda.education.gov.il/files/Pop/0files/matmatika/Chativa-Elyona/mafmar/exams-time.pdf',
  grading: 'https://meyda.education.gov.il/files/Pop/0files/matmatika/Chativa-Elyona/ekronot-anhayot-bdika-bagrut.pdf',
  middleSchool: 'https://meyda.education.gov.il/files/Mazkirut_Pedagogit/matematika/geo_hatab_2015.pdf',
};

// ---------------------------------------------------------------- reasons
// lv: the levels whose curriculum has the reason. At 4 and 5 units it may be cited without
//   proof; at 3 units there are no formal proofs, and it is a fact used in calculations.
// ms: in the middle-school summary, so citable at 4 and 5 units from the start.
// out: levels where it is not examined in תשפ"ז.
// practice: levels where it is learned only as an exercise: proved each time, never cited.
// aux: levels where it is not on the list but follows in a line or two; the exam wants that line.
// opt: the Bagrut does not ask for this reason in writing (the game still needs the row).
const C = (lv, more = {}) => ({ lv, ...more });
const ALL = [3, 4, 5];
const HS = [4, 5];

export const REASON_CURRICULUM = {
  given: C(ALL), from_diagram: C(ALL), algebra: C(ALL),
  common_side: C(ALL, { opt: true }), common_angle: C(ALL, { opt: true }),
  segment_add: C(ALL, { opt: true }), angle_add: C(ALL, { opt: true }),
  cons_segment: C(HS), cons_extend: C(HS), cons_midpoint: C(HS), cons_median: C(HS),
  cons_perp: C(HS), cons_parallel: C(HS), cons_bisector: C(HS),

  adj_angles: C(HS, { ms: true }), straight_angle: C(ALL, { ms: true }), vert_angles: C(ALL, { ms: true }),
  around_point: C([3], { aux: HS }),
  bisector_def: C(ALL, { ms: true }), midpoint_def: C(ALL, { ms: true }), perp_def: C(ALL, { ms: true }),

  SAS: C(HS, { ms: true }), ASA: C(HS, { ms: true }), SSS: C(HS, { ms: true }), SSA: C(HS, { ms: true }),
  cpct_side: C(HS, { ms: true }), cpct_angle: C(HS, { ms: true }),

  iso_base: C(ALL, { ms: true }), iso_converse: C(HS, { ms: true }), iso_median: C(ALL, { ms: true }),
  equi_sides: C([], { aux: HS }), equi_angles: C([3], { aux: HS }),

  alt_angles: C(ALL, { ms: true }), corr_angles: C(ALL, { ms: true }), cointerior: C(ALL, { ms: true }),
  tri_sum: C(ALL, { ms: true }), par_converse: C(HS, { ms: true }), ext_angle: C(HS, { ms: true }),
  par_trans: C([], { aux: HS }),

  side_angle: C(HS, { ms: true }), angle_side: C(HS, { ms: true }), tri_ineq: C(HS, { ms: true }),

  para_def: C(ALL, { ms: true }), para_sides: C(ALL, { ms: true }), para_angles: C(ALL, { ms: true }),
  para_diag: C(ALL, { ms: true }), para_test: C(HS, { ms: true }), rect_diag: C(ALL, { ms: true }),
  rhombus_diag: C(ALL, { ms: true }), kite_diag: C(ALL, { ms: true }), trap_iso: C(ALL, { ms: true }),
  tri_area: C(ALL), quad_area: C(ALL, { ms: true }),

  midseg_tri: C(HS, { ms: true }), midseg_trap: C(HS, { ms: true }), median_hyp: C(HS, { ms: true }), tri_30: C(HS),

  pythagoras: C(ALL, { ms: true }), pyth_conv: C(HS),

  thales: C([5]), sim_aa: C(ALL, { ms: true }), sim_sas: C(HS), sim_sss: C(HS), sim_parts: C(ALL, { ms: true }),
  bis_ratio: C(HS, { out: [4] }),

  radii: C(ALL), inscribed_central: C(HS), inscribed_same: C(HS), semicircle: C(HS),
  tangent_radius: C(HS), tangents_eq: C(HS, { out: [4] }), cyclic_quad: C(HS),

  sin_def: C(ALL), cos_def: C(ALL), tan_def: C(ALL), law_sines: C(HS), law_cosines: C([5]),

  // added by geo-more.js
  tangent_chord: C([5]), tangents_center: C(HS, { out: [4] }),
  chords_product: C([], { practice: [5] }), secant_tangent: C([], { practice: [5] }),
  law_sines_2r: C(HS), area_split: C(ALL), same_height: C(HS), sim_area: C(ALL, { ms: true }),
  quad_props: C(ALL, { ms: true }), quad_test: C(HS, { ms: true }), tangent_test: C(HS),
  cyclic_test: C(HS), cyclic_props: C(HS), tangential_test: C([5], { out: [5] }), tangential_props: C([5], { out: [5] }),
  coord_calc: C(ALL), coord_mid: C(ALL), coord_slope: C(ALL), slope_perp: C(ALL), slope_par: C(ALL),
  line_eq: C(ALL), line_point: C(ALL), circle_eq: C(HS),
};

export const curriculumOf = (id) => REASON_CURRICULUM[id] || null;
export const inLevel = (id, level) => { const c = curriculumOf(id); return !c || c.lv.includes(+level); };

// Official names a student may type for a reason (matched like the reason's own names).
export const REASON_ALIASES = {
  SSA: ['משפט חפיפה רביעי', 'יתר ניצב', 'יתר-ניצב', 'fourth congruence theorem', 'HL', 'hypotenuse leg'],
  bis_ratio: ['משפט חוצה הזווית הפנימית', 'חוצה זווית פנימית במשולש'],
  pyth_conv: ['המשפט ההפוך למשפט פיתגורס'],
  semicircle: ['זווית היקפית הנשענת על קוטר'],
  tangent_chord: ['זווית בין משיק ומיתר'],
  iso_median: ['התלכדות', 'חוצה זווית הראש'],
  sim_aa: ['משפט דמיון זווית זווית'],
  tri_30: ['ניצב מול זווית של 30'],
};

// Typed by a student, these name congruence by two angles and a side not between them. The
// Bagrut has no such theorem.
export const AAS_NAMES = ['צזז', 'זזצ', 'aas', 'saa'];

// ---------------------------------------------------------------- stages
// Where each stage is taught: 'ms' = middle school (cited at 4 and 5 units, used at 3 units);
// otherwise the grade. A missing level: the stage is not in that level's curriculum.
const G = (he, en) => ({ he, en });
const MS = 'ms';
export const STAGE_CURRICULUM = {
  L01: { 3: G('כיתה י"א', 'grade 11'), 4: MS, 5: MS },
  L02: { 4: MS, 5: MS },
  L03: { 3: G('כיתה י"א', 'grade 11'), 4: MS, 5: MS },
  L04: { 3: G('כיתה י"א', 'grade 11'), 4: MS, 5: MS },
  L05: { 4: MS, 5: MS },
  L06: { 3: G('כיתות י\'–י"א', 'grades 10–11'), 4: MS, 5: MS },
  L07: { 4: G('כיתה י\'', 'grade 10'), 5: G('כיתה י\'', 'grade 10') },
  L08: { 3: G('כיתה י\'', 'grade 10'), 4: MS, 5: MS },
  L09: { 3: G('כיתה י"א, דמיון ז.ז בלבד', 'grade 11, AA only'), 4: G('כיתה י\', בלי תאלס', 'grade 10, no intercept theorem'), 5: G('כיתה י\'', 'grade 10') },
  L10: { 4: G('כיתה י"א', 'grade 11'), 5: G('כיתה י\'', 'grade 10') },
  L11: { 3: G('כיתה י"א, משולש ישר זווית', 'grade 11, right triangles'), 4: G('כיתות י\'–י"א, בלי משפט הקוסינוסים', 'grades 10–11, no law of cosines'), 5: G('כיתה י\'', 'grade 10') },
};

// ---------------------------------------------------------------- the geometry Bagrut, תשפ"ז
export const EXAM = {
  3: {
    papers: G('035172 (כיתה י\'), 035371 (כיתה י"א, כולל חומר י\'), 035372 (כיתה י"ב)', '035172 (grade 10), 035371 (grade 11, with grade 10 material), 035372 (grade 12)'),
    geometry: G('אין הוכחות פורמליות: מחשבים, ומנמקים במשפט קצר. בדמיון כותבים אילו זוויות שוות ולמה.', 'No formal proofs: compute, and justify in a short sentence. For similarity, say which angles are equal and why.'),
    out: G('ריצופים, וטריגונומטריה במצולעים משוכללים עם יותר מ-4 צלעות (371).', 'Tilings, and trigonometry in regular polygons with more than 4 sides (371).'),
  },
  4: {
    papers: G('035471 (סוף י"א, חומר י\' וי"א), 035472 (כיתה י"ב)', '035471 (end of grade 11, grades 10–11), 035472 (grade 12)'),
    geometry: G('פרק "גאומטריה משולבת": שאלה אחת מתוך שתיים, ולפחות שאלת גאומטריה אחת חובה. כל שאלה משלבת שניים מתוך גאומטריה, גאומטריה אנליטית וטריגונומטריה, ובלי פרמטרים.', 'A "combined geometry" chapter: one of two questions, and at least one geometry question is compulsory. Each question combines two of plane geometry, analytic geometry and trigonometry, with no parameters.'),
    out: G('משפט חוצה הזווית וההפוך לו, מפגש חוצי הזוויות, שני משיקים למעגל, משולש החוסם מעגל (471).', 'The angle bisector theorem and its converse, the meeting point of the angle bisectors, two tangents to a circle, a triangle circumscribing a circle (471).'),
  },
  5: {
    papers: G('035571 (סוף י"א, חומר י\' וי"א), 035572 (כיתה י"ב)', '035571 (end of grade 11, grades 10–11), 035572 (grade 12)'),
    geometry: G('פרק שאלות קצרות חובה (3 מתוך 4), ופרק "גאומטריה וטריגונומטריה במישור": שאלה אחת מתוך שתיים, ולפחות אחת חובה.', 'A compulsory short-questions chapter (3 of 4), and a "geometry and plane trigonometry" chapter: one of two questions, at least one compulsory.'),
    out: G('מרובע החוסם מעגל. היחס בין היקפים, תיכונים, חוצי זוויות ורדיוסים במשולשים דומים. היחס בין גבהים ובין שטחים כן נבחן (571).', 'A quadrilateral circumscribing a circle. The ratio of perimeters, medians, bisectors and radii of similar triangles; the ratio of heights and of areas is still examined (571).'),
  },
};

// ---------------------------------------------------------------- topics
// The levels that study each home-page topic (data.js TOPICS ids).
export const TOPIC_LEVELS = {
  geometry: ALL, trigonometry: ALL, analytic: ALL, algebra: ALL, statistics: ALL,
  space: ALL, sequences: HS, calculus: HS, complex: [5],
};
