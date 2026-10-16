import type { PhotoResponse } from '../dto/media.dto.ts';
import { isNotFound, mergeCursorItems } from '../utils/service-guidance.ts';
import { listPhotos } from './media-client.ts';

export interface WindowPage<T> {
  items: T[];
  nextCursor: string | null;
}
// Server default page size for albums and photos, and the most pages a
// refresh (or an album link) reads: 600 rows.
export const PAGE_SIZE = 30;
export const MAX_WINDOW_PAGES = 20;
export const MAX_WINDOW_ROWS = PAGE_SIZE * MAX_WINDOW_PAGES;
// Pages covering what is on screen, plus one for rows added at the top.
export const windowPages = (count: number) =>
  Math.min(MAX_WINDOW_PAGES, Math.ceil(count / PAGE_SIZE) + 1);
// A capped refresh keeps rows loaded beyond its window (in their order)
// instead of dropping them from the screen.
export function withTail<T extends { id: string }>(
  window: T[],
  shown: T[],
  capped: boolean
) {
  return capped ? mergeCursorItems(window, shown, true).items : window;
}

/**
 * Re-reads a cursor list from the top until at least `count` items (what is
 * on screen) or the end, so a background refresh keeps pages loaded with
 * "더 보기"/"더 불러오기". A cursor invalidated between these requests
 * (`isStale`) restarts the pass once; anything else is thrown.
 */
export async function readWindow<T extends { id: string }>(
  fetchPage: (
    cursor: string | null,
    signal: AbortSignal
  ) => Promise<WindowPage<T>>,
  count: number,
  signal: AbortSignal,
  isStale: (error: unknown) => boolean,
  maxPages = windowPages(count)
): Promise<WindowPage<T> & { capped: boolean }> {
  for (let attempt = 0; ; attempt++) {
    try {
      let current = await fetchPage(null, signal);
      let items = current.items;
      for (
        let pages = 1;
        current.nextCursor && items.length < count && pages < maxPages;
        pages++
      ) {
        current = await fetchPage(current.nextCursor, signal);
        items = mergeCursorItems(items, current.items, true).items;
      }
      return {
        items,
        nextCursor: current.nextCursor,
        // Stopped by the page limit before covering what is on screen.
        capped: !!current.nextCursor && items.length < count,
      };
    } catch (cause) {
      if (attempt || signal.aborted || !isStale(cause)) throw cause;
    }
  }
}

// A photo cursor hidden since (deleted, uploader blocked) answers 404.
export function photoWindow(
  groupId: string,
  albumId: string,
  count: number,
  signal: AbortSignal
) {
  return readWindow<PhotoResponse>(
    async (cursor, pageSignal) => {
      const page = await listPhotos(groupId, albumId, cursor, pageSignal);
      return { items: page.photos, nextCursor: page.nextCursor ?? null };
    },
    count,
    signal,
    isNotFound
  );
}
