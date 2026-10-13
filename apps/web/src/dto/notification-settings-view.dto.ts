import type {
  NotificationGroupMode,
  NotificationPreferences,
  NotificationSaveStatus,
  NotificationSettingRow,
} from "./notification.dto";

export interface NotificationSettingsViewProps {
  preferences: NotificationPreferences;
  status: NotificationSaveStatus;
  ready: boolean;
  rows: NotificationSettingRow[];
  quietRow: NotificationSettingRow;
  previewRow: NotificationSettingRow;
  groups: { id: string; name: string }[];
  error: string;
  permissionHelp: boolean;
  onToggle: (key: NotificationSettingRow["key"]) => void;
  onTime: (key: "quietStart" | "quietEnd", value: string) => void;
  onGroup: (groupId: string, mode: NotificationGroupMode) => void;
  onRetry: () => void;
  onBack: () => void;
  onPermissionHelp: () => void;
}
