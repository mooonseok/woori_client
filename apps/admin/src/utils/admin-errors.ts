import { ADMIN_ERROR } from '../constants/admin-auth.ts';
import type { SessionEndReason } from '../dto/admin-auth.dto.ts';

export function statusOf(error: unknown) {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : null;
}
export function codeOf(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : null;
}

export const NETWORK_MESSAGE =
  '서버에 연결할 수 없어요. 네트워크와 API 서버 상태를 확인한 뒤 다시 시도해 주세요.';
export const RATE_LIMIT_MESSAGE =
  '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
const CODE_MESSAGES: Record<string, string> = {
  [ADMIN_ERROR.AUTHENTICATION_REQUIRED]:
    '관리자 로그인이 끝났어요. 다시 로그인해 주세요.',
  [ADMIN_ERROR.MFA_REQUIRED]: '2단계 인증을 먼저 완료해 주세요.',
  [ADMIN_ERROR.REAUTH_REQUIRED]:
    '민감한 작업이라 비밀번호와 인증 코드를 다시 확인해야 해요.',
  [ADMIN_ERROR.NOT_CONFIGURED]:
    '관리자 기능이 서버에 아직 설정되지 않았어요. 서버 환경 설정을 확인해 주세요.',
  [ADMIN_ERROR.ORIGIN_REJECTED]:
    '허용된 관리자 웹 주소에서만 요청할 수 있어요. 접속 주소를 확인해 주세요.',
  [ADMIN_ERROR.TOO_MANY_REQUESTS]: RATE_LIMIT_MESSAGE,
  [ADMIN_ERROR.AUTH_BUSY]:
    '요청이 몰려 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
  [ADMIN_ERROR.NOT_FOUND]: '아직 연결되지 않은 관리자 기능이에요.',
  [ADMIN_ERROR.NOTICE_NOT_FOUND]:
    '공지를 찾을 수 없어요. 목록에서 다시 확인해 주세요.',
  [ADMIN_ERROR.INQUIRY_NOT_FOUND]:
    '문의를 찾을 수 없어요. 회원 탈퇴로 함께 삭제됐을 수 있어요.',
  [ADMIN_ERROR.REPORT_NOT_FOUND]:
    '신고를 찾을 수 없어요. 목록에서 다시 확인해 주세요.',
  [ADMIN_ERROR.PHOTO_NOT_FOUND]:
    '사진을 볼 수 없어요. 이미 삭제되어 표시용 이미지가 없을 수 있어요.',
  [ADMIN_ERROR.COMMENT_NOT_FOUND]: '댓글을 찾을 수 없어요.',
  [ADMIN_ERROR.REPORT_ALREADY_CLOSED]:
    '이미 종료된 신고라 바꿀 수 없어요. 최신 상태를 다시 불러왔어요.',
  [ADMIN_ERROR.ACTION_NOT_APPLICABLE]:
    '이 신고 대상에는 적용할 수 없는 조치예요.',
  [ADMIN_ERROR.USER_NOT_SUSPENDABLE]: '탈퇴한 회원이라 이용 정지할 수 없어요.',
  [ADMIN_ERROR.NOTICE_UPDATE_EMPTY]:
    '바뀐 내용이 없어요. 제목이나 본문을 고친 뒤 저장해 주세요.',
  [ADMIN_ERROR.NOTICE_PUBLISH_AT_INVALID]:
    '게시 시각은 지금부터 90일 이내로 골라 주세요. 지난 시각은 예약할 수 없어요.',
  [ADMIN_ERROR.MEDIA_NOT_CONFIGURED]:
    '사진 저장소가 설정되지 않아 사진을 볼 수 없어요. 서버 설정을 확인해 주세요.',
  [ADMIN_ERROR.USER_NOT_FOUND]: '회원을 찾을 수 없어요.',
  [ADMIN_ERROR.GROUP_NOT_FOUND]: '그룹을 찾을 수 없어요.',
  [ADMIN_ERROR.ALBUM_NOT_FOUND]: '앨범을 찾을 수 없어요.',
  [ADMIN_ERROR.OWNED_GROUPS_REMAIN]:
    '회원이 소유한 그룹이 남아 있어 삭제할 수 없어요.',
  [ADMIN_ERROR.USER_NOT_SUSPENDED]:
    '이용 정지 상태가 아니라 해제할 수 없어요. 최신 상태를 확인해 주세요.',
  [ADMIN_ERROR.CONFIRM_USERNAME_MISMATCH]:
    '입력한 아이디가 현재 아이디와 달라요. 다시 확인해 주세요.',
};
// Framework validation errors carry English text; only show server text
// written for people (Korean) and fall back to our own wording otherwise.
const READABLE = /[가-힣]/;
// Message for a failed admin API call: our own text for known codes, then the
// server's plain-text message, then a status default. Always shown as text.
export function apiErrorMessage(
  status: number,
  code: string | undefined,
  serverMessage: string | undefined
) {
  if (code && Object.hasOwn(CODE_MESSAGES, code)) return CODE_MESSAGES[code];
  if (status === 0) return NETWORK_MESSAGE;
  if (status === 429) return RATE_LIMIT_MESSAGE;
  if (serverMessage && READABLE.test(serverMessage)) return serverMessage;
  if (status === 401) return CODE_MESSAGES[ADMIN_ERROR.AUTHENTICATION_REQUIRED];
  if (status === 400)
    return '보낼 수 없는 내용이 있어요. 입력한 내용을 확인해 주세요.';
  if (status === 404) return '요청한 항목을 찾을 수 없어요.';
  if (status === 409)
    return '다른 변경과 겹쳐 처리하지 못했어요. 최신 상태를 확인해 주세요.';
  if (status === 503) return '관리자 서비스를 잠시 사용할 수 없어요.';
  return '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
}
// A login failure never says which part was wrong or that an account is
// locked or disabled; the server answers all of them with one 401.
export const LOGIN_INVALID_MESSAGE =
  '아이디 또는 비밀번호를 확인해 주세요. 여러 번 틀리면 잠시 로그인할 수 없어요.';
