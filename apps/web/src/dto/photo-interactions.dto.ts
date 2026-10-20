import type { PhotoComment } from './album.dto';
export interface CommentResponse {
  id: string;
  photoId: string;
  author: {
    id: string;
    displayName: string;
    nickname?: string;
    avatarVersion?: number | null;
  };
  body: string;
  kind: 'GENERAL' | 'PIN';
  x: number | null;
  y: number | null;
  createdAt: string;
  canEdit: boolean;
  canDelete: boolean;
}
export interface CommentPage {
  comments: CommentResponse[];
  nextCursor: string | null;
  total: number;
}
export interface ReactionSummary {
  reactions: { emoji: string; count: number }[];
  myReaction: string | null;
  total: number;
}
export interface CommentListState {
  comments: PhotoComment[];
  total: number;
  nextCursor: string | null;
}
