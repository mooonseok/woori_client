import type { MEMBER_STATUSES } from '../constants/content-ops.ts';
export type AdminMemberStatus = (typeof MEMBER_STATUSES)[number];
export interface AdminMemberSummary {
  id: string;
  username: string;
  displayName: string;
  // "ab***@example.com"; null for deleted accounts. Never the full address.
  emailMasked: string | null;
  status: AdminMemberStatus;
  emailVerified: boolean;
  createdAt: string;
  activeGroupCount: number;
}
export interface AdminMembership {
  group: { id: string; name: string; status: string };
  role: string;
  status: string;
  joinedAt: string | null;
}
export interface AdminMemberCounts {
  photos: number;
  comments: number;
  openReportsAgainst: number;
  openReportsFiled: number;
  inquiries: number;
}
export interface AdminMemberDetail extends AdminMemberSummary {
  memberships: AdminMembership[];
  counts: AdminMemberCounts;
}
export interface MemberListQuery {
  query: string;
  status: AdminMemberStatus | null;
  cursor: string | null;
  limit?: number;
}
export interface OwnedGroup {
  id: string;
  name: string;
}
export type MemberAction = 'rename' | 'suspend' | 'unsuspend' | 'delete';
