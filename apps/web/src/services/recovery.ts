import { apiRequest } from './api-client.ts';
import type { RecoveryInput, ResetPasswordInput } from '../dto/recovery.dto.ts';
import type { AuthUser } from '../dto/auth.dto.ts';
export function requestRecovery(
  kind: 'username' | 'password',
  input: RecoveryInput,
  signal?: AbortSignal
) {
  return apiRequest<{ accepted: boolean }>(`/v1/auth/recovery/${kind}`, {
    method: 'POST',
    body: JSON.stringify(input),
    signal,
  });
}
export function resetPassword(input: ResetPasswordInput, signal?: AbortSignal) {
  return apiRequest<void>('/v1/auth/recovery/password/confirm', {
    method: 'POST',
    body: JSON.stringify(input),
    signal,
  });
}
export function updateProfile(profile: {
  displayName?: string;
  nickname?: string;
}) {
  return apiRequest<{ user: AuthUser }>('/v1/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  });
}
