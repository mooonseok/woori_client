// Server contract W06 slice B (OpenAPI 0.17.0): trimmed lengths in code points.
export const NOTICE_TITLE_MAX = 120;
export const NOTICE_BODY_MAX = 10_000;
export const INQUIRY_ANSWER_MAX = 4_000;
export const ACTION_REASON_MAX = 500;
export const VIEW_REASON_MIN = 5;
export const VIEW_REASON_MAX = 500;
export const NOTICE_SCHEDULE_MAX_DAYS = 90;
export const LIST_PAGE_SIZE = 20;
export const NOTICE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export const INQUIRY_STATUSES = [
  'RECEIVED',
  'IN_PROGRESS',
  'ANSWERED',
  'CLOSED',
] as const;
export const INQUIRY_CATEGORIES = [
  'ACCOUNT',
  'GROUP',
  'PHOTO',
  'NOTIFICATION',
  'BUG',
  'OTHER',
] as const;
export const REPORT_STATUSES = [
  'RECEIVED',
  'REVIEWING',
  'RESOLVED',
  'DISMISSED',
] as const;
export const REPORT_TARGET_TYPES = ['PHOTO', 'COMMENT', 'USER'] as const;
export const REPORT_ACTIONS = ['DELETE_CONTENT', 'SUSPEND_USER'] as const;
// Slice C (OpenAPI 0.18.0).
export const DISPLAY_NAME_MAX = 80;
export const SEARCH_MAX = 64;
export const PHOTO_PAGE_SIZE = 30;
export const MEMBER_STATUSES = ['ACTIVE', 'SUSPENDED', 'DELETED'] as const;
export const GROUP_STATUSES = ['ACTIVE', 'DELETING', 'DELETED'] as const;
