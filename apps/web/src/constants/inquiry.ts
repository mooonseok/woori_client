import type { InquiryCategory } from '../dto/inquiry.dto.ts';
// Server contract (OpenAPI 0.13.0): trimmed lengths and a 24-hour per-member limit.
export const INQUIRY_TITLE_MAX = 100;
export const INQUIRY_BODY_MAX = 2000;
export const INQUIRY_DAILY_LIMIT = 5;
export const INQUIRY_CATEGORIES: readonly InquiryCategory[] = [
  'ACCOUNT',
  'GROUP',
  'PHOTO',
  'NOTIFICATION',
  'BUG',
  'OTHER',
];
export const SERVICE_PAGE_SIZE = 20;
