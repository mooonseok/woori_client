'use client';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { useMemories } from '@/hooks/use-memories';
import { useAuth } from '@/hooks/use-auth';
import type { MemoryCard } from '@/dto/memories.dto';
import { MemoriesView } from './memories-view';
import { useRouter } from 'next/navigation';
import { GalleryStatus } from '@/components/organisms/gallery-status/gallery-status';
import { EntryDialog } from '@/components/organisms/entry-dialog/entry-dialog';
import {
  GroupStartView,
  INVITE_ACTION_ID,
} from '@/components/organisms/group-start/group-start-view';
import { InviteSheet } from '@/components/organisms/invite-sheet/invite-sheet';
import { useGallery } from '@/hooks/use-gallery';
import { useGroupStart } from '@/hooks/use-group-start';
import { photosFor } from '@/lib/gallery';
import { HomeView } from './home-view';
type HomeProps = Omit<ComponentProps<typeof HomeView>, 'memories' | 'start'>;
export function HomeContainer() {
  const {
    data,
    groupId,
    openPhoto,
    mode,
    loading,
    error,
    retryPreview,
    markPreviewError,
  } = useGallery();
  const { user } = useAuth();
  const router = useRouter();
  if (mode === 'live' && (loading || error || !groupId))
    return <GalleryStatus />;
  const albums = data.albums
    .filter((a) => a.groupId === groupId)
    .sort((a, b) => Number(Boolean(b.coverId)) - Number(Boolean(a.coverId)));
  const hero = data.photos.find((p) => p.id === albums[0]?.coverId);
  const home: HomeProps = {
    onRetryPreview: (photo) => void retryPreview?.(photo),
    onImageError: markPreviewError,
    demo: mode === 'demo',
    albums,
    photos: data.photos,
    hero,
    count: albums[0]
      ? (albums[0].photoCount ?? photosFor(data, albums[0].id).length)
      : 0,
    onPhoto: openPhoto,
    onAlbum: (id) => router.push(`/album?id=${encodeURIComponent(id)}`),
    onAlbums: () => router.push('/albums'),
  };
  if (mode !== 'live') return <HomeView {...home} />;
  return (
    <LiveHome key={`${user?.id}:${groupId}`} groupId={groupId} home={home} />
  );
}

// Live home: the start guide while the group has no photos, otherwise the
// memories. The invite sheet and album dialog stay mounted across that switch
// (a one-time invite link must not vanish when a photo lands meanwhile).
function LiveHome({ groupId, home }: { groupId: string; home: HomeProps }) {
  const start = useGroupStart();
  const { group, state } = start;
  function closeInvite() {
    start.closeInvite();
    // The sheet returns focus to its opener; if an invite replaced that
    // button meanwhile, the invite step's current action takes it.
    requestAnimationFrame(() =>
      window.setTimeout(() => {
        const active = document.activeElement;
        if (!active || active === document.body)
          document.getElementById(INVITE_ACTION_ID)?.focus();
      })
    );
  }
  return (
    <>
      <HomeView
        {...home}
        memories={
          state.kind === 'active' ? (
            <LiveMemories groupId={groupId} />
          ) : undefined
        }
        start={
          group && state.kind === 'starting' ? (
            <GroupStartView
              groupName={group.name}
              memberCount={start.memberCount}
              owner={start.owner}
              verified={start.verified}
              people={start.people}
              ownerName={start.ownerName}
              state={state}
              invitePending={start.invitePending}
              openInviteUntil={start.openInviteUntil}
              onInvite={start.openInvite}
              onCreateAlbum={start.openAlbumDialog}
            />
          ) : undefined
        }
      />
      {group && start.owner && (
        <InviteSheet
          group={group}
          open={start.inviteOpen}
          onClose={closeInvite}
        />
      )}
      {start.albumDialog && (
        <EntryDialog
          title='앨범 만들기'
          label='앨범 제목'
          maxLength={160}
          note='그룹 구성원과 함께 보는 앨범이에요.'
          onClose={start.closeAlbumDialog}
          onSubmit={start.createAlbum}
        />
      )}
    </>
  );
}

function LiveMemories({ groupId }: { groupId: string }) {
  const model = useMemories(groupId),
    gallery = useGallery();
  const [opening, setOpening] = useState(false),
    [openError, setOpenError] = useState('');
  const openingRef = useRef(false),
    controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function open(item: MemoryCard) {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    setOpenError('');
    const attempt = new AbortController();
    controller.current = attempt;
    try {
      await gallery.openMemoryPhoto?.(item.photo, attempt.signal);
    } catch (cause) {
      if (!attempt.signal.aborted)
        setOpenError(
          cause instanceof Error ? cause.message : '사진을 열지 못했어요.'
        );
    } finally {
      openingRef.current = false;
      if (!attempt.signal.aborted) setOpening(false);
    }
  }
  return (
    <MemoriesView
      {...model}
      opening={opening}
      openError={openError}
      hasMore={!!model.nextCursor}
      onKind={model.setKind}
      onOpen={(item) => void open(item)}
      onHide={(id, hidden) => void model.hide(id, hidden)}
      onReload={() => void model.reload()}
      onMore={() => void model.more()}
    />
  );
}
