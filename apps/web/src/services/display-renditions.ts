import type { Photo } from '../dto/album.dto.ts';
import type { DisplayLoader } from '../dto/viewer.dto.ts';
import { photoBlob } from './media-client.ts';

/** The viewer's loader: the 2560px display rendition, never the grid thumbnail. */
export function displayLoader(groupId: string): DisplayLoader {
  return (photo, signal) =>
    photoBlob(groupId, photo.albumId, photo.id, signal, 'display');
}

const upgradable = (photo: Photo | undefined): photo is Photo =>
  photo?.variant === 'thumbnail';

/**
 * Photos whose display rendition the viewer needs: the photo on screen, then
 * the neighbours the stage already renders as adjacent swipe slides.
 */
export function displayWindow(photos: readonly Photo[], index: number) {
  const current = upgradable(photos[index]) ? photos[index] : undefined;
  const neighbours = [photos[index + 1], photos[index - 1]].filter(upgradable);
  return { current, neighbours };
}

interface Events {
  onChange: (sources: ReadonlyMap<string, string>) => void;
  /**
   * The photo on screen could not be upgraded; the viewer offers a retry.
   * Never called for a video (its poster falls back to the thumbnail).
   */
  onFailure: (photoId: string) => void;
}

/**
 * Upgrades grid thumbnails to display renditions while one viewer is open.
 * It owns every object URL it creates: evicted, removed and late responses are
 * revoked, and dispose() aborts loads and revokes the rest.
 */
export function createDisplayRenditions(
  load: DisplayLoader,
  { onChange, onFailure }: Events,
  limit = 5
) {
  const sources = new Map<string, string>(); // photo id -> object URL, LRU order
  const pending = new Map<string, AbortController>();
  // Failed on screen: kept until retry(). Failed as a neighbour: until shown.
  const failed = new Set<string>(),
    deferred = new Set<string>();
  let last: { photos: readonly Photo[]; index: number } | null = null;
  let disposed = false;
  const emit = () => onChange(new Map(sources));
  const revoke = (id: string) => {
    URL.revokeObjectURL(sources.get(id)!);
    sources.delete(id);
  };
  function windowIds() {
    if (!last) return new Set<string>();
    const { current, neighbours } = displayWindow(last.photos, last.index);
    return new Set(
      [...(current ? [current] : []), ...neighbours].map((p) => p.id)
    );
  }
  // Keep the window plus the most recently shown photos, at most `limit`.
  function trim() {
    const keep = windowIds();
    for (const id of [...sources.keys()]) {
      if (sources.size <= limit) break;
      if (!keep.has(id)) revoke(id);
    }
  }
  async function start(photo: Photo) {
    const controller = new AbortController();
    pending.set(photo.id, controller);
    try {
      const blob = await load(photo, controller.signal);
      if (controller.signal.aborted || disposed) return;
      sources.set(photo.id, URL.createObjectURL(blob));
      trim();
      emit();
    } catch {
      if (controller.signal.aborted || disposed) return;
      // A video's display rendition is only its poster: the grid thumbnail
      // stays as the poster and the video still plays, so nothing to report.
      if (
        photo.mediaKind !== 'VIDEO' &&
        last?.photos[last.index]?.id === photo.id
      ) {
        failed.add(photo.id);
        onFailure(photo.id);
      } else deferred.add(photo.id);
    } finally {
      if (pending.get(photo.id) === controller) pending.delete(photo.id);
      if (!disposed) pump();
    }
  }
  function pump() {
    if (!last) return;
    const { current, neighbours } = displayWindow(last.photos, last.index);
    const needs = (photo: Photo) =>
      ![sources, pending, failed, deferred].some((ids) => ids.has(photo.id));
    // The photo on screen first; neighbours do not compete for bandwidth.
    if (current && needs(current)) void start(current);
    if (current && pending.has(current.id)) return;
    neighbours.filter(needs).forEach((photo) => void start(photo));
  }
  function show(photos: readonly Photo[], index: number) {
    if (disposed) return;
    last = { photos, index };
    const keep = windowIds();
    for (const [id, controller] of pending)
      if (!keep.has(id)) {
        controller.abort();
        pending.delete(id);
      }
    let changed = false;
    // Deleted or blocked photos leave the viewer; their renditions go too.
    for (const id of [...sources.keys()])
      if (!photos.some((photo) => photo.id === id)) {
        revoke(id);
        changed = true;
      }
    for (const id of [...keep].reverse()) {
      const src = sources.get(id);
      if (!src) continue;
      sources.delete(id);
      sources.set(id, src);
    }
    const before = sources.size;
    trim();
    if (changed || sources.size !== before) emit();
    const current = photos[index];
    if (current && failed.has(current.id)) onFailure(current.id);
    deferred.clear();
    pump();
  }
  function retry() {
    failed.clear();
    pump();
  }
  function dispose() {
    disposed = true;
    pending.forEach((controller) => controller.abort());
    pending.clear();
    [...sources.keys()].forEach(revoke);
  }
  return { show, retry, dispose };
}
