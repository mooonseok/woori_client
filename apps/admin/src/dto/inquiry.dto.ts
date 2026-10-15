import type {
  INQUIRY_CATEGORIES,
  INQUIRY_STATUSES,
} from '../constants/content-ops.ts';
export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export interface InquiryMember {
  id: string;
  displayName: string;
  username: string;
}
export interface AdminInquirySummary {
  id: string;
  category: InquiryCategory;
  title: string;
  status: InquiryStatus;
  createdAt: string;
  answeredAt: string | null;
  member: InquiryMember;
}
export interface AdminInquiryDetail extends Omit<
  AdminInquirySummary,
  'member'
> {
  body: string;
  answer: string | null;
  member: InquiryMember & { status: MemberStatus | string };
}
export interface InquiryListQuery {
  status: InquiryStatus | null;
  category: InquiryCategory | null;
  cursor: string | null;
  limit?: number;
}
// Operator status changes besides answering.
export type InquiryStatusChange = 'IN_PROGRESS' | 'CLOSED';
