import { describe, expect, it } from 'vitest';
import { createUTCDate, getMYTCurrentDateTime } from '@/lib/timezone';

describe('createUTCDate', () => {
  it('creates UTC midnights', () => {
    expect(createUTCDate(2026, 10, 16).toISOString()).toBe('2026-10-16T00:00:00.000Z');
    expect(createUTCDate(2026, 1, 1).toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('rolls month 13 over to January of the next year (used by the month+1 filter bound)', () => {
    expect(createUTCDate(2026, 13, 1).toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});

describe('getMYTCurrentDateTime', () => {
  it('returns a YYYY-MM-DD date and HH:MM:SS time', () => {
    const { date, time } = getMYTCurrentDateTime();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(time).toMatch(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/);
  });

  it('returns Asia/Kuching wall-clock time (UTC+8, no DST)', () => {
    const { date, time } = getMYTCurrentDateTime();
    const asUtc = new Date(`${date}T${time}Z`).getTime();
    const expectedMytAsUtc = Date.now() + 8 * 60 * 60 * 1000;
    expect(Math.abs(asUtc - expectedMytAsUtc)).toBeLessThan(60 * 1000);
  });
});
