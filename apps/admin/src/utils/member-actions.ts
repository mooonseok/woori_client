import { ADMIN_ERROR } from '../constants/admin-auth.ts';
import { SEARCH_MAX } from '../constants/content-ops.ts';
import type {
  AdminMemberStatus,
  MemberAction,
  OwnedGroup,
} from '../dto/member.dto.ts';

// Which operator actions apply to a member in this status. Deleted
// accounts are read-only; the server stays the authority (409 otherwise).
export function memberActions(status: AdminMemberStatus | string) {
  const actions: MemberAction[] = [];
  if (status === 'DELETED') return actions;
  actions.push('rename');
  if (status === 'ACTIVE') actions.push('suspend');
  if (status === 'SUSPENDED') actions.push('unsuspend');
  actions.push('delete');
  return actions;
}
// Deletion is typed out: the input must equal the current username exactly
// (surrounding spaces ignored, no case folding).
export function confirmUsernameMatches(input: string, username: string) {
  return !!username && input.trim() === username;
}
// 409 ADMIN_OWNED_GROUPS_REMAIN carries { groups: [{ id, name }] }.
export function ownedGroupsOf(error: unknown): OwnedGroup[] | null {
  const value = error as { code?: unknown; details?: unknown } | null;
  if (value?.code !== ADMIN_ERROR.OWNED_GROUPS_REMAIN) return null;
  const groups = (value.details as { groups?: unknown } | null)?.groups;
  if (!Array.isArray(groups)) return [];
  return groups.filter(
    (group): group is OwnedGroup =>
      !!group &&
      typeof (group as OwnedGroup).id === 'string' &&
      typeof (group as OwnedGroup).name === 'string'
  );
}
// Search text sent to the server: trimmed, at most 64 code points.
export function normalizeSearch(value: string) {
  return [...value.trim()].slice(0, SEARCH_MAX).join('');
}
