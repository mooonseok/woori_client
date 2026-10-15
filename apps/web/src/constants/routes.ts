export const ROUTES = {
  HOME: '/',
  ALBUMS: '/albums',
  ALBUM: '/album',
  MY: '/mypage',
  NOTIFICATIONS: '/notifications',
  SETTINGS: '/notification-settings',
  NOTICES: '/notices',
  NOTICE: '/notice',
  HELP: '/help',
  INQUIRIES: '/inquiries',
  INQUIRY_NEW: '/inquiries/new',
  INQUIRY: '/inquiry',
  PRIVACY: '/privacy',
  REPORTS: '/reports',
  BLOCKS: '/blocks',
} as const;
// Routes that render without a signed-in member. Everything else goes through AccountGate.
export const PUBLIC_ROUTES: readonly string[] = [
  '/login',
  '/signup',
  '/invite',
  '/verify-email',
  '/find-id',
  '/forgot-password',
  '/reset-password',
  '/change-email',
  '/account-deleted',
  ROUTES.HELP,
  ROUTES.PRIVACY,
];
// Screens reached from 마이페이지; the bottom tab stays on 마이페이지 for members.
export const MY_SUB_ROUTES: readonly string[] = [
  ROUTES.NOTICES,
  ROUTES.NOTICE,
  ROUTES.INQUIRIES,
  ROUTES.INQUIRY_NEW,
  ROUTES.INQUIRY,
  ROUTES.HELP,
  ROUTES.PRIVACY,
  ROUTES.REPORTS,
  ROUTES.BLOCKS,
];
export const SORT = { RECENT: 'recent', TAKEN: 'taken' } as const;
