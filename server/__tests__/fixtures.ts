/** Builds a minimal, valid single-page PDF with one line of Helvetica text per entry. */
export function makePdf(lines: string[]): Buffer {
  const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const content = ['BT', '/F1 10 Tf', '12 TL', '40 800 Td', ...lines.map((l) => `(${escape(l)}) Tj T*`), 'ET'].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

export function labReportLines({ hba1c = '6.1', vitaminD = '18.2', name = 'JOHN DOE', date = '28/09/2026 10:15 AM' } = {}) {
  return [
    'Gulf Diagnostics Lab',
    'Department of Clinical Biochemistry - Laboratory Investigation Report',
    `Name : ${name}     Lab ID : GD-99812`,
    'Age : 42 years     Sex : Male',
    `Reporting Date : ${date}`,
    'Specimen : Whole blood / Serum      Result      Unit      Reference Range',
    `HbA1c ${hba1c} % 4.0 - 5.6`,
    'Glucose Fasting (FBS) 92 mg/dL 70 - 99',
    'Cholesterol Total 185 mg/dL < 200',
    'HDL Cholesterol 42 mg/dL > 50',
    `25-OH Vitamin D (Total) ${vitaminD} ng/mL 30 - 100`,
    'Thyroid Stimulating Hormone (TSH) 2.1 uIU/mL 0.4 - 4.0',
    'Creatinine Serum 0.9 mg/dL 0.6 - 1.3',
    'Results relate only to the sample tested. Please correlate clinically.',
  ];
}

export const NON_LAB_TEXT = [
  'RENTAL AGREEMENT',
  'This rental agreement between the landlord and the tenant is made on the first day of the month.',
  'The tenant agrees to pay the monthly rent of 500 on time and to keep the apartment clean.',
].join('\n');
