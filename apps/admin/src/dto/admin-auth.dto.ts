export type AdminMfaState = 'SETUP_REQUIRED' | 'REQUIRED' | 'VERIFIED';
export interface AdminAccount {
  id: string;
  username: string;
  displayName: string;
}
export interface AdminLoginInput {
  username: string;
  password: string;
}
export interface AdminLoginResult {
  admin: AdminAccount;
  mfa: Exclude<AdminMfaState, 'VERIFIED'>;
}
// GET /v1/admin/auth/me and the MFA/re-auth success responses.
export interface AdminSession {
  admin: AdminAccount;
  mfa: AdminMfaState;
  // Absolute expiry (pre-MFA: login + 10 min, verified: MFA time + 8 h).
  sessionExpiresAt: string | null;
  reauthValidUntil: string | null;
}
export interface AdminMfaSetup {
  secret: string;
  otpauthUri: string;
}
export interface AdminReauthInput {
  password: string;
  code: string;
}
export type AdminSessionStatus =
  'loading' | 'anonymous' | 'authenticated' | 'error';
// Why the last session ended; selects a fixed notice on the login screen.
export type SessionEndReason = 'expired' | 'logout' | 'mfa-failed';
