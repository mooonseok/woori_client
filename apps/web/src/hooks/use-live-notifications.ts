'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './use-auth';
import { useNotificationPreferences } from './use-notification-preferences';
import type { NotificationItem } from '@/dto/notification.dto';
import * as api from '@/services/notifications';
import { readWindow } from '@/services/list-window';
import { GROUP_MEMBERSHIP_CHANGED } from '@/services/api-client';
import { BLOCKS_CHANGED } from '@/services/blocks';
import { blockChangeOf, withoutPerson } from '@/utils/blocks';
import {
  applyRead,
  mergeNotificationItems,
  notificationModel,
  observeSequences,
  readRequests,
} from '@/utils/notification-model';
import {
  finishLoad,
  freshLoad,
  startLoad,
  type LoadState,
} from '@/utils/load-state';
const INBOX = 'inbox';
const FIRST_LOAD = freshLoad(INBOX);
const messageOf = (cause: unknown, fallback: string) =>
  cause instanceof Error && cause.message ? cause.message : fallback;
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
    [loadingMore, setLoadingMore] = useState(false),
    [pending, setPending] = useState(false),
    [actionError, setActionError] = useState('');
  // Only the first load (or a retry after it failed) shows loading; a refresh
  // keeps the rows (enabled, focused) until the new list lands.
  const statusRef = useRef<LoadState>(FIRST_LOAD);
  const [status, setStatus] = useState(FIRST_LOAD);
  const itemsRef = useRef<NotificationItem[]>([]);
  const scope = useRef<AbortController | null>(null),
    generation = useRef(0),
    marking = useRef(false);
  const applyStatus = useCallback((next: LoadState) => {
    statusRef.current = next;
    setStatus(next);
  }, []);
  const show = useCallback((next: NotificationItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);
  // Re-reads as many rows as are shown: bundles move up and change in place,
  // pages loaded with "더 보기" stay, and the newest response wins.
  const load = useCallback(async () => {
    const controller = scope.current;
    if (!user || !controller || controller.signal.aborted) return;
    const version = ++generation.current,
      signal = controller.signal;
    const start = startLoad(statusRef.current, INBOX);
    applyStatus(start.state);
    setLoadingMore(false);
    try {
      let unread = 0;
      const page = await readWindow(
        async (cursor, pageSignal) => {
          const result = await api.listNotifications(cursor, pageSignal);
          if (!cursor) unread = result.unreadCount;
          return {
            items: result.notifications.map(notificationModel),
            nextCursor: result.nextCursor,
          };
        },
        itemsRef.current.length,
        signal,
        // A cursor row that disappeared still continues from its place.
        () => false
      );
      if (signal.aborted || version !== generation.current) return;
      // Past the page limit, rows loaded beyond the window stay listed.
      show(
        mergeNotificationItems(page.capped ? itemsRef.current : [], page.items)
      );
      setUnreadCount(unread);
      if (!page.capped) setCursor(page.nextCursor);
      setNow(Date.now());
      applyStatus(finishLoad(statusRef.current, INBOX, start.background));
    } catch (error) {
      if (!signal.aborted && version === generation.current)
        applyStatus(
          finishLoad(
            statusRef.current,
            INBOX,
            start.background,
            messageOf(error, '알림을 불러오지 못했어요.')
          )
        );
    }
  }, [user, applyStatus, show]);
  // The "새로고침"/"다시 불러오기" buttons (and the page's mount effect): also
  // clears an action error. Stable, as consumers use it in effect deps.
  const reload = useCallback(async () => {
    setActionError('');
    await load();
  }, [load]);
  async function more() {
    const controller = scope.current,
      cursor = nextCursor;
    if (!controller || !cursor || loadingMore) return;
    const version = ++generation.current,
      signal = controller.signal;
    setLoadingMore(true);
    setActionError('');
    try {
      const result = await api.listNotifications(cursor, signal);
      if (signal.aborted || version !== generation.current) return;
      show(
        mergeNotificationItems(
          itemsRef.current,
          result.notifications.map(notificationModel)
        )
      );
      setUnreadCount(result.unreadCount);
      setCursor(result.nextCursor);
      setNow(Date.now());
    } catch (error) {
      if (!signal.aborted && version === generation.current)
        setActionError(messageOf(error, '알림을 더 불러오지 못했어요.'));
    } finally {
      if (!signal.aborted && version === generation.current)
        setLoadingMore(false);
    }
  }
  // A new scope: no rows from before it may land (groups, blocks, account).
  const restart = useCallback(() => {
    scope.current?.abort();
    scope.current = new AbortController();
    generation.current++;
    marking.current = false;
    setPending(false);
    setLoadingMore(false);
  }, []);
  const invalidateGroups = useCallback(() => {
    restart();
    show([]);
    setUnreadCount(0);
    setCursor(null);
    applyStatus(freshLoad(INBOX));
    settingsRef.current.invalidateGroups();
    void load();
  }, [restart, show, applyStatus, load]);
  useEffect(() => {
    // The server deletes my notifications caused by a person I block: hide
    // them now, restart the scope (dropping in-flight pages and pending
    // read-all with stale ids) and refetch the list and unread count.
    const changed = (event: Event) => {
      const change = blockChangeOf(event);
      if (!change?.blocked) return;
      restart();
      show(
        withoutPerson(itemsRef.current, (item) => item.actorId, change.userId)
      );
      void load();
    };
    window.addEventListener(BLOCKS_CHANGED, changed);
    return () => window.removeEventListener(BLOCKS_CHANGED, changed);
  }, [restart, show, load]);
  useEffect(() => {
    window.addEventListener(GROUP_MEMBERSHIP_CHANGED, invalidateGroups);
    return () =>
      window.removeEventListener(GROUP_MEMBERSHIP_CHANGED, invalidateGroups);
  }, [invalidateGroups]);
  useEffect(() => {
    const controller = new AbortController();
    scope.current = controller;
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
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
      controller.abort();
      scope.current?.abort();
      clearInterval(timer);
      window.removeEventListener('focus', focus);
    };
  }, [load]);
  // `observed`: a fresher latestSequence per id (from /target) to read through.
  async function mark(ids: string[], observed: Record<string, number> = {}) {
    const controller = scope.current;
    if (!controller || controller.signal.aborted || marking.current)
      return false;
    const rows = readRequests(itemsRef.current, ids, observed);
    if (!rows.length) {
      show(observeSequences(itemsRef.current, observed));
      return true;
    }
    const signal = controller.signal;
    marking.current = true;
    // A list response from before this read must not undo it.
    generation.current++;
    setPending(true);
    setActionError('');
    try {
      for (let start = 0; start < rows.length; start += 100) {
        const batch = rows.slice(start, start + 100);
        if (batch.length === 1)
          await api.readNotification(
            batch[0].id,
            batch[0].throughSequence,
            signal
          );
        else await api.readNotifications(batch, signal);
        signal.throwIfAborted();
        show(applyRead(itemsRef.current, batch));
      }
      return true;
    } catch (error) {
      if (!signal.aborted)
        setActionError(messageOf(error, '읽음 상태를 저장하지 못했어요.'));
      return false;
    } finally {
      if (scope.current === controller) marking.current = false;
      if (!signal.aborted) {
        setPending(false);
        // Server truth: unread count, and bundles that grew meanwhile.
        void load();
      }
    }
  }
  return {
    ...settings,
    live: true,
    items,
    unreadCount,
    now,
    loading: (!!user && status.loading) || loadingMore,
    pending,
    error: status.error || actionError,
    nextCursor,
    latestDecision: '',
    notify: () => {},
    markRead: (id: string, latestSequence?: number) =>
      mark([id], latestSequence ? { [id]: latestSequence } : {}),
    markAllRead: () => {
      void mark(itemsRef.current.map((item) => item.id));
    },
    invalidateGroups,
    reload,
    more,
  };
}
