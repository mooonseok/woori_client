'use client';
import { useEffect, useRef } from 'react';
import { useNotifications } from '../../hooks/use-notifications';
import { useNotificationTarget } from '@/hooks/use-notification-target';
import {
  notificationDateLabel,
  notificationRelativeTime,
} from '../../utils/notification-policy';
import { PhotoViewer } from '@/components/organisms/photo-viewer/photo-viewer';
import { NotificationsView } from './notifications-view';
import type { NotificationRowViewModel } from './notifications-view';
import '../../styles/notifications.css';
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
  const inbox = useNotifications();
  const target = useNotificationTarget();
  const reload = inbox.reload;
  const requested = useRef(false);
  const targetRef = useRef(target);
  const inboxRef = useRef(inbox);
  useEffect(() => {
    targetRef.current = target;
    inboxRef.current = inbox;
  });
  useEffect(() => {
    if (!inbox.live || requested.current) return;
    const id = new URLSearchParams(window.location.search).get(
      'notificationId'
    );
    if (
      !id ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      )
    )
      return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      requested.current = true;
      void targetRef.current.open(id, true).then(async (opened) => {
        if (opened) await inboxRef.current.reload?.();
      });
    });
    return () => {
      active = false;
    };
  }, [inbox.live]);
  useEffect(() => {
    void reload?.();
  }, [reload]);
  const groups: { label: string; rows: NotificationRowViewModel[] }[] = [];
  for (const item of inbox.items) {
    const label = notificationDateLabel(item.timestamp, inbox.now);
    let group = groups.find((candidate) => candidate.label === label);
    if (!group) {
      group = { label, rows: [] };
      groups.push(group);
    }
    group.rows.push({
      id: item.id,
      title: item.title,
      image: inbox.live ? undefined : `/photos/${item.photoId}.jpg`,
      group: item.groupName || '윤슬네 가족',
      when: notificationRelativeTime(item.timestamp, inbox.now),
      read: item.read,
      count: item.count,
      onOpen: async () => {
        if (inbox.live) {
          if (await target.open(item.id)) await inbox.markRead(item.id);
        } else {
          inbox.markRead(item.id);
          onOpenPhoto(item.photoId);
        }
      },
    });
  }
  return (
    <>
      <NotificationsView
        groups={groups}
        unreadCount={inbox.unreadCount}
        loading={!!inbox.loading || !inbox.now}
        pending={!!inbox.pending || target.opening}
        live={!!inbox.live}
        error={target.error || inbox.error || ''}
        hasMore={!!inbox.nextCursor}
        onRefresh={() => {
          target.close();
          void inbox.reload?.();
        }}
        onMore={() => void inbox.more?.()}
        onReadAll={inbox.markAllRead}
        onBack={onBack}
        onSettings={onSettings}
      />
      {target.viewer && (
        <PhotoViewer
          key={target.viewer.photo.id}
          live
          photos={[target.viewer.photo]}
          initialPhotoId={target.viewer.photo.id}
          initialCommentId={target.viewer.target.commentId || undefined}
          comments={[]}
          reactions={[]}
          onAddComment={() => {}}
          onReact={() => {}}
          onClose={target.close}
          onDownloadOriginal={target.download}
        />
      )}
    </>
  );
}
