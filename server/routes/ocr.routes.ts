import { Router } from 'express';
import { AppError, asyncHandler } from '../errors';
import { extractText } from '../ocr/ocr.service';
import { detectFileKind, singleUpload } from '../upload';

export const ocrRouter = Router();

/**
 * POST /api/ocr/extract  (multipart, field "file")
 * Returns the normalized text of a PDF / image / .txt without parsing it, e.g. for the scanner playground.
 */
ocrRouter.post(
  '/extract',
  singleUpload,
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('A file is required (form field "file")', 400);
    const result = await extractText(req.file.buffer, detectFileKind(req.file));
    res.json({ success: true, data: { ...result, chars: result.text.length } });
  }),
);
