const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];
// 1536 → "1.5 KB"; base 1024 to match the storage quota.
export function formatBytes(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    return '—';
  let size = value,
    unit = 0;
  while (size >= 1024 && unit < UNITS.length - 1) {
    size /= 1024;
    unit++;
  }
  const digits = unit === 0 || size >= 100 ? 0 : 1;
  return `${size.toFixed(digits).replace(/\.0$/, '')} ${UNITS[unit]}`;
}
// Share of the quota in whole percent (null when there is no quota).
export function usagePercent(used: number, quota: number) {
  if (!Number.isFinite(used) || !Number.isFinite(quota) || quota <= 0)
    return null;
  return Math.min(100, Math.max(0, Math.round((used / quota) * 100)));
}
export function formatCount(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('ko-KR')
    : '—';
}
