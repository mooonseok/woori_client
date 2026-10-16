'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Photo } from '@/dto/album.dto';
import type { DisplayLoader } from '@/dto/viewer.dto';
import { createDisplayRenditions } from '@/services/display-renditions';
const NONE: ReadonlyMap<string, string> = new Map();
/**
 * Viewer photos with grid thumbnails swapped for display renditions as they
 * arrive. Without a loader (demo, notification, memory) photos pass through.
 * The renditions live only while the viewer is mounted.
 */
export function useDisplayRenditions(
  photos: Photo[],
  index: number,
  load: DisplayLoader | undefined,
  retry: number,
  onFailure: (photoId: string) => void
) {
  const [sources, setSources] = useState(NONE);
  const latest = useRef({ load, onFailure });
  useEffect(() => {
    latest.current = { load, onFailure };
  });
  const renditions = useRef<ReturnType<typeof createDisplayRenditions> | null>(
    null
  );
  const enabled = !!load;
  useEffect(() => {
    if (!enabled) return;
    const created = createDisplayRenditions(
      (photo, signal) => latest.current.load!(photo, signal),
      {
        onChange: setSources,
        onFailure: (photoId) => latest.current.onFailure(photoId),
      }
    );
    renditions.current = created;
    return () => {
      created.dispose();
      renditions.current = null;
      setSources(NONE);
    };
  }, [enabled]);
  useEffect(() => {
    renditions.current?.show(photos, index);
  }, [photos, index, enabled]);
  useEffect(() => {
    if (retry) renditions.current?.retry();
  }, [retry]);
  return useMemo(
    () =>
      sources.size
        ? photos.map((photo) => {
            const src = sources.get(photo.id);
            return src ? { ...photo, src, variant: 'display' as const } : photo;
          })
        : photos,
    [photos, sources]
  );
}
