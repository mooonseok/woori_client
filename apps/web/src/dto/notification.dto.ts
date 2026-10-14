export type NotificationType = 'photos' | 'comment' | 'reaction';
export type NotificationGroupMode = 'default' | 'mine' | 'off';
export interface NotificationItem {
  id: string;
  type: NotificationType;
  photoId: string;
  groupId: string;
  title: string;
  timestamp: number;
  createdAt: number;
  read: boolean;
  count: number;
}
export interface NotificationPreferences {
  master: boolean;
  photos: boolean;
  comments: boolean;
  reactions: boolean;
  quiet: boolean;
  quietStart: string;
  quietEnd: string;
  preview: boolean;
  groups: Record<string, NotificationGroupMode>;
}
export type NotificationSaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export interface NotificationSettingRow {
  key: 'master' | 'photos' | 'comments' | 'reactions' | 'quiet' | 'preview';
  label: string;
  description: string;
}
export interface NotificationDecision {
  eligible: boolean;
  held: boolean;
  reason: string;
}
