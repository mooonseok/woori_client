import { LIST_PAGE_SIZE } from '../constants/content-ops.ts';
import type { CursorPage } from '../dto/audit-log.dto.ts';
import type {
  AdminNoticeDetail,
  AdminNoticeSummary,
  NoticeInput,
  NoticeListQuery,
} from '../dto/notice.dto.ts';
import { apiRequest, post } from './api-client.ts';
import { checkPage, listPath, recordPath } from './admin-paths.ts';

export async function listNotices(
  { status, cursor, limit }: NoticeListQuery,
  signal?: AbortSignal
): Promise<CursorPage<AdminNoticeSummary>> {
  const path = listPath('notices', {
    status,
    cursor,
    limit: limit ?? LIST_PAGE_SIZE,
  });
  return checkPage(await apiRequest(path, { signal }), '공지 목록');
}
export const getNotice = async (id: string, signal?: AbortSignal) =>
  apiRequest<AdminNoticeDetail>(recordPath('notices', id), { signal });
export const createNotice = async (input: NoticeInput) =>
  post<AdminNoticeDetail>('/v1/admin/notices', input);
export const updateNotice = async (id: string, patch: Partial<NoticeInput>) =>
  apiRequest<AdminNoticeDetail>(recordPath('notices', id), {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
// publishAt omitted = publish now; otherwise an ISO time (scheduled).
export const publishNotice = async (id: string, publishAt?: string) =>
  post<AdminNoticeDetail>(
    recordPath('notices', id, 'publish'),
    publishAt ? { publishAt } : {}
  );
export const archiveNotice = async (id: string) =>
  post<AdminNoticeDetail>(recordPath('notices', id, 'archive'));
