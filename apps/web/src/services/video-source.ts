import type { Photo } from '../dto/album.dto.ts';
import type { VideoLoader } from '../dto/viewer.dto.ts';

export interface VideoSourceState {
  photoId: string;
  src: string;
  // Bumps when a new URL replaces a failed one (remounts the element).
  attempt: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
}
const IDLE: VideoSourceState = {
  photoId: '',
  src: '',
  attempt: 0,
  status: 'idle',
};

/**
 * The play URL for the video on screen. Signed URLs expire (10 min), so a
 * playback error re-fetches one fresh URL; a second failure in a row shows an
 * error until retry(). Once the video plays again (played()) the next expiry
 * gets its fresh URL too. Leaving the item aborts its request and forgets it.
 */
export function createVideoSource(
  load: VideoLoader,
  onChange: (state: VideoSourceState) => void
) {
  let state = IDLE,
    controller: AbortController | null = null,
    disposed = false,
    photo: Photo | null = null,
    // Failures since the video last played; `attempt` only keys the element.
    failures = 0;
  const set = (next: VideoSourceState) => {
    state = next;
    if (!disposed) onChange(state);
  };
  async function fetchUrl(attempt: number) {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    const target = photo!;
    set({ photoId: target.id, src: '', attempt, status: 'loading' });
    try {
      const access = await load(target, current.signal);
      if (current.signal.aborted || disposed) return;
      set({ photoId: target.id, src: access.url, attempt, status: 'ready' });
    } catch {
      if (current.signal.aborted || disposed) return;
      set({ photoId: target.id, src: '', attempt, status: 'error' });
    }
  }
  return {
    show(next: Photo | null) {
      if (disposed || next?.id === photo?.id) return;
      controller?.abort();
      controller = null;
      photo = next?.mediaKind === 'VIDEO' ? next : null;
      failures = 0;
      if (photo) void fetchUrl(0);
      else set(IDLE);
    },
    // The <video> element failed (expired URL, network): one fresh URL.
    failed() {
      if (disposed || !photo || state.status !== 'ready') return;
      failures++;
      if (failures === 1) void fetchUrl(state.attempt + 1);
      else set({ ...state, src: '', status: 'error' });
    },
    // The element is playing: a later expiry is a new, first failure.
    played() {
      failures = 0;
    },
    retry() {
      if (!disposed && photo) void fetchUrl(state.attempt + 1);
    },
    dispose() {
      disposed = true;
      controller?.abort();
      photo = null;
    },
  };
}
