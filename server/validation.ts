import { AppError } from './errors';

export function positiveInt(value: unknown, field: string, { required = false } = {}): number | null {
  if (value == null || value === '') {
    if (required) throw new AppError(`${field} is required`, 400);
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(`${field} must be a positive integer`, 400);
  return n;
}

export function optionalText(value: unknown, field: string, maxLength = 120): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new AppError(`${field} must be a string`, 400);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new AppError(`${field} must be at most ${maxLength} characters`, 400);
  return trimmed || null;
}
