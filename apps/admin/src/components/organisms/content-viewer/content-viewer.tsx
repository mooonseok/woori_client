'use client';
import { useEffect, useId, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dd,
  Dialog,
  Dl,
  Dt,
  Form,
  Heading,
  Image,
  Input,
  Label,
  Text,
  Time,
  Video,
} from '@/components/atoms/ui';
import { Notice } from '@/components/molecules/notice';
import { REAUTH_WINDOW_MINUTES } from '@/constants/admin-auth';
import { VIEW_REASON_MAX, VIEW_REASON_MIN } from '@/constants/content-ops';
import { COMMENT_KIND_LABELS, labelOf } from '@/content/content-labels';
import type { ContentViewTarget } from '@/dto/content-view.dto';
import { useContentViewer } from '@/hooks/use-content-viewer';
import { kstDateTimeLabel } from '@/utils/time';
// Audited viewer for one member photo or comment (reports now, groups and
// albums later). Asks for a reason, runs through re-auth, shows the display
// image or plain comment text. No download, nothing cached or stored.
export function ContentViewer({
  target,
  onClose,
}: {
  target: ContentViewTarget;
  onClose: () => void;
}) {
  const viewer = useContentViewer(target);
  const dialog = useRef<HTMLDialogElement>(null),
    reasonInput = useRef<HTMLInputElement>(null);
  const titleId = useId(),
    reasonId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      el = dialog.current;
    el?.showModal();
    reasonInput.current?.focus();
    return () => {
      el?.close();
      queueMicrotask(() => {
        // The trigger may be gone (e.g. the record was closed): use main.
        const target = previous?.isConnected
          ? previous
          : document.getElementById('admin-main');
        target?.focus({ preventScroll: true });
      });
    };
  }, []);
  const noun =
    target.kind === 'photo'
      ? '사진'
      : target.kind === 'video'
        ? '동영상'
        : '댓글';
  const video = useRef<HTMLVideoElement>(null),
    [videoError, setVideoError] = useState(false);
  // Closing or expiring the grant stops playback and drops the API URL.
  useEffect(() => {
    const element = video.current;
    return () => {
      if (!element) return;
      element.pause();
      element.removeAttribute('src');
      element.load();
    };
  }, [viewer.videoUrl]);
  const comment = viewer.comment;
  return (
    <Dialog
      ref={dialog}
      className='console-dialog viewer-dialog'
      aria-labelledby={titleId}
      aria-busy={viewer.loading}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <Heading id={titleId}>{target.label}</Heading>
      <Notice tone='warning'>
        열람 기록이 남아요. 누가 언제 어떤 사유로 {noun}을 봤는지 감사로그에
        기록되고, 최근 {REAUTH_WINDOW_MINUTES}분 안에 본인 확인을 하지 않았다면
        비밀번호와 인증 코드를 다시 확인해요.
      </Notice>
      {!viewer.shown ? (
        <Form
          className='stack-form'
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            viewer.open();
          }}
        >
          <Box className='field'>
            <Label htmlFor={reasonId}>열람 사유</Label>
            <Input
              ref={reasonInput}
              id={reasonId}
              autoComplete='off'
              value={viewer.reason}
              readOnly={viewer.loading}
              aria-invalid={viewer.reasonError ? true : undefined}
              aria-describedby={`${reasonId}-help${
                viewer.reasonError ? ` ${reasonId}-error` : ''
              }`}
              onChange={(event) => viewer.setReason(event.target.value)}
            />
            <Text id={`${reasonId}-help`} className='field-help'>
              {VIEW_REASON_MIN}~{VIEW_REASON_MAX}자로 적어 주세요. 예: 신고 내용
              확인을 위한 열람
            </Text>
            {viewer.reasonError && (
              <Text id={`${reasonId}-error`} className='field-error'>
                {viewer.reasonError}
              </Text>
            )}
          </Box>
          {viewer.error && <Notice tone='error'>{viewer.error}</Notice>}
          <Box className='dialog-actions'>
            <Button className='secondary-button' onClick={onClose}>
              취소
            </Button>
            <Button
              type='submit'
              className='primary'
              aria-disabled={viewer.loading}
            >
              {viewer.loading ? '불러오는 중…' : `${noun} 보기`}
            </Button>
          </Box>
        </Form>
      ) : (
        <>
          {viewer.photoUrl && (
            <Box className='viewer-photo'>
              <Image
                src={viewer.photoUrl}
                alt={`${target.label} (표시용 이미지)`}
                draggable={false}
              />
            </Box>
          )}
          {viewer.videoUrl && (
            <Box className='viewer-photo'>
              <Video
                ref={video}
                src={viewer.videoUrl}
                controls
                crossOrigin='use-credentials'
                playsInline
                preload='metadata'
                // Viewing only: no download or picture-in-picture controls.
                controlsList='nodownload noremoteplayback'
                disablePictureInPicture
                onContextMenu={(event) => event.preventDefault()}
                onError={() => setVideoError(true)}
                aria-label={`${target.label} (변환된 동영상)`}
              />
            </Box>
          )}
          {videoError && (
            <Notice tone='error'>
              동영상을 재생하지 못했어요. 권한이나 열람 시간이 바뀌었을 수
              있어요. 닫고 다시 열람해 주세요.
            </Notice>
          )}
          {comment && (
            <Box className='viewer-comment'>
              <Dl className='facts'>
                <Box>
                  <Dt>작성자</Dt>
                  <Dd>{comment.author?.displayName ?? '탈퇴한 회원'}</Dd>
                </Box>
                <Box>
                  <Dt>종류</Dt>
                  <Dd>{labelOf(COMMENT_KIND_LABELS, comment.kind)}</Dd>
                </Box>
                <Box>
                  <Dt>작성일</Dt>
                  <Dd>
                    <Time dateTime={comment.createdAt}>
                      {kstDateTimeLabel(comment.createdAt)}
                    </Time>
                  </Dd>
                </Box>
                {comment.deletedAt && (
                  <Box>
                    <Dt>삭제됨</Dt>
                    <Dd>
                      <Time dateTime={comment.deletedAt}>
                        {kstDateTimeLabel(comment.deletedAt)}
                      </Time>
                    </Dd>
                  </Box>
                )}
              </Dl>
              <Text className='plain-text quote'>{comment.body}</Text>
            </Box>
          )}
          <Box className='dialog-actions'>
            <Button className='primary' onClick={onClose}>
              닫기
            </Button>
          </Box>
        </>
      )}
    </Dialog>
  );
}
