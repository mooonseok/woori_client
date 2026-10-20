import type { CursorPage } from './notice.dto.ts';
export interface BlockedUser {
  userId: string;
  displayName: string;
  nickname?: string;
  blockedAt: string;
}
export type BlockPage = CursorPage<BlockedUser>;
// A person the UI may block: photo uploader, comment author or roster member.
export interface BlockSubject {
  id: string;
  name: string;
}
export interface BlockChange {
  userId: string;
  blocked: boolean;
}
