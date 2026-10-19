'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MemoryCard, MemoryItem, MemoryKind } from '@/dto/memories.dto';
import * as memories from '@/services/memories';
import { thumbnailFailure, thumbnailResult } from '@/services/thumbnail-result';
import {
  MemoryPreviewRequests,
  reconcileMemoryPreviews,
} from '@/services/memory-preview';
import { photoBlob } from '@/services/media-client';
import { MAX_WINDOW_PAGES, readWindow, withTail } from '@/services/list-window';
import { GROUP_MEMBERSHIP_CHANGED } from '@/services/api-client';
import { BLOCKS_CHANGED } from '@/services/blocks';
import { blockChangeOf, purgeOnBlock, uploaderOf } from '@/utils/blocks';
import { isNotFound } from '@/utils/service-guidance';
import {
  finishLoad,
  freshLoad,
  startLoad,
  type LoadState,
} from '@/utils/load-state';

const FIRST_LOAD = freshLoad('today');
const MEMORY_PAGE = 12;
const failMessage = (cause: unknown) =>
  cause instanceof Error && cause.message
    ? cause.message
    : '추억을 불러오지 못했어요.';
// One card per photo of this group, in page order.
function validItems(items: MemoryItem[], groupId: string, seen: Set<string>) {
  return items.filter((item) => {
    if (item.photo.groupId !== groupId || seen.has(item.photo.id)) return false;
    seen.add(item.photo.id);
    return true;
  });
}
// Cards with a thumbnail, reusing ones already shown for the same photo.
async function cardsFor(
  groupId: string,
  page: MemoryItem[],
  reuse: Map<string, string>,
  created: string[],
  signal: AbortSignal
) {
  const cards: MemoryCard[] = [];
  for (const item of page) {
    let thumbnail = reuse.get(item.photo.id);
    if (!thumbnail) {
      // A failed private image request must not leave a stale card visible.
      thumbnail = await thumbnailResult(
        async () => {
          const blob = await photoBlob(
            groupId,
            item.photo.albumId,
            item.photo.id,
            signal,
            'thumbnail'
          );
          signal.throwIfAborted();
          const src = URL.createObjectURL(blob);
          created.push(src);
          return src;
        },
        () => '',
        signal
      );
    }
    cards.push({
      ...item,
      thumbnail,
      previewStatus: thumbnail ? undefined : 'error',
    });
  }
  return cards;
}

