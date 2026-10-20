import { memberNickname } from './nickname.ts';
import { BLOCK_LIMIT } from '../constants/block.ts';
import type { Photo } from '../dto/album.dto.ts';
import type { BlockChange } from '../dto/block.dto.ts';
import type { PhotoUploader } from '../dto/media.dto.ts';
import { statusOf } from './service-guidance.ts';

// Maps MediaPhoto.uploader (album photos, memories `item.photo`); unknown
// uploaders stay '' so the UI never offers report/block it cannot attribute.
export function uploaderOf(
  photo: { uploader?: PhotoUploader | null } | null | undefined
): { authorId: string; authorName?: string } {
  const uploader = photo?.uploader;
  return uploader && typeof uploader.id === 'string' && uploader.id
    ? { authorId: uploader.id, authorName: memberNickname(uploader) }
    : { authorId: '' };
}
// Report/block are offered only for a known person who is not me.
export function isOtherPerson(
  personId: string | null | undefined,
  currentUserId: string | null | undefined
) {
  return !!personId && !!currentUserId && personId !== currentUserId;
}

export function blockConfirmCopy(name: string) {
  return {
    title: `${name}님을 차단할까요?`,
    description: `${name}님이 올린 사진·댓글·반응과 ${name}님 활동 알림이 나에게만 보이지 않아요. ${name}님에게는 알리지 않고, 같은 그룹에서 나가지도 않아요. 그룹에서 내보내기는 그룹장이 그룹 설정에서 할 수 있어요. 차단하면 ${name}님 활동으로 받은 기존 알림도 지워져요.`,
    confirmLabel: '차단하기',
  };
}
export function unblockConfirmCopy(name: string) {
  return {
    title: `${name}님 차단을 해제할까요?`,
    description: `${name}님이 올린 사진·댓글·반응이 다시 보여요. 차단할 때 지워진 알림은 돌아오지 않아요. ${name}님에게는 알리지 않아요.`,
    confirmLabel: '차단 해제',
  };
}
export const BLOCKED_MESSAGE = '차단했어요.';
export const UNBLOCKED_MESSAGE = '차단을 해제했어요.';

// Maps a failed block/unblock to text that matches the real server state.
export function blockErrorMessage(error: unknown, blocking: boolean) {
  const status = statusOf(error),
    code = (error as { code?: unknown } | null)?.code;
  if (status === 400 && code === 'BLOCK_SELF_NOT_ALLOWED')
    return '나 자신은 차단할 수 없어요.';
  if (status === 404)
    return '더 이상 함께 볼 수 있는 사진·댓글이나 그룹이 없는 사람이라 차단할 수 없어요.';
  if (status === 409 && code === 'BLOCK_LIMIT_REACHED')
    return `차단은 ${BLOCK_LIMIT}명까지 할 수 있어요. 차단 관리에서 해제한 뒤 다시 시도해 주세요.`;
  if (status === 429)
    return '차단과 차단 해제를 너무 자주 했어요. 잠시 후 다시 시도해 주세요.';
  if (status === 401) return '로그인이 끝났어요. 다시 로그인해 주세요.';
  if (status === 400)
    return blocking
      ? '차단하지 못했어요. 다시 시도해 주세요.'
      : '차단을 해제하지 못했어요. 다시 시도해 주세요.';
  return error instanceof Error && error.message
    ? error.message
    : blocking
      ? '차단하지 못했어요. 잠시 후 다시 시도해 주세요.'
      : '차단을 해제하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

export function blockChangeOf(event: Event): BlockChange | null {
  const detail = (event as CustomEvent<unknown>).detail as {
    userId?: unknown;
    blocked?: unknown;
  } | null;
  return detail &&
    typeof detail.userId === 'string' &&
    detail.userId &&
    typeof detail.blocked === 'boolean'
    ? { userId: detail.userId, blocked: detail.blocked }
    : null;
}
// After a block, drop the blocked uploader's photos from an open viewer.
// Returns null when the photo on screen is hidden, so the viewer closes.
export function viewerAfterBlock<
  V extends { photos: Pick<Photo, 'id' | 'authorId'>[]; id: string },
>(viewer: V | null, userId: string): V | null {
  if (!viewer) return viewer;
  const photos = viewer.photos.filter((photo) => photo.authorId !== userId);
  if (!photos.some((photo) => photo.id === viewer.id)) return null;
  return photos.length === viewer.photos.length
    ? viewer
    : { ...viewer, photos };
}
// What an open notification-target viewer does after a block change:
// the uploader was blocked → close; someone else → re-check the target.
export function targetViewerAfterBlock(
  uploaderId: string,
  change: BlockChange
): 'close' | 'recheck' | 'keep' {
  if (!change.blocked) return 'keep';
  return uploaderId && uploaderId === change.userId ? 'close' : 'recheck';
}
export const TARGET_GONE_AFTER_BLOCK =
  '이 알림은 더 이상 열 수 없어요. 차단한 사람의 활동 알림은 지워져요.';
// On block, drop the blocked uploader's photos and any photo whose uploader is
// unknown (album covers), so no cover of theirs can show until refetched.
export function purgeOnBlock<P extends Pick<Photo, 'authorId'>>(
  photos: P[],
  userId: string
) {
  const removed: P[] = [],
    kept: P[] = [];
  for (const photo of photos)
    (photo.authorId === userId || !photo.authorId ? removed : kept).push(photo);
  return { kept, removed };
}
// Locally hides items caused by a blocked person until the refetch lands.
export function withoutPerson<T>(
  items: T[],
  personOf: (item: T) => string | undefined,
  userId: string
) {
  return items.filter((item) => personOf(item) !== userId);
}
