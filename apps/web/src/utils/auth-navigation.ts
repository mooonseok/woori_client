import { MY_SUB_ROUTES, PUBLIC_ROUTES, ROUTES } from '../constants/routes.ts';
import { isUuid } from './service-guidance.ts';
function routeOf(path: string) {
  return path.replace(/\/$/, '') || '/';
}
export function isPublicRoute(path: string) {
  return PUBLIC_ROUTES.includes(routeOf(path));
}
// Which main tab is current: an album belongs to 앨범, and 마이페이지
// sub-screens stay on 마이페이지 for a signed-in (or demo) member.
export function currentTab(path: string, member: boolean): string | null {
  const route = routeOf(path);
  if (route === ROUTES.ALBUM) return ROUTES.ALBUMS;
  if (member && MY_SUB_ROUTES.includes(route)) return ROUTES.MY;
  return (
    [ROUTES.HOME, ROUTES.ALBUMS, ROUTES.MY].find((tab) => tab === route) ?? null
  );
}
// Service guidance pages keep only their own validated record id across login.
const serviceReturnRoutes = new Map<string, { list: string; detail: boolean }>([
  [ROUTES.NOTICES, { list: ROUTES.NOTICES, detail: false }],
  [ROUTES.NOTICE, { list: ROUTES.NOTICES, detail: true }],
  [ROUTES.INQUIRIES, { list: ROUTES.INQUIRIES, detail: false }],
  [ROUTES.INQUIRY_NEW, { list: ROUTES.INQUIRY_NEW, detail: false }],
  [ROUTES.INQUIRY, { list: ROUTES.INQUIRIES, detail: true }],
  [ROUTES.REPORTS, { list: ROUTES.REPORTS, detail: false }],
  [ROUTES.BLOCKS, { list: ROUTES.BLOCKS, detail: false }],
]);
export function safeReturnTo(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\r\n]/.test(value)
  )
    return '/';
  try {
    const url = new URL(value, 'https://woori.invalid');
    if (url.origin !== 'https://woori.invalid') return '/';
    // Only explicit invitation, notification and service-guidance targets survive authentication.
    const route = url.pathname.replace(/\/$/, '');
    if (route === '/notifications') {
      const id = url.searchParams.get('notificationId');
      return id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id
        )
        ? `/notifications?notificationId=${id}`
        : '/notifications';
    }
    const service = serviceReturnRoutes.get(route);
    if (service) {
      const id = url.searchParams.get('id');
      return service.detail && isUuid(id) ? `${route}?id=${id}` : service.list;
    }
    if (route !== '/invite' && route !== '/verify-email') return '/';
    const result = new URLSearchParams();
    const token = url.searchParams.get('token'),
      code = url.searchParams.get('code');
    if (token && /^[a-zA-Z0-9_-]{16,200}$/.test(token))
      result.set('token', token);
    else if (code && /^[a-zA-Z0-9-]{4,32}$/.test(code))
      result.set('code', code);
    if (route === '/verify-email') {
      const next = url.searchParams.get('next');
      if (next?.startsWith('/invite')) result.set('next', safeReturnTo(next));
    }
    return `${route}${result.size ? `?${result}` : ''}`;
  } catch {
    return '/';
  }
}
export function authDestination(
  path: '/login' | '/signup' | '/verify-email',
  next: string
) {
  return `${path}?next=${encodeURIComponent(safeReturnTo(next))}`;
}
