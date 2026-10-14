import {
  Box,
  Header,
  Heading,
  Text,
  Button,
  Input,
  Select,
  Option,
  Label,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { AlbumCard } from '@/components/molecules/album-card';
import { EmptyState } from '@/components/molecules/empty-state';
import type { Album, Photo } from '@/dto/album.dto';
import type { AlbumSearch } from '@/dto/album-search.dto';
interface Props {
  albums: Album[];
  photos: Photo[];
  search: AlbumSearch;
  onOpen: (id: string) => void;
}
export function AlbumsView({ albums, photos, search: s, onOpen }: Props) {
  const { input, trigger } = s;
  return (
    <Box>
      <Header className='page-heading'>
        <Heading>앨범</Heading>
        <Button
          ref={trigger}
          className='text-button'
          aria-label='앨범 검색'
          aria-expanded={s.searchOpen}
          aria-controls='album-search'
          onClick={s.openSearch}
          style={{ visibility: s.searchOpen ? 'hidden' : 'visible' }}
        >
          <Icon name='search' />
          검색
        </Button>
      </Header>
      <Box
        className={`search-reveal ${s.searchOpen ? 'is-open' : ''}`}
        id='album-search'
        inert={!s.searchOpen}
      >
        <Box className='search-clip'>
          <Box className='search-row'>
            <Box className='search-field'>
              <Icon name='search' />
              <Input
                ref={input}
                type='search'
                aria-label='앨범 제목 검색'
                placeholder='앨범 제목 검색'
                value={s.draft}
                onCompositionStart={s.startComposition}
                onCompositionEnd={(e) =>
                  s.endComposition(e.currentTarget.value)
                }
                onChange={(e) => s.changeDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') s.closeSearch();
                }}
              />
            </Box>
            <Button className='text-button' onClick={s.closeSearch}>
              닫기
            </Button>
          </Box>
        </Box>
      </Box>
      <Box className='album-controls'>
        <Text className='muted'>앨범 {albums.length}개</Text>
        <Box className='control-actions'>
          <Label className='sr-only' htmlFor='sort'>
            앨범 정렬
          </Label>
          <Select
            id='sort'
            className='sort-select'
            value={s.sort}
            onChange={(e) => s.setSort(e.target.value)}
          >
            <Option value='recent'>최신순</Option>
            <Option value='taken'>촬영일순</Option>
          </Select>
          <Button className='primary' onClick={() => s.setCreating(true)}>
            <Icon name='plus' size={20} />
            앨범 만들기
          </Button>
        </Box>
      </Box>
      {albums.length ? (
        <Box className='album-grid'>
          {albums.map((a) => (
            <AlbumCard
              key={a.id}
              album={a}
              cover={photos.find((p) => p.id === a.coverId)}
              count={
                a.photoCount ?? photos.filter((p) => p.albumId === a.id).length
              }
              onOpen={() => onOpen(a.id)}
            />
          ))}
        </Box>
      ) : (
        <EmptyState
          title={s.query ? '찾는 앨범이 없어요' : '아직 앨범이 없어요'}
          body={
            s.query
              ? '다른 제목으로 검색해 보세요.'
              : '소중한 순간을 담을 첫 앨범을 만들어 보세요.'
          }
          action={s.query ? '검색 초기화' : '앨범 만들기'}
          onAction={s.query ? s.closeSearch : () => s.setCreating(true)}
        />
      )}
    </Box>
  );
}
