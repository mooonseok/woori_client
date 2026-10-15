import type { CursorPage } from './notice.dto.ts';
export type InquiryCategory =
  'ACCOUNT' | 'GROUP' | 'PHOTO' | 'NOTIFICATION' | 'BUG' | 'OTHER';
export type InquiryStatus = 'RECEIVED' | 'IN_PROGRESS' | 'ANSWERED' | 'CLOSED';
export interface InquirySummary {
  id: string;
  category: InquiryCategory;
  title: string;
  status: InquiryStatus;
  createdAt: string;
  answeredAt: string | null;
}
export interface InquiryDetail extends InquirySummary {
  body: string;
  answer: string | null;
}
export type InquiryPage = CursorPage<InquirySummary>;
export interface InquiryInput {
  category: InquiryCategory;
  title: string;
  body: string;
}
export type InquiryField = 'category' | 'title' | 'body';
export interface InquiryDraft {
  category: InquiryCategory | '';
  title: string;
  body: string;
}
export type InquiryFieldErrors = Partial<Record<InquiryField, string>>;
