'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isNotFound, isUuid } from '@/utils/service-guidance';

export type RecordDetailState<T> =
  | { status: 'disabled' }
  | { status: 'invalid' }
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; error: string }
  | { status: 'ready'; record: T };

// Loads one record by a validated UUID. Results are tagged with the requested
// id, so a stale response for a previous id or account is never shown.
export function useRecordDetail<T>(
  id: string,
  fetchRecord: (id: string, signal: AbortSignal) => Promise<T>,
  enabled: boolean,
  fallbackError: string
) {
  const [result, setResult] = useState<{
    id: string;
    state: RecordDetailState<T>;
  } | null>(null);
  const active = useRef<AbortController | null>(null);
  const valid = isUuid(id);
  const load = useCallback(async () => {
    if (!enabled || !valid) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setResult({ id, state: { status: 'loading' } });
    try {
      const record = await fetchRecord(id, controller.signal);
      if (!controller.signal.aborted)
        setResult({ id, state: { status: 'ready', record } });
    } catch (cause) {
      if (controller.signal.aborted) return;
      setResult({
        id,
        state: isNotFound(cause)
          ? { status: 'not-found' }
          : {
              status: 'error',
              error:
                cause instanceof Error && cause.message
                  ? cause.message
                  : fallbackError,
            },
      });
    } finally {
      if (active.current === controller) active.current = null;
    }
  }, [enabled, valid, id, fetchRecord, fallbackError]);
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) void load();
    });
    return () => {
      mounted = false;
      active.current?.abort();
      active.current = null;
    };
  }, [load]);
  const state: RecordDetailState<T> = !enabled
    ? { status: 'disabled' }
    : !valid
      ? { status: 'invalid' }
      : result?.id === id
        ? result.state
        : { status: 'loading' };
  return { state, reload: () => void load() };
}
