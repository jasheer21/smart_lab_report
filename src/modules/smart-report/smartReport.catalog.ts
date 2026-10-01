import { MarkerCatalogDefinition } from './smartReport.types';

export const DISCLAIMER =
  'Educational information only, not a diagnosis. Please discuss your results with a licensed clinician.';

export const PANEL_ORDER = [
  'glycemic',
  'lipid',
  'iron',
  'vitamins',
  'thyroid',
  'inflammation',
  'minerals',
  'blood',
  'kidney',
  'liver',
];

export const PANEL_DISPLAY_NAMES: Record<string, string> = {
  glycemic: 'Blood Sugar (Glycemic Control)',
  lipid: 'Lipid Profile (Cholesterol & Fats)',
  iron: 'Iron & Anemia Markers',
  vitamins: 'Vitamins & Micronutrients',
  thyroid: 'Thyroid Function',
  inflammation: 'Inflammation & Immunity',
  minerals: 'Essential Minerals & Electrolytes',
  blood: 'Complete Blood Count (Hematology)',
  kidney: 'Renal & Kidney Health',
  liver: 'Hepatic & Liver Function',
};

/** Helper to keep entries consistent and complete */
const m = (def: Partial<MarkerCatalogDefinition> & {
  panel: string;
  panelName: string;
  name: string;
  aliases: string[];
  unitHints: string[];
  referenceRange: { low: number | null; high: number | null };
}): MarkerCatalogDefinition => ({
  higherIsBetter: false,
  questions: {
    high: [`What could be causing my ${def.name} to be elevated?`, 'Do I need a repeat test, dietary change, or follow-up?'],
    low: [`What could be causing my ${def.name} to be low?`, 'Do I need supplementation, lifestyle adjustment, or clinical follow-up?'],
    ...(def.questions || {}),
  },
  explanation: {
    high: `Your ${def.name} is above the recommended clinical range. It is worth discussing this with your doctor.`,
    low: `Your ${def.name} is below the recommended clinical range. It is worth discussing this with your doctor.`,
    normal: `Your ${def.name} is within the usual healthy reference range. No action is required for this result.`,
    ...(def.explanation || {}),
  },
  clinicalImportance: 'Standard diagnostic biomarker for physiological baseline assessment.',
  ...def,
});

