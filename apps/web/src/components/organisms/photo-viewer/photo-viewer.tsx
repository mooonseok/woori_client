'use client';
import { useEffect, useRef, useState } from 'react';
import type { PhotoViewerProps } from '@/dto/viewer.dto';
import {
  Box,
  Button,
  Dialog,
  Form,
  Heading,
  Text,
  Textarea,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { usePhotoInteractions } from '@/hooks/use-photo-interactions';
import { usePhotoViewer } from '@/hooks/use-photo-viewer';
import { useDisplayRenditions } from '@/hooks/use-display-renditions';
import { useVideoChrome } from '@/hooks/use-video-chrome';
import { useVideoSource } from '@/hooks/use-video-source';
import { usePhotoGestures } from '@/hooks/use-photo-gestures';
import { PinGuide } from '@/components/organisms/guide/pin-guide';
import { Guide } from '@/components/organisms/guide/guide';
import { PhotoStageView } from './photo-stage-view';
import { PhotoCommentsView } from './photo-comments-view';
import { ViewerToolbarView } from './viewer-toolbar-view';
import { ActionConfirm } from '@/components/organisms/action-confirm/action-confirm';
import { ViewerConfirm } from './viewer-confirm';
import { CaptureDateDialog } from './capture-date-dialog';
import { photoDateLabel } from '@/utils/photo-date';
import { useAuth } from '@/hooks/use-auth';
import { ReportDialog } from '@/components/organisms/report-dialog/report-dialog';
import type { ReportTarget } from '@/dto/report.dto';
import type { BlockSubject } from '@/dto/block.dto';
import { BlockConfirm } from '@/components/organisms/block-confirm/block-confirm';
import { BlockOffer } from '@/components/molecules/block-offer';
import { BLOCKED_MESSAGE, isOtherPerson } from '@/utils/blocks';
export function PhotoViewer(props: PhotoViewerProps) {
  return props.photos.length ? <PhotoViewerContainer {...props} /> : null;
}
function PhotoViewerContainer(props: PhotoViewerProps) {
  const [editingDate, setEditingDate] = useState(false);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const [blocking, setBlocking] = useState<BlockSubject | null>(null);
  const [notice, setNotice] = useState('');
  // Where focus returns after report/block flows that start from a comment.
  const flowTrigger = useRef<HTMLElement | null>(null);
  const { user } = useAuth();
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  const [deleting, setDeleting] = useState(false),
    [downloading, setDownloading] = useState(false),
    [downloadError, setDownloadError] = useState('');
  const menuButton = useRef<HTMLButtonElement>(null);
  const downloadLock = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const m = usePhotoViewer({
      ...props,
      onAddComment: (photoId, body, point) =>
        props.live
          ? interactions.add(body, point)
          : props.onAddComment(photoId, body, point),
    }),
    dialog = useRef<HTMLDialogElement>(null);
  const interactions = usePhotoInteractions(m.photo.id, !!props.live);
  // The video source stays behind the existing authenticated API.
  const video = useVideoSource(m.photo, props.loadVideo);
  const videoPausedByPanel = !!(
    m.panel ||
    m.more ||
    m.reacting ||
    m.guide ||
    m.confirm ||
    deleting ||
    editingDate ||
    reporting ||
    blocking
  );
  const videoChrome = useVideoChrome(
    m.photo.id,
    m.photo.mediaKind === 'VIDEO',
    videoPausedByPanel,
    m.setChrome
  );
  // Grid thumbnails stay on screen until the display rendition arrives.
  const stagePhotos = useDisplayRenditions(
    props.photos,
    m.index,
    props.loadDisplay,
    m.imageRetry,
    m.setFailedPhoto
  );
  const commentTargetOpened = useRef(false);
  useEffect(() => {
    if (
      !props.initialCommentId ||
      commentTargetOpened.current ||
      interactions.loading
    )
      return;
    commentTargetOpened.current = true;
    const comment = interactions.comments.find(
      (item) => item.id === props.initialCommentId
    );
    queueMicrotask(() => {
      if (comment?.point) {
        m.setSelectedPin(comment.id);
        m.setPins(true);
      } else m.setPanel(true);
    });
  }, [props.initialCommentId, interactions.loading, interactions.comments, m]);
  const g = usePhotoGestures({
    photo: m.photo,
    canPrevious: m.index > 0,
    canNext: m.index < props.photos.length - 1,
    disabled:
      m.guide === 'view' ||
      (m.guide === 'pin' && m.guideStep !== 1) ||
      !!m.confirm ||
      deleting ||
      editingDate ||
      !!reporting ||
      !!blocking ||
      m.savingComment ||
      m.mode === 'write',
    placing: m.mode === 'place',
    onTap: m.tap,
    onNavigate: m.navigate,
  });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = overflow;
      queueMicrotask(() => {
        const target = previous?.isConnected
          ? previous
          : document.querySelector<HTMLElement>('[data-photo-viewer-return]');
        target?.focus({ preventScroll: true });
      });
    };
  }, []);
  const comments = props.live
    ? interactions.comments
    : props.comments.filter((comment) => comment.photoId === m.photo.id);
  const reactions = props.reactions.filter(
    (reaction) => reaction.photoId === m.photo.id
  );
  const pin = comments.find((comment) => comment.id === m.selectedPin);
  // Only a known uploader who is not me can be reported or blocked.
  const uploader =
    props.live && isOtherPerson(m.photo.authorId, user?.id)
      ? { id: m.photo.authorId, name: m.photo.authorName || '올린 사람' }
      : null;
  // If the trigger vanished (comments reloaded after a 404), keep focus in the
  // viewer: the comments panel, else the photo menu button.
  const flowFallback = () =>
    dialog.current?.querySelector<HTMLElement>('.viewer-comments') ??
    menuButton.current;
  const startFlow = (from: 'photo' | 'comment') => {
    flowTrigger.current =
      from === 'photo'
        ? menuButton.current
        : (document.activeElement as HTMLElement | null);
  };
  return (
    <Dialog
      ref={dialog}
      className={`woori-viewer ${m.panel ? 'has-comments' : ''}`}
      aria-label={m.photo.mediaKind === 'VIDEO' ? '동영상 보기' : '사진 보기'}
      {...videoChrome.events}
      onCancel={(event) => {
        event.preventDefault();
        if (m.guide === 'pin') m.finishGuide('skipped');
        else if (m.more) m.setMore(false);
        else if (m.reacting) m.setReacting(false);
        else if (m.mode !== 'browse') m.cancelPin();
        else if (m.panel) m.setPanel(false);
        else m.requestClose();
      }}
      onKeyDown={g.onKeyDown}
    >
      <Box className='viewer-canvas'>
        <PhotoStageView
          model={m}
          gestures={g}
          photos={stagePhotos}
          comments={m.photo.mediaKind === 'VIDEO' ? [] : comments}
          video={video}
          videoPausedByPanel={videoPausedByPanel}
          onVideoPlaybackChange={videoChrome.playback}
        />
        <Box inert={m.guide === 'pin'}>
          <ViewerToolbarView
            model={m}
            gestures={g}
            menuButtonRef={menuButton}
            interactionsEnabled
            reactionSummary={props.live ? interactions : undefined}
            reactionPending={
              props.live && (interactions.pending || interactions.loading)
            }
            reactionError={props.live ? interactions.reactionError : ''}
            interactionError={props.live ? interactions.error : ''}
            onRetryInteractions={props.live ? interactions.reload : undefined}
            count={props.photos.length}
            downloading={downloading}
            downloadError={downloadError}
            onDownloadOriginal={
              props.onDownloadOriginal
                ? async () => {
                    if (downloadLock.current) return;
                    downloadLock.current = true;
                    setDownloading(true);
                    setDownloadError('');
                    try {
                      await props.onDownloadOriginal?.(m.photo);
                    } catch (e) {
                      if (mounted.current)
                        setDownloadError(
                          e instanceof Error
                            ? e.message
                            : '다운로드하지 못했어요. 다시 시도해 주세요.'
                        );
                    } finally {
                      downloadLock.current = false;
                      if (mounted.current) setDownloading(false);
                    }
                  }
                : undefined
            }
            onDelete={
              props.onDeletePhoto && m.photo.canDelete
                ? () => {
                    m.setMore(false);
                    setDeleting(true);
                  }
                : undefined
            }
            onEditCaptureDate={
              props.onSetCaptureDate && m.photo.canEditCaptureDate
                ? () => {
                    m.setMore(false);
                    setEditingDate(true);
                  }
                : undefined
            }
            uploaderLabel={
              props.live && m.photo.authorName
                ? m.photo.authorId === user?.id
                  ? `내가 올린 ${m.photo.mediaKind === 'VIDEO' ? '동영상' : '사진'}`
                  : `올린 사람 · ${m.photo.authorName}`
                : ''
            }
            onReport={
              uploader
                ? () => {
                    startFlow('photo');
                    m.setMore(false);
                    setReporting({
                      targetType: 'PHOTO',
                      targetId: m.photo.id,
                      name: '사진',
                      subject: uploader,
                    });
                  }
                : undefined
            }
            blockLabel={uploader ? `${uploader.name}님 차단` : undefined}
            onBlockUploader={
              uploader
                ? () => {
                    startFlow('photo');
                    m.setMore(false);
                    setBlocking(uploader);
                  }
                : undefined
            }
            comments={props.live ? interactions.commentTotal : comments.length}
            reactions={reactions}
            onReact={async (emoji) => {
              if (props.live) return interactions.react(emoji);
              props.onReact(m.photo.id, emoji);
              return true;
            }}
          />
        </Box>
        {pin && (
          <Box className='viewer-pin-bubble' data-viewer-interactive='true'>
            <Box>
              <Text>{pin.authorName}</Text>
              <Button
                aria-label='위치 댓글 닫기'
                onClick={() => m.setSelectedPin(null)}
              >
                <Icon name='close' size={18} />
              </Button>
            </Box>
            <Text>{pin.body}</Text>
          </Box>
        )}
        {m.mode === 'write' && (
          <Form
            className='viewer-pin-composer'
            onSubmit={(event) => {
              event.preventDefault();
              m.submitPin();
            }}
          >
            <Heading>이 자리에 한마디</Heading>
            <Textarea
              autoFocus
              aria-label='위치 댓글'
              placeholder='어떤 순간이었나요?'
              rows={2}
              value={m.pinText}
              disabled={m.savingComment}
              onChange={(event) => m.setPinText(event.target.value)}
              maxLength={2000}
            />
            {m.commentError && <Text role='alert'>{m.commentError}</Text>}
            <Box>
              <Text>사진에서 선택한 위치에 남겨져요.</Text>
              <Button
                type='submit'
                disabled={
                  m.savingComment ||
                  interactions.loading ||
                  interactions.pending ||
                  !m.pinText.trim()
                }
              >
                {m.savingComment ? '저장 중…' : '등록'}
              </Button>
            </Box>
          </Form>
        )}
      </Box>
      {m.panel && (
        <PhotoCommentsView
          mediaKind={m.photo.mediaKind}
          key={m.photo.id}
          comments={comments}
          loading={props.live ? interactions.loading : false}
          pending={
            m.savingComment || (props.live ? interactions.pending : false)
          }
          error={props.live ? interactions.error : ''}
          submitError={m.commentError}
          total={props.live ? interactions.commentTotal : comments.length}
          hasMore={props.live ? !!interactions.nextCursor : false}
          onReload={props.live ? interactions.reload : undefined}
          onMore={props.live ? interactions.more : undefined}
          onEdit={props.live ? interactions.edit : undefined}
          onDelete={props.live ? interactions.remove : undefined}
          currentUserId={user?.id}
          onReport={
            props.live
              ? (comment) => {
                  startFlow('comment');
                  setReporting({
                    targetType: 'COMMENT',
                    targetId: comment.id,
                    name: `${comment.authorName}님의 댓글`,
                    subject: { id: comment.authorId, name: comment.authorName },
                  });
                }
              : undefined
          }
          onBlock={
            props.live
              ? (comment) => {
                  startFlow('comment');
                  setBlocking({
                    id: comment.authorId,
                    name: comment.authorName,
                  });
                }
              : undefined
          }
          draft={m.drafts[m.photo.id] || ''}
          onChange={(value) =>
            m.setDrafts((current) => ({ ...current, [m.photo.id]: value }))
          }
          onSubmit={m.submitComment}
          onClose={() => m.setPanel(false)}
          onPin={(id) => {
            g.reset();
            m.setSelectedPin(id);
            m.setPins(true);
            m.setPanel(false);
          }}
          photoDescription={`${photoDateLabel(m.photo.effectiveDate || m.photo.capturedAt, m.photo.dateSource).replaceAll('사진', m.photo.mediaKind === 'VIDEO' ? '동영상' : '사진')} · ${m.photo.alt}`}
        />
      )}
      {editingDate && props.onSetCaptureDate && (
        <CaptureDateDialog
          photo={m.photo}
          onSave={(date) => props.onSetCaptureDate!(m.photo, date)}
          onClose={() => setEditingDate(false)}
        />
      )}
      {deleting && props.onDeletePhoto && (
        <ActionConfirm
          title={
            m.photo.mediaKind === 'VIDEO'
              ? '동영상을 삭제할까요?'
              : '사진을 삭제할까요?'
          }
          description={
            m.photo.mediaKind === 'VIDEO'
              ? '모든 구성원에게서 이 동영상이 삭제돼요. 변환한 동영상과 썸네일도 정리되며 되돌릴 수 없어요.'
              : '모든 구성원에게서 이 사진이 삭제돼요. 원본과 썸네일도 정리되며 되돌릴 수 없어요.'
          }
          returnFocus={menuButton}
          onConfirm={() => props.onDeletePhoto!(m.photo)}
          onClose={() => setDeleting(false)}
        />
      )}
      {reporting && (
        <ReportDialog
          key={`${reporting.targetType}:${reporting.targetId}`}
          target={reporting}
          returnFocus={flowTrigger}
          fallbackFocus={flowFallback}
          onTargetGone={() => void interactions.reload()}
          onClose={() => setReporting(null)}
          followUp={(_, close) => {
            const subject = reporting.subject;
            return subject && isOtherPerson(subject.id, user?.id) ? (
              <BlockOffer
                name={subject.name}
                onBlock={() => {
                  close();
                  setBlocking(subject);
                }}
              />
            ) : null;
          }}
        />
      )}
      {blocking && (
        <BlockConfirm
          key={blocking.id}
          person={blocking}
          returnFocus={flowTrigger}
          fallbackFocus={flowFallback}
          // If the photo on screen was theirs, the gallery closes the viewer;
          // otherwise confirm in place (the app toast sits under the viewer).
          onDone={() => setNotice(BLOCKED_MESSAGE)}
          onClose={() => setBlocking(null)}
        />
      )}
      {notice && (
        <Text className='viewer-block-status' role='status'>
          {notice}
        </Text>
      )}
      {m.guide === 'view' && <Guide kind='view' onClose={m.finishGuide} />}
      {m.guide === 'pin' && (
        <PinGuide
          step={m.guideStep}
          photo={stagePhotos[m.index]}
          point={m.point}
          onNext={m.nextGuide}
          onPrevious={m.previousGuide}
          onClose={() => m.finishGuide('skipped')}
        />
      )}

      {m.confirm && (
        <ViewerConfirm
          count={m.confirm === 'pin' ? 1 : m.draftCount}
          onCancel={() => m.setConfirm(null)}
          onDiscard={m.discard}
        />
      )}
    </Dialog>
  );
}
