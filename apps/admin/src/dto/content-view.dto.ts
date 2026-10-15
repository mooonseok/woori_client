export type ContentViewKind = 'photo' | 'comment';
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
