import { describe, expect, it } from 'vitest';
import { calculateMinutes } from '@/lib/total-time';

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe('calculateMinutes', () => {
  it('computes same-day handling time', () => {
    expect(calculateMinutes(utc(2026, 10, 16), '10:00', utc(2026, 10, 16), '12:34')).toBe(154);
  });

  it('computes cross-midnight handling time', () => {
    expect(calculateMinutes(utc(2026, 10, 15), '23:00', utc(2026, 10, 16), '01:10')).toBe(130);
  });

  it('computes exactly 120 minutes at the policy boundary', () => {
    expect(calculateMinutes(utc(2026, 10, 16), '09:00', utc(2026, 10, 16), '11:00')).toBe(120);
  });

  it('clamps impossible completion-before-receipt to 0', () => {
    expect(calculateMinutes(utc(2026, 10, 16), '13:00', utc(2026, 10, 16), '11:00')).toBe(0);
    expect(calculateMinutes(utc(2026, 10, 16), '09:00', utc(2026, 10, 15), '17:00')).toBe(0);
  });

  it('returns 0 for identical timestamps', () => {
    expect(calculateMinutes(utc(2026, 10, 16), '09:30', utc(2026, 10, 16), '09:30')).toBe(0);
  });
});
