/** ISO 8601 week in year, using the selected period's date in Vietnam. */
export function weeklyLabel(start: Date | string, offsetWeeks = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(start));
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  const day = new Date(Date.UTC(part('year'), part('month') - 1, part('day') + offsetWeeks * 7));
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const year = day.getUTCFullYear();
  const week = Math.ceil(((day.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return { week, year, title: `Tuần ${week} năm ${year}` };
}
