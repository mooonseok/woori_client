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
export interface BlockRowViewModel {
  id: string;
  buttonId: string;
  name: string;
  date: string;
  dateTime: string;
}
interface Props {
  demo: boolean;
  rows: BlockRowViewModel[];
  loading: boolean;
  loadingMore: boolean;
  error: string;
  moreError: string;
  notice: string;
  hasMore: boolean;
  onRetry: () => void;
  onMore: () => void;
  onUnblock: (userId: string) => void;
  onBack: () => void;
}
export function BlocksView({
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
  onUnblock,
  onBack,
}: Props) {
  return (
    <Section className='service-page' aria-labelledby='blocks-title'>
      <BackHeader title='차단 관리' titleId='blocks-title' onBack={onBack} />
      {demo ? (
        <LoadError
          title='미리보기에서는 차단을 관리할 수 없어요'
          message='로그인한 계정에서 확인할 수 있어요.'
          backLabel='마이페이지로'
          onBack={onBack}
        />
      ) : (
        <>
          <Text className='service-meta'>
            차단한 사람이 올린 사진·댓글·반응과 그 사람 활동 알림은 나에게만
            보이지 않아요. 상대방에게는 알리지 않아요.
          </Text>
          {loading ? (
            <LoadingState message='차단 목록을 불러오고 있어요…' />
          ) : error ? (
            <LoadError
              title='차단 목록을 불러오지 못했어요'
              message={error}
              onRetry={onRetry}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon='eye-off'
              title='차단한 사람이 없어요'
              body='사진·댓글 메뉴나 그룹 구성원 목록에서 차단할 수 있어요.'
            />
          ) : (
            <>
              {notice && (
                <Text className='service-meta' role='status'>
                  {notice}
                </Text>
              )}
              <Ul className='service-list' aria-label='차단한 사람 목록'>
                {rows.map((row) => (
                  <Li key={row.id}>
                    <Box className='service-row'>
                      <Span className='service-row-copy'>
                        <Span className='service-row-title'>{row.name}</Span>
                        <Span className='service-row-meta'>
                          <Time dateTime={row.dateTime}>{row.date}</Time> 차단
                        </Span>
                      </Span>
                      <Button
                        id={row.buttonId}
                        className='secondary-button'
                        aria-label={`${row.name}님 차단 해제`}
                        onClick={() => onUnblock(row.id)}
                      >
                        차단 해제
                      </Button>
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
                      : '더 보기'}
                </Button>
              )}
            </>
          )}
        </>
      )}
    </Section>
  );
}
