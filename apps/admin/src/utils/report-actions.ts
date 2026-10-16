import type {
  AdminReportSummary,
  ReportAction,
  ReportStatus,
  ReportTargetType,
} from '../dto/report.dto.ts';

export function isReportOpen(status: ReportStatus) {
  return status === 'RECEIVED' || status === 'REVIEWING';
}
// Deleting content only applies to photos and comments; any target's
// responsible member (uploader, author or reported member) can be suspended.
export function allowedReportActions(
  targetType: ReportTargetType
): ReportAction[] {
  return targetType === 'USER'
    ? ['SUSPEND_USER']
    : ['DELETE_CONTENT', 'SUSPEND_USER'];
}
export type ReporterTextState =
  { kind: 'text'; text: string } | { kind: 'removed' } | { kind: 'none' };
// The reporter's text is erased when their account is deleted (status
// DELETED, detail null); any other null detail means none was written.
// Decided by status, never by the display name.
export function reporterTextState(
  detail: string | null | undefined,
  reporter: AdminReportSummary['reporter']
): ReporterTextState {
  if (typeof detail === 'string' && detail.trim())
    return { kind: 'text', text: detail };
  return reporter.status === 'DELETED' ? { kind: 'removed' } : { kind: 'none' };
}
