import { describe, expect, it } from 'vitest';
import {
  cleanText,
  isIndentType,
  parseMonthYear,
  parsePositiveInt,
  parseValidDate,
  parseValidTime,
} from '@/lib/validation';

describe('isIndentType', () => {
  it('accepts the three known types', () => {
    expect(isIndentType('office_hour')).toBe(true);
    expect(isIndentType('ipp_shift')).toBe(true);
    expect(isIndentType('on_call')).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isIndentType('')).toBe(false);
    expect(isIndentType('holiday')).toBe(false);
    expect(isIndentType(null)).toBe(false);
    expect(isIndentType(undefined)).toBe(false);
    expect(isIndentType(42)).toBe(false);
  });
});

describe('parseValidDate', () => {
  it('parses ISO strings into valid dates', () => {
    const d = parseValidDate('2026-10-16T00:00:00.000Z');
    expect(d).toBeInstanceOf(Date);
    expect(d?.toISOString()).toBe('2026-10-16T00:00:00.000Z');
  });

  it('rejects garbage', () => {
    expect(parseValidDate('garbage')).toBeNull();
    expect(parseValidDate('')).toBeNull();
    expect(parseValidDate(null)).toBeNull();
    expect(parseValidDate(undefined)).toBeNull();
    expect(parseValidDate(12345)).toBeNull();
  });
});

describe('parseValidTime', () => {
  it('accepts zero-padded 24-hour times', () => {
    expect(parseValidTime('00:00')).toBe('00:00');
    expect(parseValidTime('09:05')).toBe('09:05');
    expect(parseValidTime('23:59')).toBe('23:59');
    expect(parseValidTime(' 12:30 ')).toBe('12:30');
  });

  it('rejects malformed times', () => {
    expect(parseValidTime('24:00')).toBeNull();
    expect(parseValidTime('9:05')).toBeNull();
    expect(parseValidTime('12:60')).toBeNull();
    expect(parseValidTime('12:30 PM')).toBeNull();
    expect(parseValidTime('')).toBeNull();
    expect(parseValidTime(null)).toBeNull();
  });
});

describe('parsePositiveInt', () => {
  it('accepts positive integers as numbers or strings', () => {
    expect(parsePositiveInt(1)).toBe(1);
    expect(parsePositiveInt(42)).toBe(42);
    expect(parsePositiveInt('7')).toBe(7);
  });

  it('rejects zero, negatives, NaN and non-integers', () => {
    expect(parsePositiveInt(0)).toBeNull();
    expect(parsePositiveInt(-3)).toBeNull();
    expect(parsePositiveInt('abc')).toBeNull();
    expect(parsePositiveInt(1.5)).toBeNull();
    expect(parsePositiveInt(null)).toBeNull();
  });
});

describe('cleanText', () => {
  it('trims strings and normalizes non-strings to empty', () => {
    expect(cleanText('  Ward A  ')).toBe('Ward A');
    expect(cleanText('Ward A')).toBe('Ward A');
    expect(cleanText('   ')).toBe('');
    expect(cleanText(null)).toBe('');
    expect(cleanText(undefined)).toBe('');
    expect(cleanText(42)).toBe('');
  });
});

describe('parseMonthYear', () => {
  it('accepts valid month/year pairs', () => {
    expect(parseMonthYear('10', '2026')).toEqual({ month: 10, year: 2026 });
    expect(parseMonthYear('1', '2000')).toEqual({ month: 1, year: 2000 });
    expect(parseMonthYear('12', '2100')).toEqual({ month: 12, year: 2100 });
  });

  it('rejects out-of-range and malformed values', () => {
    expect(parseMonthYear('13', '2026')).toBeNull();
    expect(parseMonthYear('0', '2026')).toBeNull();
    expect(parseMonthYear('abc', '2026')).toBeNull();
    expect(parseMonthYear('10', '1999')).toBeNull();
    expect(parseMonthYear('10', '2101')).toBeNull();
    expect(parseMonthYear(null, '2026')).toBeNull();
    expect(parseMonthYear('10', null)).toBeNull();
    expect(parseMonthYear('', '')).toBeNull();
  });
});
