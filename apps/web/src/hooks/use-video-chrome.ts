'use client';
import { useEffect, useRef } from 'react';
import type { FocusEvent, KeyboardEvent, PointerEvent } from 'react';
import { createVideoChrome } from '@/lib/viewer/video-chrome';

export function useVideoChrome(
  id: string,
  enabled: boolean,
  blocked: boolean,
  show: (visible: boolean) => void
) {
  const controller = useRef<ReturnType<typeof createVideoChrome> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const current = createVideoChrome(show);
    controller.current = current;
    return () => {
      current.dispose();
      controller.current = null;
    };
  }, [enabled, show]);
  useEffect(() => {
    controller.current?.reset();
  }, [id]);
  useEffect(() => {
    controller.current?.block(blocked);
  }, [blocked, enabled]);
  return {
    playback: (playing: boolean) => controller.current?.playback(playing),
    events: {
      onPointerMove: () => controller.current?.activity(),
      onPointerDownCapture: () => controller.current?.touch(true),
      onPointerUpCapture: () => controller.current?.touch(false),
      onPointerCancelCapture: () => controller.current?.touch(false),
      onLostPointerCapture: (event: PointerEvent) => {
        if (event.buttons === 0) controller.current?.touch(false);
      },
      onKeyDownCapture: (event: KeyboardEvent) => {
        if (event.key === 'Tab' || event.target instanceof HTMLVideoElement)
          controller.current?.focus(true);
        controller.current?.activity();
      },
      onFocusCapture: (event: FocusEvent) => {
        controller.current?.focus(event.target.matches(':focus-visible'));
      },
      onBlurCapture: (event: FocusEvent) => {
        const next = event.relatedTarget;
        controller.current?.focus(
          next instanceof Element && next.matches(':focus-visible')
        );
      },
    },
  };
}
