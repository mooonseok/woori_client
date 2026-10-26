import type { FormEvent } from 'react';
import {
  Box,
  Button,
  Dd,
  Dl,
  Dt,
  Form,
  Heading,
  Label,
  Section,
  Span,
  Text,
  Textarea,
  Time,
  Title,
} from '@/components/atoms/ui';
import { BackLink } from '@/components/molecules/back-link';
import { Notice } from '@/components/molecules/notice';
import { ConfirmDialog } from '@/components/organisms/confirm-dialog/confirm-dialog';
interface Props {
  title: string;
  category: string;
  status: string;
  statusLabel: string;
  memberName: string;
  memberUsername: string;
  memberStatus: string;
  memberStatusLabel: string;
  created: string;
  createdAt: string;
  answered: string;
  answeredAt: string;
  body: string;
  currentAnswer: string;
  answer: string;
  answerCount: number;
  answerMax: number;
  answerError: string;
  sending: boolean;
  changing: boolean;
  message: string;
  error: string;
  closeCopy: {
    title: string;
    consequences: readonly string[];
    confirmLabel: string;
  } | null;
  listHref: string;
  onAnswer: (value: string) => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
  onInProgress: () => void;
  onClose: () => void;
  onConfirmClose: () => Promise<void>;
  onCancelClose: () => void;
}
export function InquiryView(props: Props) {
  const reanswer = !!props.currentAnswer;
  const closed = props.status === 'CLOSED';
  return (
    <Section
      className='console-page console-page-detail'
      aria-labelledby='page-title'
    >
      <Box className='record-header'>
        <BackLink href={props.listHref} label='문의 목록' />
        <Box className='page-head'>
          <Title id='page-title' className='record-title'>
            {props.title}
          </Title>
          <Box className='meta-row'>
            <Span className='status-chip' data-status={props.status}>
              {props.statusLabel}
            </Span>
            <Span className='muted'>{props.category}</Span>
          </Box>
        </Box>
      </Box>
      {props.message && <Notice>{props.message}</Notice>}
      {props.error && <Notice tone='error'>{props.error}</Notice>}
      <Box className='detail-grid'>
        <Section className='card' aria-labelledby='inquiry-info'>
          <Heading id='inquiry-info'>문의 정보</Heading>
          <Dl className='facts'>
            <Box>
              <Dt>회원</Dt>
              <Dd>
                {props.memberName}
                {props.memberUsername && (
                  <Span className='muted'> @{props.memberUsername}</Span>
                )}
                {props.memberStatus && props.memberStatus !== 'ACTIVE' && (
                  <Span
                    className='status-chip'
                    data-status={props.memberStatus}
                  >
                    {props.memberStatusLabel}
                  </Span>
                )}
              </Dd>
            </Box>
            <Box>
              <Dt>접수</Dt>
              <Dd>
                <Time dateTime={props.createdAt}>{props.created}</Time>
              </Dd>
            </Box>
            <Box>
              <Dt>답변</Dt>
              <Dd>
                {props.answered ? (
                  <Time dateTime={props.answeredAt}>{props.answered}</Time>
                ) : (
                  '아직 답변하지 않았어요'
                )}
              </Dd>
            </Box>
          </Dl>
          <Heading className='sub-heading'>문의 내용</Heading>
          <Text className='plain-text quote'>{props.body}</Text>
        </Section>
        <Form
          className='card stack-form'
          onSubmit={props.onSend}
          aria-labelledby='inquiry-answer-title'
          aria-busy={props.sending}
          noValidate
        >
          <Heading id='inquiry-answer-title'>
            {reanswer ? '답변 고치기' : '답변'}
          </Heading>
          {reanswer && (
            <>
              <Text className='muted'>현재 회원에게 보이는 답변</Text>
              <Text className='plain-text quote'>{props.currentAnswer}</Text>
              <Notice tone='warning'>
                다시 보내면 기존 답변을 덮어써요. 회원에게는 새 답변만 보이고
                이전 답변은 남지 않아요.
              </Notice>
            </>
          )}
          <Box className='field'>
            <Label htmlFor='inquiry-answer'>
              {reanswer ? '새 답변' : '답변 내용'}
            </Label>
            <Textarea
              id='inquiry-answer'
              rows={8}
              value={props.answer}
              readOnly={props.sending}
              aria-invalid={props.answerError ? true : undefined}
              aria-describedby={
                props.answerError
                  ? 'inquiry-answer-count inquiry-answer-error'
                  : 'inquiry-answer-count'
              }
              onChange={(event) => props.onAnswer(event.target.value)}
            />
            <Text id='inquiry-answer-count' className='field-help counter'>
              {props.answerCount.toLocaleString('ko-KR')} /{' '}
              {props.answerMax.toLocaleString('ko-KR')}자 · 회원에게 글자 그대로
              보여요
            </Text>
            {props.answerError && (
              <Text id='inquiry-answer-error' className='field-error'>
                {props.answerError}
              </Text>
            )}
          </Box>
          <Box className='form-actions'>
            <Button
              type='submit'
              className='primary'
              aria-disabled={props.sending}
            >
              {props.sending
                ? '보내는 중…'
                : reanswer
                  ? '답변 다시 보내기'
                  : '답변 보내기'}
            </Button>
          </Box>
        </Form>
      </Box>
      <Section
        className='card stack-form action-panel'
        aria-labelledby='inquiry-status'
      >
        <Heading id='inquiry-status'>처리 상태</Heading>
        <Text className='muted'>
          답변을 보내면 자동으로 ‘답변 완료’가 돼요. 회원도 같은 상태를 봐요.
        </Text>
        <Box className='inline-actions'>
          {props.status !== 'IN_PROGRESS' && (
            <Button
              className='secondary-button'
              aria-disabled={props.changing}
              onClick={props.onInProgress}
            >
              {props.status === 'RECEIVED'
                ? '확인 중으로 표시'
                : '다시 확인 중으로 표시'}
            </Button>
          )}
          {!closed && (
            <Button
              className='secondary-button'
              aria-disabled={props.changing}
              onClick={props.onClose}
            >
              문의 종료
            </Button>
          )}
        </Box>
      </Section>
      {props.closeCopy && (
        <ConfirmDialog
          title={props.closeCopy.title}
          consequences={props.closeCopy.consequences}
          confirmLabel={props.closeCopy.confirmLabel}
          onConfirm={props.onConfirmClose}
          onClose={props.onCancelClose}
        />
      )}
    </Section>
  );
}
