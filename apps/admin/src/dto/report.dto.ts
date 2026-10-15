import type {
  REPORT_ACTIONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
} from '../constants/content-ops.ts';
export type ReportStatus = (typeof REPORT_STATUSES)[number];
// OPEN = RECEIVED + REVIEWING (server default, oldest first).
export type ReportStatusFilter = 'OPEN' | ReportStatus;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];
export type ReportReason =
  'INAPPROPRIATE' | 'HARASSMENT' | 'PRIVACY' | 'SPAM' | 'OTHER';
export type ReportResolution =
  'CONTENT_DELETED' | 'USER_SUSPENDED' | 'NO_ACTION';
export type ReportAction = (typeof REPORT_ACTIONS)[number];
export interface AdminReportSummary {
  id: string;
  targetType: ReportTargetType;
  reason: ReportReason | string;
  status: ReportStatus;
  resolution: ReportResolution | null;
  createdAt: string;
  resolvedAt: string | null;
  group: { id: string; name: string; status: string } | null;
  // A withdrawn reporter stays as { displayName: '탈퇴한 회원', status:
  // 'DELETED' } (status arrives with OpenAPI 0.18.0); null is tolerated.
  reporter: { id: string; displayName: string; status?: string } | null;
  targetUser: { id: string; displayName: string; status: string } | null;
  openReportsOnTarget: number;
}
export interface PhotoReportTarget {
  photoId: string;
  albumId: string;
  albumTitle: string;
  status: string;
  uploadedAt: string | null;
}
export interface CommentReportTarget {
  commentId: string;
  photoId: string;
  kind: string;
  deleted: boolean;
  createdAt: string;
}
export interface UserReportTarget {
  userId: string;
  membershipStatus: string;
}
export interface AdminReportDetail extends AdminReportSummary {
  // Reporter's free text; null when none was written or it was anonymized.
  detail: string | null;
  target:
    | PhotoReportTarget
    | CommentReportTarget
    | UserReportTarget
    | null
    | undefined;
}
export interface ReportListQuery {
  status: ReportStatusFilter;
  targetType: ReportTargetType | null;
  cursor: string | null;
  limit?: number;
}
export interface ReportActionResult {
  alsoResolved?: number;
}
