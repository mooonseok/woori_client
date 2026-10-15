'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { currentSessionRevision } from '@/services/api-client';
import { isNotFound, messageOf } from '@/utils/admin-errors';

// Loads one admin record (notice, inquiry, report). load = null means the id
// in the URL is not valid, shown as "not found" without a request. Detail
// GETs of inquiries/reports are audited, so the record is fetched once per
// mount and mutations prefer the updated record returned by the server.
export function useAdminRecord<T extends { id: string }>(
  load: ((signal: AbortSignal) => Promise<T>) | null,
  fallback: string
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(load !== null),
    [error, setError] = useState(''),
    [notFound, setNotFound] = useState(load === null);
  const active = useRef<AbortController | null>(null);
  const fetchRecord = useCallback(async () => {
    if (!load) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const revision = currentSessionRevision();
    setLoading(true);
    setError('');
    try {
      const next = await load(controller.signal);
      if (controller.signal.aborted || revision !== currentSessionRevision())
        return;
      setData(next);
      setNotFound(false);
    } catch (cause) {
      if (controller.signal.aborted || revision !== currentSessionRevision())
        return;
      if (isNotFound(cause)) {
        setData(null);
        setNotFound(true);
      } else setError(messageOf(cause, fallback));
    } finally {
      if (active.current === controller) {
        active.current = null;
        setLoading(false);
      }
    }
  }, [load, fallback]);
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) void fetchRecord();
    });
    return () => {
      mounted = false;
      active.current?.abort();
      active.current = null;
    };
  }, [fetchRecord]);
  return {
    data,
    loading,
    error,
    notFound,
    reload: () => void fetchRecord(),
    // Applies a mutation response: merged when it is the same record,
    // otherwise the record is fetched again.
    apply: (response: unknown) => {
      const value = response as Partial<T> | null;
      if (data && value && typeof value === 'object' && value.id === data.id)
        setData({ ...data, ...value });
      else void fetchRecord();
    },
  };
}