export function loginErrorMessage(error: unknown) {
  const status = statusOf(error);
  if (status === 400 || status === 401) return LOGIN_INVALID_MESSAGE;
  if (status === 429)
    return '로그인 시도가 많아요. 잠시 후 다시 시도해 주세요.';
  if (status === 503 && codeOf(error) !== ADMIN_ERROR.NOT_CONFIGURED)
    return '관리자 로그인을 잠시 사용할 수 없어요. 잠시 후 다시 시도해 주세요.';
  return messageOf(error, '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.');
}
export const MFA_INVALID_MESSAGE =
  '인증 코드가 맞지 않아요. 인증 앱의 새 코드를 입력해 주세요. 여러 번 틀리면 다시 로그인해야 해요.';
export type MfaFailure =
  // Show the message and let the admin try another code.
  | { action: 'retry'; message: string }
  // The session state changed (already enabled/verified, setup missing):
  // re-read /auth/me and let the gate pick the right screen. lostReason is
  // the login notice if that check finds the session revoked.
  | { action: 'recheck'; message: string; lostReason?: SessionEndReason }
  // The session is gone; the api client already signalled it.
  | { action: 'login'; message: string };
export function mfaFailure(error: unknown): MfaFailure {
  const status = statusOf(error),
    code = codeOf(error);
  if (status === 401 && code === ADMIN_ERROR.MFA_INVALID)
    // The fifth wrong code in one session revokes it on the server.
    return {
      action: 'recheck',
      message: MFA_INVALID_MESSAGE,
      lostReason: 'mfa-failed',
    };
  if (status === 401)
    return {
      action: 'login',
      message: CODE_MESSAGES[ADMIN_ERROR.AUTHENTICATION_REQUIRED],
    };
  if (status === 409)
    return {
      action: 'recheck',
      message: '인증 상태가 바뀌었어요. 알맞은 화면으로 이동할게요.',
    };
  if (status === 400)
    return { action: 'retry', message: '6자리 숫자를 모두 입력해 주세요.' };
  return {
    action: 'retry',
    message: messageOf(error, '인증하지 못했어요. 잠시 후 다시 시도해 주세요.'),
  };
}
export function reauthErrorMessage(error: unknown) {
  const status = statusOf(error);
  if (status === 401 && codeOf(error) === ADMIN_ERROR.INVALID_CREDENTIALS)
    return '비밀번호 또는 인증 코드가 맞지 않아요. 방금 사용한 코드는 다시 쓸 수 없으니 새 코드를 입력해 주세요.';
  if (status === 400) return '비밀번호와 6자리 인증 코드를 모두 입력해 주세요.';
  return messageOf(error, '재인증하지 못했어요. 잠시 후 다시 시도해 주세요.');
}
export function messageOf(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
export function isCursorInvalid(error: unknown) {
  return (
    statusOf(error) === 400 && /_CURSOR_INVALID$/.test(codeOf(error) ?? '')
  );
}
export function isNotFound(error: unknown) {
  return statusOf(error) === 404;
}
// Message for a failed operator action (publish, answer, resolve, view…).
// A cancelled re-auth prompt is reported as such, not as a failure.
export function actionErrorMessage(error: unknown, fallback: string) {
  if ((error as { name?: unknown } | null)?.name === 'ReauthCancelledError')
    return '본인 확인을 취소해 작업을 진행하지 않았어요.';
  return messageOf(error, fallback);
}
// Audited views are rate limited per admin (120 per hour on the server).
export function viewErrorMessage(error: unknown) {
  if (statusOf(error) === 429)
    return '열람 요청이 너무 많아요. 관리자 한 명당 한 시간에 120회까지 열람할 수 있어요. 잠시 후 다시 시도해 주세요.';
  return actionErrorMessage(error, '내용을 불러오지 못했어요.');
}
