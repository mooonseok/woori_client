import type { ReportReason } from '../dto/report.dto.ts';
// Server contract (OpenAPI 0.14.0).
export const REPORT_DETAIL_MAX = 500;
export const REPORT_DAILY_LIMIT = 20;
export const REPORT_REASONS: readonly ReportReason[] = [
  'INAPPROPRIATE',
  'HARASSMENT',
  'PRIVACY',
  'SPAM',
  'OTHER',
];
