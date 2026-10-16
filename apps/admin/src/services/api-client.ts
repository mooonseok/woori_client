import { ADMIN_ERROR } from '../constants/admin-auth.ts';
import { apiErrorMessage } from '../utils/admin-errors.ts';

// Dispatched when the admin session is gone (401 without a session).
export const ADMIN_SESSION_EXPIRED = 'woori-admin:session-expired';
// Dispatched when the server says the session state differs from ours
// (e.g. 403 ADMIN_MFA_REQUIRED): re-read /auth/me.
export const ADMIN_SESSION_RECHECK = 'woori-admin:session-recheck';
let sessionRevision = 0;
// Changes on login, logout, session loss and admin switch.
export function advanceSessionRevision() {
  return ++sessionRevision;
}
export function currentSessionRevision() {
  return sessionRevision;
}
export class ApiError extends Error {
  status: number;
  // Server error code such as ADMIN_MFA_INVALID, when the body has one.
  code?: string;
  // The parsed error body, for codes that carry data (e.g. owned groups).
  details?: unknown;
  constructor(
    status: number,
    message: string,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    if (code) this.code = code;
    if (details !== undefined) this.details = details;
  }
}
const ADMIN_PREFIX = '/v1/admin/';
const LOGIN_PATH = '/v1/admin/auth/login';
// Wrong MFA codes and failed re-auth also answer 401, but with their own
// code; only a missing session (or no code at all) ends the session here.
export function isSessionLoss(path: string, status: number, code?: string) {
  if (status !== 401 || path === LOGIN_PATH) return false;
  return !code || code === ADMIN_ERROR.AUTHENTICATION_REQUIRED;
}
function emit(name: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(name));
}
async function request(path: string, init: RequestInit = {}) {
  const requestRevision = sessionRevision;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base)
    throw new ApiError(
      503,
      '서버 주소가 설정되지 않았어요. NEXT_PUBLIC_API_BASE_URL 설정을 확인해 주세요.'
    );
  if (!path.startsWith(ADMIN_PREFIX) || /[\\\r\n]/.test(path))
    throw new ApiError(400, '올바르지 않은 관리자 API 경로입니다.');
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  const method = (init.method ?? 'GET').toUpperCase();
  // The server requires this header on every admin request, reads included.
  headers.set('X-Woori-Request', '1');
  if (init.body !== undefined && init.body !== null)
    headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(new URL(path, base), {
      ...init,
      method,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError(0, apiErrorMessage(0, undefined, undefined));
  }
  if (response.ok) return response;
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
    code?: unknown;
  } | null;
  const code = typeof body?.code === 'string' ? body.code : undefined;
  const serverMessage =
    typeof body?.message === 'string' ? body.message : undefined;
  // A response to a request from an earlier session must not end the new one.
  if (requestRevision === sessionRevision && !init.signal?.aborted) {
    if (isSessionLoss(path, response.status, code)) emit(ADMIN_SESSION_EXPIRED);
    else if (response.status === 403 && code === ADMIN_ERROR.MFA_REQUIRED)
      emit(ADMIN_SESSION_RECHECK);
  }
  throw new ApiError(
    response.status,
    apiErrorMessage(response.status, code, serverMessage),
    code,
    body ?? undefined
  );
}
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await request(path, init);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
// Binary responses (audited photo view). Only raster images are accepted
// (no SVG or HTML), matching the server's display variant.
const RASTER_IMAGE = /^image\/(webp|jpeg|png|avif)$/;
export async function apiImage(
  path: string,
  init: RequestInit = {}
): Promise<Blob> {
  const response = await request(path, init);
  const blob = await response.blob();
  if (!RASTER_IMAGE.test(blob.type))
    throw new ApiError(502, '사진 응답 형식이 올바르지 않아요.');
  return blob;
}
export function post<T>(
  path: string,
  body: unknown = {},
  signal?: AbortSignal
) {
  return apiRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });
}
