import type { ReactNode } from 'react';
import { Button, Text } from '@/components/atoms/ui';
import { LoadError, LoadingState } from './load-state';
import { Notice } from './notice';
// Loading / error / empty / content switch shared by the record lists.
export function ListState({
  loading,
  error,
  empty,
  loadingLabel,
  errorTitle,
  emptyState,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string;
  empty: boolean;
  loadingLabel: string;
  errorTitle: string;
  emptyState: ReactNode;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (loading) return <LoadingState message={loadingLabel} />;
  if (error)
    return <LoadError title={errorTitle} message={error} onRetry={onRetry} />;
  if (empty) return emptyState;
  return children;
}
// Count line, restart notice, the table itself and "더 보기".
export function ListFooter({
  notice,
  count,
  hasMore,
  loadingMore,
  moreError,
  moreLabel,
  onMore,
  children,
}: {
  notice: string;
  count: number;
  hasMore: boolean;
  loadingMore: boolean;
  moreError: string;
  moreLabel: string;
  onMore: () => void;
  children: ReactNode;
}) {
  return (
    <>
      {notice && <Notice>{notice}</Notice>}
      <Text className='muted' role='status'>
        {count}건 표시 중{hasMore ? ' · 더 있어요' : ''}
      </Text>
      {children}
      {moreError && <Notice tone='error'>{moreError}</Notice>}
      {hasMore && (
        <Button
          className='secondary-button list-more'
          aria-disabled={loadingMore}
          aria-busy={loadingMore}
          onClick={onMore}
        >
          {loadingMore
            ? '불러오는 중…'
            : moreError
              ? '다시 불러오기'
              : moreLabel}
        </Button>
      )}
    </>
  );
}
