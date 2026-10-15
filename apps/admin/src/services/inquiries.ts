import { LIST_PAGE_SIZE } from '../constants/content-ops.ts';
import type { CursorPage } from '../dto/audit-log.dto.ts';
import type {
  AdminInquiryDetail,
  AdminInquirySummary,
  InquiryListQuery,
  InquiryStatusChange,
} from '../dto/inquiry.dto.ts';
import { apiRequest, post } from './api-client.ts';
import { checkPage, listPath, recordPath } from './admin-paths.ts';

export async function listInquiries(
  { status, category, cursor, limit }: InquiryListQuery,
  signal?: AbortSignal
): Promise<CursorPage<AdminInquirySummary>> {
  const path = listPath('inquiries', {
    status,
    category,
    cursor,
    limit: limit ?? LIST_PAGE_SIZE,
  });
  return checkPage(await apiRequest(path, { signal }), '문의 목록');
}
// Opening a detail writes an ADMIN_INQUIRY_VIEWED audit row on the server.
export const getInquiry = async (id: string, signal?: AbortSignal) =>
  apiRequest<AdminInquiryDetail>(recordPath('inquiries', id), { signal });
export const answerInquiry = async (id: string, answer: string) =>
  post<Partial<AdminInquiryDetail>>(recordPath('inquiries', id, 'answer'), {
    answer,
  });
export const changeInquiryStatus = async (
  id: string,
  status: InquiryStatusChange
) =>
  post<Partial<AdminInquiryDetail>>(recordPath('inquiries', id, 'status'), {
    status,
  });
