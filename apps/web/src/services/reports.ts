import { apiRequest } from './api-client.ts';
import { SERVICE_PAGE_SIZE } from '../constants/inquiry.ts';
import type {
  ReportInput,
  ReportPage,
  ReportResult,
} from '../dto/report.dto.ts';

const root = '/v1/reports';
// 201 creates a report; 200 returns the caller's earlier report (duplicate: true).
export function createReport(input: ReportInput, signal?: AbortSignal) {
  const body: ReportInput = {
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
  };
  if (input.groupId) body.groupId = input.groupId;
  if (input.detail) body.detail = input.detail;
  return apiRequest<ReportResult>(root, {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });
}
export function listReports(cursor: string | null, signal: AbortSignal) {
  const query = new URLSearchParams({ limit: String(SERVICE_PAGE_SIZE) });
  if (cursor) query.set('cursor', cursor);
  return apiRequest<ReportPage>(`${root}?${query}`, { signal });
}
