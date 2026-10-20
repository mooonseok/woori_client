import { memberNickname } from './nickname.ts';
import type { PhotoComment } from '../dto/album.dto.ts';
import type { CommentResponse } from '../dto/photo-interactions.dto.ts';
export function commentModel(comment: CommentResponse): PhotoComment {
  return {
    id: comment.id,
    photoId: comment.photoId,
    authorId: comment.author.id,
    authorName: memberNickname(comment.author),
    authorAvatarVersion: comment.author.avatarVersion ?? null,
    body: comment.body,
    createdAt: comment.createdAt,
    canEdit: comment.canEdit,
    canDelete: comment.canDelete,
    ...(comment.kind === 'PIN' && comment.x !== null && comment.y !== null
      ? { point: { x: comment.x, y: comment.y } }
      : {}),
  };
}
export function mergeComments(
  existing: PhotoComment[],
  incoming: PhotoComment[]
) {
  const ids = new Set(existing.map((comment) => comment.id));
  return [...existing, ...incoming.filter((comment) => !ids.has(comment.id))];
}
