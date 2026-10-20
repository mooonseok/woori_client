import {
  ApiError,
  apiBlob,
  apiRequest,
  currentSessionRevision,
  post,
} from './api-client.ts';
import { putToStorage } from './media-client.ts';
import type { AuthUser } from '../dto/auth.dto.ts';
import type { AvatarSize, AvatarUploadTicket } from '../dto/avatar.dto.ts';

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const AVATAR_MAX_BYTES = 10 * 1024 * 1024;
// The server keeps 512px renditions; a 1024px source is plenty and uploads
// in a fraction of a phone photo's size.
const SHRINK_EDGE = 1024;
const KEEP_BYTES = 1024 * 1024;

/**
 * The chosen photo, downscaled in the browser before upload (orientation
 * applied, metadata dropped). Returns the file itself when it is already small
 * or the browser cannot decode it; the server validates either way.
 */
export async function prepareAvatarFile(file: File): Promise<Blob> {
  if (
    typeof createImageBitmap !== 'function' ||
    typeof document === 'undefined'
  )
    return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  try {
    const scale = Math.min(
      1,
      SHRINK_EDGE / Math.max(bitmap.width, bitmap.height)
    );
    if (
      scale === 1 &&
      AVATAR_TYPES.includes(file.type) &&
      file.size <= KEEP_BYTES
    )
      return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    // JPEG has no transparency: transparent PNG areas become white.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    );
    return blob ?? file;
  } finally {
    bitmap.close();
  }
}

/** Why a prepared file cannot be sent, or '' when it can. */
export function avatarFileProblem(file: Pick<Blob, 'type' | 'size'>) {
  if (!AVATAR_TYPES.includes(file.type))
    return 'JPG, PNG, WebP 사진만 쓸 수 있어요. HEIC 사진은 JPG로 바꿔 주세요.';
  if (!file.size) return '빈 파일은 쓸 수 없어요.';
  if (file.size > AVATAR_MAX_BYTES) return '10MB 이하 사진을 골라 주세요.';
  return '';
}

/** Reserve → signed PUT (no cookies) → complete. Answers with the account. */
export async function uploadAvatar(
  file: Blob,
  signal: AbortSignal,
  onProgress?: (percent: number) => void
) {
  const ticket = await post<AvatarUploadTicket>(
    '/v1/auth/profile/avatar/uploads',
    { contentType: file.type, bytes: file.size }
  );
  let status: number;
  try {
    status = await putToStorage(
      ticket.uploadUrl,
      file,
      ticket.headers,
      signal,
      (sent, size) =>
        onProgress?.(Math.min(100, Math.round((sent / size) * 100)))
    );
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(
      '사진을 올리지 못했어요. 연결을 확인하고 다시 시도해 주세요.'
    );
  }
  if (status < 200 || status >= 300)
    throw new Error('사진을 올리지 못했어요. 다시 시도해 주세요.');
  return post<{ user: AuthUser }>('/v1/auth/profile/avatar/complete', {
    uploadId: ticket.uploadId,
  });
}

export function removeAvatar() {
  return apiRequest<{ user: AuthUser }>('/v1/auth/profile/avatar', {
    method: 'DELETE',
  });
}

// One object URL per person, photo version and size for this session, shared
// by every place that shows the same person. A new login drops them all.
const images = new Map<string, Promise<string | null>>();
let imagesRevision = -1;
export function avatarImageUrl(
  userId: string,
  version: number,
  size: AvatarSize
): Promise<string | null> {
  const revision = currentSessionRevision();
  if (revision !== imagesRevision) {
    for (const pending of images.values())
      void pending.then((url) => url && URL.revokeObjectURL(url));
    images.clear();
    imagesRevision = revision;
  }
  const key = `${userId}:${version}:${size}`;
  let pending = images.get(key);
  if (!pending) {
    pending = apiBlob(
      `/v1/users/${encodeURIComponent(userId)}/avatar?size=${size}&v=${version}`
    ).then(
      (blob) =>
        revision === currentSessionRevision()
          ? URL.createObjectURL(blob)
          : null,
      (error: unknown) => {
        // Hidden or missing stays missing; anything else may be retried.
        if (!(error instanceof ApiError && [403, 404].includes(error.status)))
          images.delete(key);
        return null;
      }
    );
    images.set(key, pending);
  }
  return pending;
}
