import type { IndentType } from './indent-type';

const INDENT_TYPES: readonly string[] = ['office_hour', 'ipp_shift', 'on_call'];
const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export function isIndentType(value: unknown): value is IndentType {
  return typeof value === 'string' && INDENT_TYPES.includes(value);
}

/** Parses an ISO/date string into a valid Date, or null if unusable. */
export function parseValidDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Validates a zero-padded 24-hour "HH:mm" string and returns it trimmed, or null. */
export function parseValidTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const time = value.trim();
  return TIME_PATTERN.test(time) ? time : null;
}

/** Parses a positive integer (accepts number or numeric string), or null. */
export function parsePositiveInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return Number.isInteger(n) && n >= 1 && n <= 100000 ? n : null;
}

/** Trims a string value (anything non-string becomes an empty string). */
export function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Validates ?month=&year= query params, or null if missing/invalid. */
export function parseMonthYear(
  month: string | null,
  year: string | null
): { month: number; year: number } | null {
  if (!month || !year) return null;
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  if (!Number.isInteger(y) || y < 2000 || y > 2100) return null;
  return { month: m, year: y };
}
