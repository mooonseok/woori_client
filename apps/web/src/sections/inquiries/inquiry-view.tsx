import {
  Article,
  Box,
  Section,
  Span,
  Subheading,
  Text,
  Time,
} from '@/components/atoms/ui';
import { BackHeader } from '@/components/molecules/back-header';
import { LoadError, LoadingState } from '@/components/molecules/load-state';
import type { InquiryStatus } from '@/dto/inquiry.dto';
import type { RecordStatus } from '@/dto/service-guide.dto';
export interface InquiryViewModel {
  title: string;
  body: string;
  category: string;
  status: InquiryStatus;
  statusLabel: string;
  created: string;
  createdAt: string;
  answer: string | null;
  answered: string;
  answeredAt: string;
}
interface Props {
  status: RecordStatus;
  error: string;
  inquiry: InquiryViewModel | null;
  onRetry: () => void;
  onBack: () => void;
}
export function InquiryView({
  status,
  error,
  inquiry,
  onRetry,
  onBack,
}: Props) {
  return (
    <Section className='service-page' aria-labelledby='inquiry-title'>
      <BackHeader
        title={inquiry?.title ?? '문의 내역'}
        titleId='inquiry-title'
        onBack={onBack}
      />
      {status === 'disabled' ? (
        <LoadError
          title='미리보기에서는 문의를 볼 수 없어요'
          message='로그인한 계정에서 확인할 수 있어요.'
          backLabel='문의 내역으로'
          onBack={onBack}
        />
      ) : status === 'invalid' || status === 'not-found' ? (
        <LoadError
          title='찾을 수 없는 문의예요'
          message={
            status === 'invalid'
              ? '주소가 올바른지 확인해 주세요.'
              : '내가 보낸 문의만 볼 수 있어요. 문의 내역에서 다시 선택해 주세요.'
          }
          backLabel='문의 내역으로'
          onBack={onBack}
        />
      ) : status === 'error' ? (
        <LoadError
          title='문의를 불러오지 못했어요'
          message={error}
          onRetry={onRetry}
          backLabel='문의 내역으로'
          onBack={onBack}
        />
      ) : status === 'loading' || !inquiry ? (
        <LoadingState message='문의를 불러오고 있어요…' />
      ) : (
        <Article className='service-article' aria-labelledby='inquiry-title'>
          <Box className='service-meta-row'>
            <Span className='status-chip' data-status={inquiry.status}>
              <Span className='sr-only'>진행 상태 </Span>
              {inquiry.statusLabel}
            </Span>
            <Text className='service-meta'>
              {inquiry.category} ·{' '}
              <Time dateTime={inquiry.createdAt}>{inquiry.created}</Time> 보냄
            </Text>
          </Box>
          <Section
            className='service-block'
            aria-labelledby='inquiry-body-heading'
          >
            <Subheading id='inquiry-body-heading'>문의 내용</Subheading>
            <Text className='plain-text'>{inquiry.body}</Text>
          </Section>
          <Section
            className='service-block'
            aria-labelledby='inquiry-answer-heading'
          >
            <Subheading id='inquiry-answer-heading'>답변</Subheading>
            {inquiry.answer ? (
              <>
                <Text className='plain-text'>{inquiry.answer}</Text>
                {inquiry.answered && (
                  <Text className='service-meta'>
                    <Time dateTime={inquiry.answeredAt}>
                      {inquiry.answered}
                    </Time>{' '}
                    답변
                  </Text>
                )}
              </>
            ) : (
              <Text className='muted'>
                {inquiry.status === 'CLOSED'
                  ? '답변 없이 종료된 문의예요.'
                  : '아직 답변이 없어요.'}
              </Text>
            )}
          </Section>
        </Article>
      )}
    </Section>
  );
}
