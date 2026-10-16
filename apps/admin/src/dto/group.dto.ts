import type { GROUP_STATUSES } from '../constants/content-ops.ts';
export type AdminGroupStatus = (typeof GROUP_STATUSES)[number];
export interface AdminGroupSummary {
  id: string;
  name: string;
  status: AdminGroupStatus | string;
  owner: { id: string; displayName: string } | null;
  memberCount: number;
  albumCount: number;
  photoCount: number;
  usedBytes: number;
  quotaBytes: number;
  createdAt: string;
}
export interface AdminGroupMember {
  user: { id: string; displayName: string; status: string };
  role: string;
  status: string;
  joinedAt: string | null;
}
export interface AdminGroupAlbum {
  id: string;
  title: string;
  photoCount: number;
  createdAt: string;
  deletedAt: string | null;
}
export interface AdminGroupDetail extends AdminGroupSummary {
  members: AdminGroupMember[];
  albums: AdminGroupAlbum[];
}
// Metadata only; bytes come solely from the audited photo view.
export interface AdminAlbumPhoto {
  id: string;
  status: string;
  uploader: { id: string; displayName: string } | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  effectiveDate: string | null;
  createdAt: string;
  // OpenAPI 0.22.0: VIDEO plays via the audited video view.
  mediaKind?: 'PHOTO' | 'VIDEO';
  durationMs?: number | null;
}
export interface GroupListQuery {
  query: string;
  status: AdminGroupStatus | null;
  cursor: string | null;
  limit?: number;
}
