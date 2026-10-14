'use client';

import { useEffect, useState } from 'react';
import { useNotifications } from '../../hooks/use-notifications';
import {
  notificationPreviewRow,
  notificationQuietRow,
  notificationRows,
} from '../../content/notification-content';
import type {
  NotificationGroupMode,
  NotificationSettingRow,
} from '../../dto/notification.dto';
import { validNotificationTime } from '../../utils/notification-policy';
import { SettingsView } from './settings-view';
import '../../styles/notifications.css';

interface Props {
  onBack: () => void;
  groups?: { id: string; name: string }[];
}
export function SettingsContainer({ onBack, groups = [] }: Props) {
  const {
    preferences,
    status,
    ready,
    change,
    retry,
    flush,
    live,
    settingsError,
    settingsGroups,
    reloadSettings,
    discardChanges,
  } = useNotifications();
  useEffect(() => {
    void reloadSettings?.();
  }, [reloadSettings]);
  const [error, setError] = useState('');
  const [permissionHelp, setPermissionHelp] = useState(false);
  const toggle = (key: NotificationSettingRow['key']) =>
    change({ [key]: !preferences[key] });
  const time = (key: 'quietStart' | 'quietEnd', value: string) => {
    if (!validNotificationTime(value)) {
      setError('시간을 끝까지 입력해 주세요.');
      return;
    }
    const other = key === 'quietStart' ? 'quietEnd' : 'quietStart';
    if (value === preferences[other]) {
      setError('시작과 끝을 다른 시간으로 정해 주세요.');
      return;
    }
    setError('');
    change({ [key]: value });
  };
  const group = (groupId: string, mode: NotificationGroupMode) =>
    change({ groups: { ...preferences.groups, [groupId]: mode } });
  return (
    <SettingsView
      preferences={preferences}
      status={status}
      ready={ready && status !== 'saving' && status !== 'error'}
      live={!!live}
      settingsError={settingsError || ''}
      rows={notificationRows}
      quietRow={notificationQuietRow}
      previewRow={notificationPreviewRow}
      groups={settingsGroups ?? groups}
      error={error}
      permissionHelp={permissionHelp}
      onToggle={toggle}
      onTime={time}
      onGroup={group}
      onRetry={retry}
      onDiscard={
        discardChanges
          ? () => {
              discardChanges();
              onBack();
            }
          : undefined
      }
      onReload={reloadSettings ? () => void reloadSettings() : undefined}
      onBack={async () => {
        if (await flush()) onBack();
      }}
      onPermissionHelp={() => setPermissionHelp((current) => !current)}
    />
  );
}
