import type { NotificationPreferences } from "../dto/notification.dto";
import {
  notificationDefaults,
  parseNotificationPreferences,
} from "../utils/notification-policy";

const key = "woori.notification-preferences.v1";
export function loadNotificationPreferences(): NotificationPreferences {
  try {
    return parseNotificationPreferences(
      JSON.parse(localStorage.getItem(key) ?? "null"),
    );
  } catch {
    return notificationDefaults();
  }
}
export function saveNotificationPreferences(
  preferences: NotificationPreferences,
): void {
  localStorage.setItem(key, JSON.stringify({ version: 1, preferences }));
}