export const MARKERS: Record<string, MarkerCatalogDefinition> = {
  hba1c: m({
    panel: 'glycemic',
    panelName: 'Blood sugar',
    name: 'HbA1c (average blood sugar)',
    aliases: [
      'HbA1c (Glycosylated hemoglobin A1)',
      'Glycated Haemoglobin (HbA1C)',
      'Glycated Haemoglobin',
      'HbA1C',
      'HbA1c',
      'HEMOGLOBIN A1c',
      'HBA1C',
    ],
    unitHints: ['%'],
    referenceRange: { low: 4.0, high: 5.6 },
    explanation: {
      high: 'Your HbA1c reflects your average blood sugar over approximately 3 months and is above the usual range. Dietary adjustments, physical exercise, and doctor review are recommended.',
      low: 'Your HbA1c is below the standard range. Discuss this with your doctor if you experience symptoms like dizziness or hypoglycemia.',
      normal: 'Your HbA1c is within the healthy range, indicating well-regulated medium-term blood sugar levels.',
    },
    questions: {
      high: ["Does this HbA1c result indicate prediabetes or diabetes risk?", 'Should I repeat this test, and would fasting insulin or glucose tolerance be useful?'],
      low: ['Why might my HbA1c be lower than usual?', 'Are there underlying red blood cell or metabolic factors to consider?'],
    },
    clinicalImportance: 'Gold standard for assessing 90-day glycemic control without day-to-day fluctuation bias.',
  }),

  glucose_fasting: m({
    panel: 'glycemic',
    panelName: 'Blood sugar',
    name: 'Fasting glucose',
    aliases: [
      'Glucose Fasting (FBS), Fluoride Plasma',
      'Glucose Fasting (FBS)',
      'Fasting Blood Sugar',
      'Fasting glucose',
      'FBS',
      'Plasma Glucose - Fasting',
      'Fasting Blood Glucose',
    ],
    unitHints: ['mg/dl', 'mg/dL'],
    referenceRange: { low: 70, high: 99 },
    explanation: {
      high: 'Your fasting glucose is above 99 mg/dL. Elevated fasting levels can indicate insulin resistance or impaired fasting glucose.',
      low: 'Your fasting blood glucose is below 70 mg/dL, which can cause fatigue, shakiness, or lightheadedness.',
      normal: 'Your fasting blood glucose is within the optimal fasting target range (70–99 mg/dL).',
    },
    questions: {
      high: ['What diet or lifestyle changes will best bring my fasting glucose back into target?', 'Should I test post-prandial (after meal) glucose or HbA1c?'],
      low: ['Could skipped meals or medication be triggering low glucose levels?', 'Should I keep fast-acting carbs available?'],
    },
    clinicalImportance: 'Primary metric for real-time baseline carbohydrate metabolism after overnight fast.',
  }),

  cholesterol_total: m({
    panel: 'lipid',
    panelName: 'Cholesterol & fats',
    name: 'Total cholesterol',
    aliases: [
      'Cholesterol Total',
      'Cholesterol, Total',
      'Total cholesterol',
      'TOTAL CHOLESTEROL',
      'Serum Cholesterol Total',
    ],
    unitHints: ['mg/dl', 'mg/dL'],
    referenceRange: { low: null, high: 200 },
    explanation: {
      high: 'Your total cholesterol is above 200 mg/dL. Elevated overall cholesterol can contribute to cardiovascular plaque buildup over time.',
      low: 'Your total cholesterol is very low. Extremely low levels are uncommon but occasionally linked to malnutrition or liver dysfunction.',
      normal: 'Your total cholesterol is in a healthy range below 200 mg/dL.',
    },
    questions: {
      high: ['How do my LDL and HDL fractions influence my overall cardiovascular risk score?', 'Would dietary modifications alone be sufficient?'],
      low: ['Is there any clinical concern with having total cholesterol this low?'],
    },
    clinicalImportance: 'Overall circulating sterol level, best evaluated in conjunction with LDL, HDL, and Triglycerides.',
  }),

  triglycerides: m({
    panel: 'lipid',
    panelName: 'Cholesterol & fats',
    name: 'Triglycerides',
    aliases: [
      'Triglyceride Serum',
      'Triglycerides',
      'Triglyceride',
      'TRIGLYCERIDES',
      'Serum Triglycerides',
    ],
    unitHints: ['mg/dl', 'mg/dL'],
    referenceRange: { low: null, high: 150 },
    explanation: {
      high: 'Triglycerides are blood fats derived from excess calorie intake and carbohydrates. Elevated levels increase cardiovascular strain.',
      low: 'Your triglyceride levels are very low, which is generally not a medical concern unless accompanied by malnutrition.',
      normal: 'Your triglyceride level is well below 150 mg/dL, indicating healthy lipid metabolism.',
    },
    questions: {
      high: ['Should I reduce refined carbohydrates or alcohol intake to improve this?', 'Does this elevate my risk for metabolic syndrome or fatty liver?'],
      low: ['Are there any nutritional deficiencies associated with low triglycerides?'],
    },
    clinicalImportance: 'Direct indicator of fat storage in blood and sensitivity to excess sugar/carbohydrate consumption.',
  }),

  ldl: m({
    panel: 'lipid',
    panelName: 'Cholesterol & fats',
    name: "LDL ('bad' cholesterol)",
    aliases: [
      'Cholesterol LDL Serum',
      'LDL Cholesterol (calc.)',
      'LDL Cholesterol',
      'LDL Serum',
      'LDL-C',
      'Low Density Lipoprotein Cholesterol',
    ],
    unitHints: ['mg/dl', 'mg/dL'],
    referenceRange: { low: null, high: 100 },
    explanation: {
      high: "Low-density lipoprotein (LDL) transports cholesterol to arteries. Elevated levels can promote atherosclerotic plaque formation.",
      low: 'Your LDL level is low. While lower is generally protective for blood vessels, very low levels should be interpreted with your total health context.',
      normal: 'Your LDL cholesterol is within the desirable optimal target (< 100 mg/dL).',
    },
    questions: {
      high: ['What is my personalized LDL target based on my blood pressure and family history?', 'Would an ApoB or coronary calcium scan be informative?'],
      low: ['Is my low LDL level fully safe and healthy?'],
    },
    clinicalImportance: 'Primary atherogenic particle targeted by cardiology guidelines worldwide.',
  }),

  hdl: m({
    panel: 'lipid',
    panelName: 'Cholesterol & fats',
    name: "HDL ('good' cholesterol)",
    aliases: [
      'Cholesterol HDL Serum',
      'HDL Cholesterol',
      'HDL Serum',
      'HDL-C',
      'High Density Lipoprotein Cholesterol',
    ],
    unitHints: ['mg/dl', 'mg/dL'],
    referenceRange: { low: 50, high: null },
    higherIsBetter: true,
    explanation: {
      high: 'High HDL is protective; it helps clear excess cholesterol from peripheral tissues back to the liver for excretion.',
      low: 'Your HDL is below 50 mg/dL. Low HDL reduces your body’s ability to scavenge excess cholesterol from vessel walls.',
      normal: 'Your HDL is in the protective optimal range (above 50 mg/dL).',
    },
    questions: {
      high: ['Is my high HDL providing good cardiovascular protection?'],
      low: ['What aerobic exercises or dietary healthy fats (olive oil, nuts) can help raise my HDL?', 'Are my triglycerides also contributing?'],
    },
    clinicalImportance: 'Reverse-cholesterol transport carrier; higher levels correlate with cardio-protective resilience.',
  }),

  vitamin_d: m({
    panel: 'vitamins',
    panelName: 'Vitamins',
    name: 'Vitamin D (25-OH)',
    aliases: [
      '25-OH Vitamin D (Total)',
      '25 Hydroxy Vitamin D',
      'Vitamin D Total',
      'Vitamin D',
      '25-OH VITAMIN D',
      'VITAMIN D (25-OH)',
    ],
    unitHints: ['ng/ml', 'ng/mL'],
    referenceRange: { low: 30, high: 100 },
    explanation: {
      high: 'Your Vitamin D is above 100 ng/mL. While toxicity is rare, excessive supplementation should be tapered.',
      low: 'Your Vitamin D is below 30 ng/mL (insufficient/deficient). This can impact bone density, immune defense, muscle strength, and mood.',
      normal: 'Your Vitamin D levels are optimal (30–100 ng/mL) for bone mineralization and immune health.',
    },
    questions: {
      high: ['Should I adjust my daily vitamin D3 supplement dosage?'],
      low: ['What dose of vitamin D3 (e.g. 2,000 to 5,000 IU/day) should I take, and for how many weeks?', 'Should I also take vitamin K2 or magnesium with it?'],
    },
    clinicalImportance: 'Crucial pro-hormone for calcium homeostasis, bone density, and immunological resilience.',
  }),

  vitamin_b12: m({
    panel: 'vitamins',
    panelName: 'Vitamins',
    name: 'Vitamin B12',
    aliases: [
      'Vitamin B12 (Cyanocobalamin)',
      'Vitamin B12',
      'Cyanocobalamin',
      'VITAMIN B12',
      'Serum B12',
    ],
    unitHints: ['pg/ml', 'pg/mL'],
    referenceRange: { low: 200, high: 900 },
    explanation: {
      high: 'Your Vitamin B12 is elevated. This is frequently seen after B-complex supplementation or injections and is water-soluble.',
      low: 'Your Vitamin B12 is below 200 pg/mL. Low B12 can cause fatigue, neurological tingling (pins & needles), memory fog, and anemia.',
      normal: 'Your Vitamin B12 level is healthy, supporting active nerve conduction and red blood cell maturation.',
    },
    questions: {
      high: ['Does my high B12 reflect my recent multivitamins or supplements?'],
      low: ['Would sublingual methylcobalamin or intramuscular injections be recommended?', 'Could gut absorption or diet be the root cause?'],
    },
    clinicalImportance: 'Essential co-factor for DNA synthesis, myelin sheath preservation, and neurological vitality.',
  }),

  tsh: m({
    panel: 'thyroid',
    panelName: 'Thyroid',
    name: 'TSH (Thyroid Stimulating Hormone)',
    aliases: [
      'Thyroid Stimulating Hormone (TSH)',
      'TSH Ultrasensitive',
      'TSH',
      'THYROID STIMULATING HORMONE',
      'TSH 3rd Generation',
    ],
    unitHints: ['uIU/mL', 'uiu/ml', 'mIU/L'],
    referenceRange: { low: 0.4, high: 4.0 },
    explanation: {
      high: 'Your TSH is elevated (> 4.0 uIU/mL). The pituitary gland produces extra TSH when the thyroid is sluggish (subclinical hypothyroidism). Symptoms include fatigue, weight gain, or cold sensitivity.',
      low: 'Your TSH is suppressed (< 0.4 uIU/mL), which may signal an overactive thyroid (hyperthyroidism). Symptoms include palpitations, anxiety, or heat intolerance.',
      normal: 'Your TSH is within normal limits, reflecting balanced thyroid hormonal regulation.',
    },
    questions: {
      high: ['Should we test Free T3, Free T4, and Thyroid Peroxidase Antibodies (Anti-TPO)?', 'Could this explain my fatigue or sluggish metabolism?'],
      low: ['Do I need an ultrasound or Free T4 test to evaluate potential hyperthyroidism?'],
    },
    clinicalImportance: 'Most sensitive first-line screening marker for thyroid axis dysregulation.',
  }),

  ferritin: m({
    panel: 'iron',
    panelName: 'Iron',
    name: 'Ferritin',
    aliases: [
      'Ferritin Serum',
      'Ferritin',
      'SERUM FERRITIN',
      'Ferritin, Serum',
    ],
    unitHints: ['ng/ml', 'ng/mL'],
    referenceRange: { low: 30, high: 400 },
    explanation: {
      high: 'Ferritin stores iron in cells. Elevated levels can stem from iron overload, hereditary hemochromatosis, or acute systemic inflammation.',
      low: 'Low ferritin (< 30 ng/mL) indicates depleted total body iron reserves, even if routine hemoglobin has not yet dropped.',
      normal: 'Your iron storage stores are well-balanced and adequate.',
    },
    questions: {
      high: ['Is elevated ferritin due to inflammation, liver stress, or true iron overload?', 'Should we check transferrin saturation?'],
      low: ['Should I start oral iron supplementation, and which form is gentlest on the stomach?', 'Should we investigate occult blood loss or heavy cycles?'],
    },
    clinicalImportance: 'Primary intracellular iron storage protein; earliest indicator of iron-deficiency anemia.',
  }),

  hemoglobin: m({
    panel: 'blood',
    panelName: 'Blood count',
    name: 'Hemoglobin',
    aliases: [
      'Haemoglobin (Hb)',
      'Hemoglobin (Hb)',
      'Haemoglobin',
      'Hemoglobin',
      'HB',
      'HEMOGLOBIN',
    ],
    unitHints: ['g/dl', 'g/dL'],
    referenceRange: { low: 12.0, high: 17.5 },
    explanation: {
      high: 'Elevated hemoglobin can occur with dehydration, smoking, high altitude residence, or polycythemia.',
      low: 'Low hemoglobin indicates anemia. Your blood carries less oxygen to tissues, which can cause shortness of breath, pallor, and chronic tiredness.',
      normal: 'Your hemoglobin level is healthy, ensuring robust oxygen transport throughout your body.',
    },
    questions: {
      high: ['Could mild dehydration or sleep apnea contribute to higher hemoglobin?'],
      low: ['What type of anemia does this indicate (iron, B12, or chronic)?', 'What follow-up blood work or diet adjustments are indicated?'],
    },
    clinicalImportance: 'Oxygen-carrying metalloprotein inside red erythrocytes responsible for tissue respiration.',
  }),

  creatinine: m({
    panel: 'kidney',
    panelName: 'Kidney',
    name: 'Creatinine',
    aliases: [
      'Creatinine Serum',
      'Serum Creatinine',
      'Creatinine',
      'CREATININE',
      'Creatinine, Serum',
    ],
    unitHints: ['mg/dl', 'mg/dL'],
    referenceRange: { low: 0.6, high: 1.3 },
    explanation: {
      high: 'Creatinine is a breakdown product of muscle metabolism cleared by the kidneys. Elevated levels suggest reduced renal filtration or dehydration.',
      low: 'Low creatinine is generally harmless and often reflects low muscle mass or a low-protein diet.',
      normal: 'Your creatinine is within normal limits, reflecting healthy baseline kidney filtration function.',
    },
    questions: {
      high: ['What is my calculated eGFR (estimated glomerular filtration rate)?', 'Could intense exercise or dehydration have raised this transiently?'],
      low: ['Is low creatinine related to my muscle tone or nutritional intake?'],
    },
    clinicalImportance: 'Standard metabolic indicator of renal glomerular filtration efficiency.',
  }),

  alt: m({
    panel: 'liver',
    panelName: 'Liver',
    name: 'ALT (liver enzyme)',
    aliases: [
      'ALT (SGPT)',
      'SGPT (ALT)',
      'Alanine Aminotransferase',
      'SGPT',
      'ALT',
      'Serum Glutamic Pyruvic Transaminase',
    ],
    unitHints: ['U/L'],
    referenceRange: { low: null, high: 41 },
    explanation: {
      high: 'Alanine aminotransferase (ALT) is an enzyme concentrated in liver cells. When liver cells are stressed or inflamed, ALT leaks into the bloodstream.',
      low: 'Low ALT is normal and indicates absence of acute hepatocellular stress.',
      normal: 'Your ALT level is healthy (< 41 U/L), indicating no signs of active liver cell irritation.',
    },
    questions: {
      high: ['Could medications, supplements, alcohol, or fatty liver be elevating my ALT?', 'Should we repeat liver enzymes or perform an abdominal ultrasound?'],
      low: ['Is this normal range reassuring for liver function?'],
    },
    clinicalImportance: 'Specific enzyme marker for hepatocellular integrity and acute or chronic liver inflammation.',
  }),

  albumin: m({
    panel: 'liver',
    panelName: 'Liver',
    name: 'Albumin',
    aliases: ['Albumin Serum', 'Serum Albumin', 'Albumin'],
    unitHints: ['g/dl', 'g/dL'],
    referenceRange: { low: 3.8, high: 5.4 },
    explanation: {
      high: 'Your Albumin is slightly elevated, often related to mild dehydration.',
      low: 'Your Albumin is below the usual range. Discuss nutrition and liver/kidney context with your doctor.',
      normal: 'Your Albumin level is within the healthy reference range, supporting normal blood oncotic pressure.',
    },
    questions: {
      high: ['Could mild dehydration be causing elevated albumin?'],
      low: ['Could nutritional protein intake or liver/kidney status be influencing my low albumin?'],
    },
    clinicalImportance: 'Major serum protein synthesized by liver indicating nutritional and systemic health.',
  }),

  crp: m({
    panel: 'inflammation',
    panelName: 'Inflammation',
    name: 'CRP (inflammation marker)',
    aliases: ['C-Reactive Protein (CRP)', 'C Reactive Protein', 'hs-CRP', 'hsCRP', 'CRP'],
    unitHints: ['mg/l', 'mg/L', 'mg/dl', 'mg/dL'],
    referenceRange: { low: null, high: 5.0 },
    explanation: {
      high: 'Your C-reactive protein (CRP) is elevated, signaling active systemic inflammation or tissue stress.',
      low: 'Your CRP is low, indicating no active systemic inflammatory response.',
      normal: 'Your CRP is within normal limits, reflecting minimal circulating systemic inflammation.',
    },
    questions: {
      high: ['What could be raising my CRP?', 'Do I need a repeat CRP or other tests?'],
      low: ['Is this low CRP level normal and reassuring?'],
    },
    clinicalImportance: 'Acute-phase reactant protein synthesized by liver in response to inflammatory cytokines.',
  }),

  esr: m({
    panel: 'inflammation',
    panelName: 'Inflammation',
    name: 'ESR (sedimentation rate)',
    aliases: ['Erythrocyte Sedimentation Rate (ESR)', 'Erythrocyte Sedimentation Rate', 'ESR'],
    unitHints: ['mm/hr', 'mm'],
    referenceRange: { low: null, high: 20 },
    explanation: {
      high: 'Your ESR is elevated, indicating red blood cells settle faster due to inflammatory proteins.',
      low: 'Your ESR is low, which is generally normal and non-concerning.',
      normal: 'Your ESR is in normal range, indicating no major inflammatory erythrocyte settling.',
    },
    questions: {
      high: ['Why is my ESR high?', 'Should CRP and ESR be reviewed together?'],
      low: ['Is my ESR normal?'],
    },
    clinicalImportance: 'Non-specific measurement of systemic inflammatory activity and plasma protein changes.',
  }),

  zinc: m({
    panel: 'minerals',
    panelName: 'Minerals',
    name: 'Zinc',
    aliases: ['Zinc Serum', 'Serum Zinc', 'Zinc'],
    unitHints: ['ug/dl', 'ug/dL', 'μg/dL'],
    referenceRange: { low: 70, high: 120 },
    explanation: {
      high: 'Your zinc level is above typical reference range, likely due to heavy supplementation.',
      low: 'Your zinc level is below the optimal threshold. Zinc is vital for immunity, cellular repair, and wound healing.',
      normal: 'Your zinc level is well-balanced within the healthy range.',
    },
    questions: {
      high: ['Should I reduce dietary zinc supplements?'],
      low: ['Would dietary changes or a zinc supplement help improve my immunity and levels?'],
    },
    clinicalImportance: 'Essential trace mineral essential for hundreds of metabolic enzymes and immune competence.',
  }),
};
