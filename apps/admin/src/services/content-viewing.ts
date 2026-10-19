import type {
  AdminCommentView,
  AdminVideoView,
} from '../dto/content-view.dto.ts';
import {
  apiImage,
  post,
  ApiError,
  currentSessionRevision,
} from './api-client.ts';
import { authenticatedMediaUrl } from '../utils/media-url.ts';
import { recordPath } from './admin-paths.ts';

// Audited views of member content. Both require a recent re-authentication
// and a written reason; the server records who looked and why. The photo is
// the display variant only (never the original) and is not cached.
export const viewPhoto = async (
  photoId: string,
  reason: string,
  signal?: AbortSignal
) =>
  apiImage(recordPath('photos', photoId, 'view'), {
    method: 'POST',
    headers: { Accept: 'image/*' },
    body: JSON.stringify({ reason }),
    signal,
  });
// Audited, short-lived ticket bound to the current API session.
export const viewVideo = async (
  photoId: string,
  reason: string,
  signal?: AbortSignal
) => {
  const revision = currentSessionRevision();
  const path = recordPath('photos', photoId, 'video');
  const access = await post<AdminVideoView>(path, { reason }, signal);
  signal?.throwIfAborted();
  if (revision !== currentSessionRevision())
    throw new ApiError(401, '관리자 로그인이 바뀌었어요. 다시 열람해 주세요.');
  const expires = Date.parse(access.expiresAt);
  if (!Number.isFinite(expires) || expires <= Date.now())
    throw new ApiError(
      502,
      '동영상 열람 시간이 올바르지 않아요. 다시 열람해 주세요.'
    );
  return {
    ...access,
    url: authenticatedMediaUrl(access.url, `${path}/content`),
  };
};
export const viewComment = async (
  commentId: string,
  reason: string,
  signal?: AbortSignal
) =>
  post<AdminCommentView>(
    recordPath('comments', commentId, 'view'),
    { reason },
    signal
  );
