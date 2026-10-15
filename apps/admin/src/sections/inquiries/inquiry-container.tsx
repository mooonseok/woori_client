'use client';
import { useCallback, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { RecordFrame } from '@/components/molecules/record-frame';
import { useAdminRecord } from '@/hooks/use-admin-record';
import {
  answerInquiry,
  changeInquiryStatus,
  getInquiry,
} from '@/services/inquiries';
import { INQUIRY_ANSWER_MAX } from '@/constants/content-ops';
import { ROUTES } from '@/constants/routes';
import {
  INQUIRY_CATEGORY_LABELS,
  INQUIRY_STATUS_LABELS,
  MEMBER_STATUS_LABELS,
  labelOf,
} from '@/content/content-labels';
import type {
  AdminInquiryDetail,
  InquiryStatusChange,
} from '@/dto/inquiry.dto';
import { actionErrorMessage } from '@/utils/admin-errors';
import { isUuid } from '@/utils/admin-navigation';
import { codePoints, plainTextError, RULES } from '@/utils/plain-text';
import { kstDateTimeLabel } from '@/utils/time';
import { InquiryView } from './inquiry-view';

const CLOSE_COPY = {
  title: '문의를 종료할까요?',
  consequences: [
    '회원에게 이 문의가 ‘종료’로 표시돼요.',
    '종료한 뒤에도 필요하면 다시 ‘확인 중’으로 바꾸거나 답변할 수 있어요.',
  ],
  confirmLabel: '문의 종료',
} as const;
function Inquiry({
  inquiry,
  onChanged,
}: {
  inquiry: AdminInquiryDetail;
  onChanged: (response: unknown) => void;
}) {
  const [answer, setAnswer] = useState(inquiry.answer ?? ''),
    [answerError, setAnswerError] = useState(''),
    [sending, setSending] = useState(false),
    [changing, setChanging] = useState(false),
    [closing, setClosing] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const invalid = plainTextError(answer, RULES.answer);
    setAnswerError(invalid);
    setMessage('');
    setError('');
    if (invalid) {
      document.getElementById('inquiry-answer')?.focus();
      return;
    }
    setSending(true);
    try {
      const text = answer.trim();
      const response = await answerInquiry(inquiry.id, text);
      setAnswer(text);
      onChanged(response);
      setMessage(
        inquiry.answer
          ? '답변을 고쳐 보냈어요. 회원에게는 새 답변만 보여요.'
          : '답변을 보냈어요. 회원에게 ‘답변 완료’로 표시돼요.'
      );
    } catch (cause) {
      setError(actionErrorMessage(cause, '답변을 보내지 못했어요.'));
    } finally {
      setSending(false);
    }
  }
  async function change(status: InquiryStatusChange) {
    if (changing) return;
    setChanging(true);
    setMessage('');
    setError('');
    try {
      onChanged(await changeInquiryStatus(inquiry.id, status));
      setMessage(
        status === 'CLOSED'
          ? '문의를 종료했어요.'
          : '‘확인 중’으로 표시했어요. 회원에게도 같은 상태로 보여요.'
      );
    } catch (cause) {
      const text = actionErrorMessage(cause, '상태를 바꾸지 못했어요.');
      if (status === 'CLOSED') throw new Error(text);
      setError(text);
    } finally {
      setChanging(false);
    }
  }
  return (
    <InquiryView
      title={inquiry.title}
      category={labelOf(INQUIRY_CATEGORY_LABELS, inquiry.category)}
      status={inquiry.status}
      statusLabel={labelOf(INQUIRY_STATUS_LABELS, inquiry.status)}
      memberName={inquiry.member?.displayName ?? '알 수 없는 회원'}
      memberUsername={inquiry.member?.username ?? ''}
      memberStatus={inquiry.member?.status ?? ''}
      memberStatusLabel={labelOf(MEMBER_STATUS_LABELS, inquiry.member?.status)}
      created={kstDateTimeLabel(inquiry.createdAt)}
      createdAt={inquiry.createdAt}
      answered={kstDateTimeLabel(inquiry.answeredAt)}
      answeredAt={inquiry.answeredAt ?? ''}
      body={inquiry.body}
      currentAnswer={inquiry.answer ?? ''}
      answer={answer}
      answerCount={codePoints(answer.trim())}
      answerMax={INQUIRY_ANSWER_MAX}
      answerError={answerError}
      sending={sending}
      changing={changing}
      message={message}
      error={error}
      closeCopy={closing ? CLOSE_COPY : null}
      listHref={ROUTES.INQUIRIES}
      onAnswer={(value) => {
        setAnswer(value);
        setAnswerError('');
      }}
      onSend={send}
      onInProgress={() => void change('IN_PROGRESS')}
      onClose={() => setClosing(true)}
      onConfirmClose={async () => {
        await change('CLOSED');
        setClosing(false);
      }}
      onCancelClose={() => setClosing(false)}
    />
  );
}
export function InquiryContainer() {
  const id = useSearchParams().get('id');
  const load = useCallback(
    (signal: AbortSignal) => getInquiry(id as string, signal),
    [id]
  );
  const record = useAdminRecord(
    isUuid(id) ? load : null,
    '문의를 불러오지 못했어요.'
  );
  return (
    <RecordFrame
      title='문의'
      ready={!!record.data}
      loading={record.loading}
      error={record.error}
      notFound={record.notFound}
      notFoundBody='주소가 잘못됐거나 회원 탈퇴로 삭제된 문의예요. 목록에서 다시 골라 주세요.'
      backHref={ROUTES.INQUIRIES}
      backLabel='문의 목록'
      onRetry={record.reload}
    >
      {record.data && (
        <Inquiry
          key={record.data.id}
          inquiry={record.data}
          onChanged={record.apply}
        />
      )}
    </RecordFrame>
  );
}
