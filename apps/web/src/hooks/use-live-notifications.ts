'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './use-auth';
import { useNotificationPreferences } from './use-notification-preferences';
import type { NotificationItem } from '@/dto/notification.dto';
import * as api from '@/services/notifications';
import { GROUP_MEMBERSHIP_CHANGED } from '@/services/api-client';
import {
  notificationModel,
  mergeNotificationItems,
} from '@/utils/notification-model';
export function useLiveNotifications() {
  const { user } = useAuth();
  const settings = useNotificationPreferences(!!user);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  const [items, setItems] = useState<NotificationItem[]>([]),
    [unreadCount, setUnreadCount] = useState(0),
    [nextCursor, setCursor] = useState<string | null>(null);
  const [now, setNow] = useState(0),
    [loading, setLoading] = useState(!!user),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const scope = useRef<{ controller: AbortController; busy: boolean } | null>(
    null
  );
  const load = useCallback(
    async (cursor: string | null = null) => {
      const current = scope.current;
      if (
        !user ||
        !current ||
        current.busy ||
        current.controller.signal.aborted
      )
        return;
      current.busy = true;
      setLoading(true);
      setError('');
      try {
        const result = await api.listNotifications(
          cursor,
          current.controller.signal
        );
        current.controller.signal.throwIfAborted();
        const incoming = result.notifications.map(notificationModel);
        setItems((previous) =>
          cursor ? mergeNotificationItems(previous, incoming) : incoming
        );
        setUnreadCount(result.unreadCount);
        setCursor(result.nextCursor);
        setNow(Date.now());
      } catch (error) {
        if (!current.controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : '알림을 불러오지 못했어요.'
          );
      } finally {
        current.busy = false;
        if (!current.controller.signal.aborted) setLoading(false);
      }
    },
    [user]
  );
  const invalidateGroups = useCallback(() => {
    scope.current?.controller.abort();
    scope.current = { controller: new AbortController(), busy: false };
    setItems([]);
    setUnreadCount(0);
    setCursor(null);
    setPending(false);
    settingsRef.current.invalidateGroups();
    void load();
  }, [load]);
  useEffect(() => {
    window.addEventListener(GROUP_MEMBERSHIP_CHANGED, invalidateGroups);
    return () =>
      window.removeEventListener(GROUP_MEMBERSHIP_CHANGED, invalidateGroups);
  }, [invalidateGroups]);
  useEffect(() => {
    const current = { controller: new AbortController(), busy: false };
    scope.current = current;
    queueMicrotask(() => {
      if (!current.controller.signal.aborted) {
        setNow(Date.now());
        void load();
      }
    });
    const timer = setInterval(() => setNow(Date.now()), 60000);
    const focus = () => {
      if (document.visibilityState === 'visible') void load();
    };
    window.addEventListener('focus', focus);
    return () => {
      current.controller.abort();
      scope.current?.controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', focus);
    };
  }, [load]);
  async function mark(ids: string[]) {
    const current = scope.current;
    if (!current || current.busy || current.controller.signal.aborted)
      return false;
    const observed = items
      .filter((item) => ids.includes(item.id) && !item.read)
      .map((item) => ({ id: item.id, throughSequence: item.latestSequence! }));
    if (!observed.length) return true;
    current.busy = true;
    let succeeded = false;
    setPending(true);
    setError('');
    try {
      for (let start = 0; start < observed.length; start += 100) {
        const batch = observed.slice(start, start + 100);
        if (batch.length === 1)
          await api.readNotification(
            batch[0].id,
            batch[0].throughSequence,
            current.controller.signal
          );
        else await api.readNotifications(batch, current.controller.signal);
        current.controller.signal.throwIfAborted();
        setItems((previous) =>
          previous.map((item) =>
            batch.some(
              (row) =>
                row.id === item.id &&
                row.throughSequence === item.latestSequence
            )
              ? { ...item, read: true }
              : item
          )
        );
      }
      succeeded = true;
      return true;
    } catch (error) {
      if (!current.controller.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : '읽음 상태를 저장하지 못했어요.'
        );
      return false;
    } finally {
      current.busy = false;
      if (!current.controller.signal.aborted) {
        setPending(false);
        if (succeeded) await load();
      }
    }
  }
  return {
    ...settings,
    live: true,
    items,
    unreadCount,
    now,
    loading,
    pending,
    error,
    nextCursor,
    latestDecision: '',
    notify: () => {},
    markRead: (id: string) => mark([id]),
    markAllRead: () => {
      void mark(items.map((item) => item.id));
    },
    invalidateGroups,
    reload: load,
    more: () => load(nextCursor),
  };
}
