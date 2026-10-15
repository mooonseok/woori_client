import { apiRequest, currentSessionRevision } from './api-client.ts';
import { SERVICE_PAGE_SIZE } from '../constants/inquiry.ts';
import type { BlockChange, BlockPage, BlockedUser } from '../dto/block.dto.ts';

// Fired after a block or unblock so live views refetch what they show.
export const BLOCKS_CHANGED = 'woori:blocks-changed';
const root = '/v1/blocks';
export function listBlocks(cursor: string | null, signal: AbortSignal) {
  const query = new URLSearchParams({ limit: String(SERVICE_PAGE_SIZE) });
  if (cursor) query.set('cursor', cursor);
  return apiRequest<BlockPage>(`${root}?${query}`, { signal });
}
// Idempotent: blocking an already blocked user returns the existing block.
export function blockUser(userId: string, signal?: AbortSignal) {
  return apiRequest<BlockedUser>(`${root}/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    signal,
  });
}
// Idempotent: 204 whether or not the user was blocked.
export function unblockUser(userId: string, signal?: AbortSignal) {
  return apiRequest<void>(`${root}/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    signal,
  });
}

// Block/unblock and announce it so live views refetch. The request is not
// cancelled when the caller unmounts: PUT/DELETE are idempotent and a committed
// change must still be announced, unless the session changed meanwhile
// (logout or account switch), when the old account's views are gone anyway.
export async function setBlocked(userId: string, blocked: boolean) {
  const revision = currentSessionRevision();
  if (blocked) await blockUser(userId);
  else await unblockUser(userId);
  const announced =
    revision === currentSessionRevision() && typeof window !== 'undefined';
  if (announced)
    window.dispatchEvent(
      new CustomEvent<BlockChange>(BLOCKS_CHANGED, {
        detail: { userId, blocked },
      })
    );
  return announced;
}
