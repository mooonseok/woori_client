'use client';
import { useEffect, useRef } from 'react';
import { useNotifications } from '../../hooks/use-notifications';
import { useNotificationTarget } from '@/hooks/use-notification-target';
import {
  notificationDateLabel,
  notificationRelativeTime,
} from '../../utils/notification-policy';
import { PhotoViewer } from '@/components/organisms/photo-viewer/photo-viewer';
import { notificationDestination } from '@/utils/notification-model';
import { NotificationsView } from './notifications-view';
import type { NotificationRowViewModel } from './notifications-view';
import '../../styles/notifications.css';
interface Props {
  onOpenPhoto: (id: string) => void;
  // PHOTOS bundles lead to the album screen (switching group if needed).
  onOpenAlbum: (groupId: string, albumId: string) => void;
  onBack: () => void;
  onSettings: () => void;
}
export function NotificationsContainer({
  onOpenPhoto,
  onOpenAlbum,
  onBack,
  onSettings,
}: Props) {
  const inbox = useNotifications();
  const target = useNotificationTarget();
  const reload = inbox.reload;
  const requested = useRef(false);
  const targetRef = useRef(target);
  const inboxRef = useRef(inbox);
  const albumRef = useRef(onOpenAlbum);
  useEffect(() => {
    targetRef.current = target;
    inboxRef.current = inbox;
    albumRef.current = onOpenAlbum;
  });
  useEffect(() => {
    // After the first list load, so the row (and its media kind) is known.
    if (!inbox.live || inbox.loading || requested.current) return;
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
      // A push opens before the row may be loaded: its kind if known.
      const row = inboxRef.current.items.find((item) => item.id === id);
      void targetRef.current
        .open(id, true, row?.mediaKind)
        .then(async (opened) => {
          if (!opened) return;
          const destination = notificationDestination(opened);
          if (destination.kind === 'album')
            albumRef.current(destination.groupId, destination.albumId);
          await inboxRef.current.reload?.();
        });
    });
    return () => {
      active = false;
    };
  }, [inbox.live, inbox.loading]);
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
      group: item.groupName || '이름 없는 그룹',
      when: notificationRelativeTime(item.timestamp, inbox.now),
      read: item.read,
      count: item.count,
      onOpen: async () => {
        if (inbox.live) {
          const opened = await target.open(item.id, false, item.mediaKind);
          if (!opened) return;
          const destination = notificationDestination(opened);
          if (destination.kind === 'album')
            onOpenAlbum(destination.groupId, destination.albumId);
          // Read through what was opened, which may be newer than the row.
          await inbox.markRead(item.id, opened.latestSequence);
        } else {
          inbox.markRead(item.id);
          if (item.navigation === 'ALBUM' && item.albumId)
            onOpenAlbum(item.groupId, item.albumId);
          else onOpenPhoto(item.photoId);
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
          loadVideo={target.loadVideo}
        />
      )}
    </>
  );
}
