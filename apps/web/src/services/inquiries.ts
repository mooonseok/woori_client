import { apiRequest } from './api-client.ts';
import { SERVICE_PAGE_SIZE } from '../constants/inquiry.ts';
import type {
  InquiryDetail,
  InquiryInput,
  InquiryPage,
} from '../dto/inquiry.dto.ts';

const root = '/v1/inquiries';
export function listInquiries(cursor: string | null, signal: AbortSignal) {
  const query = new URLSearchParams({ limit: String(SERVICE_PAGE_SIZE) });
  if (cursor) query.set('cursor', cursor);
  return apiRequest<InquiryPage>(`${root}?${query}`, { signal });
}
export function getInquiry(inquiryId: string, signal: AbortSignal) {
  return apiRequest<InquiryDetail>(`${root}/${encodeURIComponent(inquiryId)}`, {
    signal,
  });
}
export function createInquiry(input: InquiryInput, signal?: AbortSignal) {
  return apiRequest<InquiryDetail>(root, {
    method: 'POST',
    body: JSON.stringify({
      category: input.category,
      title: input.title,
      body: input.body,
    }),
    signal,
  });
}
