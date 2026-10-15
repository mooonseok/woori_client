'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CursorPage } from '@/dto/audit-log.dto';
import { currentSessionRevision } from '@/services/api-client';
import { isCursorInvalid, messageOf } from '@/utils/admin-errors';

export type FetchPage<T> = (
  cursor: string | null,
  signal: AbortSignal
) => Promise<CursorPage<T>>;
// Cursor list for admin records. fetchPage must be memoized by the caller;
// a new fetchPage (filter change) restarts from the first page. The console
// remounts per admin, and abort + the session revision drop answers that
// belong to an older session.
export function useCursorList<T extends { id: string }>(
  fetchPage: FetchPage<T>,
  domId: (id: string) => string,
  fallback: string
) {
  const [items, setItems] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true),
    [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(''),
    [moreError, setMoreError] = useState(''),
    [notice, setNotice] = useState('');
  const active = useRef<AbortController | null>(null);
  const loaded = useRef<T[]>([]);
  const pendingFocus = useRef<string | null>(null);
  const domIdRef = useRef(domId);
  useEffect(() => {
    domIdRef.current = domId;
  });
  useEffect(() => {
    // Keep keyboard position after "더 보기" adds rows or removes its button.
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target) document.getElementById(target)?.focus();
  }, [items]);
  const load = useCallback(
    async (cursor: string | null) => {
      active.current?.abort();
      const controller = new AbortController(),
        signal = controller.signal;
      active.current = controller;
      const revision = currentSessionRevision();
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
        let page: CursorPage<T>,
          restarted = false;
        try {
          page = await fetchPage(cursor, signal);
        } catch (cause) {
          if (!cursor || !isCursorInvalid(cause)) throw cause;
          // The cursor is no longer valid: start over instead of retrying it.
          restarted = true;
          page = await fetchPage(null, signal);
        }
        if (signal.aborted || revision !== currentSessionRevision()) return;
        const base = restarted ? [] : loaded.current;
        const seen = new Set(base.map((item) => item.id));
        const added = page.items.filter((item) => !seen.has(item.id));
        loaded.current = [...base, ...added];
        if (cursor) {
          const focus = restarted
            ? loaded.current[0]
            : (added[0] ?? loaded.current.at(-1));
          if (focus) pendingFocus.current = domIdRef.current(focus.id);
        }
        if (restarted)
          setNotice('목록 위치를 찾지 못해 처음부터 다시 불러왔어요.');
        setItems(loaded.current);
        setNextCursor(page.nextCursor);
      } catch (cause) {
        if (signal.aborted || revision !== currentSessionRevision()) return;
        const message = messageOf(cause, fallback);
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
    [fetchPage, fallback]
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
    hasMore: !!nextCursor,
    loading,
    loadingMore,
    error,
    moreError,
    notice,
    reload: () => void load(null),
    more: () => {
      if (nextCursor && !active.current) void load(nextCursor);
    },
  };
}
