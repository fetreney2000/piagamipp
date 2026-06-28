import Holidays from 'date-holidays';

const hd = new Holidays('MY', 'Sabah');

const SABAH_SUPPLEMENTAL: Array<{ month: number; day: number }> = [
  { month: 5, day: 30 },
  { month: 5, day: 31 },
];

let cache: Map<string, boolean> = new Map();

export async function isSabahPublicHoliday(dateStr: string): Promise<boolean> {
  const cached = cache.get(dateStr);
  if (cached !== undefined) return cached;

  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);

  // Tier 1: date-holidays node module
  try {
    const result = hd.isHoliday(date);
    if (result !== false) {
      cache.set(dateStr, true);
      return true;
    }
    for (const h of SABAH_SUPPLEMENTAL) {
      if (h.month === m && h.day === d) {
        cache.set(dateStr, true);
        return true;
      }
    }
    cache.set(dateStr, false);
    return false;
  } catch {
    // Tier 2: Nager.Date API — does not include Malaysia, skip
  }

  // Tier 3: Calendarific API
  const apiKey = process.env.CALENDARIFIC_API_KEY;
  if (apiKey) {
    try {
      const url = `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=MY&year=${y}`;
      const res = await fetch(url);
      const data = await res.json() as { response?: { holidays?: Array<{ date: { iso: string }; states?: string; type?: string[] }> } };
      const holidays = data?.response?.holidays;
      if (holidays) {
        for (const h of holidays) {
          if (h.date.iso === dateStr) {
            cache.set(dateStr, true);
            return true;
          }
        }
      }
    } catch {
      // All tiers exhausted
    }
  }

  cache.set(dateStr, false);
  return false;
}
