import type { PushDeviceView } from './web-push.dto';
import type {
  NotificationGroupMode,
  NotificationPreferences,
  NotificationSaveStatus,
  NotificationSettingRow,
} from './notification.dto';

export interface NotificationSettingsViewProps {
  devicePush: PushDeviceView;
  preferences: NotificationPreferences;
  status: NotificationSaveStatus;
  ready: boolean;
  live: boolean;
  settingsError: string;
  rows: NotificationSettingRow[];
  quietRow: NotificationSettingRow;
  previewRow: NotificationSettingRow;
  groups: { id: string; name: string }[];
  error: string;
  permissionHelp: boolean;
  onToggle: (key: NotificationSettingRow['key']) => void;
  onTime: (key: 'quietStart' | 'quietEnd', value: string) => void;
  onGroup: (groupId: string, mode: NotificationGroupMode) => void;
  onRetry: () => void;
  onReload?: () => void;
  onDiscard?: () => void;
  onBack: () => void;
  onPermissionHelp: () => void;
}
