import { NOTICE_SCHEDULE_MAX_DAYS } from '../constants/content-ops.ts';
import type { NoticeStatus, NoticeVisibility } from '../dto/notice.dto.ts';

const KST_OFFSET = 9 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const pad = (value: number) => String(value).padStart(2, '0');
// datetime-local value ("YYYY-MM-DDTHH:mm") read as KST → ISO (UTC). The
// browser time zone is never used, so an operator abroad schedules in KST too.
export function kstInputToIso(value: string): string | null {
  const match = LOCAL.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const time = Date.UTC(year, month - 1, day, hour, minute) - KST_OFFSET;
  const back = new Date(time + KST_OFFSET);
  // Reject overflowing values such as 02-30 or 24:00.
  if (
    back.getUTCFullYear() !== year ||
    back.getUTCMonth() !== month - 1 ||
    back.getUTCDate() !== day ||
    back.getUTCHours() !== hour ||
    back.getUTCMinutes() !== minute
  )
    return null;
  return new Date(time).toISOString();
}
// ISO (or epoch ms) → datetime-local value in KST, minutes precision.
export function kstInputValue(value: string | number) {
  const time = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(time)) return '';
  const kst = new Date(time + KST_OFFSET);
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(
    kst.getUTCDate()
  )}T${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`;
}
// Bounds for the picker (min = next minute, max = now + 90 days).
export function scheduleBounds(now = Date.now()) {
  return {
    min: kstInputValue(now + 60_000),
    max: kstInputValue(now + NOTICE_SCHEDULE_MAX_DAYS * DAY),
  };
}
// '' when the KST input is a valid future time within 90 days.
export function scheduleError(value: string, now = Date.now()) {
  if (!value) return '게시할 날짜와 시각을 골라 주세요.';
  const iso = kstInputToIso(value);
  if (!iso) return '날짜와 시각을 다시 골라 주세요.';
  const time = Date.parse(iso);
  if (time <= now)
    return '예약 시각이 지났어요. 지금 이후 시각을 고르거나 ‘지금 게시’를 선택해 주세요.';
  if (time > now + NOTICE_SCHEDULE_MAX_DAYS * DAY)
    return `예약은 ${NOTICE_SCHEDULE_MAX_DAYS}일 이내로만 할 수 있어요.`;
  return '';
}
export function noticeVisibility(
  status: NoticeStatus,
  publishedAt: string | null,
  now = Date.now()
): NoticeVisibility {
  if (status !== 'PUBLISHED') return 'hidden';
  const time = publishedAt ? Date.parse(publishedAt) : NaN;
  if (Number.isFinite(time) && time > now) return 'scheduled';
  return 'visible';
}
