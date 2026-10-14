'use client';
import { useRouter } from 'next/navigation';
import { GalleryStatus } from '@/components/organisms/gallery-status/gallery-status';
import { useGallery } from '@/hooks/use-gallery';
import { photosFor } from '@/lib/gallery';
import { HomeView } from './home-view';
export function HomeContainer() {
  const { data, groupId, openPhoto, mode, loading, error } = useGallery();
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
