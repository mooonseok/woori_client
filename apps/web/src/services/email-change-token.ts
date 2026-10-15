// Survives the private gallery remount during login, but never a page reload.
// No cookies, browser storage, logging, or redirect URLs contain this token.
let pending: { token: string; expiresAt: number } | undefined;
export function rememberEmailChangeToken(token: string) {
  pending = /^[A-Za-z0-9_-]{43}$/.test(token)
    ? { token, expiresAt: Date.now() + 30 * 60 * 1000 }
    : undefined;
}
export function emailChangeToken() {
  if (pending && pending.expiresAt <= Date.now()) pending = undefined;
  return pending?.token || '';
}
export function forgetEmailChangeToken() {
  pending = undefined;
}