export function useMemories(groupId: string) {
  const [kind, setKind] = useState<MemoryKind>('today');
  const [items, setItems] = useState<MemoryCard[]>([]);
  // Scope = tab: a first load (or retry) shows loading; a refresh of shown
  // cards (focus, MEMORIES_CHANGED, blocks) keeps them until the new list lands.
  const statusRef = useRef<LoadState>(FIRST_LOAD);
  const [status, setStatus] = useState(FIRST_LOAD);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [asOf, setAsOf] = useState(''),
    [pending, setPending] = useState('');
  const [notice, setNotice] = useState('');
  const active = useRef<AbortController | null>(null),
    generation = useRef(0);
  const mutation = useRef<AbortController | null>(null);
  const urls = useRef(new Set<string>());
  const currentItems = useRef<MemoryCard[]>([]);
  const previewRequests = useRef(new MemoryPreviewRequests());
  const applyStatus = useCallback((next: LoadState) => {
    statusRef.current = next;
    setStatus(next);
  }, []);
  const refresh = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController(),
      version = ++generation.current,
      signal = controller.signal;
    active.current = controller;
    setLoadingMore(false);
    const start = startLoad(statusRef.current, kind);
    applyStatus(start.state);
    if (!start.background) {
      previewRequests.current.cancelAll();
      urls.current.forEach(URL.revokeObjectURL);
      urls.current.clear();
      currentItems.current = [];
      setItems([]);
      setNextCursor(null);
    }
    const captured = [...currentItems.current];
    const reuse = new Map(
      captured
        .filter((card) => !card.previewStatus)
        .map((card) => [card.photo.id, card.thumbnail])
    );
    const created: string[] = [];
    let committed = false;
    try {
      let pageAsOf = '';
      const window = await readWindow(
        async (cursor, pageSignal) => {
          const page = await memories.listMemories(
            groupId,
            kind,
            cursor,
            pageSignal
          );
          if (!cursor) pageAsOf = page.asOf;
          return {
            items: page.items.map((item) => ({ id: item.photo.id, item })),
            nextCursor: page.nextCursor,
          };
        },
        currentItems.current.length,
        signal,
        isNotFound,
        // Memories come 12 to a page (services/memories).
        Math.min(
          MAX_WINDOW_PAGES,
          Math.ceil(currentItems.current.length / MEMORY_PAGE) + 1
        )
      );
      signal.throwIfAborted();
      if (version !== generation.current) return;
      const cards = await cardsFor(
        groupId,
        validItems(
          window.items.map(({ item }) => item),
          groupId,
          new Set()
        ),
        reuse,
        created,
        signal
      );
      signal.throwIfAborted();
      if (version !== generation.current) return;
      // Past the page limit, cards loaded beyond the window stay.
      const shown = withTail(
        reconcileMemoryPreviews(cards, currentItems.current, captured).map(
          (card) => ({ id: card.photo.id, card })
        ),
        currentItems.current.map((card) => ({ id: card.photo.id, card })),
        window.capped
      ).map(({ card }) => card);
      const kept = new Set(shown.map((card) => card.thumbnail));
      for (const url of [...urls.current])
        if (!kept.has(url)) {
          URL.revokeObjectURL(url);
          urls.current.delete(url);
        }
      created.forEach((url) => {
        if (kept.has(url)) urls.current.add(url);
        else URL.revokeObjectURL(url);
      });
      // A removed card must not publish a pending retry after this refresh.
      const shownIds = new Set(shown.map((card) => card.photo.id));
      currentItems.current.forEach((card) => {
        if (!shownIds.has(card.photo.id))
          previewRequests.current.cancel(card.photo.id);
      });
      committed = true;
      currentItems.current = shown;
      setItems(shown);
      if (!window.capped) setNextCursor(window.nextCursor);
      setAsOf(pageAsOf);
      applyStatus(finishLoad(statusRef.current, kind, start.background));
    } catch (cause) {
      // A background failure keeps the cards on screen.
      if (!signal.aborted && version === generation.current)
        applyStatus(
          finishLoad(
            statusRef.current,
            kind,
            start.background,
            failMessage(cause)
          )
        );
    } finally {
      if (!committed) created.forEach(URL.revokeObjectURL);
    }
  }, [groupId, kind, applyStatus]);
  async function more() {
    const cursor = nextCursor;
    if (!cursor || loadingMore) return;
    active.current?.abort();
    const controller = new AbortController(),
      version = ++generation.current,
      signal = controller.signal;
    active.current = controller;
    setLoadingMore(true);
    const created: string[] = [];
    let committed = false;
    try {
      const page = await memories.listMemories(groupId, kind, cursor, signal);
      signal.throwIfAborted();
      if (version !== generation.current) return;
      const cards = await cardsFor(
        groupId,
        validItems(
          page.items,
          groupId,
          new Set(currentItems.current.map((card) => card.photo.id))
        ),
        new Map(),
        created,
        signal
      );
      signal.throwIfAborted();
      if (version !== generation.current) return;
      created.forEach((url) => urls.current.add(url));
      committed = true;
      currentItems.current = [...currentItems.current, ...cards];
      setItems(currentItems.current);
      setNextCursor(page.nextCursor);
    } catch (cause) {
      // As before: the error panel's retry starts the tab over.
      if (!signal.aborted && version === generation.current)
        applyStatus({ ...statusRef.current, error: failMessage(cause) });
    } finally {
      if (!committed) created.forEach(URL.revokeObjectURL);
      if (!signal.aborted && version === generation.current)
        setLoadingMore(false);
    }
  }
  // Drops cards now (a hidden memory, a blocked uploader) before the refetch.
  function dropCards(drop: (card: MemoryCard) => boolean) {
    const removed = currentItems.current.filter(drop);
    if (!removed.length) return;
    removed.forEach((card) => {
      previewRequests.current.cancel(card.photo.id);
      URL.revokeObjectURL(card.thumbnail);
      urls.current.delete(card.thumbnail);
    });
    currentItems.current = currentItems.current.filter((card) => !drop(card));
    setItems(currentItems.current);
  }
  const dropRef = useRef(dropCards);
  useEffect(() => {
    dropRef.current = dropCards;
  });
  useEffect(() => {
    let mounted = true;
    const reload = () => {
      if (mounted) void refresh();
    };
    const focus = () => {
      if (document.visibilityState === 'visible' && !mutation.current) reload();
    };
    const blocked = (event: Event) => {
      const change = blockChangeOf(event);
      if (change?.blocked) {
        // Their cards (and any of unknown uploader) go at once.
        const { removed } = purgeOnBlock(
          currentItems.current.map((card) => ({
            authorId: uploaderOf(card.photo).authorId,
            card,
          })),
          change.userId
        );
        const gone = new Set(removed.map(({ card }) => card));
        dropRef.current((card) => gone.has(card));
      }
      // A new load bumps the generation, so pre-block pages cannot land.
      reload();
    };
    queueMicrotask(reload);
    window.addEventListener(memories.MEMORIES_CHANGED, reload);
    window.addEventListener(GROUP_MEMBERSHIP_CHANGED, reload);
    window.addEventListener(BLOCKS_CHANGED, blocked);
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    const objects = urls.current,
      previews = previewRequests.current,
      counter = generation;
    return () => {
      mounted = false;
      counter.current++;
      active.current?.abort();
      previews.cancelAll();
      mutation.current?.abort();
      mutation.current = null;
      objects.forEach(URL.revokeObjectURL);
      objects.clear();
      window.removeEventListener(memories.MEMORIES_CHANGED, reload);
      window.removeEventListener(GROUP_MEMBERSHIP_CHANGED, reload);
      window.removeEventListener(BLOCKS_CHANGED, blocked);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [refresh]);
  async function hide(photoId: string, hidden: boolean) {
    if (mutation.current) return;
    const controller = new AbortController();
    mutation.current = controller;
    setPending(photoId);
    if (statusRef.current.error && statusRef.current.loaded)
      applyStatus({ ...statusRef.current, error: '' });
    setNotice('');
    try {
      await memories.setMemoryHidden(
        groupId,
        photoId,
        hidden,
        controller.signal
      );
      controller.signal.throwIfAborted();
      // It leaves this tab either way (hidden ↔ shown); the refetch confirms.
      dropCards((card) => card.photo.id === photoId);
      setNotice(
        hidden
          ? '내 추억에서 숨겼어요. 앨범에는 그대로 남아 있어요.'
          : '추억 숨김을 해제했어요. 날짜가 맞으면 다시 보여요.'
      );
      window.dispatchEvent(new Event(memories.MEMORIES_CHANGED));
    } catch (cause) {
      if (!controller.signal.aborted)
        applyStatus({
          ...statusRef.current,
          error:
            cause instanceof Error
              ? cause.message
              : '추억 설정을 저장하지 못했어요.',
        });
    } finally {
      if (mutation.current === controller) {
        mutation.current = null;
        setPending('');
      }
    }
  }
  function previewError(item: MemoryCard) {
    const update = currentItems.current.map((p) =>
      p.photo.id === item.photo.id && p.thumbnail === item.thumbnail
        ? { ...p, previewStatus: 'error' as const }
        : p
    );
    currentItems.current = update;
    setItems(update);
  }
  async function retryPreview(item: MemoryCard) {
    // A list refresh/page request may be cancelled independently. Only a
    // replaced retry, removed card, or group/tab cleanup cancels this request.
    const controller = previewRequests.current.start(item.photo.id);
    const signal = controller.signal;
    const current = () =>
      previewRequests.current.isCurrent(item.photo.id, controller);
    const update = (patch: Partial<MemoryCard>) => {
      currentItems.current = currentItems.current.map((p) =>
        p.photo.id === item.photo.id && p.thumbnail === item.thumbnail
          ? { ...p, ...patch }
          : p
      );
      setItems(currentItems.current);
    };
    update({ previewStatus: 'loading' });
    try {
      const blob = await photoBlob(
        groupId,
        item.photo.albumId,
        item.photo.id,
        signal,
        'thumbnail'
      );
      signal.throwIfAborted();
      const bitmap = await createImageBitmap(blob);
      bitmap.close();
      if (
        !current() ||
        !currentItems.current.some(
          (p) => p.photo.id === item.photo.id && p.thumbnail === item.thumbnail
        )
      )
        return;
      const thumbnail = URL.createObjectURL(blob);
      urls.current.add(thumbnail);
      update({ thumbnail, previewStatus: undefined });
      if (item.thumbnail) {
        URL.revokeObjectURL(item.thumbnail);
        urls.current.delete(item.thumbnail);
      }
    } catch (cause) {
      if (current()) update({ previewStatus: thumbnailFailure(cause) });
    } finally {
      previewRequests.current.finish(item.photo.id, controller);
    }
  }
  function changeKind(next: MemoryKind) {
    if (next === kind || mutation.current) return;
    active.current?.abort();
    previewRequests.current.cancelAll();
    generation.current++;
    urls.current.forEach(URL.revokeObjectURL);
    urls.current.clear();
    currentItems.current = [];
    setItems([]);
    setNextCursor(null);
    setAsOf('');
    setLoadingMore(false);
    setNotice('');
    applyStatus(freshLoad(next));
    setKind(next);
  }
  return {
    kind,
    setKind: changeKind,
    items,
    loading: status.loading || loadingMore,
    error: status.error,
    nextCursor,
    asOf,
    pending,
    notice,
    hide,
    previewError,
    retryPreview: (item: MemoryCard) => void retryPreview(item),
    reload: () => void refresh(),
    more: () => void more(),
  };
}
