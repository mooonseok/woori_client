import type { Album, Group } from '../dto/album.dto.ts';
import type { Invitation } from '../dto/invitation.dto.ts';

// What the home shows while a group is getting started (no photos yet).
// Derived from data the member already has: member count and role, the first
// page of albums (photoCount) and, for the owner, the invitation list. Nothing
// is stored, so the guide disappears on its own once photos exist.

export type InviteStep =
  | { kind: 'done'; members: number }
  | { kind: 'sent'; expiresAt: string }
  | { kind: 'todo' }
  | { kind: 'member' }
  | { kind: 'unverified' };

export type AlbumStep =
  { kind: 'done'; album: Pick<Album, 'id' | 'title'> } | { kind: 'todo' };

export type GroupStart =
  | { kind: 'active' }
  | {
      kind: 'starting';
      invite: InviteStep;
      album: AlbumStep;
      // Exactly one primary action on the screen.
      primary: 'invite' | 'album' | 'upload';
    };

const used = (invitation: Invitation) =>
  invitation.useCount ?? invitation.uses ?? 0;

/** Not revoked, not expired and not used up. */
export function activeInvitation(invitation: Invitation, now: Date) {
  return (
    !invitation.revokedAt &&
    Date.parse(invitation.expiresAt) > now.getTime() &&
    used(invitation) < invitation.maxUses
  );
}

export function groupStartState(input: {
  group: Pick<Group, 'members' | 'role'>;
  albums: Pick<Album, 'id' | 'title' | 'photoCount'>[];
  invitations: Invitation[];
  verified: boolean;
  now: Date;
}): GroupStart {
  if (input.albums.some((album) => (album.photoCount ?? 0) > 0))
    return { kind: 'active' };
  const owner = input.group.role === 'OWNER';
  let invite: InviteStep;
  if (input.group.members > 1)
    invite = { kind: 'done', members: input.group.members };
  else if (!owner) invite = { kind: 'member' };
  else if (!input.verified) invite = { kind: 'unverified' };
  else {
    const latest = input.invitations
      .filter((invitation) => activeInvitation(invitation, input.now))
      .map((invitation) => invitation.expiresAt)
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
    invite = latest ? { kind: 'sent', expiresAt: latest } : { kind: 'todo' };
  }
  const first = input.albums[0];
  const album: AlbumStep = first
    ? { kind: 'done', album: { id: first.id, title: first.title } }
    : { kind: 'todo' };
  const primary =
    invite.kind === 'todo'
      ? 'invite'
      : album.kind === 'done'
        ? 'upload'
        : 'album';
  return { kind: 'starting', invite, album, primary };
}
