'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CursorPage } from '@/dto/notice.dto';
import { fetchCursorPage, mergeCursorItems } from '@/utils/service-guidance';

// Cursor list for member-owned records. Containers mount it per signed-in user,
// and unmount/abort drops late responses so another account never sees them.
export function usePagedList<T extends { id: string }>(
  fetchPage: (
    cursor: string | null,
    signal: AbortSignal
  ) => Promise<CursorPage<T>>,
  enabled: boolean,
  fallbackError: string,
  focusId?: (item: T) => string
) {
  const [items, setItems] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled),
    [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(''),
    [moreError, setMoreError] = useState(''),
    [notice, setNotice] = useState('');
  const active = useRef<AbortController | null>(null);
  const loaded = useRef<T[]>([]);
  const pendingFocus = useRef<string | null>(null);
  const focusRef = useRef(focusId);
  useEffect(() => {
    focusRef.current = focusId;
  });
  useEffect(() => {
    // Keep keyboard position after "더 보기" removes or keeps its button.
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target) document.getElementById(target)?.focus();
  }, [items]);
  const load = useCallback(
    async (cursor: string | null) => {
      if (!enabled) return;
      active.current?.abort();
      const controller = new AbortController(),
        signal = controller.signal;
      active.current = controller;
      setMoreError('');
      setNotice('');
      if (cursor) setLoadingMore(true);
      else {
        loaded.current = [];
        setItems([]);
        setNextCursor(null);
        setError('');
        setLoadingMore(false);
        setLoading(true);
      }
      try {
        const { page, restarted } = await fetchCursorPage(
          fetchPage,
          cursor,
          signal
        );
        if (signal.aborted) return;
        if (!Array.isArray(page?.items)) throw new Error(fallbackError);
        const appending = !!cursor && !restarted;
        const merged = mergeCursorItems(loaded.current, page.items, appending);
        const added = merged.added;
        loaded.current = merged.items;
        const focusItem = appending
          ? (added[0] ?? (page.nextCursor ? null : loaded.current.at(-1)))
          : loaded.current[0];
        if (cursor && focusItem && focusRef.current)
          pendingFocus.current = focusRef.current(focusItem);
        if (restarted) setNotice('목록이 바뀌어 처음부터 다시 불러왔어요.');
        setItems(loaded.current);
        setNextCursor(page.nextCursor);
      } catch (cause) {
        if (signal.aborted) return;
        const message =
          cause instanceof Error && cause.message
            ? cause.message
            : fallbackError;
        if (cursor) setMoreError(message);
        else setError(message);
      } finally {
        if (active.current === controller) {
          active.current = null;
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [enabled, fetchPage, fallbackError]
  );
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) void load(null);
    });
    return () => {
      mounted = false;
      active.current?.abort();
      active.current = null;
    };
  }, [load]);
  return {
    items,
    nextCursor,
    loading,
    loadingMore,
    error,
    moreError,
    notice,
    reload: () => void load(null),
    // Drops a record removed elsewhere (e.g. an unblock) and moves focus.
    remove: (id: string, focusTarget?: string) => {
      loaded.current = loaded.current.filter((item) => item.id !== id);
      pendingFocus.current = focusTarget ?? null;
      setItems(loaded.current);
    },
    more: () => {
      if (nextCursor && !active.current) void load(nextCursor);
    },
  };
}
