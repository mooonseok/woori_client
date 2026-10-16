import type { PhotoUploader } from './media.dto';
// OpenAPI 0.20.0: where a row (or push) leads. ALBUM for PHOTOS bundles,
// PHOTO for reactions, COMMENT for comments and pins.
export type NotificationNavigation = 'ALBUM' | 'PHOTO' | 'COMMENT';
export interface InboxNotification {
  id: string;
  kind: 'PHOTOS' | 'COMMENT' | 'PIN' | 'REACTION';
  groupId: string;
  groupName: string;
  actor: { id: string; displayName: string };
  albumId: string;
  albumTitle: string;
  photoId: string;
  commentId: string | null;
  // OpenAPI 0.20.0 bundles: visible photos (PHOTOS) or reactors (REACTION);
  // always 1 for COMMENT/PIN. actor and photoId are the latest visible ones.
  count: number;
  createdAt: string; // the bundle's start
  latestAt: string; // list order, newest first; activity moves a bundle up
  latestSequence: number; // grows with activity; send it to mark read
  readThroughSequence: number;
  unread: boolean; // readThroughSequence < latestSequence: can turn unread again
  navigation: NotificationNavigation;
  // OpenAPI 0.22.0: kind of photoId's media; videos among a PHOTOS count.
  mediaKind?: 'PHOTO' | 'VIDEO';
  videoCount?: number;
}
export interface InboxPage {
  notifications: InboxNotification[];
  nextCursor: string | null;
  unreadCount: number;
}
export interface NotificationTarget {
  latestSequence: number;
  groupId: string;
  albumId: string;
  photoId: string;
  commentId: string | null;
  // OpenAPI 0.15.0 (additive): who uploaded the target photo.
  uploader?: PhotoUploader;
  navigation: NotificationNavigation;
  // OpenAPI 0.24.0 (planned): the target's media kind; until then the inbox
  // row's mediaKind is used (see targetMediaKind).
  mediaKind?: 'PHOTO' | 'VIDEO';
}
export interface StoredNotificationPreferences {
  enabled: boolean;
  photos: boolean;
  comments: boolean;
  reactions: boolean;
  join: boolean;
  memories: boolean;
  preview: boolean;
  quietEnabled: boolean;
  quietStartMinute: number;
  quietEndMinute: number;
  timeZone: string;
  version: number;
}
export interface NotificationPreferencesResponse {
  preferences: StoredNotificationPreferences;
  groups: {
    groupId: string;
    groupName: string;
    mode: 'DEFAULT' | 'MINE' | 'OFF';
  }[];
}
