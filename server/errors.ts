import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import multer from 'multer';

export class AppError extends Error {
  constructor(message: string, public readonly statusCode = 500) {
    super(message);
    this.name = 'AppError';
  }
}

/** Forwards rejected promises from async handlers to the error middleware (Express 4 doesn't). */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

const MULTER_MESSAGES: Partial<Record<multer.ErrorCode, [number, string]>> = {
  LIMIT_FILE_SIZE: [413, 'File is too large'],
  LIMIT_FILE_COUNT: [400, 'Too many files in one request'],
  LIMIT_UNEXPECTED_FILE: [400, 'Unexpected file field'],
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let status = 500;
  let message = 'Internal server error';

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
  } else if (err instanceof multer.MulterError) {
    [status, message] = MULTER_MESSAGES[err.code] || [400, err.message];
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large';
  }

  if (status >= 500) console.error('[smart-report-api]', err);
  res.status(status).json({ success: false, message });
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
};
