import { Router } from 'express';
import { AppError, asyncHandler } from '../errors';
import {
  analyzeBatch,
  buildReportFromText,
  getSmartReportById,
  getSmartReportForOrder,
} from '../reports/analysis.service';
import { batchUpload } from '../upload';
import { optionalText, positiveInt } from '../validation';

export const reportsRouter = Router();

const MAX_TEXT_CHARS = 200_000;

/** GET /api/reports/smart/:orderId/:patientId — smart report with trend history from earlier orders. */
reportsRouter.get('/smart/:orderId/:patientId', (req, res) => {
  const orderId = positiveInt(req.params.orderId, 'orderId', { required: true })!;
  const patientId = positiveInt(req.params.patientId, 'patientId', { required: true })!;
  res.json({ success: true, data: getSmartReportForOrder(orderId, patientId) });
});

/** POST /api/reports/parse-text  { text, patientName?, orderNumber? } — build a report from already-extracted text. */
reportsRouter.post('/parse-text', (req, res) => {
  const text = req.body?.text;
  if (typeof text !== 'string' || !text.trim()) throw new AppError('text is required', 400);
  if (text.length > MAX_TEXT_CHARS) throw new AppError(`text must be at most ${MAX_TEXT_CHARS} characters`, 413);

  const report = buildReportFromText(text, {
    patientName: optionalText(req.body.patientName, 'patientName'),
    orderNumber: optionalText(req.body.orderNumber, 'orderNumber', 60),
  });
  res.json({ success: true, data: report });
});

/** POST /api/reports/insights  (multipart, field "files" repeated) — multi-report longitudinal insights. */
reportsRouter.post(
  '/insights',
  batchUpload,
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) || [];
    if (!files.length) throw new AppError('At least one file is required (form field "files")', 400);

    const data = await analyzeBatch(files, {
      patientName: optionalText(req.body.patientName, 'patientName'),
    });
    if (!data.entries.length) {
      throw new AppError(data.errors.map((e) => `${e.fileName}: ${e.message}`).join(' | '), 422);
    }
    res.json({ success: true, data });
  }),
);

/** GET /api/reports/:reportId — re-fetch a report returned by an earlier upload. */
reportsRouter.get('/:reportId', (req, res) => {
  const { reportId } = req.params;
  if (!/^r_[a-f0-9]{12}$/.test(reportId)) throw new AppError('Invalid report id', 400);
  res.json({ success: true, data: getSmartReportById(reportId) });
});
