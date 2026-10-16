export type ContentViewKind = 'photo' | 'video' | 'comment';
// POST /v1/admin/photos/{id}/video: the transcoded MP4 as a 10-minute signed
// inline URL (audited ADMIN_VIDEO_VIEWED); no original exists.
export interface AdminVideoView {
  url: string;
  expiresAt: string;
  mime: 'video/mp4';
  bytes: number;
  durationMs: number | null;
}
// What the audited viewer is asked to open; label names it in the dialog.
export interface ContentViewTarget {
  kind: ContentViewKind;
  id: string;
  label: string;
}
export interface AdminCommentView {
  id: string;
  photoId: string;
  kind: string;
  body: string;
  x: number | null;
  y: number | null;
  createdAt: string;
  deletedAt: string | null;
  author: { id: string; displayName: string } | null;
}
