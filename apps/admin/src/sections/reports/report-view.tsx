import type { Ref } from 'react';
import {
  Box,
  Button,
  Dd,
  Dl,
  Dt,
  Fieldset,
  Heading,
  Input,
  Label,
  Legend,
  Section,
  Span,
  Text,
  Time,
  Title,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { BackLink } from '@/components/molecules/back-link';
import { Notice } from '@/components/molecules/notice';
import { ConfirmDialog } from '@/components/organisms/confirm-dialog/confirm-dialog';
import type { ReporterTextState } from '@/utils/report-actions';
export interface ReportTargetFact {
  label: string;
  value: string;
  dateTime?: string;
}
interface DialogCopy {
  title: string;
  consequences: readonly string[];
  confirmLabel: string;
  danger: boolean;
  acknowledge?: string;
}
interface Props {
  listHref: string;
  title: string;
  status: string;
  statusLabel: string;
  resolution: string;
  reasonLabel: string;
  reporterText: ReporterTextState;
  reporter: string;
  group: string;
  groupStatus: string;
  targetUser: string;
  targetUserStatus: string;
  openOnTarget: number;
  created: string;
  createdAt: string;
  resolved: string;
  resolvedAt: string;
  targetFacts: ReportTargetFact[];
  viewLabel: string;
  open: boolean;
  canReview: boolean;
  reviewing: boolean;
  message: string;
  error: string;
  dialog: DialogCopy | null;
  actionOptions: { value: string; label: string }[];
  action: string;
  reason: string;
  reasonError: string;
  reasonRef: Ref<HTMLInputElement>;
  acknowledged: boolean;
  onView: () => void;
  onReview: () => void;
  onDismiss: () => void;
  onResolve: () => void;
  onAction: (value: string) => void;
  onReason: (value: string) => void;
  onAcknowledge: (value: boolean) => void;
  onConfirm: () => Promise<void>;
  onCloseDialog: () => void;
}
// The ref is kept apart from the other props so render never reads it.
export function ReportView({ reasonRef, ...p }: Props) {
  return (
    <Section
      className='console-page console-page-detail'
      aria-labelledby='page-title'
    >
      <Box className='record-header'>
        <BackLink href={p.listHref} label='신고 목록' />
        <Box className='page-head'>
          <Title id='page-title' className='record-title'>
            {p.title}
          </Title>
          <Box className='meta-row'>
            <Span className='status-chip' data-status={p.status}>
              {p.statusLabel}
            </Span>
            {p.resolution && <Span className='muted'>{p.resolution}</Span>}
            <Span className='muted'>
              접수 <Time dateTime={p.createdAt}>{p.created}</Time>
            </Span>
            {p.resolved && (
              <Span className='muted'>
                종료 <Time dateTime={p.resolvedAt}>{p.resolved}</Time>
              </Span>
            )}
          </Box>
        </Box>
      </Box>
      {p.message && <Notice>{p.message}</Notice>}
      {p.error && <Notice tone='error'>{p.error}</Notice>}
      <Box className='card-grid'>
        <Section className='card' aria-labelledby='report-info'>
          <Heading id='report-info'>신고 내용</Heading>
          <Dl className='facts'>
            <Box>
              <Dt>사유</Dt>
              <Dd>{p.reasonLabel}</Dd>
            </Box>
            <Box>
              <Dt>신고자</Dt>
              <Dd>{p.reporter}</Dd>
            </Box>
            <Box>
              <Dt>그룹</Dt>
              <Dd>
                {p.group}
                {p.groupStatus && (
                  <Span className='muted'> ({p.groupStatus})</Span>
                )}
              </Dd>
            </Box>
          </Dl>
          <Heading className='sub-heading'>신고자가 적은 내용</Heading>
          {p.reporterText.kind === 'text' ? (
            <Text className='plain-text quote'>{p.reporterText.text}</Text>
          ) : (
            <Text className='muted'>
              {p.reporterText.kind === 'removed'
                ? '(탈퇴로 삭제됨)'
                : '(작성한 내용 없음)'}
            </Text>
          )}
        </Section>
        <Section className='card' aria-labelledby='report-target'>
          <Heading id='report-target'>신고 대상</Heading>
          <Dl className='facts'>
            <Box>
              <Dt>대상 회원</Dt>
              <Dd>
                {p.targetUser}
                {p.targetUserStatus && (
                  <Span className='status-chip' data-status='SUSPENDED'>
                    {p.targetUserStatus}
                  </Span>
                )}
              </Dd>
            </Box>
            {p.targetFacts.map((fact) => (
              <Box key={fact.label}>
                <Dt>{fact.label}</Dt>
                <Dd>
                  {fact.dateTime ? (
                    <Time dateTime={fact.dateTime}>{fact.value}</Time>
                  ) : (
                    fact.value
                  )}
                </Dd>
              </Box>
            ))}
            {p.openOnTarget > 1 && (
              <Box>
                <Dt>처리 대기</Dt>
                <Dd>같은 대상에 대한 신고 {p.openOnTarget}건</Dd>
              </Box>
            )}
          </Dl>
          {p.viewLabel && (
            <Button className='secondary-button' onClick={p.onView}>
              <Icon name='eye' size={18} />
              {p.viewLabel}
            </Button>
          )}
          {p.viewLabel && (
            <Text className='field-help'>
              열람 사유와 본인 확인이 필요하고, 열람 기록이 감사로그에 남아요.
            </Text>
          )}
        </Section>
      </Box>
      <Section
        className='card stack-form action-panel'
        aria-labelledby='report-actions'
      >
        <Heading id='report-actions'>처리</Heading>
        {p.open ? (
          <>
            <Text className='muted'>
              신고한 회원에게는 처리 상태(접수됨·검토 중·조치 완료·조치 없음)만
              보여요. 조치 사유는 감사로그에만 남아요.
            </Text>
            <Box className='inline-actions'>
              {p.canReview && (
                <Button
                  className='secondary-button'
                  aria-disabled={p.reviewing}
                  onClick={p.onReview}
                >
                  {p.reviewing ? '처리 중…' : '검토 시작'}
                </Button>
              )}
              <Button className='secondary-button' onClick={p.onDismiss}>
                조치 없음으로 종료
              </Button>
              <Button className='primary danger' onClick={p.onResolve}>
                조치하기
              </Button>
            </Box>
          </>
        ) : (
          <Notice>
            종료된 신고예요{p.resolution ? ` (${p.resolution})` : ''}. 종료한
            신고는 다시 바꿀 수 없어요.
          </Notice>
        )}
      </Section>
      {p.dialog && (
        <ConfirmDialog
          title={p.dialog.title}
          consequences={p.dialog.consequences}
          confirmLabel={p.dialog.confirmLabel}
          danger={p.dialog.danger}
          acknowledge={p.dialog.acknowledge}
          acknowledged={p.acknowledged}
          onAcknowledge={p.onAcknowledge}
          onConfirm={p.onConfirm}
          onClose={p.onCloseDialog}
        >
          {p.actionOptions.length > 1 && (
            <Fieldset className='choice-group'>
              <Legend>조치</Legend>
              {p.actionOptions.map((option) => (
                <Label key={option.value} className='choice'>
                  <Input
                    type='radio'
                    name='report-action'
                    checked={p.action === option.value}
                    onChange={() => p.onAction(option.value)}
                  />
                  {option.label}
                </Label>
              ))}
            </Fieldset>
          )}
          <Box className='field'>
            <Label htmlFor='report-reason'>사유 (감사로그에 남아요)</Label>
            <Input
              ref={reasonRef}
              id='report-reason'
              autoComplete='off'
              value={p.reason}
              aria-invalid={p.reasonError ? true : undefined}
              aria-describedby={
                p.reasonError ? 'report-reason-error' : undefined
              }
              onChange={(event) => p.onReason(event.target.value)}
            />
            {p.reasonError && (
              <Text id='report-reason-error' className='field-error'>
                {p.reasonError}
              </Text>
            )}
          </Box>
        </ConfirmDialog>
      )}
    </Section>
  );
}
