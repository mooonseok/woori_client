export interface GroupMember {
  userId: string;
  displayName: string;
  nickname?: string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: string | null;
  // OpenAPI 0.15.0 (additive): I have personally blocked this member.
  blockedByMe?: boolean;
}
export interface GroupMembersPage {
  members: GroupMember[];
  nextCursor: string | null;
}
export type GroupAction =
  | { kind: 'rename' | 'leave' | 'delete' }
  | { kind: 'remove' | 'transfer'; member: GroupMember };
