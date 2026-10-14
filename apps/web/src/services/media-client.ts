import { apiRequest, apiBlob, ApiError } from "./api-client.ts";
import type {
  AlbumResponse,
  PhotoResponse,
  PendingUpload,
} from "../dto/media.dto.ts";
export const albumPath = (groupId: string, albumId?: string) =>
  `/v1/groups/${encodeURIComponent(groupId)}/albums${albumId ? `/${encodeURIComponent(albumId)}` : ""}`;
export function validatePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "JPG, PNG, WebP 사진만 올릴 수 있어요. HEIC 사진은 JPG로 변환해 주세요.",
    );
  if (!file.size || file.size > 30 * 1024 * 1024)
    throw new Error("사진 한 장은 30MB 이하여야 해요.");
}
export function listAlbums(groupId: string, signal: AbortSignal) {
  return apiRequest<{ albums: AlbumResponse[] }>(albumPath(groupId), {
    signal,
  });
}
export function createAlbum(
  groupId: string,
  title: string,
  signal: AbortSignal,
) {
  return apiRequest<{ album: AlbumResponse }>(albumPath(groupId), {
    method: "POST",
    body: JSON.stringify({ title: title.trim() }),
    signal,
  });
}
export function listPhotos(
  groupId: string,
  albumId: string,
  cursor: string | null,
  signal: AbortSignal,
) {
  return apiRequest<{ photos: PhotoResponse[]; nextCursor: string | null }>(
    `${albumPath(groupId, albumId)}/photos${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    { signal },
  );
}
export function photoBlob(
  groupId: string,
  albumId: string,
  photoId: string,
  signal: AbortSignal,
  variant = "display",
) {
  return apiBlob(
    `${albumPath(groupId, albumId)}/photos/${encodeURIComponent(photoId)}/content?variant=${variant}`,
    signal,
  );
}
export async function uploadPhoto(
  groupId: string,
  albumId: string,
  file: File,
  pending: PendingUpload,
  signal: AbortSignal,
): Promise<PhotoResponse> {
  signal.throwIfAborted();
  validatePhoto(file);
  const path = albumPath(groupId, albumId);
  if (!pending.ticket)
    pending.ticket = await apiRequest(`${path}/uploads`, {
      method: "POST",
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
    let response: Response;
    try {
      response = await fetch(ticket.uploadUrl, {
        method: "PUT",
        body: file,
        headers: ticket.headers,
        credentials: "omit",
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw error;
      throw new Error(
        "사진을 전송하지 못했어요. 연결을 확인하고 다시 시도해 주세요.",
      );
    }
    if (!response.ok) {
      if (response.status === 403) pending.ticket = undefined;
      throw new Error("사진 전송에 실패했어요. 다시 시도해 주세요.");
    }
    signal.throwIfAborted();
    pending.uploaded = true;
  }
  try {
    const { photo } = await apiRequest<{ photo: PhotoResponse }>(
      `${path}/photos/${encodeURIComponent(ticket.photoId)}/complete`,
      { method: "POST", body: "{}", signal },
    );
    return photo;
  } catch (error) {
    if (error instanceof ApiError && [400, 410].includes(error.status)) {
      pending.ticket = undefined;
      pending.uploaded = false;
    }
    if (error instanceof ApiError && error.status === 503)
      throw new Error(
        "사진 저장을 준비하고 있어요. 잠시 후 다시 시도해 주세요.",
      );
    throw error;
  }
}

export function renameAlbum(
  groupId: string,
  albumId: string,
  title: string,
  signal: AbortSignal,
) {
  return apiRequest<{ album: AlbumResponse }>(albumPath(groupId, albumId), {
    method: "PATCH",
    body: JSON.stringify({ title: title.trim() }),
    signal,
  });
}
export function deleteAlbum(
  groupId: string,
  albumId: string,
  signal: AbortSignal,
) {
  return apiRequest<void>(albumPath(groupId, albumId), {
    method: "DELETE",
    signal,
  });
}
export function deletePhoto(
  groupId: string,
  albumId: string,
  photoId: string,
  signal: AbortSignal,
) {
  return apiRequest<void>(
    `${albumPath(groupId, albumId)}/photos/${encodeURIComponent(photoId)}`,
    { method: "DELETE", signal },
  );
}
export async function originalPhoto(
  groupId: string,
  albumId: string,
  photoId: string,
  signal: AbortSignal,
) {
  const blob = await photoBlob(groupId, albumId, photoId, signal, "original");
  signal.throwIfAborted();
  const extension = (
    { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<
      string,
      string
    >
  )[blob.type];
  if (!extension)
    throw new Error("원본 사진 형식을 확인하지 못했어요. 다시 시도해 주세요.");
  const safeId = photoId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "photo";
  return { blob, filename: `woori-${safeId}.${extension}` };
}
