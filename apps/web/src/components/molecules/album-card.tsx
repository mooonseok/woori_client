import { Button, Box, Image, Text } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import type { Album, Photo } from '@/dto/album.dto';
import { albumMeta } from '@/lib/gallery';
import { AlbumMeta } from './album-meta';
import { MediaBadge } from './media-badge';
export function AlbumCard({
  album,
  cover,
  count,
  onOpen,
  domId,
}: {
  album: Album;
  cover?: Photo;
  count: number;
  onOpen: () => void;
  // Lets the album list move focus to the first card of a new page.
  domId?: string;
}) {
  const meta = albumMeta(album, count);
  return (
    <Button
      id={domId}
      className='album-card'
      onClick={onOpen}
      aria-label={`${album.title}, ${meta.replace(' · ', ', ')}${cover?.mediaKind === 'VIDEO' ? ', 대표 동영상' : ''}`}
    >
      <Box className='album-cover'>
        {cover ? (
          <>
            <Image src={cover.src} alt='' loading='lazy' />
            {cover.mediaKind === 'VIDEO' && (
              <MediaBadge durationMs={cover.durationMs} />
            )}
          </>
        ) : (
          <Icon name='photo' size={40} />
        )}
      </Box>
      <Text className='album-title'>{album.title}</Text>
      <AlbumMeta className='album-meta' album={album} count={count} />
    </Button>
  );
}
