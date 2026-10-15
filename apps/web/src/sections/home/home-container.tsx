'use client';
import { useEffect, useRef, useState } from 'react';
import { useMemories } from '@/hooks/use-memories';
import { useAuth } from '@/hooks/use-auth';
import type { MemoryCard } from '@/dto/memories.dto';
import { MemoriesView } from './memories-view';
import { useRouter } from 'next/navigation';
import { GalleryStatus } from '@/components/organisms/gallery-status/gallery-status';
import { useGallery } from '@/hooks/use-gallery';
import { photosFor } from '@/lib/gallery';
import { HomeView } from './home-view';
export function HomeContainer() {
  const { data, groupId, openPhoto, mode, loading, error } = useGallery();
  const { user } = useAuth();
  const router = useRouter();
  if (mode === 'live' && (loading || error || !groupId))
    return <GalleryStatus />;
  const albums = data.albums
    .filter((a) => a.groupId === groupId)
    .sort((a, b) => Number(Boolean(b.coverId)) - Number(Boolean(a.coverId)));
  const hero = data.photos.find((p) => p.id === albums[0]?.coverId);
  return (
    <HomeView
      demo={mode === 'demo'}
      memories={
        mode === 'live' ? (
          <LiveMemories key={`${user?.id}:${groupId}`} groupId={groupId} />
        ) : undefined
      }
      albums={albums}
      photos={data.photos}
      hero={hero}
      count={
        albums[0]
          ? (albums[0].photoCount ?? photosFor(data, albums[0].id).length)
          : 0
      }
      onPhoto={openPhoto}
      onAlbum={(id) => router.push(`/album?id=${encodeURIComponent(id)}`)}
      onAlbums={() => router.push('/albums')}
    />
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
