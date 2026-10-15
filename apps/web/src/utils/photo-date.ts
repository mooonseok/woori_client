import type { PhotoDateSource } from '../dto/memories.dto.ts';
export function photoDateLabel(date: string, source?: PhotoDateSource) {
  const label =
    source === 'UPLOAD'
      ? '업로드일 기준'
      : source === 'USER'
        ? '직접 지정한 촬영일'
        : source === 'EXIF'
          ? '사진에 기록된 촬영일'
          : '사진 날짜';
  return `${date.replaceAll('-', '.')} · ${label}`;
}
export function todayInSeoul(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}
export function validCaptureDate(value: string, today = todayInSeoul()) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < '1800-01-01' ||
    value > today
  )
    return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
