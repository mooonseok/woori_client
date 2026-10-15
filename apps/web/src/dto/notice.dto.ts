export interface NoticeSummary {
  id: string;
  title: string;
  publishedAt: string;
  updatedAt: string;
}
export interface NoticeDetail extends NoticeSummary {
  // Plain text written by operators. Render as text with preserved line breaks, never as HTML.
  body: string;
}
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}
export type NoticePage = CursorPage<NoticeSummary>;
