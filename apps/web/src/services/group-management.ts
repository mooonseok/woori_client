import { apiRequest } from './api-client.ts';
import type { Group } from '../dto/album.dto.ts';
import type { GroupMembersPage } from '../dto/group.dto.ts';
const path = (id: string) => `/v1/groups/${encodeURIComponent(id)}`;
export function listGroupMembers(
  id: string,
  after: string | null,
  signal?: AbortSignal
) {
  const query = new URLSearchParams({ limit: '30' });
  if (after) query.set('after', after);
  return apiRequest<GroupMembersPage>(`${path(id)}/members?${query}`, {
    signal,
  });
}
export function renameGroup(id: string, name: string, signal?: AbortSignal) {
  return apiRequest<{ group: Group }>(path(id), {
    method: 'PATCH',
    body: JSON.stringify({ name: name.trim() }),
    signal,
  });
}
export function leaveGroup(id: string, signal?: AbortSignal) {
  return apiRequest<void>(`${path(id)}/leave`, { method: 'POST', signal });
}
export function removeGroupMember(
  id: string,
  userId: string,
  signal?: AbortSignal
) {
  return apiRequest<void>(`${path(id)}/members/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    signal,
  });
}
export function transferGroupOwnership(
  id: string,
  userId: string,
  signal?: AbortSignal
) {
  return apiRequest<{ group: Group }>(`${path(id)}/ownership`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
    signal,
  });
}
export function deleteGroup(id: string, name: string, signal?: AbortSignal) {
  return apiRequest<{ accepted: true }>(path(id), {
    method: 'DELETE',
    body: JSON.stringify({ name }),
    signal,
  });
}
