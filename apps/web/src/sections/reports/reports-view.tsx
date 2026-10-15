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
import { BackHeader } from '@/components/molecules/back-header';
import { EmptyState } from '@/components/molecules/empty-state';
import { LoadError, LoadingState } from '@/components/molecules/load-state';
import type { ReportStatus } from '@/dto/report.dto';
export interface ReportRowViewModel {
  id: string;
  domId: string;
  target: string;
  reason: string;
  status: ReportStatus;
  statusLabel: string;
  date: string;
  dateTime: string;
  resolved: string;
  resolvedAt: string;
}
interface Props {
  demo: boolean;
  intro: string;
  rows: ReportRowViewModel[];
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
export function ReportsView({
  demo,
  intro,
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
    <Section className='service-page' aria-labelledby='reports-title'>
      <BackHeader title='신고 내역' titleId='reports-title' onBack={onBack} />
      {demo ? (
        <LoadError
          title='미리보기에서는 신고 내역을 볼 수 없어요'
          message='로그인한 계정에서 확인할 수 있어요.'
          backLabel='마이페이지로'
          onBack={onBack}
        />
      ) : (
        <>
          <Text className='service-meta'>{intro}</Text>
          {loading ? (
            <LoadingState message='신고 내역을 불러오고 있어요…' />
          ) : error ? (
            <LoadError
              title='신고 내역을 불러오지 못했어요'
              message={error}
              onRetry={onRetry}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon='flag'
              title='아직 신고한 내역이 없어요'
              body='사진·댓글·회원을 신고하면 처리 상태를 여기에서 확인할 수 있어요.'
            />
          ) : (
            <>
              {notice && (
                <Text className='service-meta' role='status'>
                  {notice}
                </Text>
              )}
              <Ul className='service-list' aria-label='신고 목록'>
                {rows.map((row) => (
                  <Li key={row.id}>
                    <Box id={row.domId} className='service-row' tabIndex={-1}>
                      <Span className='service-row-copy'>
                        <Span className='service-row-title'>
                          {row.target} · {row.reason}
                        </Span>
                        <Span className='service-row-meta'>
                          <Time dateTime={row.dateTime}>{row.date}</Time> 신고
                          {row.resolved && (
                            <>
                              {' · '}
                              <Time dateTime={row.resolvedAt}>
                                {row.resolved}
                              </Time>{' '}
                              처리
                            </>
                          )}
                        </Span>
                      </Span>
                      <Span className='status-chip' data-status={row.status}>
                        <Span className='sr-only'>처리 상태 </Span>
                        {row.statusLabel}
                      </Span>
                    </Box>
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
                      : '신고 더 보기'}
                </Button>
              )}
            </>
          )}
        </>
      )}
    </Section>
  );
}
