'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GalleryStatus } from '@/components/organisms/gallery-status/gallery-status';
import { useGallery } from '@/hooks/use-gallery';
import { useAlbumSearch } from '@/hooks/use-albums';
import { listAlbums } from '@/lib/gallery';
import { EntryDialog } from '@/components/organisms/entry-dialog/entry-dialog';
import { AlbumsView } from './albums-view';
const cardId = (albumId: string) => `album-card-${albumId}`;
export function AlbumsContainer() {
  const gallery = useGallery(),
    search = useAlbumSearch(),
    router = useRouter();
  const albums = listAlbums(
    gallery.data,
    gallery.groupId,
    search.query,
    search.sort
  );
  const hasMore = !!gallery.albumList?.hasMore;
  // After "더 불러오기": the first new card the search still shows, else the
  // last card once the list is complete, else the count line.
  const focusAdded = useRef<string[] | null>(null),
    [focusTick, setFocusTick] = useState(0);
  useEffect(() => {
    const added = focusAdded.current;
    focusAdded.current = null;
    if (!added) return;
    const target =
      albums.find((album) => added.includes(album.id)) ??
      (hasMore ? undefined : albums.at(-1));
    if (target) document.getElementById(cardId(target.id))?.focus();
    else if (!hasMore) document.getElementById('album-count')?.focus();
  }, [focusTick, albums, hasMore]);
  async function more() {
    const added = await gallery.loadMoreAlbums?.();
    if (!added) return;
    focusAdded.current = added;
    setFocusTick((tick) => tick + 1);
  }
  if (
    gallery.mode === 'live' &&
    (gallery.loading || gallery.error || !gallery.groupId)
  )
    return <GalleryStatus />;
  return (
    <>
      <AlbumsView
        onRetryPreview={(photo) => void gallery.retryPreview?.(photo)}
        onImageError={gallery.markPreviewError}
        albums={albums}
        loadedCount={
          gallery.data.albums.filter((a) => a.groupId === gallery.groupId)
            .length
        }
        paging={gallery.albumList}
        cardId={cardId}
        onMore={() => void more()}
        live={gallery.mode === 'live'}
        photos={gallery.data.photos}
        search={search}
        onOpen={(id) => router.push(`/album?id=${encodeURIComponent(id)}`)}
      />
      {search.creating && (
        <EntryDialog
          title='앨범 만들기'
          maxLength={160}
          label='앨범 제목'
          onClose={() => search.setCreating(false)}
          note={
            gallery.mode === 'live'
              ? '그룹 구성원과 함께 보는 앨범이에요.'
              : undefined
          }
          onSubmit={async (title) => {
            const id = await gallery.createAlbum(title);
            if (id) router.push(`/album?id=${id}`);
          }}
        />
      )}
    </>
  );
}
