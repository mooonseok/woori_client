import type {
  NotificationDecision,
  NotificationItem,
  NotificationPreferences,
  NotificationType,
} from '../dto/notification.dto';
import { notificationTitle } from './notification-model.ts';

export function notificationDefaults(): NotificationPreferences {
  return {
    master: true,
    photos: true,
    comments: true,
    reactions: true,
    quiet: false,
    quietStart: '22:00',
    quietEnd: '08:00',
    preview: false,
    groups: { g1: 'default', g2: 'default' },
  };
}
export function validNotificationTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
export function notificationKstTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}
export function notificationQuietAt(
  settings: NotificationPreferences,
  time: string
): boolean {
  if (
    !settings.quiet ||
    !validNotificationTime(time) ||
    settings.quietStart === settings.quietEnd
  )
    return false;
  return settings.quietStart < settings.quietEnd
    ? time >= settings.quietStart && time < settings.quietEnd
    : time >= settings.quietStart || time < settings.quietEnd;
}
export function notificationDecision(
  type: NotificationType,
  settings: NotificationPreferences,
  groupId: string,
  time: string
): NotificationDecision {
  const category =
    type === 'comment'
      ? 'comments'
      : type === 'reaction'
        ? 'reactions'
        : 'photos';
  const group = settings.groups[groupId] ?? 'default';
  if (!settings.master || !settings[category])
    return {
      eligible: false,
      held: false,
      reason: '이 종류의 푸시가 꺼져 있어요.',
    };
  if (group === 'off' || (group === 'mine' && type === 'photos'))
    return {
      eligible: false,
      held: false,
      reason: '그룹 알림 설정에 따라 푸시를 보내지 않아요.',
    };
  if (notificationQuietAt(settings, time))
    return {
      eligible: false,
      held: true,
      reason: '방해금지 시간이에요. 알림함에는 소식이 남아요.',
    };
  return { eligible: true, held: false, reason: '받도록 설정한 소식이에요.' };
}
export function insertNotification(
  items: NotificationItem[],
  incoming: NotificationItem
): NotificationItem[] {
  const matching =
    incoming.type === 'reaction'
      ? items.find(
          (item) =>
            item.type === 'reaction' &&
            item.photoId === incoming.photoId &&
            item.groupId === incoming.groupId &&
            incoming.timestamp - item.createdAt >= 0 &&
            incoming.timestamp - item.createdAt < 5 * 60000
        )
      : undefined;
  if (!matching) return [incoming, ...items];
  return items.map((item) =>
    item.id === matching.id
      ? {
          ...item,
          count: item.count + 1,
          timestamp: incoming.timestamp,
          read: false,
          actorName: incoming.actorName,
          // Same wording as live bundles: "{actor}님 외 N명이 …".
          title: incoming.actorName
            ? notificationTitle(
                'REACTION',
                incoming.actorName,
                '',
                item.count + 1
              )
            : incoming.title,
        }
      : item
  );
}
export function notificationDateLabel(timestamp: number, now: number): string {
  const day = (value: number) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
  if (day(timestamp) === day(now)) return '오늘';
  if (day(timestamp) === day(now - 86400000)) return '어제';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
  }).format(timestamp);
}
export function notificationRelativeTime(
  timestamp: number,
  now: number
): string {
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  return minutes < 1
    ? '방금'
    : minutes < 60
      ? `${minutes}분 전`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}시간 전`
        : notificationDateLabel(timestamp, now);
}

export function parseNotificationPreferences(
  raw: unknown
): NotificationPreferences {
  const defaults = notificationDefaults();
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('version' in raw) ||
    raw.version !== 1 ||
    !('preferences' in raw)
  )
    return defaults;
  const stored = raw.preferences;
  if (!stored || typeof stored !== 'object') return defaults;
  const value = stored as Record<string, unknown>;
  const merged = { ...defaults, groups: { ...defaults.groups } };
  for (const name of [
    'master',
    'photos',
    'comments',
    'reactions',
    'quiet',
    'preview',
  ] as const) {
    if (name in value && typeof value[name] === 'boolean')
      merged[name] = value[name];
  }
  for (const name of ['quietStart', 'quietEnd'] as const) {
    if (
      name in value &&
      typeof value[name] === 'string' &&
      validNotificationTime(value[name])
    )
      merged[name] = value[name];
  }
  if ('groups' in value && value.groups && typeof value.groups === 'object') {
    const storedGroups = value.groups as Record<string, unknown>;
    for (const [legacyId, mode] of Object.entries(storedGroups)) {
      const id =
        legacyId === 'family' ? 'g1' : legacyId === 'walk' ? 'g2' : legacyId;
      if (legacyId !== id && Object.hasOwn(storedGroups, id)) continue;
      if (
        /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id) &&
        !['constructor', 'prototype'].includes(id) &&
        typeof mode === 'string' &&
        ['default', 'mine', 'off'].includes(mode)
      )
        merged.groups[id] = mode as 'default' | 'mine' | 'off';
    }
  }

  if (merged.quietStart === merged.quietEnd) {
    merged.quietStart = defaults.quietStart;
    merged.quietEnd = defaults.quietEnd;
  }
  return merged;
}
