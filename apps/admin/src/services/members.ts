import { LIST_PAGE_SIZE } from '../constants/content-ops.ts';
import type { CursorPage } from '../dto/audit-log.dto.ts';
import type {
  AdminMemberDetail,
  AdminMemberSummary,
  MemberListQuery,
} from '../dto/member.dto.ts';
import { normalizeSearch } from '../utils/member-actions.ts';
import { apiRequest, post } from './api-client.ts';
import { checkPage, listPath, recordPath } from './admin-paths.ts';

export async function listMembers(
  { query, status, cursor, limit }: MemberListQuery,
  signal?: AbortSignal
): Promise<CursorPage<AdminMemberSummary>> {
  const path = listPath('users', {
    query: normalizeSearch(query),
    status,
    cursor,
    limit: limit ?? LIST_PAGE_SIZE,
  });
  return checkPage(await apiRequest(path, { signal }), '회원 목록');
}
// Opening a member writes an ADMIN_USER_VIEWED audit row on the server.
export const getMember = async (id: string, signal?: AbortSignal) =>
  apiRequest<AdminMemberDetail>(recordPath('users', id), { signal });
export const renameMember = async (
  id: string,
  displayName: string,
  reason: string
) =>
  apiRequest<Partial<AdminMemberDetail>>(recordPath('users', id), {
    method: 'PATCH',
    body: JSON.stringify({ displayName, reason }),
  });
// suspend / unsuspend / delete require a re-authentication within 10 min.
export const suspendMember = async (id: string, reason: string) =>
  post<Partial<AdminMemberDetail>>(recordPath('users', id, 'suspend'), {
    reason,
  });
export const unsuspendMember = async (id: string, reason: string) =>
  post<Partial<AdminMemberDetail>>(recordPath('users', id, 'unsuspend'), {
    reason,
  });
export const deleteMember = async (
  id: string,
  reason: string,
  confirmUsername: string
) =>
  post<Partial<AdminMemberDetail> | undefined>(
    recordPath('users', id, 'delete'),
    { reason, confirmUsername }
  );
