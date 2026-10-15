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
import type { InquiryStatus } from '@/dto/inquiry.dto';
export interface InquiryRowViewModel {
  id: string;
  domId: string;
  title: string;
  href: string;
  category: string;
  status: InquiryStatus;
  statusLabel: string;
  date: string;
  dateTime: string;
}
interface Props {
  demo: boolean;
  rows: InquiryRowViewModel[];
  newHref: string;
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
export function InquiriesView({
  demo,
  rows,
  newHref,
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
    <Section className='service-page' aria-labelledby='inquiries-title'>
      <BackHeader title='문의 내역' titleId='inquiries-title' onBack={onBack}>
        {!demo && (
          <Link className='primary service-header-action' href={newHref}>
            문의하기
          </Link>
        )}
      </BackHeader>
      {demo ? (
        <LoadError
          title='미리보기에서는 문의를 이용할 수 없어요'
          message='로그인한 계정에서 문의를 보내고 확인할 수 있어요.'
          backLabel='마이페이지로'
          onBack={onBack}
        />
      ) : loading ? (
        <LoadingState message='문의 내역을 불러오고 있어요…' />
      ) : error ? (
        <LoadError
          title='문의 내역을 불러오지 못했어요'
          message={error}
          onRetry={onRetry}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon='comment'
          title='아직 보낸 문의가 없어요'
          body='궁금한 점이나 불편한 점이 있으면 문의하기로 알려 주세요.'
        />
      ) : (
        <>
          {notice && (
            <Text className='service-meta' role='status'>
              {notice}
            </Text>
          )}
          <Ul className='service-list' aria-label='보낸 문의 목록'>
            {rows.map((row) => (
              <Li key={row.id}>
                <Link id={row.domId} className='service-row' href={row.href}>
                  <Span className='service-row-copy'>
                    <Span className='service-row-title'>{row.title}</Span>
                    <Span className='service-row-meta'>
                      {row.category} ·{' '}
                      <Time dateTime={row.dateTime}>{row.date}</Time>
                    </Span>
                  </Span>
                  <Span className='status-chip' data-status={row.status}>
                    <Span className='sr-only'>진행 상태 </Span>
                    {row.statusLabel}
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
                  : '문의 더 보기'}
            </Button>
          )}
        </>
      )}
    </Section>
  );
}
