import type { GroupMember } from '../dto/group.dto.ts';
// A first-page reload normally starts empty; a refresh after a block keeps
// the visible roster (and the focused button) until the new page arrives.
export function clearsRosterBeforeLoad(
  after: string | null,
  keepVisible: boolean
) {
  return !after && !keepVisible;
}
export function mergeRosterPage(
  previous: GroupMember[],
  incoming: GroupMember[],
  append: boolean
) {
  return append
    ? [
        ...previous.filter(
          (member) => !incoming.some((next) => next.userId === member.userId)
        ),
        ...incoming,
      ]
    : incoming;
}
// Focus target when the button that started a roster block flow is gone.
export const rosterBlockButtonId = (userId: string) => `member-block-${userId}`;
export const ROSTER_TITLE_ID = 'group-members-title';
