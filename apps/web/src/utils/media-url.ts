// Media is served by the authenticated API. Never send a session cookie or
// navigate a download to a storage URL returned by a stale/misconfigured API.
export function authenticatedMediaUrl(value: string, expectedPath: string) {
  const base = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? '');
  const url = new URL(value, base);
  if (
    !['https:', 'http:'].includes(base.protocol) ||
    url.origin !== base.origin ||
    url.username ||
    url.password ||
    url.hash ||
    url.pathname !== expectedPath
  )
    throw new Error('동영상 주소가 올바르지 않아요. 다시 열어 주세요.');
  return url.href;
}
