'use client';
import { useEffect, useRef, useState } from 'react';
import type { Photo } from '@/dto/album.dto';
import type { NotificationTarget } from '@/dto/notification-api.dto';
import { notificationTarget, readNotification } from '@/services/notifications';
import { originalPhoto, photoBlob, videoAccess } from '@/services/media-client';
import type { VideoLoader } from '@/dto/viewer.dto';
import { BLOCKS_CHANGED } from '@/services/blocks';
import {
  TARGET_GONE_AFTER_BLOCK,
  blockChangeOf,
  targetViewerAfterBlock,
  uploaderOf,
} from '@/utils/blocks';
import { isNotFound } from '@/utils/service-guidance';
import {
  notificationDestination,
  targetMediaKind,
} from '@/utils/notification-model';
export function useNotificationTarget() {
  const [viewer, setViewer] = useState<{
    photo: Photo;
    target: NotificationTarget;
    notificationId: string;
  } | null>(null);
  const [opening, setOpening] = useState(false),
    [error, setError] = useState('');
  const current = useRef<AbortController | null>(null),
    urls = useRef(new Set<string>());
  useEffect(() => {
    const objects = urls.current;
    return () => {
      current.current?.abort();
      objects.forEach(URL.revokeObjectURL);
      objects.clear();
    };
  }, []);
  function close() {
    current.current?.abort();
    urls.current.forEach(URL.revokeObjectURL);
    urls.current.clear();
    setViewer(null);
    setOpening(false);
    setError('');
  }
  // Resolves the target (null on failure). PHOTO/COMMENT open the viewer
  // here; ALBUM opens nothing and the caller moves to the album screen.
  // mediaKind: from the inbox row (/target does not say whether it is a
  // video); unknown opens the poster as a photo.
  async function open(
    id: string,
    markObserved = false,
    mediaKind: 'PHOTO' | 'VIDEO' = 'PHOTO'
  ): Promise<NotificationTarget | null> {
    close();
    const controller = new AbortController();
    current.current = controller;
    const signal = controller.signal;
    setOpening(true);
    setError('');
    try {
      const target = await notificationTarget(id, signal);
      const kind = targetMediaKind(target, mediaKind);
      if (notificationDestination(target).kind === 'album') {
        if (markObserved) await observe(id, target, signal);
        return target;
      }
      const blob = await photoBlob(
        target.groupId,
        target.albumId,
        target.photoId,
        signal
      );
      signal.throwIfAborted();
      const bitmap = await createImageBitmap(blob);
      const width = bitmap.width,
        height = bitmap.height;
      bitmap.close();
      signal.throwIfAborted();
      const src = URL.createObjectURL(blob);
      urls.current.add(src);
      // The ref is set now: the viewer's video loader runs (in a child
      // effect) before this hook's own effect would update it.
      viewerRef.current = {
        target,
        notificationId: id,
        photo: {
          id: target.photoId,
          albumId: target.albumId,
          src,
          width,
          height,
          alt: kind === 'VIDEO' ? '알림에서 연 동영상' : '알림에서 연 사진',
          mediaKind: kind,
          capturedAt: '',
          ...uploaderOf(target),
        },
      };
      setViewer(viewerRef.current);
      if (markObserved) await observe(id, target, signal);
      return target;
    } catch (error) {
      if (!signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : '사진을 열지 못했어요. 삭제되었거나 접근 권한이 바뀌었을 수 있어요.'
        );
      return null;
    } finally {
      if (!signal.aborted) setOpening(false);
    }
  }
  // Reads through the target's latestSequence (it may be newer than the row).
  async function observe(
    id: string,
    target: NotificationTarget,
    signal: AbortSignal
  ) {
    try {
      await readNotification(id, target.latestSequence, signal);
    } catch (cause) {
      if (!signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : '알림을 열었지만 읽음 상태를 저장하지 못했어요.'
        );
    }
  }
  const viewerRef = useRef(viewer);
  useEffect(() => {
    viewerRef.current = viewer;
  });
  useEffect(() => {
    // Comments/reactions reload inside the viewer itself; here the uploader
    // being blocked closes it, and any other block re-checks the target.
    const changed = (event: Event) => {
      const change = blockChangeOf(event),
        open = viewerRef.current,
        signal = current.current?.signal;
      if (!change || !open || !signal) return;
      const action = targetViewerAfterBlock(open.photo.authorId, change);
      if (action === 'close') close();
      if (action !== 'recheck') return;
      notificationTarget(open.notificationId, signal).catch((cause) => {
        if (signal.aborted || !isNotFound(cause)) return;
        close();
        setError(TARGET_GONE_AFTER_BLOCK);
      });
    };
    window.addEventListener(BLOCKS_CHANGED, changed);
    return () => window.removeEventListener(BLOCKS_CHANGED, changed);
  }, []);
  async function download() {
    const signal = current.current?.signal;
    if (!viewer || !signal) return;
    if (viewer.photo.mediaKind === 'VIDEO') {
      const access = await videoAccess(
        viewer.target.groupId,
        viewer.target.albumId,
        viewer.target.photoId,
        'download',
        signal
      );
      signal.throwIfAborted();
      const link = document.createElement('a');
      link.href = access.url;
      link.rel = 'noopener';
      document.body.append(link);
      link.click();
      link.remove();
      return;
    }
    const { blob, filename } = await originalPhoto(
      viewer.target.groupId,
      viewer.target.albumId,
      viewer.target.photoId,
      signal
    );
    signal.throwIfAborted();
    const src = URL.createObjectURL(blob);
    urls.current.add(src);
    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => {
      URL.revokeObjectURL(src);
      urls.current.delete(src);
    }, 1000);
  }
  // The open target's video plays from its own group/album.
  const loadVideo: VideoLoader = async (photo, signal) => {
    const open = viewerRef.current;
    if (!open || open.photo.id !== photo.id)
      throw new Error('알림 대상이 바뀌었어요.');
    return videoAccess(
      open.target.groupId,
      open.target.albumId,
      photo.id,
      'play',
      signal
    );
  };
  return { viewer, opening, error, open, close, download, loadVideo };
}
