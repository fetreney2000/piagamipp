export type IndentType = 'office_hour' | 'ipp_shift' | 'on_call';

export function determineIndentType(
  dateStr: string,
  timeStr: string,
  isPublicHoliday: boolean
): IndentType {
  const date = new Date(dateStr + 'T00:00:00+08:00');
  const dayOfWeek = date.getDay();
  const [hours, minutes] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isPublicHoliday || isWeekend) {
    if (totalMinutes >= 8 * 60 && totalMinutes < 22 * 60) {
      return 'ipp_shift';
    }
    return 'on_call';
  }

  if (totalMinutes >= 8 * 60 && totalMinutes < 17 * 60) {
    return 'office_hour';
  }

  if (totalMinutes >= 17 * 60 && totalMinutes < 22 * 60) {
    return 'ipp_shift';
  }

  return 'on_call';
}
