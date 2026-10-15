import { LIST_PAGE_SIZE } from '../constants/content-ops.ts';
import type { CursorPage } from '../dto/audit-log.dto.ts';
import type {
  AdminReportDetail,
  AdminReportSummary,
  ReportAction,
  ReportActionResult,
  ReportListQuery,
} from '../dto/report.dto.ts';
import { apiRequest, post } from './api-client.ts';
import { checkPage, listPath, recordPath } from './admin-paths.ts';

export async function listReports(
  { status, targetType, cursor, limit }: ReportListQuery,
  signal?: AbortSignal
): Promise<CursorPage<AdminReportSummary>> {
  const path = listPath('reports', {
    status,
    targetType,
    cursor,
    limit: limit ?? LIST_PAGE_SIZE,
  });
  return checkPage(await apiRequest(path, { signal }), '신고 목록');
}
// Opening a detail writes an ADMIN_REPORT_VIEWED audit row on the server.
export const getReport = async (id: string, signal?: AbortSignal) =>
  apiRequest<AdminReportDetail>(recordPath('reports', id), { signal });
type ActionResponse = Partial<AdminReportDetail> & ReportActionResult;
export const reviewReport = async (id: string) =>
  post<ActionResponse>(recordPath('reports', id, 'review'));
export const dismissReport = async (id: string, reason: string) =>
  post<ActionResponse>(recordPath('reports', id, 'dismiss'), { reason });
// Requires a re-authentication within 10 minutes (403 ADMIN_REAUTH_REQUIRED).
export const resolveReport = async (
  id: string,
  action: ReportAction,
  reason: string
) =>
  post<ActionResponse>(recordPath('reports', id, 'resolve'), {
    action,
    reason,
  });
