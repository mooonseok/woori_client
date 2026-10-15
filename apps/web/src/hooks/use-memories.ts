'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MemoryCard, MemoryKind } from '@/dto/memories.dto';
import * as memories from '@/services/memories';
import { photoBlob } from '@/services/media-client';
import { GROUP_MEMBERSHIP_CHANGED } from '@/services/api-client';
import { BLOCKS_CHANGED } from '@/services/blocks';

export function useMemories(groupId: string) {
  const [kind, setKind] = useState<MemoryKind>('today');
  const [items, setItems] = useState<MemoryCard[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [asOf, setAsOf] = useState(''),
    [pending, setPending] = useState('');
  const [notice, setNotice] = useState('');
  const active = useRef<AbortController | null>(null),
    generation = useRef(0);
  const mutation = useRef<AbortController | null>(null);
  const urls = useRef(new Set<string>());
  const currentItems = useRef<MemoryCard[]>([]);
  const load = useCallback(
    async (cursor: string | null = null) => {
      active.current?.abort();
      const controller = new AbortController(),
        version = ++generation.current;
      active.current = controller;
      const signal = controller.signal;
      setLoading(true);
      setError('');
      if (!cursor) {
        urls.current.forEach(URL.revokeObjectURL);
        urls.current.clear();
        currentItems.current = [];
        setItems([]);
        setNextCursor(null);
      }
      const created: string[] = [];
      let committed = false;
      try {
        const page = await memories.listMemories(groupId, kind, cursor, signal);
        signal.throwIfAborted();
        if (version !== generation.current) return;
        const cards: MemoryCard[] = [];
        for (const item of page.items) {
          if (
            item.photo.groupId !== groupId ||
            cards.some((card) => card.photo.id === item.photo.id) ||
            currentItems.current.some((card) => card.photo.id === item.photo.id)
          )
            continue;
          let thumbnail = '';
          try {
            const blob = await photoBlob(
              groupId,
              item.photo.albumId,
              item.photo.id,
              signal,
              'thumbnail'
            );
            signal.throwIfAborted();
            thumbnail = URL.createObjectURL(blob);
            created.push(thumbnail);
          } catch (cause) {
            if (signal.aborted) throw cause;
            // A failed private image request must not leave a stale memory card visible.
            throw cause;
          }
          cards.push({ ...item, thumbnail });
        }
        signal.throwIfAborted();
        if (version !== generation.current) return;
        created.forEach((url) => urls.current.add(url));
        currentItems.current = [...currentItems.current, ...cards];
        setItems(currentItems.current);
        setNextCursor(page.nextCursor);
        setAsOf(page.asOf);
        committed = true;
      } catch (cause) {
        if (!signal.aborted && version === generation.current)
          setError(
            cause instanceof Error ? cause.message : '추억을 불러오지 못했어요.'
          );
      } finally {
        if (!committed) created.forEach(URL.revokeObjectURL);
        if (!signal.aborted && version === generation.current)
          setLoading(false);
      }
    },
    [groupId, kind]
  );
  useEffect(() => {
    let mounted = true;
    const reload = () => {
      if (mounted) void load();
    };
    const focus = () => {
      if (document.visibilityState === 'visible' && !mutation.current) reload();
    };
    queueMicrotask(reload);
    window.addEventListener(memories.MEMORIES_CHANGED, reload);
    window.addEventListener(GROUP_MEMBERSHIP_CHANGED, reload);
    // A new load bumps the generation, so pre-block pages cannot land.
    window.addEventListener(BLOCKS_CHANGED, reload);
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    const objects = urls.current,
      counter = generation;
    return () => {
      mounted = false;
      counter.current++;
      active.current?.abort();
      mutation.current?.abort();
      mutation.current = null;
      objects.forEach(URL.revokeObjectURL);
      objects.clear();
      window.removeEventListener(memories.MEMORIES_CHANGED, reload);
      window.removeEventListener(GROUP_MEMBERSHIP_CHANGED, reload);
      window.removeEventListener(BLOCKS_CHANGED, reload);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [load]);
  async function hide(photoId: string, hidden: boolean) {
    if (mutation.current) return;
    const controller = new AbortController();
    mutation.current = controller;
    setPending(photoId);
    setError('');
    setNotice('');
    try {
      await memories.setMemoryHidden(
        groupId,
        photoId,
        hidden,
        controller.signal
      );
      controller.signal.throwIfAborted();
      setNotice(
        hidden
          ? '내 추억에서 숨겼어요. 앨범에는 그대로 남아 있어요.'
          : '추억 숨김을 해제했어요. 날짜가 맞으면 다시 보여요.'
      );
      window.dispatchEvent(new Event(memories.MEMORIES_CHANGED));
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : '추억 설정을 저장하지 못했어요.'
        );
    } finally {
      if (mutation.current === controller) {
        mutation.current = null;
        setPending('');
      }
    }
  }
  function changeKind(next: MemoryKind) {
    if (next === kind || mutation.current) return;
    active.current?.abort();
    generation.current++;
    urls.current.forEach(URL.revokeObjectURL);
    urls.current.clear();
    currentItems.current = [];
    setItems([]);
    setNextCursor(null);
    setAsOf('');
    setError('');
    setNotice('');
    setLoading(true);
    setKind(next);
  }
  return {
    kind,
    setKind: changeKind,
    items,
    loading,
    error,
    nextCursor,
    asOf,
    pending,
    notice,
    hide,
    reload: () => load(),
    more: () => nextCursor && load(nextCursor),
  };
}
