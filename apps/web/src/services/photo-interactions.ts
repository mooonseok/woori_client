import { apiRequest } from './api-client.ts';
import type { Point } from '../dto/album.dto.ts';
import type {
  CommentPage,
  CommentResponse,
  ReactionSummary,
} from '../dto/photo-interactions.dto.ts';
const path = (photoId: string, resource: string) =>
  `/v1/photos/${encodeURIComponent(photoId)}/${resource}`;
export function listComments(
  photoId: string,
  cursor: string | null,
  signal: AbortSignal
) {
  return apiRequest<CommentPage>(
    `${path(photoId, 'comments')}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    { signal }
  );
}
export function createComment(
  photoId: string,
  body: string,
  point: Point | undefined,
  signal: AbortSignal
) {
  return apiRequest<{ comment: CommentResponse }>(path(photoId, 'comments'), {
    method: 'POST',
    body: JSON.stringify({
      body: body.trim(),
      kind: point ? 'PIN' : 'GENERAL',
      ...(point ? { x: point.x, y: point.y } : {}),
    }),
    signal,
  });
}
export function editComment(
  photoId: string,
  commentId: string,
  body: string,
  signal: AbortSignal
) {
  return apiRequest<{ comment: CommentResponse }>(
    path(photoId, `comments/${encodeURIComponent(commentId)}`),
    { method: 'PATCH', body: JSON.stringify({ body: body.trim() }), signal }
  );
}
export function deleteComment(
  photoId: string,
  commentId: string,
  signal: AbortSignal
) {
  return apiRequest<void>(
    path(photoId, `comments/${encodeURIComponent(commentId)}`),
    { method: 'DELETE', signal }
  );
}
export function getReactions(photoId: string, signal: AbortSignal) {
  return apiRequest<ReactionSummary>(path(photoId, 'reactions'), { signal });
}
export function setReaction(
  photoId: string,
  emoji: string | null,
  signal: AbortSignal
) {
  return apiRequest<ReactionSummary>(path(photoId, 'reactions'), {
    method: emoji ? 'PUT' : 'DELETE',
    ...(emoji ? { body: JSON.stringify({ emoji }) } : {}),
    signal,
  });
}
