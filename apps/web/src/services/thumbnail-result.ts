import type { Photo } from '../dto/album.dto.ts';
import { ApiError } from './api-client.ts';
// Permission/session/deletion failures retain the API client's access recheck.
export function thumbnailFailure(cause: unknown): 'error' | 'unavailable' {
  return cause instanceof ApiError && [401, 403, 404].includes(cause.status)
    ? 'unavailable'
    : 'error';
}
// Isolate transport/decoding failures per tile; never mask access or cancellation.
export async function thumbnailResult<T>(
  load: () => Promise<T>,
  fallback: () => T,
  signal: AbortSignal
): Promise<T> {
  try {
    return await load();
  } catch (cause) {
    if (signal.aborted || thumbnailFailure(cause) === 'unavailable')
      throw cause;
    return fallback();
  }
}

// Server metadata may arrive after a local retry. The current preview wins;
// a captured loading/error URL must never replace a completed retry's Blob.
export function reconcileThumbnails(
  metadata: Photo[],
  current: Photo[],
  created: Photo[]
): Photo[] {
  const latest = new Map(current.map((photo) => [photo.id, photo]));
  const fetched = new Map(created.map((photo) => [photo.id, photo]));
  return metadata.map((photo) => {
    const preview = latest.get(photo.id) ?? fetched.get(photo.id);
    return {
      ...photo,
      src: preview?.src ?? '',
      previewStatus: preview ? preview.previewStatus : 'error',
    };
  });
}
