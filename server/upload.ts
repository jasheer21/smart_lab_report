import multer from 'multer';
import { config } from './config';
import { AppError } from './errors';

export type FileKind = 'pdf' | 'image' | 'text';

export interface DetectedFile {
  kind: FileKind;
  mimeType: string;
}

/** Memory-only uploads: files are processed and discarded, never written to disk or cloud storage. */
export const singleUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileBytes, files: 1 },
}).single('file');

export const batchUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileBytes, files: config.maxBatchFiles },
}).array('files', config.maxBatchFiles);

const startsWith = (buf: Buffer, bytes: number[], offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);

/**
 * Identifies the file from its bytes; the client-supplied mimetype and extension are not trusted
 * except to allow plain-text uploads, which have no signature.
 */
export function detectFileKind(file: Express.Multer.File): DetectedFile {
  const buf = file.buffer;
  if (!buf?.length) throw new AppError('Uploaded file is empty', 400);

  // The PDF spec allows junk before the header; readers accept it within the first 1 KB.
  if (buf.subarray(0, 1024).includes('%PDF-')) return { kind: 'pdf', mimeType: 'application/pdf' };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { kind: 'image', mimeType: 'image/png' };
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { kind: 'image', mimeType: 'image/jpeg' };
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { kind: 'image', mimeType: 'image/webp' };
  }

  const declaredText = file.mimetype === 'text/plain' || file.originalname.toLowerCase().endsWith('.txt');
  if (declaredText && !buf.includes(0)) return { kind: 'text', mimeType: 'text/plain' };

  throw new AppError('Unsupported file type. Upload a PDF, a PNG/JPEG/WEBP scan, or a .txt lab report.', 415);
}
