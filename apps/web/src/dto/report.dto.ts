import type { CursorPage } from './notice.dto.ts';
export type ReportTargetType = 'PHOTO' | 'COMMENT' | 'USER';
export type ReportReason =
  'INAPPROPRIATE' | 'HARASSMENT' | 'PRIVACY' | 'SPAM' | 'OTHER';
export type ReportStatus = 'RECEIVED' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
export interface ReportInput {
  targetType: ReportTargetType;
  targetId: string;
  // Required for USER; the server derives it for PHOTO/COMMENT.
  groupId?: string;
  reason: ReportReason;
  detail?: string;
}
export interface ReportSummary {
  id: string;
  targetType: ReportTargetType;
  reason: ReportReason;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
}
// 201 for a new report, 200 with duplicate: true for an earlier one.
export interface ReportResult extends ReportSummary {
  duplicate: boolean;
}
export type ReportPage = CursorPage<ReportSummary>;
// What the UI is about to report; `name` only labels the dialog.
export interface ReportTarget {
  targetType: ReportTargetType;
  targetId: string;
  groupId?: string;
  name: string;
  // The person behind the target (uploader, author or member), for 차단 follow-up.
  subject?: { id: string; name: string };
}
export interface ReportDraft {
  reason: ReportReason | '';
  detail: string;
}
