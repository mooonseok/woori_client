import { safeReturnTo } from '@/utils/auth-navigation';
const KEY = 'woori.invite-return';
export function rememberInvite(next: string) {
  const safe = safeReturnTo(next);
  if (safe.startsWith('/invite')) {
    try {
      sessionStorage.setItem(KEY, safe);
    } catch {
      /* The URL still retains this destination. */
    }
  }
}
export function pendingInvite() {
  try {
    return safeReturnTo(sessionStorage.getItem(KEY));
  } catch {
    return '/';
  }
}
export function clearPendingInvite() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* Optional navigation preference. */
  }
}
