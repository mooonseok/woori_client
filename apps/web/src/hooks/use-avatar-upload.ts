'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  avatarFileProblem,
  prepareAvatarFile,
  removeAvatar,
  uploadAvatar,
} from '@/services/avatar';
import type { AvatarPhase } from '@/dto/avatar.dto';

/**
 * Choose → preview → save, or remove, for the signed-in member's profile photo.
 * The chosen photo is downscaled in the browser and previewed exactly as the
 * server will crop it (centre square). Nothing is sent before 저장.
 */
export function useAvatarUpload(onDone: (message: string) => void) {
  const auth = useAuth();
  const [phase, setPhase] = useState<AvatarPhase>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const prepared = useRef<Blob | null>(null);
  const abort = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.abort();
    };
  }, []);
  // The preview URL lives only while it is shown.
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  async function choose(file: File | undefined) {
    if (!file || phase === 'saving' || phase === 'removing') return;
    setError('');
    setPhase('preparing');
    const blob = await prepareAvatarFile(file);
    if (!mounted.current) return;
    const problem = avatarFileProblem(blob);
    if (problem) {
      prepared.current = null;
      setPreview(null);
      setError(problem);
      setPhase('idle');
      return;
    }
    prepared.current = blob;
    setPreview(URL.createObjectURL(blob));
    setPhase('ready');
  }

  async function save() {
    const blob = prepared.current;
    if (!blob || phase !== 'ready') return;
    const controller = new AbortController();
    abort.current = controller;
    setPhase('saving');
    setProgress(0);
    setError('');
    try {
      await auth.applyUser(() =>
        uploadAvatar(blob, controller.signal, (percent) => {
          if (mounted.current) setProgress(percent);
        })
      );
      prepared.current = null;
      if (!mounted.current) return;
      setPreview(null);
      setPhase('idle');
      onDone('프로필 사진을 바꿨어요.');
    } catch (cause) {
      if (!mounted.current || controller.signal.aborted) return;
      setError(
        cause instanceof Error
          ? cause.message
          : '사진을 저장하지 못했어요. 다시 시도해 주세요.'
      );
      setPhase('ready');
    }
  }

  async function remove() {
    if (phase === 'saving' || phase === 'removing') return;
    setPhase('removing');
    setError('');
    try {
      await auth.applyUser(removeAvatar);
      if (!mounted.current) return;
      setPhase('idle');
      onDone('기본 이미지로 바꿨어요.');
    } catch (cause) {
      if (!mounted.current) return;
      setError(
        cause instanceof Error ? cause.message : '사진을 지우지 못했어요.'
      );
      setPhase('idle');
    }
  }

  /** Drops a chosen, unsaved photo (keeps the current one). */
  function discard() {
    if (phase === 'saving' || phase === 'removing') return;
    prepared.current = null;
    setPreview(null);
    setError('');
    setPhase('idle');
  }

  return { phase, preview, progress, error, choose, save, remove, discard };
}
