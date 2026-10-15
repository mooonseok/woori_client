import type {
  AdminLoginInput,
  AdminLoginResult,
  AdminMfaSetup,
  AdminReauthInput,
  AdminSession,
} from '../dto/admin-auth.dto.ts';
import { apiRequest, post } from './api-client.ts';

const AUTH = '/v1/admin/auth';
export const fetchAdminSession = (signal?: AbortSignal) =>
  apiRequest<AdminSession>(`${AUTH}/me`, { signal });
export const loginAdmin = (input: AdminLoginInput) =>
  post<AdminLoginResult>(`${AUTH}/login`, input);
// Each call replaces the pending secret on the server.
export const startMfaSetup = (signal?: AbortSignal) =>
  post<AdminMfaSetup>(`${AUTH}/mfa/setup`, {}, signal);
export const activateMfa = (code: string) =>
  post<AdminSession>(`${AUTH}/mfa/activate`, { code });
export const verifyMfa = (code: string) =>
  post<AdminSession>(`${AUTH}/mfa/verify`, { code });
export const reauthenticateAdmin = (input: AdminReauthInput) =>
  post<AdminSession>(`${AUTH}/reauth`, input);
export const logoutAdmin = () => post<void>(`${AUTH}/logout`);
