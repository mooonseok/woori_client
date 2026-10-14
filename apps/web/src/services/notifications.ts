import { apiRequest } from './api-client.ts';
import type {
  InboxPage,
  NotificationTarget,
  NotificationPreferencesResponse,
  StoredNotificationPreferences,
} from '../dto/notification-api.dto.ts';
const root = '/v1/notifications';
export const listNotifications = (cursor: string | null, signal: AbortSignal) =>
  apiRequest<InboxPage>(
    `${root}?limit=30${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    { signal }
  );
export const readNotification = (
  id: string,
  throughSequence: number,
  signal: AbortSignal
) =>
  apiRequest<{ id: string; readThroughSequence: number }>(
    `${root}/${encodeURIComponent(id)}/read`,
    { method: 'PATCH', body: JSON.stringify({ throughSequence }), signal }
  );
export const readNotifications = (
  notifications: { id: string; throughSequence: number }[],
  signal: AbortSignal
) =>
  apiRequest<{ updated: number }>(`${root}/read-all`, {
    method: 'POST',
    body: JSON.stringify({ notifications }),
    signal,
  });
export const notificationTarget = (id: string, signal: AbortSignal) =>
  apiRequest<NotificationTarget>(`${root}/${encodeURIComponent(id)}/target`, {
    signal,
  });
export const getNotificationPreferences = (signal: AbortSignal) =>
  apiRequest<NotificationPreferencesResponse>(`${root}/preferences`, {
    signal,
  });
export const patchNotificationPreferences = (
  patch: Partial<StoredNotificationPreferences> & { version: number },
  signal: AbortSignal
) =>
  apiRequest<NotificationPreferencesResponse>(`${root}/preferences`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
    signal,
  });
export const setGroupNotificationPreference = (
  groupId: string,
  mode: 'DEFAULT' | 'MINE' | 'OFF',
  version: number,
  signal: AbortSignal
) =>
  apiRequest<NotificationPreferencesResponse>(
    `${root}/preferences/groups/${encodeURIComponent(groupId)}`,
    { method: 'PUT', body: JSON.stringify({ mode, version }), signal }
  );
