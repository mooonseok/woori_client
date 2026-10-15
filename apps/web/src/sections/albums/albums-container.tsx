'use client';
import { useRouter } from 'next/navigation';
import { GalleryStatus } from '@/components/organisms/gallery-status/gallery-status';
import { useGallery } from '@/hooks/use-gallery';
import { useAlbumSearch } from '@/hooks/use-albums';
import { listAlbums } from '@/lib/gallery';
import { EntryDialog } from '@/components/organisms/entry-dialog/entry-dialog';
import { AlbumsView } from './albums-view';
export function AlbumsContainer() {
  const gallery = useGallery(),
    search = useAlbumSearch(),
    router = useRouter();
  if (
    gallery.mode === 'live' &&
    (gallery.loading || gallery.error || !gallery.groupId)
  )
    return <GalleryStatus />;
  const albums = listAlbums(
    gallery.data,
    gallery.groupId,
    search.query,
    search.sort
  );
  return (
    <>
      <AlbumsView
        albums={albums}
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
