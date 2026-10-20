export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  nickname?: string;
  nicknameNeedsUpdate?: boolean;
  email: string;
  emailVerified: boolean;
  // Profile photo version (/v1/users/{id}/avatar?v=), null without one.
  avatarVersion?: number | null;
}
export interface SignupInput {
  username: string;
  password: string;
  displayName: string;
  nickname: string;
  email: string;
}
export interface LoginInput {
  username: string;
  password: string;
}
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error';
