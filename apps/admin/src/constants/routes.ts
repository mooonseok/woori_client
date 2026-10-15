export const ROUTES = {
  DASHBOARD: '/',
  LOGIN: '/login',
  MFA: '/mfa',
  MFA_SETUP: '/mfa/setup',
  NOTICES: '/notices',
  NOTICE_NEW: '/notices/new',
  NOTICE: '/notice',
  INQUIRIES: '/inquiries',
  INQUIRY: '/inquiry',
  REPORTS: '/reports',
  REPORT: '/report',
  MEMBERS: '/members',
  MEMBER: '/member',
  GROUPS: '/groups',
  GROUP: '/group',
  AUDIT_LOGS: '/audit-logs',
} as const;
export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
  // false: the menu exists but its server API arrives in a later slice.
  ready: boolean;
}
export const NAV_ITEMS: readonly AdminNavItem[] = [
  { href: ROUTES.DASHBOARD, label: '대시보드', icon: 'home', ready: true },
  { href: ROUTES.NOTICES, label: '공지', icon: 'bell', ready: true },
  { href: ROUTES.INQUIRIES, label: '문의', icon: 'comment', ready: true },
  { href: ROUTES.REPORTS, label: '신고', icon: 'flag', ready: true },
  { href: ROUTES.MEMBERS, label: '회원', icon: 'user', ready: true },
  { href: ROUTES.GROUPS, label: '그룹', icon: 'users', ready: true },
  { href: ROUTES.AUDIT_LOGS, label: '감사로그', icon: 'clock', ready: true },
];
// Detail/sub screens and the menu they belong to. Detail screens take ?id=.
export const SUB_ROUTES: Readonly<
  Record<string, { menu: string; detail: boolean }>
> = {
  [ROUTES.NOTICE_NEW]: { menu: ROUTES.NOTICES, detail: false },
  [ROUTES.NOTICE]: { menu: ROUTES.NOTICES, detail: true },
  [ROUTES.INQUIRY]: { menu: ROUTES.INQUIRIES, detail: true },
  [ROUTES.REPORT]: { menu: ROUTES.REPORTS, detail: true },
  [ROUTES.MEMBER]: { menu: ROUTES.MEMBERS, detail: true },
  [ROUTES.GROUP]: { menu: ROUTES.GROUPS, detail: true },
};
// Screens a signed-in, MFA-verified admin may return to after login.
export const RETURNABLE_ROUTES: readonly string[] = [
  ...NAV_ITEMS.map((item) => item.href),
  ...Object.keys(SUB_ROUTES),
];
