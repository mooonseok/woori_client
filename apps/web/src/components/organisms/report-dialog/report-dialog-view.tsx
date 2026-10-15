import type { FormEvent, ReactNode, RefObject } from 'react';
import {
  Box,
  Button,
  Dialog,
  Fieldset,
  Form,
  Heading,
  Input,
  Label,
  Legend,
  Span,
  Text,
  Textarea,
} from '@/components/atoms/ui';
import type { ReportReason } from '@/dto/report.dto';
interface Props {
  dialogRef: RefObject<HTMLDialogElement | null>;
  firstReasonRef: RefObject<HTMLInputElement | null>;
  doneRef: RefObject<HTMLButtonElement | null>;
  ids: { title: string; notice: string; detail: string; count: string };
  title: string;
  policyNotice: string;
  visibilityNotice: string;
  reasons: { value: ReportReason; label: string }[];
  reason: ReportReason | '';
  detail: string;
  detailMax: number;
  // Unicode code points, the unit the server limits.
  detailCount: number;
  detailError?: string;
  error: string;
  pending: boolean;
  blocked: boolean;
  canSubmit: boolean;
  done: { duplicate: boolean; statusLabel: string } | null;
  // Follow-up action (e.g. 차단하기) shown after a report.
  followUp?: ReactNode;
  onReason: (reason: ReportReason) => void;
  onDetail: (detail: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}
export function ReportDialogView({
  dialogRef,
  firstReasonRef,
  doneRef,
  ids,
  title,
  policyNotice,
  visibilityNotice,
  reasons,
  reason,
  detail,
  detailMax,
  detailCount,
  detailError,
  error,
  pending,
  blocked,
  canSubmit,
  done,
  followUp,
  onReason,
  onDetail,
  onSubmit,
  onClose,
}: Props) {
  return (
    <Dialog
      ref={dialogRef}
      className='entry-dialog report-dialog'
      aria-labelledby={ids.title}
      aria-describedby={ids.notice}
      aria-busy={pending}
      // Keep viewer shortcuts (arrows, Escape) from acting behind the dialog.
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!pending) onClose();
      }}
    >
      {done ? (
        <Box className='report-done'>
          <Heading id={ids.title}>
            {done.duplicate ? '이미 신고한 대상이에요' : '신고 완료'}
          </Heading>
          <Text id={ids.notice} role='status'>
            {done.duplicate
              ? `현재 상태: ${done.statusLabel}`
              : '신고를 접수했어요. 운영자가 확인해요.'}
          </Text>
          <Text className='field-help'>{visibilityNotice}</Text>
          {followUp}
          <Box className='management-confirm-actions'>
            <Button ref={doneRef} className='primary' onClick={onClose}>
              닫기
            </Button>
          </Box>
        </Box>
      ) : (
        <Form className='report-form' noValidate onSubmit={onSubmit}>
          <Heading id={ids.title}>{title}</Heading>
          <Text id={ids.notice} className='notice-panel'>
            {policyNotice}
          </Text>
          <Fieldset className='report-reasons' disabled={pending || blocked}>
            <Legend>신고 사유</Legend>
            {reasons.map((option, index) => (
              <Label key={option.value} className='report-reason'>
                <Input
                  ref={index === 0 ? firstReasonRef : undefined}
                  type='radio'
                  name='report-reason'
                  value={option.value}
                  required
                  checked={reason === option.value}
                  onChange={() => onReason(option.value)}
                />
                <Span>{option.label}</Span>
              </Label>
            ))}
          </Fieldset>
          <Box className='report-detail'>
            <Label htmlFor={ids.detail}>추가 설명 (선택)</Label>
            <Textarea
              id={ids.detail}
              className='field'
              rows={4}
              value={detail}
              disabled={pending || blocked}
              aria-invalid={!!detailError}
              aria-describedby={`${ids.detail}-help ${ids.count}${detailError ? ` ${ids.detail}-error` : ''}`}
              onChange={(event) => onDetail(event.target.value)}
            />
            <Box className='report-detail-help'>
              <Text id={`${ids.detail}-help`} className='field-help'>
                비밀번호나 인증 링크 같은 민감한 정보는 적지 마세요.
              </Text>
              <Text id={ids.count} className='field-help report-count'>
                {detailCount.toLocaleString('ko-KR')} / {detailMax}자
              </Text>
            </Box>
            {detailError && (
              <Text id={`${ids.detail}-error`} className='form-error'>
                {detailError}
              </Text>
            )}
          </Box>
          {error && (
            <Text className='error-notice' role='alert'>
              {error}
            </Text>
          )}
          <Box className='management-confirm-actions'>
            <Button
              className='secondary-button'
              disabled={pending}
              onClick={onClose}
            >
              {blocked ? '닫기' : '취소'}
            </Button>
            {!blocked && (
              <Button type='submit' className='primary' disabled={!canSubmit}>
                {pending ? '보내는 중…' : '신고하기'}
              </Button>
            )}
          </Box>
          {!reason && !blocked && (
            <Text className='field-help'>사유를 고르면 신고할 수 있어요.</Text>
          )}
        </Form>
      )}
    </Dialog>
  );
}
