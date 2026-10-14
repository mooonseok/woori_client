import { Button, Box, Image, Text } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import type { Album, Photo } from '@/dto/album.dto';
export function AlbumCard({
  album,
  cover,
  count,
  onOpen,
}: {
  album: Album;
  cover?: Photo;
  count: number;
  onOpen: () => void;
}) {
  return (
    <Button
      className='album-card'
      onClick={onOpen}
      aria-label={`${album.title}, 사진 ${count}장`}
    >
      <Box className='album-cover'>
        {cover ? (
          <Image src={cover.src} alt='' loading='lazy' />
        ) : (
          <Icon name='photo' size={40} />
        )}
      </Box>
      <Text className='album-title'>{album.title}</Text>
      <Text className='album-meta'>
        {album.date.replaceAll('-', '.')} · 사진 {count}장
      </Text>
    </Button>
  );
}
