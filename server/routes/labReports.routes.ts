import { Router } from 'express';
import { AppError, asyncHandler } from '../errors';
import { createLabReport, type ReportContext } from '../reports/analysis.service';
import { singleUpload } from '../upload';
import { optionalText, positiveInt } from '../validation';

export const labReportsRouter = Router();

/**
 * POST /api/lab-reports  (multipart/form-data)
 *   file         PDF, PNG/JPEG/WEBP scan, or .txt lab report (required)
 *   orderId      positive integer (optional; with patientId enables GET /smart and trend history)
 *   patientId    positive integer (optional)
 *   patientName  fallback when the document has no name (optional)
 *   orderNumber  fallback when the document has no order number (optional)
 *
 * The file is processed in memory and discarded; only the parsed result is kept, in memory, for a limited time.
 */
labReportsRouter.post(
  '/',
  singleUpload,
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('A lab report file is required (form field "file")', 400);

    const ctx: ReportContext = {
      orderId: positiveInt(req.body.orderId, 'orderId'),
      patientId: positiveInt(req.body.patientId, 'patientId'),
      patientName: optionalText(req.body.patientName, 'patientName'),
      orderNumber: optionalText(req.body.orderNumber, 'orderNumber', 60),
    };
    if ((ctx.orderId == null) !== (ctx.patientId == null)) {
      throw new AppError('orderId and patientId must be provided together', 400);
    }

    const data = await createLabReport(req.file, ctx);
    res.status(201).json({ success: true, data });
  }),
);
