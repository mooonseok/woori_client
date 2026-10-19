'use client';
import { useEffect, useRef, useState } from 'react';
import type { Photo } from '@/dto/album.dto';
import type { VideoLoader } from '@/dto/viewer.dto';
import {
  createVideoSource,
  type VideoSourceState,
} from '@/services/video-source';
const IDLE: VideoSourceState = {
  photoId: '',
  src: '',
  attempt: 0,
  status: 'idle',
};
/**
 * The authenticated play URL for the video on screen (see createVideoSource). Without
 * a loader (demo) nothing loads and the poster stays.
 */
export function useVideoSource(photo: Photo, load: VideoLoader | undefined) {
  const [state, setState] = useState(IDLE);
  const latest = useRef(load);
  useEffect(() => {
    latest.current = load;
  });
  const source = useRef<ReturnType<typeof createVideoSource> | null>(null);
  const enabled = !!load;
  useEffect(() => {
    if (!enabled) return;
    const created = createVideoSource(
      (item, signal) => latest.current!(item, signal),
      setState
    );
    source.current = created;
    return () => {
      created.dispose();
      source.current = null;
      setState(IDLE);
    };
  }, [enabled]);
  useEffect(() => {
    source.current?.show(photo);
  }, [photo, enabled]);
  const current = state.photoId === photo.id ? state : IDLE;
  return {
    ...current,
    failed: () => source.current?.failed(),
    retry: () => source.current?.retry(),
    played: () => source.current?.played(),
  };
}
