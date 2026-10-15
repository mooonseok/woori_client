'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminMetrics } from '@/dto/metrics.dto';
import { currentSessionRevision } from '@/services/api-client';
import { getMetrics } from '@/services/metrics';
import { messageOf } from '@/utils/admin-errors';

// Dashboard metrics: loaded once and refreshed only when the operator asks
// (no polling). A failed refresh keeps the last numbers with their time.
export function useMetrics() {
  const [data, setData] = useState<AdminMetrics | null>(null),
    [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const load = useCallback(async (manual: boolean) => {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    const revision = currentSessionRevision();
    if (manual) setRefreshing(true);
    setError('');
    try {
      const next = await getMetrics(controller.signal);
      if (controller.signal.aborted || revision !== currentSessionRevision())
        return;
      setData(next);
    } catch (cause) {
      if (controller.signal.aborted || revision !== currentSessionRevision())
        return;
      setError(messageOf(cause, '운영 지표를 불러오지 못했어요.'));
    } finally {
      if (active.current === controller) {
        active.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) void load(false);
    });
    return () => {
      mounted = false;
      active.current?.abort();
      active.current = null;
    };
  }, [load]);
  return {
    data,
    loading,
    refreshing,
    error,
    refresh: () => void load(true),
  };
}
