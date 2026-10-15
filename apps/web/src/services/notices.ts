import { apiRequest } from './api-client.ts';
import { SERVICE_PAGE_SIZE } from '../constants/inquiry.ts';
import type { NoticeDetail, NoticePage } from '../dto/notice.dto.ts';

const root = '/v1/notices';
export function listNotices(cursor: string | null, signal: AbortSignal) {
  const query = new URLSearchParams({ limit: String(SERVICE_PAGE_SIZE) });
  if (cursor) query.set('cursor', cursor);
  return apiRequest<NoticePage>(`${root}?${query}`, { signal });
}
export function getNotice(noticeId: string, signal: AbortSignal) {
  return apiRequest<NoticeDetail>(`${root}/${encodeURIComponent(noticeId)}`, {
    signal,
  });
}
