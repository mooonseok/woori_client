import { ApiError } from './api-client.ts';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// /v1/admin/<collection>/<id>[/<action>] with a validated record id, so a
// tampered ?id= can never reach another path.
export function recordPath(collection: string, id: string, action?: string) {
  if (!UUID.test(id)) throw new ApiError(400, '올바르지 않은 항목 주소예요.');
  return `/v1/admin/${collection}/${id}${action ? `/${action}` : ''}`;
}
export function listPath(
  collection: string,
  query: Record<string, string | number | null | undefined>
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== null && value !== undefined && value !== '')
      params.set(key, String(value));
  return `/v1/admin/${collection}${params.size ? `?${params}` : ''}`;
}
export function checkPage<T>(page: unknown, label: string) {
  const value = page as { items?: unknown; nextCursor?: unknown } | null;
  if (!Array.isArray(value?.items))
    throw new Error(`${label} 응답 형식이 올바르지 않아요.`);
  return {
    items: value.items as T[],
    nextCursor: typeof value.nextCursor === 'string' ? value.nextCursor : null,
  };
}
// Nested record path, e.g. groups/{id}/albums/{albumId}/photos. Every id
// segment (odd positions) must be a UUID.
export function nestedPath(segments: string[]) {
  segments.forEach((segment, index) => {
    if (index % 2 === 1 && !UUID.test(segment))
      throw new ApiError(400, '올바르지 않은 항목 주소예요.');
  });
  return `/v1/admin/${segments.join('/')}`;
}
