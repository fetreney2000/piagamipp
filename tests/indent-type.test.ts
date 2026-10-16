import { describe, expect, it } from 'vitest';
import { determineIndentType } from '@/lib/indent-type';

// 2026-10-16 is a Friday, 2026-10-17 a Saturday, 2026-10-18 a Sunday.
describe('determineIndentType', () => {
  it('classifies office hours on weekdays', () => {
    expect(determineIndentType('2026-10-16', '08:00', false)).toBe('office_hour');
    expect(determineIndentType('2026-10-16', '12:00', false)).toBe('office_hour');
    expect(determineIndentType('2026-10-16', '16:59', false)).toBe('office_hour');
  });

  it('classifies out-of-office weekday times as on-call', () => {
    expect(determineIndentType('2026-10-16', '07:59', false)).toBe('on_call');
    expect(determineIndentType('2026-10-16', '17:00', false)).toBe('on_call');
    expect(determineIndentType('2026-10-16', '23:30', false)).toBe('on_call');
  });

  it('classifies weekend daytimes as IPP shift', () => {
    expect(determineIndentType('2026-10-17', '08:00', false)).toBe('ipp_shift'); // Saturday
    expect(determineIndentType('2026-10-18', '14:59', false)).toBe('ipp_shift'); // Sunday
  });

  it('classifies weekend out-of-shift times as on-call', () => {
    expect(determineIndentType('2026-10-17', '07:59', false)).toBe('on_call');
    expect(determineIndentType('2026-10-17', '15:00', false)).toBe('on_call');
    expect(determineIndentType('2026-10-18', '20:00', false)).toBe('on_call');
  });

  it('applies weekend rules to weekdays that are public holidays', () => {
    expect(determineIndentType('2026-10-16', '09:00', true)).toBe('ipp_shift'); // Friday + holiday
    expect(determineIndentType('2026-10-16', '15:00', true)).toBe('on_call');
  });

  it('treats the 8 AM boundary consistently', () => {
    expect(determineIndentType('2026-10-16', '07:59', false)).toBe('on_call');
    expect(determineIndentType('2026-10-16', '08:00', false)).toBe('office_hour');
    expect(determineIndentType('2026-10-17', '08:00', false)).toBe('ipp_shift');
  });
});
