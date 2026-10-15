import type { ReactNode } from 'react';
import {
  Box,
  Section,
  Header,
  Heading,
  Text,
  Button,
  Image,
  Span,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { AlbumCard } from '@/components/molecules/album-card';
import { EmptyState } from '@/components/molecules/empty-state';
import type { Album, Photo } from '@/dto/album.dto';
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
  demo = true,
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
              aria-label='추억 사진 크게 보기'
            >
              <Image src={hero.src} alt={hero.alt} fetchPriority='high' />
            </Button>
            <Box className='memory-caption'>
              <Text className='muted'>다시 꺼내 보는 우리</Text>
              <Heading className='memory-title'>{albums[0].title}</Heading>
              <Text className='muted'>
                {albums[0].date.replaceAll('-', '.')} · 사진 {count}장
              </Text>
              {demo && (
                <Text className='memory-quote'>
                  “이날 바닷바람이 참 시원했지.
                  <Span> 다 같이 걸어서 좋았다.”</Span>
                </Text>
              )}
              <Button
                className='text-button'
                onClick={() => onAlbum(albums[0].id)}
              >
                사진 {count}장 보기 <Icon name='chevron-right' size={18} />
              </Button>
            </Box>
          </Section>
        ))}
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
