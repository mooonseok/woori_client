export interface GroupMember {
  userId: string;
  displayName: string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: string | null;
}
export interface GroupMembersPage {
  members: GroupMember[];
  nextCursor: string | null;
}
export type GroupAction =
  | { kind: 'rename' | 'leave' | 'delete' }
  | { kind: 'remove' | 'transfer'; member: GroupMember };
