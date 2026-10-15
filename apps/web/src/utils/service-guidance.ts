import {
  INQUIRY_BODY_MAX,
  INQUIRY_CATEGORIES,
  INQUIRY_DAILY_LIMIT,
  INQUIRY_TITLE_MAX,
} from '../constants/inquiry.ts';
import type {
  InquiryCategory,
  InquiryDraft,
  InquiryField,
  InquiryFieldErrors,
  InquiryInput,
} from '../dto/inquiry.dto.ts';
import type {
  GuideRow,
  PrivacyOperatorInfo,
} from '../dto/service-guide.dto.ts';
import type { CursorPage } from '../dto/notice.dto.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID.test(value);
}

// Server timestamps are UTC; the service presents calendar dates in KST.
export function kstDateLabel(value: string | null | undefined) {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  return new Date(time + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
    .replaceAll('-', '.');
}

// "수정" date only for a real later edit on a different KST day; a notice
// scheduled after it was last edited must not show an earlier edit date.
export function noticeUpdatedLabel(publishedAt: string, updatedAt: string) {
  const published = Date.parse(publishedAt),
    updated = Date.parse(updatedAt);
  if (!Number.isFinite(published) || !Number.isFinite(updated)) return '';
  if (updated <= published) return '';
  const label = kstDateLabel(updatedAt);
  return label !== kstDateLabel(publishedAt) ? label : '';
}

export const INQUIRY_FIELDS: readonly InquiryField[] = [
  'category',
  'title',
  'body',
];
export function isInquiryCategory(value: string): value is InquiryCategory {
  return (INQUIRY_CATEGORIES as readonly string[]).includes(value);
}
// Mirrors the server rule: lengths in Unicode code points after trimming.
// Both reject control characters, lone surrogates and bidi controls
// (U+202A–U+202E, U+2066–U+2069); single-line text also rejects U+2028/U+2029,
// while multiline text keeps tab/LF/CR.
export const codePoints = (value: string) => [...value].length;
const TITLE_FORBIDDEN = /[\p{Cc}\p{Cs}\u202A-\u202E\u2066-\u2069\u2028\u2029]/u;
const BODY_FORBIDDEN = /(?![\t\n\r])[\p{Cc}\p{Cs}\u202A-\u202E\u2066-\u2069]/u;
// Multiline free text may keep tab/LF/CR only; single-line text keeps none.
export function hasForbiddenControl(value: string, multiline: boolean) {
  return (multiline ? BODY_FORBIDDEN : TITLE_FORBIDDEN).test(value);
}
export function validateInquiryDraft(draft: InquiryDraft): {
  input: InquiryInput | null;
  errors: InquiryFieldErrors;
} {
  const errors: InquiryFieldErrors = {};
  const { category } = draft,
    title = draft.title.trim(),
    body = draft.body.trim();
  if (!isInquiryCategory(category))
    errors.category = '문의 분류를 선택해 주세요.';
  if (!title) errors.title = '제목을 입력해 주세요.';
  else if (codePoints(title) > INQUIRY_TITLE_MAX)
    errors.title = `제목은 ${INQUIRY_TITLE_MAX}자까지 쓸 수 있어요.`;
  else if (hasForbiddenControl(title, false))
    errors.title = '제목에는 줄바꿈이나 탭 같은 특수 문자를 쓸 수 없어요.';
  if (!body) errors.body = '내용을 입력해 주세요.';
  else if (codePoints(body) > INQUIRY_BODY_MAX)
    errors.body = `내용은 ${INQUIRY_BODY_MAX.toLocaleString('ko-KR')}자까지 쓸 수 있어요.`;
  else if (hasForbiddenControl(body, true))
    errors.body =
      '내용에 보낼 수 없는 특수 문자가 있어요. 지우고 다시 입력해 주세요.';
  if (!isInquiryCategory(category) || Object.keys(errors).length)
    return { input: null, errors };
  return { input: { category, title, body }, errors };
}

export function statusOf(error: unknown) {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : null;
}
export const INQUIRY_LIMIT_MESSAGE = `문의는 하루 ${INQUIRY_DAILY_LIMIT}건까지 보낼 수 있어요. 잠시 후 다시 시도해 주세요.`;
// Maps a failed inquiry submission to text that matches the real server state.
export function inquiryErrorMessage(error: unknown) {
  const status = statusOf(error);
  if (status === 429) return INQUIRY_LIMIT_MESSAGE;
  if (status === 400)
    return `보낼 수 없는 내용이 있어요. 분류를 고르고 제목은 ${INQUIRY_TITLE_MAX}자, 내용은 ${INQUIRY_BODY_MAX.toLocaleString('ko-KR')}자 안으로 특수 문자 없이 적어 주세요.`;
  if (status === 401) return '로그인이 끝났어요. 다시 로그인해 주세요.';
  return error instanceof Error && error.message
    ? error.message
    : '문의를 보내지 못했어요. 잠시 후 다시 시도해 주세요.';
}
export function isNotFound(error: unknown) {
  return statusOf(error) === 404;
}

// Contract: a list cursor that is no longer visible answers 404, and the
// client restarts from the first page instead of retrying the dead cursor.
export async function fetchCursorPage<T>(
  fetchPage: (
    cursor: string | null,
    signal: AbortSignal
  ) => Promise<CursorPage<T>>,
  cursor: string | null,
  signal: AbortSignal
): Promise<{ page: CursorPage<T>; restarted: boolean }> {
  try {
    return { page: await fetchPage(cursor, signal), restarted: false };
  } catch (cause) {
    if (!cursor || signal.aborted || !isNotFound(cause)) throw cause;
    return { page: await fetchPage(null, signal), restarted: true };
  }
}
// Appends a page without duplicating records already shown.
export function mergeCursorItems<T extends { id: string }>(
  current: T[],
  incoming: T[],
  append: boolean
) {
  const base = append ? current : [];
  const known = new Set(base.map((item) => item.id));
  const added: T[] = [];
  for (const item of incoming)
    if (!known.has(item.id)) {
      known.add(item.id);
      added.push(item);
    }
  return { items: [...base, ...added], added };
}

export function privacyOperatorRows(
  info: PrivacyOperatorInfo,
  labels: Record<keyof PrivacyOperatorInfo, string>,
  pendingMessage: string
): GuideRow[] {
  return (Object.keys(labels) as (keyof PrivacyOperatorInfo)[]).map((key) => {
    const value = info[key];
    return {
      key,
      label: labels[key],
      value: value ?? pendingMessage,
      pending: value === null,
    };
  });
}
