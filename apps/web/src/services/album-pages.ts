import type { AlbumResponse } from '../dto/media.dto.ts';
import { mergeCursorItems, statusOf } from '../utils/service-guidance.ts';
import { readWindow, windowPages } from './list-window.ts';
import { listAlbums } from './media-client.ts';

export interface AlbumPage {
  albums: AlbumResponse[];
  nextCursor: string | null;
}

// Contract (OpenAPI 0.21.0): a stale or malformed album cursor answers 400
// with a `*_CURSOR_INVALID` code, and the client starts over.
export function isCursorInvalid(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  return (
    statusOf(error) === 400 &&
    typeof code === 'string' &&
    code.endsWith('_CURSOR_INVALID')
  );
}

async function page(
  groupId: string,
  signal: AbortSignal,
  cursor: string | null
): Promise<AlbumPage> {
  const result = await listAlbums(groupId, signal, cursor);
  if (!Array.isArray(result?.albums))
    throw new Error('앨범을 불러오지 못했어요.');
  return { albums: result.albums, nextCursor: result.nextCursor ?? null };
}

/** The album list as far as it was on screen (see readWindow). */
export async function albumWindow(
  groupId: string,
  count: number,
  signal: AbortSignal,
  maxPages = windowPages(count)
): Promise<AlbumPage & { capped: boolean }> {
  const { items, nextCursor, capped } = await readWindow(
    async (cursor, pageSignal) => {
      const result = await page(groupId, pageSignal, cursor);
      return { items: result.albums, nextCursor: result.nextCursor };
    },
    count,
    signal,
    isCursorInvalid,
    maxPages
  );
  return { albums: items, nextCursor, capped };
}

/** The page after `cursor`; an invalid or stale cursor restarts at the top. */
export async function nextAlbumPage(
  groupId: string,
  cursor: string,
  signal: AbortSignal
): Promise<AlbumPage & { restarted: boolean }> {
  try {
    return { ...(await page(groupId, signal, cursor)), restarted: false };
  } catch (cause) {
    if (signal.aborted || !isCursorInvalid(cause)) throw cause;
    return { ...(await page(groupId, signal, null)), restarted: true };
  }
}

/** Appends a next page without duplicates; a restarted page replaces the list. */
export function mergeAlbumPage<T extends { id: string }>(
  current: T[],
  incoming: T[],
  restarted: boolean
) {
  return mergeCursorItems(current, incoming, !restarted);
}
