import { PatientRecord } from '../modules/smart-report/smartReport.types';
import { HistoryOrderData } from '../modules/smart-report/smartReport.builder';

export interface SampleReportCase {
  patient: PatientRecord;
  currentOrderId: number;
  rawReportText: string;
  historyOrders: HistoryOrderData[];
  description: string;
}

export const SAMPLE_CASES: Record<string, SampleReportCase> = {
  tasheel_pranav: {
    patient: {
      id: 57,
      name: 'Pranav',
      age: 26,
      gender: 'Male',
      dob: '2000-02-14',
      primaryPatientId: 57,
      orders: [
        {
          id: 89210,
          orderNumber: 'ORD-89210',
          orderDate: '2026-06-03',
          scheduledDate: '2026-06-03',
          status: 'completed',
          labName: 'TASHEEL Medical Lab',
          uploadedPdfName: 'tasheel_tsh0057_pranav.pdf',
        },
      ],
    },
    currentOrderId: 89210,
    description: 'Tasheel Comprehensive Diagnostic Health Screen (Pranav, ID: TSH-0057)',
    rawReportText: `
TASHEEL Medical Laboratory & Diagnostic Center
Patient ID: TSH-0057
Name : Pranav
Sex : Male
Age : 26 years
CPR Number : 864486445
Contact : +973 89779878
Blood Type : --
Email : --
Reporting Date : 03/06/2026, 08:44 AM
Collection Date : 03/06/2026, 07:15 AM
Requisition # : ORD-89210

============================================================
TEST DESCRIPTION                 RESULT    UNIT       REFERENCE
============================================================
BIOCHEMISTRY / BLOOD SUGAR
HbA1c (Glycosylated hemoglobin A1) 5.03     %          4 - 5.6
Fasting glucose                  97.8      mg/dL      70 - 99

HEPATIC / LIVER FUNCTION
Albumin Serum                    3.74      g/dL       3.8 - 5.4
ALT (SGPT)                       28        U/L        < 41

LIPID PROFILE
Cholesterol Total                188       mg/dL      < 200
Triglyceride Serum               134       mg/dL      < 150
Cholesterol LDL Serum            92        mg/dL      < 100
Cholesterol HDL Serum            52        mg/dL      > 50

MICRONUTRIENTS & MINERALS
25-OH Vitamin D (Total)          18.4      ng/mL      30 - 100
Vitamin B12 (Cyanocobalamin)     340       pg/mL      200 - 900
Zinc Serum                       62        ug/dL      70 - 120

INFLAMMATION MARKERS
C-Reactive Protein (CRP)         8.2       mg/L       < 5.0
Erythrocyte Sedimentation Rate   28        mm/hr      < 20

THYROID, IRON & HEMATOLOGY
Thyroid Stimulating Hormone (TSH) 2.10     uIU/mL     0.4 - 4.0
Ferritin Serum                   115       ng/mL      30 - 400
Haemoglobin (Hb)                 14.8      g/dL       12.0 - 17.5
Creatinine Serum                 0.95      mg/dL      0.6 - 1.3
============================================================
Validated By: Tasheel Clinical Pathologist
Report Status: Released & Verified
`,
    historyOrders: [
      {
        orderId: 78400,
        reportingDate: '2025-11-12',
        markers: [
          { markerId: 'hba1c', value: 5.15, unit: '%', status: 'normal' },
          { markerId: 'albumin', value: 3.90, unit: 'g/dl', status: 'normal' },
          { markerId: 'vitamin_d', value: 16.0, unit: 'ng/ml', status: 'low' },
          { markerId: 'crp', value: 6.5, unit: 'mg/l', status: 'high' },
        ],
      },
    ],
  },
  gulf_metabolic: {
    patient: {
      id: 101,
      name: 'JOHN DOE',
      age: 46,
      gender: 'Male',
      dob: '1980-04-12',
      primaryPatientId: 101,
      orders: [
        {
          id: 10231,
          orderNumber: 'ORD-10231',
          orderDate: '2026-09-28',
          scheduledDate: '2026-09-28',
          status: 'completed',
          labName: 'Gulf Diagnostics Lab',
          uploadedPdfName: 'gulf_diag_10231_johndoe.pdf',
        },
        {
          id: 9540,
          orderNumber: 'ORD-09540',
          orderDate: '2026-03-15',
          scheduledDate: '2026-03-15',
          status: 'completed',
          labName: 'Gulf Diagnostics Lab',
        },
        {
          id: 8812,
          orderNumber: 'ORD-08812',
          orderDate: '2025-09-10',
          scheduledDate: '2025-09-10',
          status: 'completed',
          labName: 'Gulf Diagnostics Lab',
        },
      ],
    },
    currentOrderId: 10231,
    description: 'Comprehensive Metabolic & Lipid Panel with Prediabetes & Vitamin D deficiency',
    rawReportText: `
Gulf Diagnostics Lab
Accredited Clinical Pathology & Diagnostic Center
Name : JOHN DOE     Lab ID : GD-99812
Age / Gender : 46 Y / Male     Order No : ORD-10231
Reporting Date : 28/09/2026 10:15 AM
Collection Date : 28/09/2026 07:30 AM
Sample Type : Serum, Fluoride Plasma, Whole Blood (EDTA)

============================================================
TEST DESCRIPTION                 RESULT    UNIT       REFERENCE
============================================================
BIOCHEMISTRY / METABOLIC
Glucose Fasting (FBS)            104       mg/dL      70 - 99
HbA1c (Glycosylated hemoglobin A1) 6.1      %          4.0 - 5.6
Creatinine Serum                 1.05      mg/dL      0.6 - 1.3
ALT (SGPT)                       34        U/L        < 41

LIPID PROFILE
Cholesterol Total                215       mg/dL      < 200
Triglyceride Serum               178       mg/dL      < 150
Cholesterol LDL Serum            138       mg/dL      < 100
Cholesterol HDL Serum            42        mg/dL      > 50

MICRONUTRIENTS & VITAMINS
25-OH Vitamin D (Total)          18.2      ng/mL      30 - 100
Vitamin B12 (Cyanocobalamin)     380       pg/mL      200 - 900

THYROID & HEMATOLOGY
Thyroid Stimulating Hormone (TSH) 2.15     uIU/mL     0.4 - 4.0
Ferritin Serum                   145       ng/mL      30 - 400
Haemoglobin (Hb)                 14.8      g/dL       12.0 - 17.5
============================================================
Validated By: Dr. Tariq Al-Mansoor, MD (Consultant Pathologist)
Status: Released / Verified
`,
    historyOrders: [
      {
        orderId: 9540,
        reportingDate: '2026-03-15',
        markers: [
          { markerId: 'hba1c', value: 6.4, unit: '%', status: 'high' },
          { markerId: 'glucose_fasting', value: 112, unit: 'mg/dl', status: 'high' },
          { markerId: 'cholesterol_total', value: 228, unit: 'mg/dl', status: 'high' },
          { markerId: 'triglycerides', value: 195, unit: 'mg/dl', status: 'high' },
          { markerId: 'ldl', value: 149, unit: 'mg/dl', status: 'high' },
          { markerId: 'hdl', value: 40, unit: 'mg/dl', status: 'low' },
          { markerId: 'vitamin_d', value: 14.1, unit: 'ng/ml', status: 'low' },
          { markerId: 'tsh', value: 2.2, unit: 'uiu/ml', status: 'normal' },
          { markerId: 'hemoglobin', value: 14.6, unit: 'g/dl', status: 'normal' },
        ],
      },
      {
        orderId: 8812,
        reportingDate: '2025-09-10',
        markers: [
          { markerId: 'hba1c', value: 6.8, unit: '%', status: 'high' },
          { markerId: 'glucose_fasting', value: 121, unit: 'mg/dl', status: 'high' },
          { markerId: 'cholesterol_total', value: 242, unit: 'mg/dl', status: 'high' },
          { markerId: 'triglycerides', value: 210, unit: 'mg/dl', status: 'high' },
          { markerId: 'ldl', value: 160, unit: 'mg/dl', status: 'high' },
          { markerId: 'hdl', value: 39, unit: 'mg/dl', status: 'low' },
          { markerId: 'vitamin_d', value: 11.5, unit: 'ng/ml', status: 'low' },
          { markerId: 'tsh', value: 2.05, unit: 'uiu/ml', status: 'normal' },
          { markerId: 'hemoglobin', value: 14.4, unit: 'g/dl', status: 'normal' },
        ],
      },
    ],
  },

  quest_thyroid_anemia: {
    patient: {
      id: 204,
      name: 'SARAH JENKINS',
      age: 38,
      gender: 'Female',
      dob: '1988-11-20',
      primaryPatientId: 101, // family member linked to John Doe's account
      relationship: 'Spouse',
      orders: [
        {
          id: 10245,
          orderNumber: 'ORD-10245',
          orderDate: '2026-09-24',
          scheduledDate: '2026-09-24',
          status: 'completed',
          labName: 'Quest Diagnostics',
          uploadedPdfName: 'quest_10245_sarah_jenkins.pdf',
        },
        {
          id: 9110,
          orderNumber: 'ORD-09110',
          orderDate: '2026-02-18',
          scheduledDate: '2026-02-18',
          status: 'completed',
          labName: 'Quest Diagnostics',
        },
        {
          id: 8200,
          orderNumber: 'ORD-08200',
          orderDate: '2025-07-04',
          scheduledDate: '2025-07-04',
          status: 'completed',
          labName: 'Quest Diagnostics',
        },
      ],
    },
    currentOrderId: 10245,
    description: 'Elevated TSH (Hypothyroidism) with Depleted Ferritin & Borderline Anemia',
    rawReportText: `
Quest Diagnostics
Clinical Reference Laboratories
Patient Name : SARAH JENKINS     Lab ID : QD-481920
DOB: 11/20/1988     Gender: F    Requisition #: ORD-10245
Reporting Date : 24/09/2026 09:40 AM
Collection Date : 23/09/2026 08:15 AM

TEST NAME                           RESULT   UNITS      REFERENCE INTERVAL
---------------------------------------------------------------------------
Thyroid Stimulating Hormone (TSH)   5.40     uIU/mL     0.40 - 4.00
Ferritin Serum                      18.0     ng/mL      30 - 400
Haemoglobin (Hb)                    11.4     g/dL       12.0 - 17.5
Vitamin B12 (Cyanocobalamin)        210      pg/mL      200 - 900
25-OH Vitamin D (Total)             26.5     ng/mL      30 - 100

Fasting Blood Sugar                 86       mg/dL      70 - 99
HbA1C                               5.1      %          4.0 - 5.6
Cholesterol Total                   192      mg/dL      < 200
Cholesterol HDL Serum               56       mg/dL      > 50
Cholesterol LDL Serum               98       mg/dL      < 100
Triglycerides                       110      mg/dL      < 150
Creatinine Serum                    0.75     mg/dL      0.60 - 1.30
ALT (SGPT)                          18       U/L        < 41
---------------------------------------------------------------------------
Report Comments: Elevated TSH consistent with subclinical hypothyroidism.
Low ferritin suggests iron store exhaustion. Correlate with clinical symptoms.
Medical Director: Dr. Eleanor Vance, MD, FCAP
`,
    historyOrders: [
      {
        orderId: 9110,
        reportingDate: '2026-02-18',
        markers: [
          { markerId: 'tsh', value: 4.85, unit: 'uiu/ml', status: 'high' },
          { markerId: 'ferritin', value: 22, unit: 'ng/ml', status: 'low' },
          { markerId: 'hemoglobin', value: 11.8, unit: 'g/dl', status: 'low' },
          { markerId: 'vitamin_d', value: 22.0, unit: 'ng/ml', status: 'low' },
          { markerId: 'vitamin_b12', value: 230, unit: 'pg/ml', status: 'normal' },
        ],
      },
      {
        orderId: 8200,
        reportingDate: '2025-07-04',
        markers: [
          { markerId: 'tsh', value: 3.9, unit: 'uiu/ml', status: 'normal' },
          { markerId: 'ferritin', value: 28, unit: 'ng/ml', status: 'low' },
          { markerId: 'hemoglobin', value: 12.2, unit: 'g/dl', status: 'normal' },
          { markerId: 'vitamin_d', value: 19.5, unit: 'ng/ml', status: 'low' },
          { markerId: 'vitamin_b12', value: 245, unit: 'pg/ml', status: 'normal' },
        ],
      },
    ],
  },

  metropolis_optimal: {
    patient: {
      id: 305,
      name: 'MICHAEL CHEN',
      age: 32,
      gender: 'Male',
      dob: '1994-06-18',
      primaryPatientId: 305,
      orders: [
        {
          id: 10190,
          orderNumber: 'ORD-10190',
          orderDate: '2026-09-18',
          scheduledDate: '2026-09-18',
          status: 'completed',
          labName: 'Metropolis Healthcare',
          uploadedPdfName: 'metropolis_10190_mchen.pdf',
        },
        {
          id: 8900,
          orderNumber: 'ORD-08900',
          orderDate: '2025-10-12',
          scheduledDate: '2025-10-12',
          status: 'completed',
          labName: 'Metropolis Healthcare',
        },
      ],
    },
    currentOrderId: 10190,
    description: 'Executive Preventive Health Screen — All Biomarkers in Optimal Calibration',
    rawReportText: `
Metropolis Healthcare
Department of Molecular & Clinical Pathology
Patient Name : MICHAEL CHEN     Lab ID : MH-88102
Age: 32 Y / Male    Order #: ORD-10190
Reporting Date : 18/09/2026 04:20 PM
Collection Date : 18/09/2026 08:00 AM

TEST RESULTS SUMMARY:
=============================================================
Glycated Haemoglobin (HbA1C)     5.1      %         4.0 - 5.6
Glucose Fasting (FBS)            84       mg/dL     70 - 99
Total cholesterol                162      mg/dL     < 200
Triglycerides                    88       mg/dL     < 150
LDL Cholesterol                  82       mg/dL     < 100
HDL Cholesterol                  62       mg/dL     > 50
25 Hydroxy Vitamin D             48.5     ng/mL     30 - 100
Vitamin B12                      520      pg/mL     200 - 900
Thyroid Stimulating Hormone      1.85     uIU/mL    0.4 - 4.0
Ferritin                         120      ng/mL     30 - 400
Hemoglobin                       15.4     g/dL      12.0 - 17.5
Serum Creatinine                 0.92     mg/dL     0.6 - 1.3
ALT (SGPT)                       22       U/L       < 41
=============================================================
Physician Note: Healthy physiological baseline across all surveyed metabolic, hematologic, and endocrine parameters.
`,
    historyOrders: [
      {
        orderId: 8900,
        reportingDate: '2025-10-12',
        markers: [
          { markerId: 'hba1c', value: 5.2, unit: '%', status: 'normal' },
          { markerId: 'glucose_fasting', value: 87, unit: 'mg/dl', status: 'normal' },
          { markerId: 'cholesterol_total', value: 170, unit: 'mg/dl', status: 'normal' },
          { markerId: 'vitamin_d', value: 42.0, unit: 'ng/ml', status: 'normal' },
          { markerId: 'hemoglobin', value: 15.2, unit: 'g/dl', status: 'normal' },
        ],
      },
    ],
  },

  apex_liver_alert: {
    patient: {
      id: 409,
      name: 'ELENA ROSTOVA',
      age: 52,
      gender: 'Female',
      dob: '1974-03-29',
      primaryPatientId: 409,
      orders: [
        {
          id: 10312,
          orderNumber: 'ORD-10312',
          orderDate: '2026-09-29',
          scheduledDate: '2026-09-29',
          status: 'completed',
          labName: 'Apex Clinical Diagnostics',
          uploadedPdfName: 'apex_10312_elena.pdf',
        },
        {
          id: 9400,
          orderNumber: 'ORD-09400',
          orderDate: '2026-04-10',
          scheduledDate: '2026-04-10',
          status: 'completed',
          labName: 'Apex Clinical Diagnostics',
        },
      ],
    },
    currentOrderId: 10312,
    description: 'Elevated ALT (Hepatic Irritation) with High Triglycerides and Borderline Renal Creatinine',
    rawReportText: `
Apex Clinical Diagnostics
Advanced Biochemistry & Toxicology
Name : ELENA ROSTOVA     Lab ID : APX-39104
Requisition No : ORD-10312
Reporting Date : 29/09/2026 11:45 AM
Collection Date : 29/09/2026 07:15 AM

ANALYTE                          VAL      UNIT      BIOLOGICAL REF
-------------------------------------------------------------------
ALT (SGPT)                       68       U/L       < 41
Creatinine Serum                 1.38     mg/dL     0.6 - 1.3
Triglyceride Serum               235      mg/dL     < 150
Cholesterol Total                218      mg/dL     < 200
Cholesterol LDL Serum            128      mg/dL     < 100
Cholesterol HDL Serum            43       mg/dL     > 50
Glucose Fasting (FBS)            102      mg/dL     70 - 99
HbA1C                            5.8      %         4.0 - 5.6
Thyroid Stimulating Hormone (TSH) 1.95    uIU/mL    0.4 - 4.0
25-OH Vitamin D (Total)          24.2     ng/mL     30 - 100
Haemoglobin (Hb)                 13.2     g/dL      12.0 - 17.5
-------------------------------------------------------------------
Alert: ALT elevated above normal clinical threshold. Repeat testing and clinical medication review advised.
`,
    historyOrders: [
      {
        orderId: 9400,
        reportingDate: '2026-04-10',
        markers: [
          { markerId: 'alt', value: 44, unit: 'u/l', status: 'high' },
          { markerId: 'triglycerides', value: 185, unit: 'mg/dl', status: 'high' },
          { markerId: 'creatinine', value: 1.15, unit: 'mg/dl', status: 'normal' },
          { markerId: 'hba1c', value: 5.6, unit: '%', status: 'normal' },
        ],
      },
    ],
  },
};
