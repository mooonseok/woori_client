'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type {
  NotificationItem,
  NotificationType,
} from '../dto/notification.dto';
import { DEMO_MODE } from '@/constants/app-mode';
import { createNotificationFixtures } from '../content/notification-content';
import {
  insertNotification,
  notificationDecision,
  notificationKstTime,
} from '../utils/notification-policy';
import { useDemoNotificationPreferences } from './use-demo-notification-preferences';
import { useLiveNotifications } from './use-live-notifications';
import { useAuth } from './use-auth';

type PreferencesApi = ReturnType<typeof useDemoNotificationPreferences>;
interface NotificationsApi extends Omit<PreferencesApi, 'flush'> {
  flush: () => boolean | Promise<boolean>;
  live?: boolean;
  loading?: boolean;
  pending?: boolean;
  error?: string;
  settingsError?: string;
  settingsGroups?: { id: string; name: string }[];
  nextCursor?: string | null;
  reload?: () => Promise<void>;
  more?: () => Promise<void>;
  reloadSettings?: () => Promise<void>;
  discardChanges?: () => void;
  items: NotificationItem[];
  unreadCount: number;
  now: number;
  latestDecision: string;
  notify: (type: NotificationType, photoId: string, title: string) => void;
  markRead: (id: string) => void | Promise<boolean>;
  markAllRead: () => void;
}
const NotificationContext = createContext<NotificationsApi | null>(null);

function DemoNotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [now, setNow] = useState(0);
  const [latestDecision, setLatestDecision] = useState('');
  const counter = useRef(0);
  const settings = useDemoNotificationPreferences();
  const settingsRef = useRef(settings.savedPreferences);
  useEffect(() => {
    settingsRef.current = settings.savedPreferences;
  }, [settings.savedPreferences]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const current = Date.now();
      setNow(current);
      setItems(DEMO_MODE ? createNotificationFixtures(current) : []);
    });
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const notify = useCallback(
    (type: NotificationType, photoId: string, title: string) => {
      if (!DEMO_MODE) return;
      const timestamp = Date.now();
      const item: NotificationItem = {
        id: `incoming-${timestamp}-${++counter.current}`,
        type,
        photoId,
        groupId: 'g1',
        title,
        timestamp,
        createdAt: timestamp,
        read: false,
        count: 1,
      };
      setItems((current) => insertNotification(current, item));
      setNow(timestamp);
      const decision = notificationDecision(
        type,
        settingsRef.current,
        item.groupId,
        notificationKstTime(new Date(timestamp))
      );
      setLatestDecision(
        `${decision.reason} 기기 푸시는 아직 연결하지 않았어요.`
      );
    },
    []
  );
  const markRead = useCallback(
    (id: string) =>
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true } : item))
      ),
    []
  );
  const markAllRead = useCallback(
    () =>
      setItems((current) => current.map((item) => ({ ...item, read: true }))),
    []
  );
  const value = useMemo(
    () => ({
      ...settings,
      items,
      unreadCount: items.filter((item) => !item.read).length,
      now,
      latestDecision,
      notify,
      markRead,
      markAllRead,
    }),
    [settings, items, now, latestDecision, notify, markRead, markAllRead]
  );
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
export function useNotifications(): NotificationsApi {
  const value = useContext(NotificationContext);
  if (!value)
    throw new Error('NotificationProvider 안에서 알림 기능을 사용해 주세요.');
  return value;
}

function LiveNotificationProvider({ children }: { children: ReactNode }) {
  const value = useLiveNotifications();
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return DEMO_MODE ? (
    <DemoNotificationProvider>{children}</DemoNotificationProvider>
  ) : (
    <LiveNotificationProvider key={user?.id || 'anonymous'}>
      {children}
    </LiveNotificationProvider>
  );
}
