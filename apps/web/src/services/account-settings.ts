import { apiRequest } from './api-client.ts';
import type {
  AccountDeletionInput,
  AccountDeletionPreview,
  EmailChangeInput,
  PasswordChangeInput,
} from '../dto/account-settings.dto.ts';

export function changePassword(
  input: PasswordChangeInput,
  signal?: AbortSignal
) {
  return apiRequest<void>('/v1/auth/password/change', {
    method: 'POST',
    body: JSON.stringify(input),
    signal,
  });
}
export function requestEmailChange(
  input: EmailChangeInput,
  signal?: AbortSignal
) {
  return apiRequest<{ accepted: true }>('/v1/auth/email-change/request', {
    method: 'POST',
    body: JSON.stringify(input),
    signal,
  });
}
export function confirmEmailChange(token: string, signal?: AbortSignal) {
  return apiRequest<void>('/v1/auth/email-change/confirm', {
    method: 'POST',
    body: JSON.stringify({ token }),
    signal,
  });
}

export function getAccountDeletionPreview(signal?: AbortSignal) {
  return apiRequest<AccountDeletionPreview>('/v1/auth/account-deletion', {
    signal,
  });
}
export function deleteAccount(input: AccountDeletionInput) {
  return apiRequest<void>('/v1/auth/account-deletion', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
