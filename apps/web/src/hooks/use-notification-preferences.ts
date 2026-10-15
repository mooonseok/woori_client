'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  NotificationPreferences,
  NotificationSaveStatus,
} from '@/dto/notification.dto';
import type { NotificationPreferencesResponse } from '@/dto/notification-api.dto';
import * as api from '@/services/notifications';
import { ApiError } from '@/services/api-client';
import { notificationDefaults } from '@/utils/notification-policy';
import { preferenceModel, preferencePatch } from '@/utils/notification-model';

export function useNotificationPreferences(enabled: boolean) {
  const initial = () => ({ ...notificationDefaults(), groups: {} });
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(initial);
  const [savedPreferences, setSavedPreferences] =
    useState<NotificationPreferences>(initial);
  const [status, setStatus] = useState<NotificationSaveStatus>('idle');
  const [ready, setReady] = useState(false),
    [settingsError, setError] = useState('');
  const [settingsGroups, setGroups] = useState<{ id: string; name: string }[]>(
    []
  );
  const controller = useRef<AbortController | null>(null);
  const stored = useRef<NotificationPreferencesResponse | null>(null);
  const draft = useRef(preferences);
  const saving = useRef<Promise<boolean> | null>(null);
  const conflict = useRef(false);
  const loading = useRef(false);
  const accept = useCallback((result: NotificationPreferencesResponse) => {
    stored.current = result;
    draft.current = preferenceModel(result);
    setPreferences(draft.current);
    setSavedPreferences(draft.current);
    setGroups(result.groups.map((g) => ({ id: g.groupId, name: g.groupName })));
    setReady(true);
  }, []);
  const reloadSettings = useCallback(async () => {
    const signal = controller.current?.signal;
    if (
      !enabled ||
      !signal ||
      signal.aborted ||
      saving.current ||
      loading.current
    )
      return;
    loading.current = true;
    setReady(false);
    setError('');
    try {
      const result = await api.getNotificationPreferences(signal);
      signal.throwIfAborted();
      accept(result);
      conflict.current = false;
      setStatus('idle');
    } catch (error) {
      if (!signal.aborted)
        setError(
          error instanceof Error ? error.message : '설정을 불러오지 못했어요.'
        );
    } finally {
      if (signal === controller.current?.signal) loading.current = false;
    }
  }, [enabled, accept]);
  useEffect(() => {
    const current = new AbortController();
    controller.current = current;
    queueMicrotask(() => {
      if (!current.signal.aborted) void reloadSettings();
    });
    return () => {
      current.abort();
      controller.current?.abort();
    };
  }, [reloadSettings]);
  const save = useCallback(
    (snapshot: NotificationPreferences) => {
      const signal = controller.current?.signal,
        previous = stored.current;
      if (
        !signal ||
        signal.aborted ||
        !previous ||
        saving.current ||
        conflict.current
      )
        return;
      setStatus('saving');
      setError('');
      const groupId = Object.keys(snapshot.groups).find(
        (id) => snapshot.groups[id] !== preferenceModel(previous).groups[id]
      );
      const promise = (async () => {
        try {
          const result = groupId
            ? await api.setGroupNotificationPreference(
                groupId,
                snapshot.groups[groupId].toUpperCase() as
                  'DEFAULT' | 'MINE' | 'OFF',
                previous.preferences.version,
                signal
              )
            : await api.patchNotificationPreferences(
                preferencePatch(snapshot, previous.preferences.version),
                signal
              );
          signal.throwIfAborted();
          accept(result);
          setStatus('saved');
          return true;
        } catch (error) {
          if (!signal.aborted) {
            conflict.current =
              error instanceof ApiError && error.status === 409;
            setError(
              conflict.current
                ? '다른 화면에서 설정이 변경됐어요. 최신 설정을 불러온 뒤 다시 선택해 주세요.'
                : error instanceof Error
                  ? error.message
                  : '설정을 저장하지 못했어요.'
            );
            setStatus('error');
          }
          return false;
        } finally {
          if (signal === controller.current?.signal) saving.current = null;
        }
      })();
      saving.current = promise;
    },
    [accept]
  );
  const change = useCallback(
    (patch: Partial<NotificationPreferences>) => {
      if (!ready || saving.current || conflict.current) return;
      draft.current = { ...draft.current, ...patch };
      setPreferences(draft.current);
      save(draft.current);
    },
    [ready, save]
  );
  return {
    preferences,
    savedPreferences,
    status,
    ready,
    settingsError,
    settingsGroups,
    change,
    retry: () => {
      if (conflict.current || !ready) void reloadSettings();
      else save(draft.current);
    },
    invalidateGroups: () => {
      controller.current?.abort();
      controller.current = new AbortController();
      loading.current = false;
      saving.current = null;
      stored.current = null;
      draft.current = { ...notificationDefaults(), groups: {} };
      setGroups([]);
      setPreferences(draft.current);
      setSavedPreferences(draft.current);
      setReady(false);
      void reloadSettings();
    },
    reloadSettings,
    discardChanges: () => {
      if (saving.current) return;
      if (stored.current) accept(stored.current);
      conflict.current = false;
      setError('');
      setStatus('idle');
    },
    flush: async () =>
      saving.current ? await saving.current : status !== 'error',
  };
}
