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
import type { Album, AlbumListState, Photo } from '@/dto/album.dto';
import type { AlbumSearch } from '@/dto/album-search.dto';
interface Props {
  onRetryPreview?: (photo: Photo) => void;
  onImageError?: (photo: Photo) => void;
  albums: Album[];
  // Albums of the group loaded so far, before the title filter.
  loadedCount: number;
  paging?: AlbumListState;
  live?: boolean;
  photos: Photo[];
  search: AlbumSearch;
  cardId: (albumId: string) => string;
  onOpen: (id: string) => void;
  onMore: () => void;
}
export function AlbumsView({
  onRetryPreview,
  onImageError,
  albums,
  loadedCount,
  paging,
  photos,
  search: s,
  cardId,
  onOpen,
  onMore,
  live = false,
}: Props) {
  const { input, trigger } = s;
  const hasMore = !!paging?.hasMore;
  // The list is paged: never present loaded albums as the group's total.
  const countLabel = s.query
    ? `불러온 앨범 중 ${albums.length}개`
    : hasMore
      ? `앨범 ${loadedCount}개 불러옴`
      : `앨범 ${loadedCount}개`;
  const searchLabel = live ? '불러온 앨범에서 찾기' : '앨범 제목 검색';
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
                aria-label={searchLabel}
                placeholder={searchLabel}
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
        <Text className='muted' id='album-count' tabIndex={-1}>
          {countLabel}
        </Text>
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
            {!live && <Option value='taken'>촬영일순</Option>}
          </Select>
          <Button className='primary' onClick={() => s.setCreating(true)}>
            <Icon name='plus' size={20} />
            앨범 만들기
          </Button>
        </Box>
      </Box>
      {paging?.notice && (
        <Text className='muted' role='status'>
          {paging.notice}
        </Text>
      )}
      {albums.length ? (
        <Box className='album-grid'>
          {albums.map((a) => (
            <AlbumCard
              key={a.id}
              domId={cardId(a.id)}
              onRetry={onRetryPreview}
              onImageError={onImageError}
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
              ? hasMore
                ? '아직 불러오지 않은 앨범에서는 찾지 못해요. 앨범을 더 불러와 보세요.'
                : '다른 제목으로 검색해 보세요.'
              : '소중한 순간을 담을 첫 앨범을 만들어 보세요.'
          }
          action={s.query ? '검색 초기화' : '앨범 만들기'}
          onAction={s.query ? s.closeSearch : () => s.setCreating(true)}
        />
      )}
      {paging?.error && (
        <Box className='error-notice' role='alert'>
          <Text>{paging.error}</Text>
        </Box>
      )}
      {hasMore && (
        <Button
          className='secondary-button album-more'
          // aria-disabled keeps keyboard focus here while the page loads.
          aria-disabled={paging?.loadingMore}
          aria-busy={paging?.loadingMore}
          onClick={() => {
            if (!paging?.loadingMore) onMore();
          }}
        >
          {paging?.loadingMore
            ? '불러오는 중…'
            : paging?.error
              ? '다시 불러오기'
              : '앨범 더 불러오기'}
        </Button>
      )}
    </Box>
  );
}
