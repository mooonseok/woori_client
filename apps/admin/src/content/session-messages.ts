import type { SessionEndReason } from '../dto/admin-auth.dto.ts';
// Fixed notices for ?reason= on the login screen; the URL value only selects
// one of these and is never shown itself.
export const SESSION_END_MESSAGES: Readonly<Record<SessionEndReason, string>> =
  {
    expired: '세션이 끝나 로그아웃됐어요. 다시 로그인해 주세요.',
    logout: '로그아웃했어요.',
    'mfa-failed':
      '인증 코드를 여러 번 잘못 입력해 로그인이 해제됐어요. 다시 로그인해 주세요.',
  };
