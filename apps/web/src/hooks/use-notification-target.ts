'use client';
import { useEffect, useRef, useState } from 'react';
import type { Photo } from '@/dto/album.dto';
import type { NotificationTarget } from '@/dto/notification-api.dto';
import { notificationTarget, readNotification } from '@/services/notifications';
import { originalPhoto, photoBlob } from '@/services/media-client';
import { BLOCKS_CHANGED } from '@/services/blocks';
import {
  TARGET_GONE_AFTER_BLOCK,
  blockChangeOf,
  targetViewerAfterBlock,
  uploaderOf,
} from '@/utils/blocks';
import { isNotFound } from '@/utils/service-guidance';
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
  async function open(id: string, markObserved = false) {
    close();
    const controller = new AbortController();
    current.current = controller;
    const signal = controller.signal;
    setOpening(true);
    setError('');
    try {
      const target = await notificationTarget(id, signal);
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
      setViewer({
        target,
        notificationId: id,
        photo: {
          id: target.photoId,
          albumId: target.albumId,
          src,
          width,
          height,
          alt: '알림에서 연 사진',
          capturedAt: '',
          ...uploaderOf(target),
        },
      });
      if (markObserved) {
        try {
          await readNotification(id, target.latestSequence, signal);
        } catch (cause) {
          if (!signal.aborted)
            setError(
              cause instanceof Error
                ? cause.message
                : '사진을 열었지만 읽음 상태를 저장하지 못했어요.'
            );
        }
      }
      return true;
    } catch (error) {
      if (!signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : '사진을 열지 못했어요. 삭제되었거나 접근 권한이 바뀌었을 수 있어요.'
        );
      return false;
    } finally {
      if (!signal.aborted) setOpening(false);
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
  return { viewer, opening, error, open, close, download };
}
