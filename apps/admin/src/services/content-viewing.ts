import type {
  AdminCommentView,
  AdminVideoView,
} from '../dto/content-view.dto.ts';
import { apiImage, post } from './api-client.ts';
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
// Same audit/re-auth rules; the URL is used as is (no cookies to storage).
export const viewVideo = async (
  photoId: string,
  reason: string,
  signal?: AbortSignal
) =>
  post<AdminVideoView>(
    recordPath('photos', photoId, 'video'),
    { reason },
    signal
  );
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
