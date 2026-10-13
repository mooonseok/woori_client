"use client";

import { DEMO_MODE } from "@/constants/app-mode";
import { Box, Heading, Text, Button } from "@/components/atoms/ui";
import { useState } from "react";
import { useNotifications } from "../../hooks/use-notifications";
import {
  notificationPreviewRow,
  notificationQuietRow,
  notificationRows,
} from "../../content/notification-content";
import type {
  NotificationGroupMode,
  NotificationSettingRow,
} from "../../dto/notification.dto";
import { validNotificationTime } from "../../utils/notification-policy";
import { SettingsView } from "./settings-view";
import "../../styles/notifications.css";

interface Props {
  onBack: () => void;
  groups?: { id: string; name: string }[];
}
export function SettingsContainer({ onBack, groups = [] }: Props) {
  const { preferences, status, ready, change, retry, flush } =
    useNotifications();
  const [error, setError] = useState("");
  const [permissionHelp, setPermissionHelp] = useState(false);
  const toggle = (key: NotificationSettingRow["key"]) =>
    change({ [key]: !preferences[key] });
  const time = (key: "quietStart" | "quietEnd", value: string) => {
    if (!validNotificationTime(value)) {
      setError("시간을 끝까지 입력해 주세요.");
      return;
    }
    const other = key === "quietStart" ? "quietEnd" : "quietStart";
    if (value === preferences[other]) {
      setError("시작과 끝을 다른 시간으로 정해 주세요.");
      return;
    }
    setError("");
    change({ [key]: value });
  };
  const group = (groupId: string, mode: NotificationGroupMode) =>
    change({ groups: { ...preferences.groups, [groupId]: mode } });
  if (!DEMO_MODE)
    return (
      <Box className="state-panel">
        <Heading>알림 설정</Heading>
        <Text>
          기기 푸시 알림 연결을 준비하고 있어요. 연결 후 사진·댓글·반응 알림과
          방해금지 시간을 여기에서 설정할 수 있어요.
        </Text>
        <Button className="secondary-button" onClick={onBack}>
          확인
        </Button>
      </Box>
    );
  return (
    <SettingsView
      preferences={preferences}
      status={status}
      ready={ready}
      rows={notificationRows}
      quietRow={notificationQuietRow}
      previewRow={notificationPreviewRow}
      groups={groups}
      error={error}
      permissionHelp={permissionHelp}
      onToggle={toggle}
      onTime={time}
      onGroup={group}
      onRetry={retry}
      onBack={() => {
        if (flush()) onBack();
      }}
      onPermissionHelp={() => setPermissionHelp((current) => !current)}
    />
  );
}
