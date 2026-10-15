import { apiRequest, apiBlob, ApiError } from './api-client.ts';
import type {
  AlbumResponse,
  PhotoResponse,
  PendingUpload,
  UploadJobResponse,
  UploadProgress,
} from '../dto/media.dto.ts';
export const albumPath = (groupId: string, albumId?: string) =>
  `/v1/groups/${encodeURIComponent(groupId)}/albums${albumId ? `/${encodeURIComponent(albumId)}` : ''}`;
export function validatePhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error(
      'JPG, PNG, WebP 사진만 올릴 수 있어요. HEIC 사진은 JPG로 변환해 주세요.'
    );
  if (!file.size || file.size > 30 * 1024 * 1024)
    throw new Error('사진 한 장은 30MB 이하여야 해요.');
}
export function listAlbums(groupId: string, signal: AbortSignal) {
  return apiRequest<{ albums: AlbumResponse[] }>(albumPath(groupId), {
    signal,
  });
}
export function createAlbum(
  groupId: string,
  title: string,
  signal: AbortSignal
) {
  return apiRequest<{ album: AlbumResponse }>(albumPath(groupId), {
    method: 'POST',
    body: JSON.stringify({ title: title.trim() }),
    signal,
  });
}
export function listPhotos(
  groupId: string,
  albumId: string,
  cursor: string | null,
  signal: AbortSignal
) {
  return apiRequest<{ photos: PhotoResponse[]; nextCursor: string | null }>(
    `${albumPath(groupId, albumId)}/photos${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    { signal }
  );
}
export function photoBlob(
  groupId: string,
  albumId: string,
  photoId: string,
  signal: AbortSignal,
  variant = 'display'
) {
  return apiBlob(
    `${albumPath(groupId, albumId)}/photos/${encodeURIComponent(photoId)}/content?variant=${variant}`,
    signal
  );
}
async function sendPhoto(
  groupId: string,
  albumId: string,
  file: File,
  pending: PendingUpload,
  signal: AbortSignal,
  onProgress?: (phase: UploadProgress['phase']) => void
): Promise<{ path: string; ticket: NonNullable<PendingUpload['ticket']> }> {
  signal.throwIfAborted();
  validatePhoto(file);
  const path = albumPath(groupId, albumId);
  onProgress?.('RESERVING');
  if (!pending.ticket)
    pending.ticket = await apiRequest(`${path}/uploads`, {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        bytes: file.size,
      }),
      signal,
    });
  signal.throwIfAborted();
  const ticket = pending.ticket!;
  if (!pending.uploaded) {
    onProgress?.('UPLOADING');
    let response: Response;
    try {
      response = await fetch(ticket.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: ticket.headers,
        credentials: 'omit',
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw error;
      throw new Error(
        '사진을 전송하지 못했어요. 연결을 확인하고 다시 시도해 주세요.'
      );
    }
    if (!response.ok) {
      if (response.status === 403) pending.ticket = undefined;
      throw new Error('사진 전송에 실패했어요. 다시 시도해 주세요.');
    }
    signal.throwIfAborted();
    pending.uploaded = true;
  }
  return { path, ticket };
}
export async function uploadPhoto(
  groupId: string,
  albumId: string,
  file: File,
  pending: PendingUpload,
  signal: AbortSignal
): Promise<PhotoResponse> {
  const { path, ticket } = await sendPhoto(
    groupId,
    albumId,
    file,
    pending,
    signal
  );
  try {
    const { photo } = await apiRequest<{ photo: PhotoResponse }>(
      `${path}/photos/${encodeURIComponent(ticket.photoId)}/complete`,
      { method: 'POST', body: '{}', signal }
    );
    return photo;
  } catch (error) {
    if (error instanceof ApiError && [400, 410].includes(error.status)) {
      pending.ticket = undefined;
      pending.uploaded = false;
    }
    if (error instanceof ApiError && error.status === 503)
      throw new Error(
        '사진 저장을 준비하고 있어요. 잠시 후 다시 시도해 주세요.'
      );
    throw error;
  }
}

export function renameAlbum(
  groupId: string,
  albumId: string,
  title: string,
  signal: AbortSignal
) {
  return apiRequest<{ album: AlbumResponse }>(albumPath(groupId, albumId), {
    method: 'PATCH',
    body: JSON.stringify({ title: title.trim() }),
    signal,
  });
}
export function deleteAlbum(
  groupId: string,
  albumId: string,
  signal: AbortSignal
) {
  return apiRequest<void>(albumPath(groupId, albumId), {
    method: 'DELETE',
    signal,
  });
}
export function deletePhoto(
  groupId: string,
  albumId: string,
  photoId: string,
  signal: AbortSignal
) {
  return apiRequest<void>(
    `${albumPath(groupId, albumId)}/photos/${encodeURIComponent(photoId)}`,
    { method: 'DELETE', signal }
  );
}
export async function originalPhoto(
  groupId: string,
  albumId: string,
  photoId: string,
  signal: AbortSignal
) {
  const blob = await photoBlob(groupId, albumId, photoId, signal, 'original');
  signal.throwIfAborted();
  const extension = (
    { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<
      string,
      string
    >
  )[blob.type];
  if (!extension)
    throw new Error('원본 사진 형식을 확인하지 못했어요. 다시 시도해 주세요.');
  const safeId = photoId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'photo';
  return { blob, filename: `woori-${safeId}.${extension}` };
}

/** Deduplication is limited to this selection; it does not identify equal photo content. */
export function photoSelection(files: File[]) {
  const seen = new Set<string>();
  const unique = files.filter((file) => {
    const key = JSON.stringify([
      file.name,
      file.size,
      file.lastModified,
      file.type,
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (unique.length > 30)
    throw new Error(
      '한 번에 30장까지 선택해 주세요. 아직 전송한 사진은 없어요.'
    );
  if (unique.reduce((bytes, file) => bytes + file.size, 0) > 300 * 1024 * 1024)
    throw new Error(
      '선택한 사진의 합계가 300MB를 넘어요. 나누어 선택해 주세요. 아직 전송한 사진은 없어요.'
    );
  return { files: unique, duplicates: files.length - unique.length };
}
export async function queuePhoto(
  groupId: string,
  albumId: string,
  file: File,
  pending: PendingUpload,
  signal: AbortSignal,
  onProgress?: (phase: UploadProgress['phase']) => void
) {
  const { path, ticket } = await sendPhoto(
    groupId,
    albumId,
    file,
    pending,
    signal,
    onProgress
  );
  signal.throwIfAborted();
  onProgress?.('QUEUING');
  try {
    return await apiRequest<UploadJobResponse>(
      `${path}/photos/${encodeURIComponent(ticket.photoId)}/process`,
      {
        method: 'POST',
        body: '{}',
        signal,
      }
    );
  } catch (error) {
    if (error instanceof ApiError && [400, 410].includes(error.status)) {
      pending.ticket = undefined;
      pending.uploaded = false;
    }
    throw error;
  }
}
export function listUploads(
  groupId: string,
  albumId: string,
  cursor: string | null,
  signal: AbortSignal,
  activeOnly = false
) {
  return apiRequest<{
    uploads: UploadJobResponse[];
    nextCursor: string | null;
  }>(
    `${albumPath(groupId, albumId)}/uploads?limit=${activeOnly ? 100 : 30}${activeOnly ? '&activeOnly=true' : ''}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    { signal }
  );
}
export function processingPhoto(
  groupId: string,
  albumId: string,
  photoId: string,
  signal: AbortSignal
) {
  return apiRequest<UploadJobResponse>(
    `${albumPath(groupId, albumId)}/photos/${encodeURIComponent(photoId)}/processing`,
    { signal }
  );
}

export async function recoverUploads(
  groupId: string,
  albumId: string,
  previous: UploadJobResponse[],
  signal: AbortSignal
) {
  signal.throwIfAborted();
  const [recent, active] = await Promise.all([
    listUploads(groupId, albumId, null, signal),
    listUploads(groupId, albumId, null, signal, true),
  ]);
  signal.throwIfAborted();
  const next = new Map(recent.uploads.map((job) => [job.photoId, job]));
  active.uploads.forEach((job) => next.set(job.photoId, job));
  // Completion may move a previously active job beyond the first recent page.
  for (const job of previous.filter(
    (job) => job.status === 'PROCESSING' && !next.has(job.photoId)
  )) {
    next.set(
      job.photoId,
      await processingPhoto(groupId, albumId, job.photoId, signal)
    );
    signal.throwIfAborted();
  }
  return [...next.values()];
}
