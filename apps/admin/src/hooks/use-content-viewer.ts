'use client';
import { useEffect, useRef, useState } from 'react';
import type {
  AdminCommentView,
  ContentViewTarget,
} from '@/dto/content-view.dto';
import { viewComment, viewPhoto, viewVideo } from '@/services/content-viewing';
import { viewErrorMessage } from '@/utils/admin-errors';
import { createBlobUrlSlot } from '@/utils/blob-url';
import { plainTextError, RULES } from '@/utils/plain-text';
import { useReauth } from './use-reauth';

type Slot = ReturnType<typeof createBlobUrlSlot>;
// Audited view of one photo or comment: reason → (re-auth) → content.
// The photo exists only as an object URL that is revoked on close/unmount;
// the console remounts per admin, so an admin switch revokes it as well.
export function useContentViewer(target: ContentViewTarget) {
  const reauth = useReauth();
  const [reason, setReason] = useState(''),
    [reasonError, setReasonError] = useState(''),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(false),
    [photoUrl, setPhotoUrl] = useState(''),
    // A session-bound API ticket, dropped when the grant expires or closes.
    // Each fresh grant is a new audited view, never a silent refresh.
    [videoUrl, setVideoUrl] = useState(''),
    [videoExpiresAt, setVideoExpiresAt] = useState<number | null>(null),
    [comment, setComment] = useState<AdminCommentView | null>(null);
  const slot = useRef<Slot | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const current = createBlobUrlSlot();
    slot.current = current;
    return () => {
      request.current?.abort();
      current.close();
    };
  }, []);
  useEffect(() => {
    if (videoExpiresAt === null) return;
    const expire = () => {
      setVideoUrl('');
      setVideoExpiresAt(null);
      setError(
        '동영상 열람 시간이 끝났어요. 사유를 확인하고 다시 열람해 주세요.'
      );
    };
    const delay = videoExpiresAt - Date.now();
    const timer = window.setTimeout(expire, Math.max(0, delay));
    const visible = () => {
      if (Date.now() >= videoExpiresAt) expire();
    };
    window.addEventListener('focus', visible);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', visible);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [videoExpiresAt]);
  async function open() {
    if (loading) return;
    const invalid = plainTextError(reason, RULES.viewReason);
    setReasonError(invalid);
    if (invalid) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const text = reason.trim();
    setLoading(true);
    setError('');
    try {
      if (target.kind === 'video') {
        const result = await reauth.run(() =>
          viewVideo(target.id, text, controller.signal)
        );
        if (!controller.signal.aborted) {
          setVideoUrl(result.url);
          setVideoExpiresAt(Date.parse(result.expiresAt));
        }
      } else if (target.kind === 'photo') {
        const blob = await reauth.run(() =>
          viewPhoto(target.id, text, controller.signal)
        );
        const url = controller.signal.aborted ? null : slot.current?.set(blob);
        if (url) setPhotoUrl(url);
      } else {
        const result = await reauth.run(() =>
          viewComment(target.id, text, controller.signal)
        );
        if (!controller.signal.aborted) setComment(result);
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(viewErrorMessage(cause));
    } finally {
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  }
  return {
    reason,
    reasonError,
    error,
    loading,
    photoUrl,
    videoUrl,
    comment,
    shown: !!photoUrl || !!videoUrl || !!comment,
    setReason: (value: string) => {
      setReason(value);
      setReasonError('');
    },
    open: () => void open(),
  };
}
