import type { ReactNode } from 'react';
import {
  Box,
  Section,
  Header,
  Heading,
  Button,
  Image,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { AlbumCard } from '@/components/molecules/album-card';
import { EmptyState } from '@/components/molecules/empty-state';
import type { Album, Photo } from '@/dto/album.dto';
import { AlbumMeta } from '@/components/molecules/album-meta';
import { MediaBadge } from '@/components/molecules/media-badge';
import { mediaCountLabel } from '@/utils/media';
interface Props {
  demo?: boolean;
  memories?: ReactNode;
  albums: Album[];
  photos: Photo[];
  hero?: Photo;
  count: number;
  onPhoto: (id: string) => void;
  onAlbum: (id: string) => void;
  onAlbums: () => void;
}
export function HomeView({
  memories,
  albums,
  photos,
  hero,
  count,
  onPhoto,
  onAlbum,
  onAlbums,
}: Props) {
  if (!hero && !memories)
    return (
      <EmptyState
        title={
          albums.length
            ? '첫 사진을 기다리고 있어요'
            : '우리의 첫 추억을 모아볼까요?'
        }
        body={
          albums.length
            ? `만들어 둔 ‘${albums[0].title}’에 사진을 담아 주세요.`
            : '앨범을 만들고 함께 보고 싶은 사진을 담아 주세요.'
        }
        action={albums.length ? '앨범에 사진 담기' : '앨범 만들러 가기'}
        onAction={albums.length ? () => onAlbum(albums[0].id) : onAlbums}
      />
    );
  return (
    <Box className='home-layout'>
      {memories ||
        (hero && (
          <Section className='memory-section'>
            <Button
              className='hero-photo'
              onClick={() => onPhoto(hero.id)}
              aria-label={
                hero.mediaKind === 'VIDEO'
                  ? '추억 동영상 크게 보기'
                  : '추억 사진 크게 보기'
              }
            >
              <Image src={hero.src} alt={hero.alt} fetchPriority='high' />
              {hero.mediaKind === 'VIDEO' && (
                <MediaBadge durationMs={hero.durationMs} />
              )}
            </Button>
            <Box className='memory-caption'>
              <Heading className='memory-title'>{albums[0].title}</Heading>
              <AlbumMeta className='muted' album={albums[0]} count={count} />
              <Button
                className='text-button'
                onClick={() => onAlbum(albums[0].id)}
              >
                {mediaCountLabel(count, albums[0].videoCount)} 보기{' '}
                <Icon name='chevron-right' size={18} />
              </Button>
            </Box>
          </Section>
        ))}
      {photos.some((photo) =>
        albums.some((album) => album.id === photo.albumId)
      ) && (
        <Section className='moments-section'>
          <Header className='section-header'>
            <Heading>함께 모은 순간</Heading>
            <Button className='text-button' onClick={onAlbums}>
              앨범 보기 <Icon name='chevron-right' size={18} />
            </Button>
          </Header>
          <Box className='moments-grid'>
            {photos
              .filter((photo) =>
                albums.some((album) => album.id === photo.albumId)
              )
              .slice(0, 6)
              .map((photo) => (
                <Button
                  className='photo-tile'
                  key={photo.id}
                  onClick={() => onPhoto(photo.id)}
                  aria-label={`${photo.alt}, ${photo.mediaKind === 'VIDEO' ? '동영상' : '사진'} 크게 보기`}
                >
                  <Image src={photo.src} alt='' loading='lazy' />
                  {photo.mediaKind === 'VIDEO' && (
                    <MediaBadge durationMs={photo.durationMs} />
                  )}
                </Button>
              ))}
          </Box>
        </Section>
      )}
      <Section className='recent-section'>
        <Header className='section-header'>
          <Heading>최근 앨범</Heading>
          <Button className='text-button' onClick={onAlbums}>
            전체 보기 <Icon name='chevron-right' size={18} />
          </Button>
        </Header>
        {!albums.length && (
          <EmptyState
            title='첫 앨범을 만들어 보세요'
            body='가족과 함께 나눌 사진을 한곳에 모아요.'
            action='앨범 만들러 가기'
            onAction={onAlbums}
          />
        )}
        <Box className='recent-grid'>
          {albums
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 4)
            .map((a) => (
              <AlbumCard
                key={a.id}
                album={a}
                cover={photos.find((p) => p.id === a.coverId)}
                count={
                  a.photoCount ??
                  photos.filter((p) => p.albumId === a.id).length
                }
                onOpen={() => onAlbum(a.id)}
              />
            ))}
        </Box>
      </Section>
    </Box>
  );
}
