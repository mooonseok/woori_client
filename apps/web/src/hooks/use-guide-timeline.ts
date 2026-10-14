'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { GUIDE_CONTENT } from '@/lib/viewer/guide-content';
const QUERY = '(prefers-reduced-motion: reduce)';
function subscribeReducedMotion(notify: () => void) {
  const query = matchMedia(QUERY);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
}
const reducedSnapshot = () => matchMedia(QUERY).matches;
const serverSnapshot = () => false;
export function useGuideTimeline(kind: 'view' | 'pin') {
  const [step, setStep] = useState(0);
  const [replay, setReplay] = useState(0);
  const [tick, setTick] = useState({ run: '', phase: 0 });
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    reducedSnapshot,
    serverSnapshot
  );
  const content = GUIDE_CONTENT[kind][step];
  const run = `${kind}:${step}:${replay}`;
  const phase = reduced
    ? content.timing.length - 1
    : tick.run === run
      ? tick.phase
      : 0;
  useEffect(() => {
    if (reduced) return;
    const timers = content.timing.map((delay, phase) =>
      setTimeout(() => setTick({ run, phase }), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [content, run, reduced]);
  return {
    step,
    phase,
    reduced,
    content,
    playing: !reduced && phase < content.timing.length - 1,
    setStep,
    replay: () => setReplay((value) => value + 1),
  };
}
