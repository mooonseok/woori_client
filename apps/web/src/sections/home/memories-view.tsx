import { Icon } from '@/components/atoms/icon';
import { MediaPreview } from '@/components/molecules/media-preview';
import {
  Box,
  Section,
  Header,
  Heading,
  Text,
  Button,
} from '@/components/atoms/ui';
import type { MemoryCard, MemoryKind } from '@/dto/memories.dto';
import { photoDateLabel } from '@/utils/photo-date';
import { formatDuration } from '@/utils/media';
import { MediaBadge } from '@/components/molecules/media-badge';
interface Props {
  previewError: (item: MemoryCard) => void;
  retryPreview: (item: MemoryCard) => void;
  kind: MemoryKind;
  items: MemoryCard[];
  loading: boolean;
  error: string;
  notice: string;
  pending: string;
  opening: boolean;
  openError: string;
  hasMore: boolean;
  asOf: string;
  onKind: (kind: MemoryKind) => void;
  onOpen: (item: MemoryCard) => void;
  onHide: (id: string, hidden: boolean) => void;
  onReload: () => void;
  onMore: () => void;
}
export function MemoriesView(props: Props) {
  const { kind, items, loading, error, pending } = props;
  return (
    <Section
      className='memories-home'
      aria-label='우리의 추억'
      aria-busy={loading}
    >
      <Header className='section-header'>
        <Heading>다시 꺼내 보는 우리</Heading>
      </Header>
      <Box className='memory-filters' role='group' aria-label='추억 보기'>
        {(
          [
            ['today', '오늘의 추억'],
            ['month', '이번 달의 추억'],
            ['hidden', '숨긴 추억'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            className='text-button'
            aria-pressed={kind === key}
            // Focus lands here if a viewer closes after its photo was hidden.
            data-photo-viewer-return={kind === key || undefined}
            disabled={!!pending || props.opening}
            onClick={() => props.onKind(key)}
          >
            {label}
          </Button>
        ))}
      </Box>
      <Text className='muted'>
        {kind === 'hidden'
          ? '나에게만 숨겨진 사진이에요. 앨범과 다른 가족의 추억에는 영향을 주지 않아요.'
          : kind === 'today'
            ? '지난해와 그 이전, 같은 날에 남긴 사진이에요.'
            : '지난해와 그 이전의 같은 달 사진이에요. 오늘의 추억은 따로 모았어요.'}
      </Text>
      {props.asOf && (
        <Text className='memory-date-note muted'>
          {props.asOf.replaceAll('-', '.')} · 한국 시간 기준
        </Text>
      )}
      {loading && <Text role='status'>추억을 불러오고 있어요…</Text>}
      {error && (
        <Box className='notice-panel'>
          <Text role='alert'>{error}</Text>
          <Button
            className='text-button'
            onClick={props.onReload}
            disabled={loading}
          >
            다시 시도
          </Button>
        </Box>
      )}
      {!loading && !error && !items.length && (
        <Box className='state-panel'>
          <Heading>
            {kind === 'hidden'
              ? '숨긴 추억이 없어요'
              : '아직 이 날짜의 추억이 없어요'}
          </Heading>
          <Text>
            {kind === 'hidden'
              ? '사진을 추억에서 숨기면 이곳에서 다시 표시할 수 있어요.'
              : '사진을 차곡차곡 모으면 시간이 지난 뒤 이곳에서 다시 만날 수 있어요. 아래 최근 앨범도 둘러보세요.'}
          </Text>
        </Box>
      )}
      <Box className='memories-grid'>
        {items.map((item) => (
          <Box className='memory-card media-card-frame' key={item.photo.id}>
            <Button
              className='memory-card-photo'
              disabled={props.opening || !!pending}
              onClick={() => props.onOpen(item)}
              aria-label={`${item.albumTitle}, ${item.effectiveDate}, ${
                item.photo.mediaKind === 'VIDEO'
                  ? `동영상${item.photo.durationMs ? ` ${formatDuration(item.photo.durationMs)}` : ''}`
                  : '사진'
              } 크게 보기`}
            >
              <MediaPreview
                src={item.thumbnail}
                status={item.previewStatus}
                video={item.photo.mediaKind === 'VIDEO'}
                onError={() => props.previewError(item)}
              />
              {item.photo.mediaKind === 'VIDEO' && (
                <MediaBadge durationMs={item.photo.durationMs} />
              )}
            </Button>
            {item.previewStatus === 'error' && (
              <Button
                className='media-retry'
                aria-label='추억 미리보기 다시 불러오기'
                onClick={(event) => {
                  event.currentTarget.parentElement
                    ?.querySelector<HTMLButtonElement>('.memory-card-photo')
                    ?.focus();
                  props.retryPreview(item);
                }}
              >
                <Icon name='refresh' size={18} />
              </Button>
            )}
            <Text className='memory-card-title'>
              {kind === 'hidden'
                ? item.albumTitle
                : `${item.yearsAgo}년 전${kind === 'today' ? ' 오늘' : ' 이번 달'}`}
            </Text>
            {kind !== 'hidden' && <Text>{item.albumTitle}</Text>}
            <Text className='muted memory-date-note'>
              {photoDateLabel(item.effectiveDate, item.dateSource)}
            </Text>
            <Button
              className='text-button'
              disabled={!!pending || props.opening}
              onClick={() => props.onHide(item.photo.id, kind !== 'hidden')}
            >
              {pending === item.photo.id
                ? '저장 중…'
                : kind === 'hidden'
                  ? '다시 표시'
                  : '내 추억에서 숨기기'}
            </Button>
          </Box>
        ))}
      </Box>
      {props.opening && <Text role='status'>사진을 열고 있어요…</Text>}
      {props.openError && <Text role='alert'>{props.openError}</Text>}
      {props.notice && <Text role='status'>{props.notice}</Text>}
      {props.hasMore && (
        <Button
          className='secondary-button'
          disabled={loading || !!pending}
          onClick={props.onMore}
        >
          추억 더 보기
        </Button>
      )}
    </Section>
  );
}
