export const SESSION_EXPIRED = "woori:session-expired";
let sessionRevision = 0;
export function advanceSessionRevision() {
  return ++sessionRevision;
}
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
async function request(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const requestRevision = sessionRevision;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base)
    throw new ApiError(
      503,
      "서버 주소가 설정되지 않았어요. NEXT_PUBLIC_API_BASE_URL 설정을 확인해 주세요.",
    );
  if (!path.startsWith("/v1/"))
    throw new ApiError(400, "올바르지 않은 API 경로입니다.");
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.method && !["GET", "HEAD"].includes(init.method.toUpperCase())) {
    headers.set("X-Woori-Request", "1");
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(new URL(path, base), {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers,
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError(
      0,
      "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.",
    );
  }
  if (!response.ok) {
    if (
      response.status === 401 &&
      requestRevision === sessionRevision &&
      !["/v1/auth/login", "/v1/auth/signup"].includes(path) &&
      typeof window !== "undefined"
    )
      window.dispatchEvent(new Event(SESSION_EXPIRED));
    const body = (await response.json().catch(() => null)) as {
      message?: unknown;
    } | null;
    const message =
      typeof body?.message === "string" ? body.message : undefined;
    throw new ApiError(
      response.status,
      message ||
        (response.status === 401
          ? "다시 로그인해 주세요."
          : response.status === 429
            ? "요청이 많아요. 잠시 후 다시 시도해 주세요."
            : "요청을 처리하지 못했어요."),
    );
  }
  return response;
}
export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await request(path, init);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export async function apiBlob(
  path: string,
  signal?: AbortSignal,
): Promise<Blob> {
  return (await request(path, { signal })).blob();
}
export function post<T>(path: string, body: unknown = {}) {
  return apiRequest<T>(path, { method: "POST", body: JSON.stringify(body) });
}
