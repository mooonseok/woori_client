// Login failures that need their own wording. A suspended account (403
// ACCOUNT_SUSPENDED) is told so plainly instead of the generic credential
// message; wrong passwords keep the server's generic 401 text.
export const ACCOUNT_SUSPENDED_MESSAGE =
  '이용이 정지된 계정이에요. 문의가 필요하면 운영자에게 연락해 주세요.';
export function isAccountSuspended(error: unknown) {
  const value = error as { status?: unknown; code?: unknown } | null;
  return value?.status === 403 && value.code === 'ACCOUNT_SUSPENDED';
}
export function loginFailure(error: unknown): {
  message: string;
  suspended: boolean;
} {
  if (isAccountSuspended(error))
    return { message: ACCOUNT_SUSPENDED_MESSAGE, suspended: true };
  return {
    message:
      error instanceof Error && error.message
        ? error.message
        : '요청을 처리하지 못했어요.',
    suspended: false,
  };
}
