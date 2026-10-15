import { apiRequest } from './api-client.ts';
import { albumPath } from './media-client.ts';
import type { MemoriesResponse, MemoryKind } from '../dto/memories.dto.ts';
import type { PhotoResponse } from '../dto/media.dto.ts';
export const MEMORIES_CHANGED = 'woori:memories-changed';
export function listMemories(
  groupId: string,
  kind: MemoryKind,
  cursor: string | null,
  signal: AbortSignal
) {
  const query = new URLSearchParams({ kind, limit: '12' });
  if (cursor) query.set('cursor', cursor);
  return apiRequest<MemoriesResponse>(
    `/v1/groups/${encodeURIComponent(groupId)}/memories?${query}`,
    { signal }
  );
}
export function setMemoryHidden(
  groupId: string,
  photoId: string,
  hidden: boolean,
  signal: AbortSignal
) {
  return apiRequest<void>(
    `/v1/groups/${encodeURIComponent(groupId)}/memories/${encodeURIComponent(photoId)}/hidden`,
    { method: hidden ? 'PUT' : 'DELETE', signal }
  );
}
export function updateCaptureDate(
  groupId: string,
  albumId: string,
  photoId: string,
  date: string | null,
  signal: AbortSignal
) {
  return apiRequest<{ photo: PhotoResponse }>(
    `${albumPath(groupId, albumId)}/photos/${encodeURIComponent(photoId)}/capture-date`,
    { method: 'PATCH', body: JSON.stringify({ date }), signal }
  );
}
