import type { NOTICE_STATUSES } from '../constants/content-ops.ts';
export type NoticeStatus = (typeof NOTICE_STATUSES)[number];
export interface AdminNoticeSummary {
  id: string;
  title: string;
  status: NoticeStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // PUBLISHED with publishedAt in the future: hidden from members until then.
  scheduled: boolean;
}
export interface AdminNoticeDetail {
  id: string;
  title: string;
  // Operator plain text; members see it with line breaks, never as HTML.
  body: string;
  status: NoticeStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface NoticeInput {
  title: string;
  body: string;
}
export type NoticeField = keyof NoticeInput;
export type NoticeFieldErrors = Partial<Record<NoticeField, string>>;
export interface NoticeListQuery {
  status: NoticeStatus | null;
  cursor: string | null;
  limit?: number;
}
// What members currently see for a notice.
export type NoticeVisibility = 'visible' | 'scheduled' | 'hidden';
