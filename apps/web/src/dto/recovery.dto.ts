export type RecoveryMode = 'username' | 'password' | 'reset';
export interface RecoveryInput {
  name: string;
  email: string;
}
export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}
