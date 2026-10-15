import type { FormEvent } from 'react';
import {
  Box,
  Button,
  Fieldset,
  Form,
  Heading,
  Input,
  Label,
  Legend,
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
import type {
  NoticeFieldErrors,
  NoticeStatus,
  NoticeVisibility,
} from '@/dto/notice.dto';
interface ConfirmCopy {
  title: string;
  consequences: readonly string[];
  confirmLabel: string;
  danger: boolean;
}
interface Props {
  isNew: boolean;
  status: NoticeStatus | null;
  statusLabel: string;
  visibility: NoticeVisibility;
  visibilityLabel: string;
  published: string;
  publishedAt: string;
  updated: string;
  updatedAt: string;
  title: string;
  body: string;
  titleCount: number;
  bodyCount: number;
  titleMax: number;
  bodyMax: number;
  errors: NoticeFieldErrors;
  saving: boolean;
  dirty: boolean;
  message: string;
  error: string;
  mode: 'now' | 'later';
  when: string;
  whenMin: string;
  whenMax: string;
  whenError: string;
  maxDays: number;
  confirm: ConfirmCopy | null;
  listHref: string;
  onTitle: (value: string) => void;
  onBody: (value: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onMode: (value: 'now' | 'later') => void;
  onWhen: (value: string) => void;
  onPublish: () => void;
  onArchive: () => void;
  onConfirm: () => Promise<void>;
  onCloseConfirm: () => void;
}
const describe = (...ids: (string | false)[]) =>
  ids.filter(Boolean).join(' ') || undefined;
export function NoticeEditorView(props: Props) {
  const { isNew, status, visibility, errors } = props;
  const canPublish = !isNew && visibility !== 'visible';
  return (
    <Section className='console-page' aria-labelledby='page-title'>
      <BackLink href={props.listHref} label='공지 목록' />
      <Box className='page-head'>
        <Title id='page-title'>{isNew ? '새 공지' : '공지 편집'}</Title>
        {!isNew && (
          <Box className='meta-row'>
            <Span className='status-chip' data-status={status ?? undefined}>
              {props.statusLabel}
            </Span>
            <Span className='visibility' data-visibility={visibility}>
              {props.visibilityLabel}
            </Span>
            {props.published && (
              <Span className='muted'>
                게시 <Time dateTime={props.publishedAt}>{props.published}</Time>
              </Span>
            )}
            <Span className='muted'>
              마지막 수정{' '}
              <Time dateTime={props.updatedAt}>{props.updated}</Time>
            </Span>
          </Box>
        )}
        <Text className='muted'>
          {isNew
            ? '먼저 초안으로 저장한 뒤 게시하거나 예약해요. 초안은 회원에게 보이지 않아요.'
            : '본문은 회원에게 입력한 그대로(줄바꿈 포함) 글자로만 보여요.'}
        </Text>
      </Box>
      {props.message && <Notice>{props.message}</Notice>}
      {props.error && <Notice tone='error'>{props.error}</Notice>}
      <Form
        className='card stack-form'
        onSubmit={props.onSave}
        aria-busy={props.saving}
        noValidate
      >
        <Heading>내용</Heading>
        {visibility === 'visible' && (
          <Notice tone='warning'>
            게시 중인 공지예요. 저장하면 회원에게 바로 반영되고 수정일이
            표시돼요.
          </Notice>
        )}
        <Box className='field'>
          <Label htmlFor='notice-title'>제목</Label>
          <Input
            id='notice-title'
            autoComplete='off'
            value={props.title}
            readOnly={props.saving}
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={describe(
              'notice-title-count',
              !!errors.title && 'notice-title-error'
            )}
            onChange={(event) => props.onTitle(event.target.value)}
          />
          <Text id='notice-title-count' className='field-help counter'>
            {props.titleCount} / {props.titleMax}자
          </Text>
          {errors.title && (
            <Text id='notice-title-error' className='field-error'>
              {errors.title}
            </Text>
          )}
        </Box>
        <Box className='field'>
          <Label htmlFor='notice-body'>본문</Label>
          <Textarea
            id='notice-body'
            rows={14}
            value={props.body}
            readOnly={props.saving}
            aria-invalid={errors.body ? true : undefined}
            aria-describedby={describe(
              'notice-body-count',
              !!errors.body && 'notice-body-error'
            )}
            onChange={(event) => props.onBody(event.target.value)}
          />
          <Text id='notice-body-count' className='field-help counter'>
            {props.bodyCount.toLocaleString('ko-KR')} /{' '}
            {props.bodyMax.toLocaleString('ko-KR')}자
          </Text>
          {errors.body && (
            <Text id='notice-body-error' className='field-error'>
              {errors.body}
            </Text>
          )}
        </Box>
        <Button type='submit' className='primary' aria-disabled={props.saving}>
          {props.saving ? '저장 중…' : isNew ? '초안 저장' : '변경 저장'}
        </Button>
      </Form>
      {canPublish && (
        <Section className='card stack-form' aria-labelledby='publish-title'>
          <Heading id='publish-title'>
            {visibility === 'scheduled' ? '예약 바꾸기' : '게시'}
          </Heading>
          <Fieldset className='choice-group'>
            <Legend>게시 시점</Legend>
            <Label className='choice'>
              <Input
                type='radio'
                name='publish-mode'
                checked={props.mode === 'now'}
                onChange={() => props.onMode('now')}
              />
              지금 게시
            </Label>
            <Label className='choice'>
              <Input
                type='radio'
                name='publish-mode'
                checked={props.mode === 'later'}
                onChange={() => props.onMode('later')}
              />
              예약 게시
            </Label>
          </Fieldset>
          {props.mode === 'later' && (
            <Box className='field'>
              <Label htmlFor='notice-when'>게시 날짜와 시각 (KST)</Label>
              <Input
                id='notice-when'
                type='datetime-local'
                step={60}
                min={props.whenMin}
                max={props.whenMax}
                value={props.when}
                aria-invalid={props.whenError ? true : undefined}
                aria-describedby={describe(
                  'notice-when-help',
                  !!props.whenError && 'notice-when-error'
                )}
                onChange={(event) => props.onWhen(event.target.value)}
              />
              <Text id='notice-when-help' className='field-help'>
                한국 시간 기준이에요. 지금부터 {props.maxDays}일 이내로 고를 수
                있어요.
              </Text>
              {props.whenError && (
                <Text id='notice-when-error' className='field-error'>
                  {props.whenError}
                </Text>
              )}
            </Box>
          )}
          {props.dirty && (
            <Notice tone='warning'>
              저장하지 않은 변경이 있어요. 게시 전에 먼저 저장해 주세요.
            </Notice>
          )}
          <Button
            className='primary'
            aria-disabled={props.dirty}
            onClick={props.onPublish}
          >
            {props.mode === 'later' ? '예약하기' : '지금 게시'}
          </Button>
        </Section>
      )}
      {!isNew && status !== 'ARCHIVED' && (
        <Section className='card stack-form' aria-labelledby='archive-title'>
          <Heading id='archive-title'>보관</Heading>
          <Text className='muted'>
            보관하면 회원에게 보이지 않아요. 공지는 삭제되지 않고 다시 게시할 수
            있어요.
          </Text>
          <Button
            className='secondary-button danger-text'
            onClick={props.onArchive}
          >
            보관하기
          </Button>
        </Section>
      )}
      {props.confirm && (
        <ConfirmDialog
          title={props.confirm.title}
          consequences={props.confirm.consequences}
          confirmLabel={props.confirm.confirmLabel}
          danger={props.confirm.danger}
          onConfirm={props.onConfirm}
          onClose={props.onCloseConfirm}
        />
      )}
    </Section>
  );
}
