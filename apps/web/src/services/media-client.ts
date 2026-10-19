import {
  apiRequest,
  apiBlob,
  ApiError,
  currentSessionRevision,
} from './api-client.ts';
import { authenticatedMediaUrl } from '../utils/media-url.ts';
import type {
  AlbumPageResponse,
  AlbumResponse,
  PhotoResponse,
  PendingUpload,
  UploadTicket,
  UploadJobResponse,
  UploadProgress,
  VideoAccess,
} from '../dto/media.dto.ts';
import { mediaPrecheck } from '../utils/media.ts';
export const albumPath = (groupId: string, albumId?: string) =>
  `/v1/groups/${encodeURIComponent(groupId)}/albums${albumId ? `/${encodeURIComponent(albumId)}` : ''}`;
// Photos (JPG/PNG/WebP, 30MB) and videos (MP4/MOV, 200MB). A video's length
// is checked separately before upload when the browser can read it.
export function validatePhoto(file: File) {
  const problem = mediaPrecheck(file);
  if (problem) throw new Error(problem);
}
// Playback and downloads use the API session; each media request rechecks access.
export async function videoAccess(
  groupId: string,
  albumId: string,
  photoId: string,
  purpose: 'play' | 'download',
  signal: AbortSignal
) {
  const revision = currentSessionRevision();
  const path = `${albumPath(groupId, albumId)}/photos/${encodeURIComponent(photoId)}/video`;
  const access = await apiRequest<VideoAccess>(`${path}?purpose=${purpose}`, {
    signal,
  });
  signal.throwIfAborted();
  if (revision !== currentSessionRevision())
    throw new ApiError(401, '로그인이 바뀌었어요. 동영상을 다시 열어 주세요.');
  return {
    ...access,
    url: authenticatedMediaUrl(access.url, `${path}/content`),
  };
}
// Server default page size (30); a server before OpenAPI 0.21.0 ignores the
// cursor and answers one page without nextCursor.
export function listAlbums(
  groupId: string,
  signal: AbortSignal,
  cursor: string | null = null
) {
  return apiRequest<AlbumPageResponse>(
    `${albumPath(groupId)}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    { signal }
  );
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
/**
 * Server renditions (long edge, `fit: inside`): thumbnail 480px WebP for grid
 * tiles, covers and memories; display 2560px WebP for the viewer only.
 */
export type PhotoVariant = 'thumbnail' | 'display' | 'original';
export function photoBlob(
  groupId: string,
  albumId: string,
  photoId: string,
  signal: AbortSignal,
  variant: PhotoVariant = 'display'
) {
  return apiBlob(
    `${albumPath(groupId, albumId)}/photos/${encodeURIComponent(photoId)}/content?variant=${variant}`,
    signal
  );
}
export type UploadProgressListener = (
  phase: UploadProgress['phase'],
  bytes?: { sent: number; size: number }
) => void;
/**
 * Presigned PUT straight to storage: no cookies, the signed headers only.
 * XMLHttpRequest reports upload progress (fetch cannot); where it does not
 * exist (tests, old runtimes) fetch is used without progress. Resolves with
 * the HTTP status; an abort rejects like fetch does.
 */
export function putToStorage(
  url: string,
  body: Blob,
  headers: Record<string, string>,
  signal: AbortSignal,
  onBytes?: (sent: number, size: number) => void
): Promise<number> {
  if (typeof XMLHttpRequest === 'undefined')
    return fetch(url, {
      method: 'PUT',
      body,
      headers,
      credentials: 'omit',
      signal,
    }).then((response) => response.status);
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const settle = () => signal.removeEventListener('abort', abort);
    xhr.open('PUT', url);
    xhr.withCredentials = false;
    for (const [name, value] of Object.entries(headers))
      xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onBytes?.(event.loaded, event.total);
    };
    xhr.onload = () => {
      settle();
      resolve(xhr.status);
    };
    xhr.onerror = xhr.ontimeout = () => {
      settle();
      reject(new TypeError('Storage upload failed'));
    };
    xhr.onabort = () => {
      settle();
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
    xhr.send(body);
  });
}
// A retry reuses its reservation, but a PUT URL this close to expiry would
// fail mid-transfer: reserve again instead. The window itself is the
// server's (longer for videos), so only the response's expiresAt counts.
const TICKET_MARGIN_MS = 60_000;
export function ticketExpiring(
  ticket: Pick<UploadTicket, 'expiresAt'>,
  now = Date.now()
) {
  const at = Date.parse(ticket.expiresAt);
  return Number.isFinite(at) && at - now < TICKET_MARGIN_MS;
}
async function sendPhoto(
  groupId: string,
  albumId: string,
  file: File,
  pending: PendingUpload,
  signal: AbortSignal,
  onProgress?: UploadProgressListener
): Promise<{ path: string; ticket: NonNullable<PendingUpload['ticket']> }> {
  signal.throwIfAborted();
  validatePhoto(file);
  const path = albumPath(groupId, albumId);
  onProgress?.('RESERVING');
  if (pending.ticket && !pending.uploaded && ticketExpiring(pending.ticket))
    pending.ticket = undefined;
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
    onProgress?.('UPLOADING', { sent: 0, size: file.size });
    let status: number;
    try {
      status = await putToStorage(
        ticket.uploadUrl,
        file,
        ticket.headers,
        signal,
        (sent, size) => onProgress?.('UPLOADING', { sent, size })
      );
    } catch (error) {
      if (signal.aborted) throw error;
      throw new Error(
        '파일을 전송하지 못했어요. 연결을 확인하고 다시 시도해 주세요.'
      );
    }
    if (status < 200 || status >= 300) {
      if (status === 403) pending.ticket = undefined;
      throw new Error('전송에 실패했어요. 다시 시도해 주세요.');
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
      '한 번에 30개까지 선택해 주세요. 아직 전송한 파일은 없어요.'
    );
  if (unique.reduce((bytes, file) => bytes + file.size, 0) > 300 * 1024 * 1024)
    throw new Error(
      '선택한 파일의 합계가 300MB를 넘어요. 나누어 선택해 주세요. 아직 전송한 파일은 없어요.'
    );
  return { files: unique, duplicates: files.length - unique.length };
}
export async function queuePhoto(
  groupId: string,
  albumId: string,
  file: File,
  pending: PendingUpload,
  signal: AbortSignal,
  onProgress?: UploadProgressListener
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
