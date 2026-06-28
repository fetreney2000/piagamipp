export function getMYTCurrentDateTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuching',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const formatted = formatter.format(now);
  const [datePart, timePart] = formatted.split(', ');
  return { date: datePart, time: timePart };
}
