'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useGallery } from '@/hooks/use-gallery';
import { useInvitations } from '@/hooks/use-invitations';
import { listGroupMembers } from '@/services/group-management';
import type { GroupMember } from '@/dto/group.dto';
import type { Invitation } from '@/dto/invitation.dto';
import {
  activeInvitation,
  groupStartState,
  type GroupStart,
} from '@/utils/group-start';
import { memberNickname } from '@/utils/nickname';

export interface StartMember {
  id: string;
  name: string;
  me: boolean;
  owner: boolean;
  avatarVersion?: number | null;
}

// Focus and visibilitychange both fire when the tab comes back.
const REFRESH_GAP_MS = 1500;
const rank = (person: StartMember) => (person.me ? 0 : person.owner ? 1 : 2);

// Home start guide of the current group (live mode): the state from the
// group's first album page, the owner's invitations and the first member page,
// plus the invite sheet and the album dialog it opens. Nothing is fetched once
// the group has photos (the regular home shows instead). Groups and albums are
// refreshed on focus by the gallery itself; members and invitations here.
export function useGroupStart() {
  const gallery = useGallery(),
    { user } = useAuth(),
    router = useRouter();
  const groupId = gallery.groupId;
  const group = gallery.data.groups.find((g) => g.id === groupId);
  const albums = gallery.data.albums
    .filter((album) => album.groupId === groupId)
    .map((album) => ({
      id: album.id,
      title: album.title,
      // A server without photoCount still reports a cover for photo albums.
      photoCount: album.photoCount ?? (album.coverId ? 1 : 0),
    }));
  const starting =
    gallery.mode === 'live' &&
    !!group &&
    !albums.some((album) => album.photoCount > 0);
  const owner = group?.role === 'OWNER',
    verified = !!user?.emailVerified,
    memberCount = group?.members ?? 0;
  const ownerInvites = starting && owner && verified;
  const invites = useInvitations(ownerInvites ? group : undefined);

  // The list as of the last finished load: a reload clears the hook's list
  // first, which must not flip "초대를 보냈어요" back to the invite button.
  const [settled, setSettled] = useState<{
    groupId: string;
    list: Invitation[];
    at: number;
  } | null>(null);
  const sawLoading = useRef(false);
  useEffect(() => {
    if (invites.listLoading) {
      sawLoading.current = true;
      return;
    }
    // A cleared list (photos arrived, hook disabled) is not a finished load.
    if (!sawLoading.current || !ownerInvites) return;
    let active = true;
    const list = invites.invitations,
      failed = !!invites.listError;
    queueMicrotask(() => {
      if (!active) return;
      setSettled((previous) =>
        failed && previous?.groupId === groupId
          ? previous
          : { groupId, list, at: Date.now() }
      );
    });
    return () => {
      active = false;
    };
  }, [
    invites.listLoading,
    invites.invitations,
    invites.listError,
    groupId,
    ownerInvites,
  ]);
  const invitations = settled?.groupId === groupId ? settled.list : null;
  const now = new Date(settled?.at ?? 0);

  // First member page: chips, and the owner's nickname for members.
  const needRoster = starting && (memberCount > 1 || !owner);
  const [roster, setRoster] = useState<{
    groupId: string;
    members: GroupMember[];
  } | null>(null);
  const rosterRequest = useRef<AbortController | null>(null);
  const loadRoster = useCallback(async () => {
    rosterRequest.current?.abort();
    if (!groupId || !needRoster) return;
    const attempt = new AbortController();
    rosterRequest.current = attempt;
    try {
      const page = await listGroupMembers(groupId, null, attempt.signal);
      if (!attempt.signal.aborted)
        setRoster({ groupId, members: page.members });
    } catch {
      // The heading still shows the count; the next refresh tries again.
    }
  }, [groupId, needRoster]);
  useEffect(() => {
    let active = true;
    const request = rosterRequest;
    queueMicrotask(() => {
      if (active) void loadRoster();
    });
    return () => {
      active = false;
      request.current?.abort();
    };
    // A changed member count (gallery focus refresh) re-reads the page.
  }, [loadRoster, memberCount]);

  const latest = useRef({
    loadRoster,
    loadInvites: invites.load,
    ownerInvites,
    groupId,
  });
  useEffect(() => {
    latest.current = {
      loadRoster,
      loadInvites: invites.load,
      ownerInvites,
      groupId,
    };
  });
  useEffect(() => {
    let last = 0;
    const visible = () => {
      if (document.visibilityState !== 'visible') return;
      const at = Date.now();
      if (at - last < REFRESH_GAP_MS) return;
      last = at;
      const current = latest.current;
      void current.loadRoster();
      if (current.ownerInvites) void current.loadInvites();
    };
    // Invites issued or cancelled elsewhere (group menu, settings page, the
    // sheet) reach useInvitations through its INVITATIONS_CHANGED listener.
    window.addEventListener('focus', visible);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('focus', visible);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);

  const me: StartMember | null = user
    ? {
        id: user.id,
        name: memberNickname(user),
        me: true,
        owner,
        avatarVersion: user.avatarVersion,
      }
    : null;
  const people: StartMember[] = (
    needRoster
      ? roster?.groupId === groupId
        ? roster.members.map((member) => ({
            id: member.userId,
            name: memberNickname(member),
            me: member.userId === user?.id,
            owner: member.role === 'OWNER',
            avatarVersion: member.avatarVersion,
          }))
        : []
      : me
        ? [me]
        : []
  ).sort((a, b) => rank(a) - rank(b)); // stable: API order within a rank
  const ownerName = people.find((person) => person.owner && !person.me)?.name;

  const state: GroupStart = group
    ? groupStartState({
        group,
        albums,
        invitations: invitations ?? [],
        verified,
        now,
      })
    : { kind: 'active' };
  const openInviteUntil = (invitations ?? [])
    .filter((invitation) => activeInvitation(invitation, now))
    .map((invitation) => invitation.expiresAt)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

  const [inviteOpen, setInviteOpen] = useState(false),
    [albumDialog, setAlbumDialog] = useState(false);
  const openAlbum = (id: string) =>
    router.push(`/album?id=${encodeURIComponent(id)}`);
  // Only follow the new album when the member is still on the home page.
  async function createAlbum(title: string) {
    const from = window.location.pathname;
    const id = await gallery.createAlbum(title);
    if (id && window.location.pathname === from) openAlbum(id);
  }
  // Arriving here right after creating the group (its dialog unmounted while
  // the gallery reloaded) leaves focus nowhere: start at the heading.
  const startingNow = state.kind === 'starting';
  useEffect(() => {
    if (!startingNow) return;
    const active = document.activeElement;
    if (!active || active === document.body)
      document
        .getElementById('group-start-title')
        ?.focus({ preventScroll: true });
  }, [startingNow, groupId]);
  return {
    group,
    state,
    owner,
    verified,
    memberCount,
    people,
    ownerName,
    // The owner's step waits for the first invitation list (no button flip).
    invitePending: ownerInvites && invitations === null,
    openInviteUntil,
    inviteOpen,
    openInvite: () => setInviteOpen(true),
    closeInvite: () => setInviteOpen(false),
    albumDialog,
    openAlbumDialog: () => setAlbumDialog(true),
    closeAlbumDialog: () => setAlbumDialog(false),
    createAlbum,
  };
}
