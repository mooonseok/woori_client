import { LIST_PAGE_SIZE, PHOTO_PAGE_SIZE } from '../constants/content-ops.ts';
import type { CursorPage } from '../dto/audit-log.dto.ts';
import type {
  AdminAlbumPhoto,
  AdminGroupDetail,
  AdminGroupSummary,
  GroupListQuery,
} from '../dto/group.dto.ts';
import { normalizeSearch } from '../utils/member-actions.ts';
import { apiRequest } from './api-client.ts';
import { checkPage, listPath, nestedPath, recordPath } from './admin-paths.ts';

// Groups are read-only in the console: no mutation helpers exist here.
export async function listGroups(
  { query, status, cursor, limit }: GroupListQuery,
  signal?: AbortSignal
): Promise<CursorPage<AdminGroupSummary>> {
  const path = listPath('groups', {
    query: normalizeSearch(query),
    status,
    cursor,
    limit: limit ?? LIST_PAGE_SIZE,
  });
  return checkPage(await apiRequest(path, { signal }), '그룹 목록');
}
// Opening a group writes an ADMIN_GROUP_VIEWED audit row on the server.
export const getGroup = async (id: string, signal?: AbortSignal) =>
  apiRequest<AdminGroupDetail>(recordPath('groups', id), { signal });
export async function listAlbumPhotos(
  groupId: string,
  albumId: string,
  cursor: string | null,
  signal?: AbortSignal
): Promise<CursorPage<AdminAlbumPhoto>> {
  const base = nestedPath(['groups', groupId, 'albums', albumId, 'photos']);
  const params = new URLSearchParams({ limit: String(PHOTO_PAGE_SIZE) });
  if (cursor) params.set('cursor', cursor);
  return checkPage(
    await apiRequest(`${base}?${params}`, { signal }),
    '사진 목록'
  );
}
