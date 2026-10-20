import { Button, Box, Text } from '@/components/atoms/ui';
import { MediaPreview, MediaRetry } from './media-preview';
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
  onRetry,
  onImageError,
}: {
  album: Album;
  cover?: Photo;
  count: number;
  onOpen: () => void;
  // Lets the album list move focus to the first card of a new page.
  domId?: string;
  onRetry?: (photo: Photo) => void;
  onImageError?: (photo: Photo) => void;
}) {
  const meta = albumMeta(album, count);
  return (
    <Box className='media-card-frame'>
      <Button
        id={domId}
        className='album-card'
        onClick={onOpen}
        aria-label={`${album.title}, ${meta.replace(' · ', ', ')}${cover?.mediaKind === 'VIDEO' ? ', 대표 동영상' : ''}`}
      >
        <Box className='album-cover'>
          <MediaPreview
            src={cover?.src}
            status={
              cover?.previewStatus ??
              (album.coverId && !cover ? 'loading' : undefined)
            }
            video={(cover?.mediaKind ?? album.coverMediaKind) === 'VIDEO'}
            onError={() => cover && onImageError?.(cover)}
          />
          {cover?.mediaKind === 'VIDEO' && (
            <MediaBadge durationMs={cover.durationMs} />
          )}
        </Box>
        <Text className='album-title'>{album.title}</Text>
        <AlbumMeta className='album-meta' album={album} count={count} />
      </Button>
      <MediaRetry photo={cover} onRetry={onRetry} />
    </Box>
  );
}
