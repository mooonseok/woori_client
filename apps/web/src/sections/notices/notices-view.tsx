import {
  Box,
  Button,
  Li,
  Section,
  Span,
  Text,
  Time,
  Ul,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { Link } from '@/components/molecules/link';
import { BackHeader } from '@/components/molecules/back-header';
import { EmptyState } from '@/components/molecules/empty-state';
import { LoadError, LoadingState } from '@/components/molecules/load-state';
export interface NoticeRowViewModel {
  id: string;
  domId: string;
  title: string;
  href: string;
  date: string;
  dateTime: string;
}
interface Props {
  demo: boolean;
  rows: NoticeRowViewModel[];
  loading: boolean;
  loadingMore: boolean;
  error: string;
  moreError: string;
  notice: string;
  hasMore: boolean;
  onRetry: () => void;
  onMore: () => void;
  onBack: () => void;
}
export function NoticesView({
  demo,
  rows,
  loading,
  loadingMore,
  error,
  moreError,
  notice,
  hasMore,
  onRetry,
  onMore,
  onBack,
}: Props) {
  return (
    <Section className='service-page' aria-labelledby='notices-title'>
      <BackHeader title='공지사항' titleId='notices-title' onBack={onBack} />
      {demo ? (
        <LoadError
          title='미리보기에서는 공지사항을 볼 수 없어요'
          message='로그인한 계정에서 확인할 수 있어요.'
          backLabel='마이페이지로'
          onBack={onBack}
        />
      ) : loading ? (
        <LoadingState message='공지사항을 불러오고 있어요…' />
      ) : error ? (
        <LoadError
          title='공지사항을 불러오지 못했어요'
          message={error}
          onRetry={onRetry}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon='info'
          title='아직 공지사항이 없어요'
          body='서비스 소식이 생기면 여기에서 알려 드릴게요.'
        />
      ) : (
        <>
          {notice && (
            <Text className='service-meta' role='status'>
              {notice}
            </Text>
          )}
          <Ul className='service-list' aria-label='공지사항 목록'>
            {rows.map((row) => (
              <Li key={row.id}>
                <Link id={row.domId} className='service-row' href={row.href}>
                  <Span className='service-row-copy'>
                    <Span className='service-row-title'>{row.title}</Span>
                    <Time className='service-row-meta' dateTime={row.dateTime}>
                      {row.date}
                    </Time>
                  </Span>
                  <Icon name='chevron-right' />
                </Link>
              </Li>
            ))}
          </Ul>
          {moreError && (
            <Box className='error-notice' role='alert'>
              <Text>{moreError}</Text>
            </Box>
          )}
          {hasMore && (
            <Button
              className='secondary-button service-more'
              disabled={loadingMore}
              aria-busy={loadingMore}
              onClick={onMore}
            >
              {loadingMore
                ? '불러오는 중…'
                : moreError
                  ? '다시 불러오기'
                  : '공지 더 보기'}
            </Button>
          )}
        </>
      )}
    </Section>
  );
}
