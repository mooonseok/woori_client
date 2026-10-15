import { Article, Section, Text, Time } from '@/components/atoms/ui';
import { BackHeader } from '@/components/molecules/back-header';
import { LoadError, LoadingState } from '@/components/molecules/load-state';
import type { RecordStatus } from '@/dto/service-guide.dto';
export interface NoticeViewModel {
  title: string;
  body: string;
  published: string;
  publishedAt: string;
  updated: string;
  updatedAt: string;
}
interface Props {
  status: RecordStatus;
  error: string;
  notice: NoticeViewModel | null;
  onRetry: () => void;
  onBack: () => void;
}
export function NoticeView({ status, error, notice, onRetry, onBack }: Props) {
  return (
    <Section className='service-page' aria-labelledby='notice-title'>
      <BackHeader
        title={notice?.title ?? '공지사항'}
        titleId='notice-title'
        onBack={onBack}
      />
      {status === 'disabled' ? (
        <LoadError
          title='미리보기에서는 공지사항을 볼 수 없어요'
          message='로그인한 계정에서 확인할 수 있어요.'
          backLabel='공지사항 목록'
          onBack={onBack}
        />
      ) : status === 'invalid' || status === 'not-found' ? (
        <LoadError
          title='찾을 수 없는 공지예요'
          message={
            status === 'invalid'
              ? '주소가 올바른지 확인해 주세요.'
              : '삭제되었거나 더 이상 볼 수 없는 공지예요.'
          }
          backLabel='공지사항 목록'
          onBack={onBack}
        />
      ) : status === 'error' ? (
        <LoadError
          title='공지를 불러오지 못했어요'
          message={error}
          onRetry={onRetry}
          backLabel='공지사항 목록'
          onBack={onBack}
        />
      ) : status === 'loading' || !notice ? (
        <LoadingState message='공지를 불러오고 있어요…' />
      ) : (
        <Article className='service-article' aria-labelledby='notice-title'>
          <Text className='service-meta'>
            <Time dateTime={notice.publishedAt}>{notice.published}</Time>
            {notice.updated && (
              <>
                {' · 수정 '}
                <Time dateTime={notice.updatedAt}>{notice.updated}</Time>
              </>
            )}
          </Text>
          <Text className='plain-text'>{notice.body}</Text>
        </Article>
      )}
    </Section>
  );
}
