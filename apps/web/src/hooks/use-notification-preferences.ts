"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  NotificationPreferences,
  NotificationSaveStatus,
} from "../dto/notification.dto";
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
} from "../services/notification-storage";
import { notificationDefaults } from "../utils/notification-policy";

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState(notificationDefaults);
  const [savedPreferences, setSavedPreferences] =
    useState(notificationDefaults);
  const [status, setStatus] = useState<NotificationSaveStatus>("idle");
  const [ready, setReady] = useState(false);
  const draft = useRef(preferences);
  const saved = useRef(savedPreferences);
  const failed = useRef<NotificationPreferences | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);

  const flush = useCallback(() => {
    if (!pending.current) return true;
    const snapshot = draft.current;
    pending.current = false;
    try {
      saveNotificationPreferences(snapshot);
      saved.current = snapshot;
      failed.current = null;
      setSavedPreferences(snapshot);
      setStatus("saved");
      return true;
    } catch {
      failed.current = snapshot;
      draft.current = saved.current;
      setPreferences(saved.current);
      setStatus("error");
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const loaded = loadNotificationPreferences();
      draft.current = loaded;
      saved.current = loaded;
      setPreferences(loaded);
      setSavedPreferences(loaded);
      setReady(true);
    });
    const visibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
      if (pending.current) {
        try {
          saveNotificationPreferences(draft.current);
        } catch {
          pending.current = false;
        }
      }
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [flush]);

  const change = useCallback(
    (patch: Partial<NotificationPreferences>) => {
      if (!ready) return;
      const next = { ...draft.current, ...patch };
      draft.current = next;
      failed.current = null;
      pending.current = true;
      setPreferences(next);
      setStatus("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 450);
    },
    [flush, ready],
  );

  const retry = useCallback(() => {
    const snapshot = failed.current;
    if (snapshot) change(snapshot);
  }, [change]);

  return { preferences, savedPreferences, status, ready, change, retry, flush };
}
