import {
  NAV_ITEMS,
  RETURNABLE_ROUTES,
  ROUTES,
  SUB_ROUTES,
} from '../constants/routes.ts';
import type {
  AdminMfaState,
  AdminSessionStatus,
  SessionEndReason,
} from '../dto/admin-auth.dto.ts';

export function routeOf(path: string) {
  return path.replace(/\/+$/, '') || '/';
}
export type RouteKind = 'login' | 'mfa' | 'mfa-setup' | 'protected';
export function routeKind(path: string): RouteKind {
  const route = routeOf(path);
  if (route === ROUTES.LOGIN) return 'login';
  if (route === ROUTES.MFA) return 'mfa';
  if (route === ROUTES.MFA_SETUP) return 'mfa-setup';
  return 'protected';
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID.test(value);
}
// Detail URL for a record screen such as /report?id=<uuid>.
export function detailHref(route: string, id: string) {
  return `${route}?id=${encodeURIComponent(id)}`;
}
// The menu a screen belongs to (detail screens highlight their list).
export function navHrefOf(path: string) {
  const route = routeOf(path);
  const sub = Object.hasOwn(SUB_ROUTES, route) ? SUB_ROUTES[route] : null;
  if (sub) return sub.menu;
  return NAV_ITEMS.some((item) => item.href === route) ? route : null;
}

// Only same-origin admin screens survive login; anything else becomes the
// dashboard. Query strings are dropped except a validated record id.
export function safeReturnTo(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\r\n\t]/.test(value)
  )
    return ROUTES.DASHBOARD;
  try {
    const url = new URL(value, 'https://admin.invalid');
    if (url.origin !== 'https://admin.invalid') return ROUTES.DASHBOARD;
    const route = routeOf(url.pathname);
    if (!RETURNABLE_ROUTES.includes(route)) return ROUTES.DASHBOARD;
    const sub = Object.hasOwn(SUB_ROUTES, route) ? SUB_ROUTES[route] : null;
    if (!sub?.detail) return route;
    const id = url.searchParams.get('id');
    return isUuid(id) ? detailHref(route, id) : sub.menu;
  } catch {
    return ROUTES.DASHBOARD;
  }
}

const END_REASONS: readonly SessionEndReason[] = [
  'expired',
  'logout',
  'mfa-failed',
];
export function endReasonOf(value: string | null | undefined) {
  return END_REASONS.find((reason) => reason === value) ?? null;
}
export function withNext(
  path: string,
  next: string | null | undefined,
  reason?: SessionEndReason | null
) {
  const params = new URLSearchParams();
  const target = safeReturnTo(next);
  if (target !== ROUTES.DASHBOARD) params.set('next', target);
  if (reason) params.set('reason', reason);
  return params.size ? `${path}?${params}` : path;
}

export function mfaRoute(mfa: AdminMfaState) {
  if (mfa === 'SETUP_REQUIRED') return ROUTES.MFA_SETUP;
  if (mfa === 'REQUIRED') return ROUTES.MFA;
  return null;
}
// Where a successful password login continues: always into an MFA step.
export function loginDestination(
  mfa: AdminMfaState,
  next: string | null | undefined
) {
  const step = mfaRoute(mfa);
  return step ? withNext(step, next) : safeReturnTo(next);
}

export type GateDecision =
  | { type: 'loading' }
  | { type: 'error' }
  | { type: 'render' }
  | { type: 'redirect'; to: string };
export interface GateInput {
  // Current pathname and search (search may be '').
  path: string;
  search: string;
  status: AdminSessionStatus;
  mfa: AdminMfaState | null;
  endReason: SessionEndReason | null;
}
// One decision table for every admin screen: anonymous → login, pre-MFA →
// the matching MFA step, verified → the console (never back to login/MFA).
export function gateDecision({
  path,
  search,
  status,
  mfa,
  endReason,
}: GateInput): GateDecision {
  const kind = routeKind(path);
  const route = routeOf(path);
  const params = new URLSearchParams(search);
  // On login/MFA screens the pending destination travels in ?next=.
  const next = kind === 'protected' ? `${route}${search}` : params.get('next');
  if (status === 'loading') return { type: 'loading' };
  if (status === 'error')
    return kind === 'login' ? { type: 'render' } : { type: 'error' };
  if (status === 'anonymous' || !mfa) {
    if (kind === 'login') return { type: 'render' };
    return {
      type: 'redirect',
      to: withNext(
        ROUTES.LOGIN,
        endReason === 'logout' ? null : next,
        endReason
      ),
    };
  }
  const step = mfaRoute(mfa);
  if (step) {
    if (route === step) return { type: 'render' };
    return { type: 'redirect', to: withNext(step, next) };
  }
  if (kind === 'protected') return { type: 'render' };
  return { type: 'redirect', to: safeReturnTo(next) };
}
