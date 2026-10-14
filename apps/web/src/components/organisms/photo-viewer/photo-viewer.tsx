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
import { usePhotoGestures } from '@/hooks/use-photo-gestures';
import { Guide } from '@/components/organisms/guide/guide';
import { PhotoStageView } from './photo-stage-view';
import { PhotoCommentsView } from './photo-comments-view';
import { ViewerToolbarView } from './viewer-toolbar-view';
import { ActionConfirm } from '@/components/organisms/action-confirm/action-confirm';
import { ViewerConfirm } from './viewer-confirm';
export function PhotoViewer(props: PhotoViewerProps) {
  return props.photos.length ? <PhotoViewerContainer {...props} /> : null;
}
function PhotoViewerContainer(props: PhotoViewerProps) {
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
      !!m.guide ||
      !!m.confirm ||
      deleting ||
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
  return (
    <Dialog
      ref={dialog}
      className={`woori-viewer ${m.panel ? 'has-comments' : ''}`}
      aria-label='사진 보기'
      onCancel={(event) => {
        event.preventDefault();
        if (m.more) m.setMore(false);
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
          photos={props.photos}
          comments={comments}
        />
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
          comments={props.live ? interactions.commentTotal : comments.length}
          reactions={reactions}
          onReact={async (emoji) => {
            if (props.live) return interactions.react(emoji);
            props.onReact(m.photo.id, emoji);
            return true;
          }}
        />
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
          photoDescription={`${m.photo.capturedAt} · ${m.photo.alt}`}
        />
      )}
      {deleting && props.onDeletePhoto && (
        <ActionConfirm
          title='사진을 삭제할까요?'
          description='모든 구성원에게서 이 사진이 삭제돼요. 원본과 썸네일도 정리되며 되돌릴 수 없어요.'
          returnFocus={menuButton}
          onConfirm={() => props.onDeletePhoto!(m.photo)}
          onClose={() => setDeleting(false)}
        />
      )}
      {m.guide && <Guide kind={m.guide} onClose={m.finishGuide} />}
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
