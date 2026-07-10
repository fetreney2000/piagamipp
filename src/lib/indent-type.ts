export type IndentType = 'office_hour' | 'ipp_shift' | 'on_call';

/**
 * Determines the indent type based on date, time, and public holiday status.
 *
 * Rules:
 * - Monday to Friday:
 *     8 AM – 5 PM  → Office Hour
 *     else          → On Call
 * - Saturday, Sunday, Public Holiday:
 *     8 AM – 3 PM  → IPP Shift
 *     else          → On Call
 */
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
    // Saturday, Sunday, or Public Holiday: 8 AM – 3 PM → IPP Shift, else → On Call
    if (totalMinutes >= 8 * 60 && totalMinutes < 15 * 60) {
      return 'ipp_shift';
    }
    return 'on_call';
  }

  // Monday to Friday: 8 AM – 5 PM → Office Hour, else → On Call
  if (totalMinutes >= 8 * 60 && totalMinutes < 17 * 60) {
    return 'office_hour';
  }

  return 'on_call';
}
