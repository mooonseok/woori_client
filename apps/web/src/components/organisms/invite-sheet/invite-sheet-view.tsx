import type { RefObject, SyntheticEvent } from 'react';
import {
  Box,
  Button,
  Details,
  Dialog,
  Header,
  Heading,
  Image,
  Span,
  Summary,
  Text,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';

/** The one-time result of an issued invitation (shown only while open). */
export interface IssuedInvite {
  /** "10월 23일(목) 오후 3시까지 · 최대 10명" */
  expiry: string;
  url?: string;
  /** Display form, e.g. "K7MQ4-R9TXP". */
  code?: string;
  /** QR image data URL; empty while it is being drawn or if drawing failed. */
  qr: string;
}
export interface InviteSheetViewProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  titleRef: RefObject<HTMLHeadingElement | null>;
  /** The step's primary button (issue, then share). */
  primaryRef: RefObject<HTMLButtonElement | null>;
  ids: { title: string; lead: string; code: string };
  issued: IssuedInvite | null;
  /** Issuing request in flight (closing is blocked meanwhile). */
  issuing: boolean;
  /** Any request in flight (issue, copy, share). */
  pending: boolean;
  /** QR panel open on first render of step 2 (wide screens). */
  qrOpen: boolean;
  notice: string;
  error: string;
  onIssue: () => void;
  onShare: () => void;
  onCopyLink: () => void;
  onCopyCode: () => void;
  onRequestClose: () => void;
  onCancel: (event: SyntheticEvent<HTMLDialogElement>) => void;
  onDialogClose: (event: SyntheticEvent<HTMLDialogElement>) => void;
}

export function InviteSheetView({
  dialogRef,
  titleRef,
  primaryRef,
  ids,
  issued,
  issuing,
  pending,
  qrOpen,
  notice,
  error,
  onIssue,
  onShare,
  onCopyLink,
  onCopyCode,
  onRequestClose,
  onCancel,
  onDialogClose,
}: InviteSheetViewProps) {
  return (
    <Dialog
      ref={dialogRef}
      className='invite-sheet'
      aria-labelledby={ids.title}
      aria-describedby={ids.lead}
      onCancel={onCancel}
      onClose={onDialogClose}
    >
      <Box className='invite-sheet-handle' aria-hidden='true' />
      <Header className='invite-sheet-header'>
        <Heading
          ref={titleRef}
          id={ids.title}
          tabIndex={-1}
          className='invite-sheet-title'
        >
          함께할 사람 초대
        </Heading>
        <Button
          variant='icon'
          className='invite-sheet-close'
          aria-label='닫기'
          disabled={issuing}
          onClick={onRequestClose}
        >
          <Icon name='close' size={22} />
        </Button>
      </Header>

      {issued ? (
        <>
          <Text id={ids.lead} className='invite-sheet-meta'>
            <Icon name='clock' size={16} />
            <Span>{issued.expiry}</Span>
          </Text>
          {issued.url && (
            <Box className='invite-sheet-actions'>
              <Button
                ref={primaryRef}
                variant='primary'
                className='invite-sheet-primary'
                onClick={onShare}
              >
                <Icon name='share' size={20} />
                <Span>링크 공유하기</Span>
              </Button>
              <Button variant='secondary' onClick={onCopyLink}>
                링크 복사
              </Button>
              {/* Readable fallback when neither sharing nor copying works. */}
              <Text className='invite-sheet-url'>{issued.url}</Text>
            </Box>
          )}
          {issued.code && (
            <Box
              role='group'
              aria-labelledby={ids.code}
              className='invite-sheet-code'
            >
              <Box className='invite-sheet-code-text'>
                <Text id={ids.code} className='invite-sheet-code-label'>
                  초대 코드
                </Text>
                <Text className='invite-sheet-code-value'>{issued.code}</Text>
              </Box>
              <Button variant='secondary' onClick={onCopyCode}>
                코드 복사
              </Button>
            </Box>
          )}
          {issued.qr && (
            <Details className='invite-sheet-qr' open={qrOpen}>
              <Summary>
                <Span>QR 보기</Span>
                <Icon name='chevron-down' size={20} />
              </Summary>
              <Box className='invite-sheet-qr-image'>
                <Image
                  src={issued.qr}
                  width={168}
                  height={168}
                  alt='초대 링크 QR 코드'
                />
              </Box>
            </Details>
          )}
        </>
      ) : (
        <>
          <Text id={ids.lead} className='invite-sheet-lead'>
            링크나 코드를 받은 사람은 바로 참여할 수 있어요.
          </Text>
          <Text className='invite-sheet-meta'>
            <Icon name='clock' size={16} />
            <Span>만들면 3일 동안 · 최대 10명</Span>
          </Text>
          <Text className='invite-sheet-meta'>
            <Icon name='shield' size={16} />
            <Span>
              링크가 있으면 누구나 참여할 수 있어요. 아는 사람에게만 보내
              주세요.
            </Span>
          </Text>
          <Button
            ref={primaryRef}
            variant='primary'
            className='invite-sheet-primary invite-sheet-issue'
            disabled={pending}
            onClick={onIssue}
          >
            {issuing || pending ? '만들고 있어요…' : '초대 링크 만들기'}
          </Button>
        </>
      )}

      {error && (
        <Text role='alert' className='form-error invite-sheet-error'>
          {error}
        </Text>
      )}
      <Text role='status' className='invite-sheet-status'>
        {notice && (
          <>
            <Icon name='check' size={16} />
            <Span>{notice}</Span>
          </>
        )}
      </Text>
      {issued && (
        <Text className='invite-sheet-note'>
          이 링크는 지금만 보여요. 닫은 뒤 필요하면 새로 만들 수 있어요.
        </Text>
      )}
    </Dialog>
  );
}
