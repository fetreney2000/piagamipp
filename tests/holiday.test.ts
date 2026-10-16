import { describe, expect, it } from 'vitest';
import { isSabahPublicHoliday } from '@/lib/holiday';

describe('isSabahPublicHoliday', () => {
  it('detects national Malaysian holidays', async () => {
    expect(await isSabahPublicHoliday('2026-05-01')).toBe(true); // Labour Day
    expect(await isSabahPublicHoliday('2026-12-25')).toBe(true); // Christmas
  });

  it('detects the hardcoded Sabah supplemental holidays (Kaamatan, 30–31 May)', async () => {
    expect(await isSabahPublicHoliday('2026-05-30')).toBe(true);
    expect(await isSabahPublicHoliday('2026-05-31')).toBe(true);
  });

  it('returns false for a regular weekday', async () => {
    expect(await isSabahPublicHoliday('2026-10-15')).toBe(false);
  });

  it('answers consistently for repeated queries (cache)', async () => {
    const first = await isSabahPublicHoliday('2026-12-25');
    const second = await isSabahPublicHoliday('2026-12-25');
    expect(second).toBe(first);
  });
});
