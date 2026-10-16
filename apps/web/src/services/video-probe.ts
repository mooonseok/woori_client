// Reads a selected video's length in the browser before upload. Resolves null
// when the browser cannot read it (e.g. HEVC on some browsers), takes too long
// or the upload is canceled (immediately): the file is then sent, or skipped
// by the canceled batch, and the server's check decides.
export async function probeVideoDuration(
  file: Blob,
  signal?: AbortSignal,
  timeoutMs = 8000
): Promise<number | null> {
  if (typeof document === 'undefined' || signal?.aborted) return null;
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  let stop = () => {};
  try {
    return await new Promise<number | null>((resolve) => {
      const timer = setTimeout(() => done(null), timeoutMs);
      function done(value: number | null) {
        clearTimeout(timer);
        resolve(value);
      }
      stop = () => done(null);
      signal?.addEventListener('abort', stop, { once: true });
      video.preload = 'metadata';
      video.muted = true;
      video.onloadedmetadata = () =>
        done(
          Number.isFinite(video.duration) && video.duration > 0
            ? Math.round(video.duration * 1000)
            : null
        );
      video.onerror = () => done(null);
      video.src = url;
    });
  } finally {
    signal?.removeEventListener('abort', stop);
    video.onloadedmetadata = null;
    video.onerror = null;
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
