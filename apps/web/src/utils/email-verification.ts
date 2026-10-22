import type { AuthStatus } from '../dto/auth.dto.ts';

// A verified session does not prove that a newly opened email link belongs
// to that account. Always submit incoming links to the server first.
export function emailVerificationState(
  status: AuthStatus,
  signedIn: boolean,
  verified: boolean,
  hasToken: boolean
) {
  if (status === 'loading') return 'loading';
  if (status === 'error') return 'connection-error';
  if (!signedIn) return 'anonymous';
  if (hasToken) return 'confirm';
  return verified ? 'verified' : 'waiting';
}
