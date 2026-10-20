import { memberNickname } from './nickname.ts';
import type {
  InboxNotification,
  NotificationNavigation,
  NotificationPreferencesResponse,
  NotificationTarget,
  StoredNotificationPreferences,
} from '../dto/notification-api.dto.ts';
import type {
  NotificationGroupMode,
  NotificationItem,
  NotificationPreferences,
} from '../dto/notification.dto.ts';
import { mediaCountLabel, mediaNoun, objectParticle } from './media.ts';
type Kind = InboxNotification['kind'];
// Row text, shared by live rows and the demo so both read the same.
// media: the target's kind ("내 동영상") and, for PHOTOS, videos in count.
export function notificationTitle(
  kind: Kind,
  actor: string,
  albumTitle: string,
  count: number,
  media: { mediaKind?: 'PHOTO' | 'VIDEO'; videoCount?: number } = {}
) {
  const n = Math.max(1, Math.floor(count) || 1);
  if (kind === 'PHOTOS') {
    const items = mediaCountLabel(n, media.videoCount);
    return `${actor}님이 '${albumTitle}'에 ${items}${objectParticle(items)} 올렸어요`;
  }
  const mine = `내 ${mediaNoun(media.mediaKind)}`;
  return kind === 'REACTION'
    ? n > 1
      ? `${actor}님 외 ${n - 1}명이 ${mine}에 반응했어요`
      : `${actor}님이 ${mine}에 반응했어요`
    : kind === 'PIN'
      ? `${actor}님이 위치 댓글을 남겼어요`
      : `${actor}님이 댓글을 남겼어요`;
}
const defaultNavigation = (kind: Kind): NotificationNavigation =>
  kind === 'PHOTOS' ? 'ALBUM' : kind === 'REACTION' ? 'PHOTO' : 'COMMENT';
export function notificationModel(item: InboxNotification): NotificationItem {
  const actor = memberNickname(item.actor);
  const count = Math.max(1, Math.floor(item.count) || 1);
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
    title: notificationTitle(item.kind, actor, item.albumTitle, count, item),
    // Sorted and shown by the latest visible activity, not the bundle start.
    timestamp: Date.parse(item.latestAt || item.createdAt),
    createdAt: Date.parse(item.createdAt),
    read: !item.unread,
    count,
    latestSequence: item.latestSequence,
    actorId: item.actor.id,
    actorName: actor,
    navigation: item.navigation ?? defaultNavigation(item.kind),
    mediaKind: item.mediaKind ?? 'PHOTO',
    videoCount: item.videoCount ?? 0,
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
// One row per id, the incoming copy winning (a bundle's count, sequence and
// unread change in place), in server order: latest activity first, then id.
export function mergeNotificationItems(
  current: NotificationItem[],
  incoming: NotificationItem[]
) {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()].sort(
    (a, b) =>
      b.timestamp - a.timestamp || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
  );
}
// Read requests: unread rows, and rows shown as read whose bundle grew since
// (a newer latestSequence observed via /target). Sends what the client saw.
export function readRequests(
  items: NotificationItem[],
  ids: string[],
  observed: Record<string, number> = {}
) {
  return items
    .filter(
      (item) =>
        ids.includes(item.id) &&
        (!item.read || (observed[item.id] ?? 0) > (item.latestSequence ?? 1))
    )
    .map((item) => ({
      id: item.id,
      throughSequence: observed[item.id] ?? item.latestSequence ?? 1,
    }));
}
// A row is read once the confirmed sequence reaches its latestSequence; the
// row also takes on a newer sequence it was read through.
export function applyRead(
  items: NotificationItem[],
  rows: { id: string; throughSequence: number }[]
) {
  return items.map((item) => {
    const row = rows.find(
      (r) => r.id === item.id && r.throughSequence >= (item.latestSequence ?? 1)
    );
    return row
      ? { ...item, read: true, latestSequence: row.throughSequence }
      : item;
  });
}
// Keeps a row's sequence in step with a newer one seen via /target even when
// nothing had to be sent (the next refresh brings the rest of the bundle).
export function observeSequences(
  items: NotificationItem[],
  observed: Record<string, number>
) {
  return items.map((item) =>
    (observed[item.id] ?? 0) > (item.latestSequence ?? 1)
      ? { ...item, latestSequence: observed[item.id], read: false }
      : item
  );
}
// The opened media's kind: /target's own field (0.24.0) when present, else
// the inbox row's, else a photo (its poster shows as an image).
export function targetMediaKind(
  target: Pick<NotificationTarget, 'mediaKind'>,
  rowKind?: 'PHOTO' | 'VIDEO'
): 'PHOTO' | 'VIDEO' {
  return target.mediaKind ?? rowKind ?? 'PHOTO';
}
// Where opening a notification leads, from its /target answer.
export function notificationDestination(target: NotificationTarget) {
  return target.navigation === 'ALBUM'
    ? ({
        kind: 'album',
        groupId: target.groupId,
        albumId: target.albumId,
      } as const)
    : target.navigation === 'COMMENT' && target.commentId
      ? ({ kind: 'photo', commentId: target.commentId } as const)
      : ({ kind: 'photo', commentId: null } as const);
}
