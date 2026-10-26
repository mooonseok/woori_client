import type { ReactNode } from 'react';
import { Box, Section, Title } from '@/components/atoms/ui';
import { particle } from '@/utils/plain-text';
import { BackLink } from './back-link';
import { EmptyState } from './empty-state';
import { LoadError, LoadingState } from './load-state';
// States around a record screen (notice, inquiry, report) until it loads.
export function RecordFrame({
  title,
  ready,
  loading,
  error,
  notFound,
  notFoundBody,
  backHref,
  backLabel,
  onRetry,
  children,
}: {
  title: string;
  ready: boolean;
  loading: boolean;
  error: string;
  notFound: boolean;
  notFoundBody: string;
  backHref: string;
  backLabel: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (ready) return children;
  const object = title + particle(title, '을', '를');
  return (
    <Section
      className='console-page console-page-detail'
      aria-labelledby='page-title'
    >
      <Box className='record-header'>
        <BackLink href={backHref} label={backLabel} />
        <Title id='page-title' className='record-title'>
          {title}
        </Title>
      </Box>
      {loading ? (
        <LoadingState message={`${object} 불러오고 있어요…`} />
      ) : notFound ? (
        <EmptyState
          icon='info'
          title={`${object} 찾을 수 없어요`}
          body={notFoundBody}
        />
      ) : error ? (
        <LoadError
          title={`${object} 불러오지 못했어요`}
          message={error}
          onRetry={onRetry}
        />
      ) : (
        <LoadingState message={`${object} 불러오고 있어요…`} />
      )}
    </Section>
  );
}
