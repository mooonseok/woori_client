import type { PhotoUploader } from './media.dto';
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
  createdAt: string;
  latestSequence: number;
  readThroughSequence: number;
  unread: boolean;
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
