import { AUDIT_PAGE_SIZE } from '../constants/admin-auth.ts';
import type {
  AuditLogEntry,
  AuditLogQuery,
  CursorPage,
} from '../dto/audit-log.dto.ts';
import { apiRequest } from './api-client.ts';
import { checkPage } from './admin-paths.ts';

export function auditLogsPath({ cursor, action, limit }: AuditLogQuery) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit ?? AUDIT_PAGE_SIZE));
  if (action) params.set('action', action);
  return `/v1/admin/audit-logs?${params}`;
}
export async function listAuditLogs(
  query: AuditLogQuery,
  signal?: AbortSignal
): Promise<CursorPage<AuditLogEntry>> {
  return checkPage(
    await apiRequest(auditLogsPath(query), { signal }),
    '감사 기록'
  );
}
