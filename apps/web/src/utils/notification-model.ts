import type {
  InboxNotification,
  NotificationPreferencesResponse,
  StoredNotificationPreferences,
} from '../dto/notification-api.dto.ts';
import type {
  NotificationGroupMode,
  NotificationItem,
  NotificationPreferences,
} from '../dto/notification.dto.ts';
export function notificationModel(item: InboxNotification): NotificationItem {
  const actor = item.actor.displayName;
  const title =
    item.kind === 'PHOTOS'
      ? `${actor}님이 ${item.albumTitle}에 사진을 올렸어요`
      : item.kind === 'PIN'
        ? `${actor}님이 위치 댓글을 남겼어요`
        : item.kind === 'COMMENT'
          ? `${actor}님이 댓글을 남겼어요`
          : `${actor}님이 사진에 반응을 남겼어요`;
  return {
    id: item.id,
    type:
      item.kind === 'PHOTOS'
        ? 'photos'
        : item.kind === 'REACTION'
          ? 'reaction'
          : 'comment',
    photoId: item.photoId,
    groupId: item.groupId,
    groupName: item.groupName,
    albumId: item.albumId,
    commentId: item.commentId,
    title,
    timestamp: Date.parse(item.createdAt),
    createdAt: Date.parse(item.createdAt),
    read: !item.unread,
    count: 1,
    latestSequence: item.latestSequence,
    actorId: item.actor.id,
  };
}
export const minuteTime = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export const timeMinute = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export function preferenceModel(
  result: NotificationPreferencesResponse
): NotificationPreferences {
  const p = result.preferences;
  return {
    master: p.enabled,
    photos: p.photos,
    comments: p.comments,
    reactions: p.reactions,
    quiet: p.quietEnabled,
    quietStart: minuteTime(p.quietStartMinute),
    quietEnd: minuteTime(p.quietEndMinute),
    preview: p.preview,
    groups: Object.fromEntries(
      result.groups.map((g) => [
        g.groupId,
        g.mode.toLowerCase() as NotificationGroupMode,
      ])
    ),
  };
}
export function preferencePatch(
  draft: NotificationPreferences,
  version: number
): Partial<StoredNotificationPreferences> & { version: number } {
  return {
    version,
    enabled: draft.master,
    photos: draft.photos,
    comments: draft.comments,
    reactions: draft.reactions,
    quietEnabled: draft.quiet,
    quietStartMinute: timeMinute(draft.quietStart),
    quietEndMinute: timeMinute(draft.quietEnd),
    preview: draft.preview,
  };
}
export function mergeNotificationItems(
  current: NotificationItem[],
  incoming: NotificationItem[]
) {
  const ids = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !ids.has(item.id))];
}
