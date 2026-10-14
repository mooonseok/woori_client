'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './use-auth';
import {
  pushConfig,
  requestPushPermission,
  pushStatus,
  savePushSubscription,
  ensureBrowserPushSubscription,
  removePushSubscription,
  supportsWebPush,
  pushWorker,
  vapidKey,
} from '@/services/web-push';
import type { PushConfig, PushDeviceState } from '@/dto/web-push.dto';
export function useWebPush(live: boolean) {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<PushDeviceState>('loading');
  const [error, setError] = useState('');
  const config = useRef<PushConfig | null>(null);
  const active = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const checking = useRef<AbortController | null>(null);
  const lastCheck = useRef(0);
  const reload = useCallback(
    async (background = false) => {
      if (busy.current) return;
      if (
        background &&
        ((checking.current && !checking.current.signal.aborted) ||
          Date.now() - lastCheck.current < 2000)
      )
        return;
      active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      checking.current = controller;
      lastCheck.current = Date.now();
      const signal = controller.signal;
      if (!background) {
        setError('');
        setState('loading');
      }
      const accept = (next: PushDeviceState) => {
        signal.throwIfAborted();
        setError('');
        setState(next);
      };
      try {
        if (!live || !userId || !supportsWebPush()) {
          accept('unsupported');
          return;
        }
        const currentConfig = await pushConfig(signal);
        signal.throwIfAborted();
        config.current = currentConfig;
        if (!currentConfig.enabled || !currentConfig.publicKey) {
          accept('unconfigured');
          return;
        }
        if (Notification.permission === 'denied') {
          accept('denied');
          return;
        }
        const registration = await navigator.serviceWorker.getRegistration('/');
        signal.throwIfAborted();
        const subscription = await registration?.pushManager.getSubscription();
        signal.throwIfAborted();
        const status = subscription
          ? await pushStatus(subscription.endpoint, signal)
          : null;
        accept(
          status?.enabled && Notification.permission === 'granted'
            ? 'on'
            : 'off'
        );
      } catch (cause) {
        if (!signal.aborted) {
          setState('error');
          setError(
            cause instanceof Error
              ? cause.message
              : '알림 연결을 확인하지 못했어요.'
          );
        }
      } finally {
        if (checking.current === controller) checking.current = null;
      }
    },
    [live, userId]
  );
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) void reload();
    });
    const focus = () => {
      if (document.visibilityState === 'visible') void reload(true);
    };
    window.addEventListener('focus', focus);
    return () => {
      mounted = false;
      active.current?.abort();
      window.removeEventListener('focus', focus);
    };
  }, [reload]);
  async function change(enable: boolean) {
    if (busy.current) return;
    busy.current = true;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const signal = controller.signal;
    setError('');
    setState('busy');
    try {
      // Permission must be requested synchronously from this explicit button gesture.
      const permission = enable
        ? await requestPushPermission(signal)
        : Notification.permission;
      signal.throwIfAborted();
      if (enable && permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const registration = enable
        ? await pushWorker()
        : await navigator.serviceWorker.getRegistration('/');
      signal.throwIfAborted();
      if (!registration) {
        setState('off');
        return;
      }
      let subscription = await registration.pushManager.getSubscription();
      if (enable) {
        if (!config.current?.publicKey)
          throw new Error('서버 알림 설정을 다시 확인해 주세요.');
        const publicKey = vapidKey(config.current.publicKey);
        subscription = await ensureBrowserPushSubscription(
          registration,
          publicKey,
          signal
        );
        signal.throwIfAborted();
        try {
          await savePushSubscription(subscription.toJSON(), signal);
        } catch (cause) {
          await subscription.unsubscribe().catch(() => false);
          throw cause;
        }
      } else if (subscription) {
        const status = await pushStatus(subscription.endpoint, signal);
        if (status.installationId)
          await removePushSubscription(status.installationId, signal);
        if (!(await subscription.unsubscribe()))
          throw new Error('브라우저 연결 해제를 다시 시도해 주세요.');
        (await registration.getNotifications()).forEach((notification) =>
          notification.close()
        );
      }
      signal.throwIfAborted();
      setState(enable ? 'on' : 'off');
    } catch (cause) {
      if (!signal.aborted) {
        setState('error');
        setError(
          cause instanceof Error
            ? cause.message
            : '알림 연결을 변경하지 못했어요.'
        );
      }
    } finally {
      busy.current = false;
    }
  }
  return {
    state,
    error,
    onEnable: () => void change(true),
    onDisable: () => void change(false),
    onRetry: () => void reload(),
  };
}
