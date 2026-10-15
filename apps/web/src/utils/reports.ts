import {
  REPORT_DAILY_LIMIT,
  REPORT_DETAIL_MAX,
  REPORT_REASONS,
} from '../constants/report.ts';
import type {
  ReportDraft,
  ReportReason,
  ReportTargetType,
} from '../dto/report.dto.ts';
import {
  codePoints,
  hasForbiddenControl,
  statusOf,
} from './service-guidance.ts';

export function isReportReason(value: string): value is ReportReason {
  return (REPORT_REASONS as readonly string[]).includes(value);
}
// Mirrors the server: detail is trimmed, 0..500 code points, empty → omitted,
// and only tab/LF/CR are allowed among control characters.
export function validateReportDraft(draft: ReportDraft): {
  input: { reason: ReportReason; detail?: string } | null;
  errors: { reason?: string; detail?: string };
} {
  const errors: { reason?: string; detail?: string } = {};
  const { reason } = draft,
    detail = draft.detail.trim();
  if (!isReportReason(reason)) errors.reason = '신고 사유를 선택해 주세요.';
  if (codePoints(detail) > REPORT_DETAIL_MAX)
    errors.detail = `추가 설명은 ${REPORT_DETAIL_MAX}자까지 쓸 수 있어요.`;
  else if (hasForbiddenControl(detail, true))
    errors.detail =
      '추가 설명에 보낼 수 없는 특수 문자가 있어요. 지우고 다시 입력해 주세요.';
  if (!isReportReason(reason) || Object.keys(errors).length)
    return { input: null, errors };
  return { input: detail ? { reason, detail } : { reason }, errors };
}

const selfMessages: Record<ReportTargetType, string> = {
  PHOTO: '내가 올린 사진은 신고할 수 없어요.',
  COMMENT: '내가 쓴 댓글은 신고할 수 없어요.',
  USER: '나 자신은 신고할 수 없어요.',
};
export const REPORT_LIMIT_MESSAGE = `신고는 하루 ${REPORT_DAILY_LIMIT}건까지 보낼 수 있어요. 잠시 후 다시 시도해 주세요.`;
export const REPORT_GONE_MESSAGE =
  '신고할 대상을 찾을 수 없어요. 이미 삭제되었거나 더 이상 볼 수 없는 내용이에요.';
export function isReportTargetGone(error: unknown) {
  return statusOf(error) === 404;
}
export function isOwnTargetError(error: unknown) {
  return (
    statusOf(error) === 400 &&
    (error as { code?: unknown } | null)?.code === 'REPORT_SELF_NOT_ALLOWED'
  );
}
// Maps a failed report to text that matches the real server state.
export function reportErrorMessage(
  error: unknown,
  targetType: ReportTargetType
) {
  const status = statusOf(error);
  if (status === 429) return REPORT_LIMIT_MESSAGE;
  if (status === 404) return REPORT_GONE_MESSAGE;
  if (isOwnTargetError(error)) return selfMessages[targetType];
  if (status === 400)
    return `보낼 수 없는 내용이 있어요. 사유를 고르고 추가 설명은 ${REPORT_DETAIL_MAX}자 안으로 특수 문자 없이 적어 주세요.`;
  if (status === 401) return '로그인이 끝났어요. 다시 로그인해 주세요.';
  return error instanceof Error && error.message
    ? error.message
    : '신고를 보내지 못했어요. 잠시 후 다시 시도해 주세요.';
}
