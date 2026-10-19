import type { RefObject } from 'react';
import {
  Anchor,
  Box,
  Button,
  Footer,
  Header,
  Span,
  Text,
} from '@/components/atoms/ui';
import { REACTION_OPTIONS } from '@/constants/reactions';
import { ReactionIcon } from '@/components/atoms/reaction-icon';
import { ReactionFan } from '@/components/molecules/reaction-fan';
import { Icon } from '@/components/atoms/icon';
import { photoDateLabel } from '@/utils/photo-date';
import type { ReactionSummary } from '@/dto/photo-interactions.dto';
import type { Reaction } from '@/dto/album.dto';
import type { PhotoViewerModel, PhotoGestureModel } from '@/dto/viewer-ui.dto';
interface Props {
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  downloading: boolean;
  downloadError: string;
  onDownloadOriginal?: () => Promise<void>;
  onDelete?: () => void;
  onEditCaptureDate?: () => void;
  onReport?: () => void;
  onBlockUploader?: () => void;
  uploaderLabel?: string;
  blockLabel?: string;
  interactionsEnabled: boolean;
  model: PhotoViewerModel;
  gestures: PhotoGestureModel;
  count: number;
  comments: number;
  reactions: Reaction[];
  reactionSummary?: ReactionSummary;
  reactionPending?: boolean;
  reactionError?: string;
  interactionError?: string;
  onRetryInteractions?: () => void;
  onReact(emoji: string): Promise<boolean>;
}
export function ViewerToolbarView({
  interactionsEnabled,
  menuButtonRef,
  downloading,
  downloadError,
  onDownloadOriginal,
  onDelete,
  onEditCaptureDate,
  onReport,
  onBlockUploader,
  uploaderLabel,
  blockLabel,
  model: m,
  gestures: g,
  count,
  comments,
  reactions,
  onReact,
  reactionSummary,
  reactionPending,
  reactionError,
  interactionError,
  onRetryInteractions,
}: Props) {
  const active = m.chrome || m.mode !== 'browse';
  const video = m.photo.mediaKind === 'VIDEO';
  const mine = reactionSummary
    ? reactionSummary.myReaction
    : reactions.find((reaction) => reaction.userId === 'me')?.emoji;
  const total = reactionSummary ? reactionSummary.total : reactions.length;
  const counts =
    reactionSummary?.reactions ??
    REACTION_OPTIONS.map((item) => ({
      emoji: item.emoji,
      count: reactions.filter((r) => r.emoji === item.emoji).length,
    }));
  const reactionLabel = counts
    .filter((item) => item.count > 0)
    .map(
      (item) =>
        `${REACTION_OPTIONS.find((option) => option.emoji === item.emoji)?.label ?? '반응'} ${item.count}`
    )
    .join(', ');

  return (
    <>
      <Header
        className={`viewer-toolbar viewer-top ${active ? 'is-visible' : ''}`}
        inert={!active}
      >
        {m.mode === 'browse' ? (
          <>
            <Button
              aria-label={video ? '동영상 보기 닫기' : '사진 보기 닫기'}
              onClick={m.requestClose}
            >
              <Icon name='close' />
            </Button>
            <Text aria-live='polite'>
              {m.index + 1} / {count}
            </Text>
            {interactionsEnabled && (
              <Button
                aria-label={video ? '동영상 정보와 댓글' : '사진 정보와 댓글'}
                onClick={() => m.setPanel(!m.panel)}
              >
                <Icon name='info' />
              </Button>
            )}
            <Button
              ref={menuButtonRef}
              aria-label={video ? '동영상 메뉴' : '사진 메뉴'}
              aria-expanded={m.more}
              onClick={() => m.setMore(!m.more)}
            >
              <Icon name='more' />
            </Button>
          </>
        ) : (
          <>
            <Button onClick={m.cancelPin}>취소</Button>
            <Text>
              {m.mode === 'place'
                ? '이야기를 남길 곳을 눌러 주세요'
                : '선택한 위치에 한마디'}
            </Text>
          </>
        )}
      </Header>
      <Footer
        className={`viewer-toolbar viewer-bottom ${active && m.mode === 'browse' ? 'is-visible' : ''}`}
        inert={!active || m.mode !== 'browse'}
      >
        {interactionsEnabled && (
          <>
            <Button
              onClick={() => {
                m.setReacting(!m.reacting);
                m.setMore(false);
              }}
              aria-label={`반응 ${total}개${reactionLabel ? `: ${reactionLabel}` : ''}. 반응 고르기`}
              aria-expanded={m.reacting}
            >
              <ReactionFan reactions={counts} mine={mine} />
              {total > 0 && <Span>{total}</Span>}
            </Button>
            <Button onClick={() => m.setPanel(!m.panel)}>
              <Icon name='comment' />
              <Span>{comments || '댓글'}</Span>
            </Button>
            {/* A position on a playing video has no fixed meaning: no pins. */}
            {!video && (
              <Button onClick={m.startPin}>
                <Icon name='pin' />
                <Span>위치 댓글</Span>
              </Button>
            )}
          </>
        )}
        {!onDownloadOriginal && !video && (
          <Anchor
            href={m.photo.src}
            download={`woori-${m.photo.id}.jpg`}
            aria-label={
              interactionsEnabled ? '사진 다운로드' : '화면 사진 저장'
            }
          >
            <Icon name='download' />
          </Anchor>
        )}
      </Footer>
      {interactionError && (
        <Box className='viewer-interaction-status' role='alert'>
          <Text>{interactionError}</Text>
          <Button onClick={onRetryInteractions}>다시 불러오기</Button>
        </Box>
      )}
      {reactionError && (
        <Box className='viewer-interaction-status' role='alert'>
          <Text>{reactionError}</Text>
          <Button onClick={() => m.setReacting(true)}>반응 다시 선택</Button>
        </Box>
      )}
      {m.reacting && (
        <Box className='viewer-reactions' role='group' aria-label='반응 선택'>
          <Text className='viewer-reaction-hint'>
            {reactionPending
              ? '저장 중…'
              : '선택한 반응을 다시 누르면 취소돼요.'}
          </Text>
          {REACTION_OPTIONS.map((item) => (
            <Button
              key={item.emoji}
              aria-label={item.label}
              aria-pressed={mine === item.emoji}
              disabled={reactionPending}
              onClick={() => {
                void onReact(item.emoji).then((saved) => {
                  if (saved) m.setReacting(false);
                });
              }}
            >
              <ReactionIcon emoji={item.emoji} size={26} />
              <Span className='viewer-reaction-count'>
                {reactionSummary
                  ? reactionSummary.reactions.find(
                      (r) => r.emoji === item.emoji
                    )?.count || 0
                  : reactions.filter((r) => r.emoji === item.emoji).length}
              </Span>
            </Button>
          ))}
        </Box>
      )}
      {m.more && (
        <Box
          className='viewer-menu'
          role='group'
          aria-label={video ? '동영상 메뉴' : '사진 메뉴'}
        >
          {uploaderLabel && (
            <Text className='muted memory-date-note'>{uploaderLabel}</Text>
          )}
          {m.photo.capturedAt && (
            <Text className='muted memory-date-note'>
              {photoDateLabel(
                m.photo.effectiveDate || m.photo.capturedAt,
                m.photo.dateSource
              ).replaceAll('사진', video ? '동영상' : '사진')}
            </Text>
          )}
          {onDownloadOriginal && (
            <Button
              disabled={downloading}
              onClick={() => void onDownloadOriginal()}
            >
              <Icon name='download' />
              {downloading
                ? '받는 중…'
                : video
                  ? '동영상 다운로드'
                  : '원본 다운로드'}
            </Button>
          )}
          {onDownloadOriginal && (
            <Text className='muted memory-date-note'>
              {video
                ? '서버에서 변환한 MP4 파일로 받아요. 촬영 위치 정보는 지워져 있어요.'
                : '원본에는 촬영 위치(GPS) 등 사진 정보가 포함될 수 있어요. 다른 곳에 공유할 때 확인해 주세요.'}
            </Text>
          )}
          {downloadError && (
            <Text role='alert' className='viewer-download-error'>
              {downloadError}
            </Text>
          )}
          {onEditCaptureDate && (
            <Button disabled={downloading} onClick={onEditCaptureDate}>
              촬영일 수정
            </Button>
          )}
          {onDelete && (
            <Button
              className='danger-text'
              disabled={downloading}
              onClick={onDelete}
            >
              {video ? '동영상 삭제' : '사진 삭제'}
            </Button>
          )}
          {onReport && (
            <Button disabled={downloading} onClick={onReport}>
              <Icon name='flag' />
              {video ? '동영상 신고' : '사진 신고'}
            </Button>
          )}
          {onBlockUploader && (
            <Button disabled={downloading} onClick={onBlockUploader}>
              <Icon name='eye-off' />
              {blockLabel || '올린 사람 차단'}
            </Button>
          )}
          {!video && (
            <>
              <Button onClick={() => g.zoom(1.5)}>
                <Icon name='zoom-in' />
                확대
              </Button>
              <Button onClick={() => g.zoom(1 / 1.5)}>
                <Icon name='zoom-out' />
                축소
              </Button>
              <Button onClick={() => g.reset()}>화면에 맞추기</Button>
            </>
          )}
          {interactionsEnabled && !video && (
            <Button
              onClick={() => {
                m.setPins(!m.pins);
                m.setMore(false);
              }}
            >
              <Icon name={m.pins ? 'eye-off' : 'eye'} />
              위치 댓글 핀 {m.pins ? '숨기기' : '보이기'}
            </Button>
          )}
          {!video && (
            <Button onClick={() => m.openGuide('view')}>
              사진 감상 사용법
            </Button>
          )}
          {interactionsEnabled && !video && (
            <Button onClick={() => m.openGuide('pin')}>위치 댓글 사용법</Button>
          )}
        </Box>
      )}
      {active && m.mode === 'browse' && (
        <Box className={`viewer-desktop-arrows ${video ? 'is-video' : ''}`}>
          <Button
            disabled={!m.index}
            aria-label='이전 사진·동영상'
            onClick={() => g.navigate(-1)}
          >
            <Icon name='chevron-left' />
          </Button>
          <Button
            disabled={m.index >= count - 1}
            aria-label='다음 사진·동영상'
            onClick={() => g.navigate(1)}
          >
            <Icon name='chevron-right' />
          </Button>
        </Box>
      )}
    </>
  );
}
