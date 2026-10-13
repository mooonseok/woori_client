"use client";

import { useEffect, useRef, useState } from "react";
import { useNotifications } from "../../hooks/use-notifications";
import {
  notificationDateLabel,
  notificationRelativeTime,
} from "../../utils/notification-policy";
import { NotificationsView } from "./notifications-view";
import type { NotificationRowViewModel } from "./notifications-view";
import "../../styles/notifications.css";

interface Props {
  onOpenPhoto: (id: string) => void;
  onBack: () => void;
  onSettings: () => void;
}
export function NotificationsContainer({
  onOpenPhoto,
  onBack,
  onSettings,
}: Props) {
  const { items, unreadCount, markRead, markAllRead, now } = useNotifications();
  const [shownIds, setShownIds] = useState<string[]>(() =>
    items.map((item) => item.id),
  );
  const initialized = useRef(items.length > 0);
  useEffect(() => {
    if (initialized.current || !now) return;
    initialized.current = true;
    queueMicrotask(() => setShownIds(items.map((item) => item.id)));
  }, [items, now]);
  const pendingCount = items.filter(
    (item) => !shownIds.includes(item.id),
  ).length;
  const groups: { label: string; rows: NotificationRowViewModel[] }[] = [];
  for (const id of shownIds) {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) continue;
    const label = notificationDateLabel(item.timestamp, now);
    let group = groups.find((candidate) => candidate.label === label);
    if (!group) {
      group = { label, rows: [] };
      groups.push(group);
    }
    group.rows.push({
      id: item.id,
      title: item.title,
      image: `/photos/${item.photoId}.jpg`,
      group: "윤슬네 가족",
      when: notificationRelativeTime(item.timestamp, now),
      read: item.read,
      count: item.count,
      onOpen: () => {
        markRead(item.id);
        onOpenPhoto(item.photoId);
      },
    });
  }
  return (
    <NotificationsView
      groups={groups}
      unreadCount={unreadCount}
      pendingCount={pendingCount}
      loading={!now}
      onShowNew={() => setShownIds(items.map((item) => item.id))}
      onReadAll={markAllRead}
      onBack={onBack}
      onSettings={onSettings}
    />
  );
}
