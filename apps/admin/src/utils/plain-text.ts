import {
  ACTION_REASON_MAX,
  INQUIRY_ANSWER_MAX,
  NOTICE_BODY_MAX,
  NOTICE_TITLE_MAX,
  VIEW_REASON_MAX,
  VIEW_REASON_MIN,
} from '../constants/content-ops.ts';
import type { NoticeFieldErrors, NoticeInput } from '../dto/notice.dto.ts';

// Mirrors the server (and member web) plain-text rule: lengths in Unicode
// code points after trimming; control characters, lone surrogates and bidi
// controls (U+202A–U+202E, U+2066–U+2069) are rejected. Single-line text also
// rejects U+2028/U+2029; multiline text keeps tab/LF/CR.
export const codePoints = (value: string) => [...value].length;
const SINGLE_LINE_FORBIDDEN =
  /[\p{Cc}\p{Cs}\u202A-\u202E\u2066-\u2069\u2028\u2029]/u;
const MULTILINE_FORBIDDEN =
  /(?![\t\n\r])[\p{Cc}\p{Cs}\u202A-\u202E\u2066-\u2069]/u;
export function hasForbiddenControl(value: string, multiline: boolean) {
  return (multiline ? MULTILINE_FORBIDDEN : SINGLE_LINE_FORBIDDEN).test(value);
}
// Korean object/topic particle for a label (제목을 / 사유를, 제목은 / 사유는).
export function particle(
  word: string,
  withFinal: string,
  withoutFinal: string
) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return withFinal;
  return code % 28 ? withFinal : withoutFinal;
}
interface TextRule {
  label: string;
  min?: number;
  max: number;
  multiline: boolean;
}
// '' when valid; otherwise a Korean message naming the field.
export function plainTextError(value: string, rule: TextRule) {
  const text = value.trim(),
    min = rule.min ?? 1,
    length = codePoints(text);
  const object = rule.label + particle(rule.label, '을', '를'),
    topic = rule.label + particle(rule.label, '은', '는');
  if (!text) return `${object} 입력해 주세요.`;
  if (length < min) return `${topic} ${min}자 이상 적어 주세요.`;
  if (length > rule.max)
    return `${topic} ${rule.max.toLocaleString('ko-KR')}자까지 쓸 수 있어요.`;
  if (hasForbiddenControl(text, rule.multiline))
    return rule.multiline
      ? `${rule.label}에 보낼 수 없는 특수 문자가 있어요. 지우고 다시 입력해 주세요.`
      : `${rule.label}에는 줄바꿈이나 탭 같은 특수 문자를 쓸 수 없어요.`;
  return '';
}
export const RULES = {
  noticeTitle: { label: '제목', max: NOTICE_TITLE_MAX, multiline: false },
  noticeBody: { label: '본문', max: NOTICE_BODY_MAX, multiline: true },
  answer: { label: '답변', max: INQUIRY_ANSWER_MAX, multiline: true },
  actionReason: { label: '사유', max: ACTION_REASON_MAX, multiline: false },
  memberReason: {
    label: '사유',
    min: VIEW_REASON_MIN,
    max: ACTION_REASON_MAX,
    multiline: false,
  },
  viewReason: {
    label: '열람 사유',
    min: VIEW_REASON_MIN,
    max: VIEW_REASON_MAX,
    multiline: false,
  },
} as const satisfies Record<string, TextRule>;
export function validateNoticeDraft(draft: NoticeInput): {
  input: NoticeInput | null;
  errors: NoticeFieldErrors;
} {
  const errors: NoticeFieldErrors = {};
  const title = plainTextError(draft.title, RULES.noticeTitle),
    body = plainTextError(draft.body, RULES.noticeBody);
  if (title) errors.title = title;
  if (body) errors.body = body;
  return Object.keys(errors).length
    ? { input: null, errors }
    : { input: { title: draft.title.trim(), body: draft.body.trim() }, errors };
}
// Only fields that actually changed are sent on PATCH; null = nothing to save.
export function noticePatch(
  saved: NoticeInput,
  input: NoticeInput
): Partial<NoticeInput> | null {
  const patch: Partial<NoticeInput> = {};
  if (input.title !== saved.title) patch.title = input.title;
  if (input.body !== saved.body) patch.body = input.body;
  return Object.keys(patch).length ? patch : null;
}
