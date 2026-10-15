const KST_OFFSET = 9 * 60 * 60 * 1000;
function kstParts(value: string | null | undefined) {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  const iso = new Date(time + KST_OFFSET).toISOString();
  return {
    date: iso.slice(0, 10).replaceAll('-', '.'),
    time: iso.slice(11, 19),
  };
}
// Server timestamps are UTC; the console always shows KST.
export function kstDateTimeLabel(value: string | null | undefined) {
  const parts = kstParts(value);
  return parts ? `${parts.date} ${parts.time}` : '';
}
export function kstTimeLabel(value: string | null | undefined) {
  return kstParts(value)?.time.slice(0, 5) ?? '';
}
export function isFuture(value: string | null | undefined, now = Date.now()) {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) && time > now;
}
// Minute precision for schedules ("2026.10.20 09:00").
export function kstMinuteLabel(value: string | null | undefined) {
  const parts = kstParts(value);
  return parts ? `${parts.date} ${parts.time.slice(0, 5)}` : '';
}
