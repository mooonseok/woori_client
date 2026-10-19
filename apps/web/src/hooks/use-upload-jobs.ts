'use client';
import { useEffect, useRef, useState } from 'react';
import type { UploadJobResponse } from '@/dto/media.dto';
import { recoverUploads } from '@/services/media-client';
import { currentSessionRevision } from '@/services/api-client';

/** Processing belongs to the server. Only polling belongs to this mounted album. */
export function useUploadJobs(
  groupId: string,
  albumId: string,
  enabled: boolean,
  onReady: () => Promise<void>,
  revision: number
) {
  const [jobs, setJobs] = useState<UploadJobResponse[]>([]);
  const [error, setError] = useState('');
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const session = currentSessionRevision();
  const key = `${session}:${groupId}:${albumId}:${enabled}`;
  const [jobScope, setJobScope] = useState('');
  const [refresh, setRefresh] = useState(0);
  const readyRef = useRef(onReady);
  const currentJobs = useRef<UploadJobResponse[]>([]);
  const retainedScope = useRef('');
  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    const controller = new AbortController();
    if (retainedScope.current !== key) {
      currentJobs.current = [];
      retainedScope.current = key;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let busy = false,
      ticks = 0;
    const known = new Map(
      currentJobs.current.map((job) => [job.photoId, job.status])
    );
    const store = (next: UploadJobResponse[]) => {
      currentJobs.current = next;
      setJobs(next);
    };
    const run = async () => {
      if (
        busy ||
        controller.signal.aborted ||
        !enabled ||
        !groupId ||
        !albumId ||
        document.visibilityState !== 'visible'
      )
        return;
      busy = true;
      setLoading(true);
      try {
        // Recover even when the process acceptance response was lost or the page reloaded.
        const values = await recoverUploads(
          groupId,
          albumId,
          currentJobs.current,
          controller.signal
        );
        if (controller.signal.aborted || session !== currentSessionRevision())
          return;
        const changed = values.some(
          (job) =>
            job.status === 'READY' && known.get(job.photoId) === 'PROCESSING'
        );
        values.forEach((job) => known.set(job.photoId, job.status));
        store(values);

        setError('');
        if (changed) await readyRef.current();
        if (controller.signal.aborted || session !== currentSessionRevision())
          return;
        // Also refresh on the first successful recovery: a job may have finished while away.
        if (ticks === 0 && values.some((job) => job.status === 'READY'))
          await readyRef.current();
        if (controller.signal.aborted || session !== currentSessionRevision())
          return;
        ticks++;
        if (ticks >= 120) setPaused(true);
        else
          timer = setTimeout(
            () => void run(),
            values.some((job) => job.status === 'PROCESSING') ? 4000 : 15000
          );
      } catch {
        if (!controller.signal.aborted) {
          setError(
            '파일 처리 상태를 확인하지 못했어요. 연결을 확인하고 다시 불러와 주세요.'
          );
          setPaused(true);
        }
      } finally {
        busy = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    const visible = () => {
      if (document.visibilityState !== 'visible') {
        clearTimeout(timer);
        return;
      }
      if (ticks >= 120) return;
      clearTimeout(timer);
      void run();
    };
    queueMicrotask(() => {
      if (controller.signal.aborted || session !== currentSessionRevision())
        return;
      setJobs(currentJobs.current);
      setError('');
      setPaused(false);
      setJobScope(key);
      setLoading(false);
      if (enabled && groupId && albumId) void run();
    });
    document.addEventListener('visibilitychange', visible);
    return () => {
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [groupId, albumId, enabled, revision, refresh, key, session]);
  const current = jobScope === key;
  return {
    jobs: current ? jobs : [],
    error: current ? error : '',
    paused: current && paused,
    loading: current && loading,
    reload: () => setRefresh((n) => n + 1),
  };
}
