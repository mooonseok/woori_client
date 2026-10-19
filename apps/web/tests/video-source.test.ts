import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  createVideoSource,
  type VideoSourceState,
} from '../src/services/video-source.ts';
import { advanceSessionRevision } from '../src/services/api-client.ts';
import { videoAccess } from '../src/services/media-client.ts';
import type { Photo } from '../src/dto/album.dto.ts';
import type { VideoAccess } from '../src/dto/media.dto.ts';

const item = (id: string, mediaKind: 'PHOTO' | 'VIDEO' = 'VIDEO'): Photo => ({
  id,
  albumId: 'album',
  src: `blob:poster-${id}`,
  mediaKind,
  durationMs: mediaKind === 'VIDEO' ? 42_000 : null,
  width: 1920,
  height: 1080,
  alt: '',
  capturedAt: '2026-10-16',
  authorId: 'member',
});
const access = (url: string): VideoAccess => ({
  url,
  expiresAt: '2026-10-16T00:10:00Z',
  purpose: 'play',
  mime: 'video/mp4',
  bytes: 1000,
  width: 1920,
  height: 1080,
  durationMs: 42_000,
});
const tick = () => new Promise((resolve) => setImmediate(resolve));

function harness() {
  const calls: { id: string; signal: AbortSignal }[] = [];
  const states: VideoSourceState[] = [];
  let n = 0;
  const source = createVideoSource(
    async (photo, signal) => {
      calls.push({ id: photo.id, signal });
      await tick();
      signal.throwIfAborted();
      return access(`https://r2.example/${photo.id}?v=${++n}`);
    },
    (state) => states.push(state)
  );
  return { source, calls, latest: () => states.at(-1)! };
}

test('a video on screen gets its play URL; a playback error fetches one fresh URL', async () => {
  const { source, calls, latest } = harness();
  source.show(item('v1'));
  assert.equal(latest().status, 'loading');
  await tick();
  await tick();
  assert.deepEqual(
    [latest().status, latest().src, latest().attempt],
    ['ready', 'https://r2.example/v1?v=1', 0]
  );
  // The signed URL expired while paused: the element reports an error.
  source.failed();
  await tick();
  await tick();
  assert.deepEqual(
    [latest().status, latest().src, latest().attempt],
    ['ready', 'https://r2.example/v1?v=2', 1]
  );
  // A second failure stops retrying until the user asks.
  source.failed();
  assert.equal(latest().status, 'error');
  assert.equal(calls.length, 2);
  source.retry();
  await tick();
  await tick();
  assert.equal(latest().status, 'ready');
  assert.equal(calls.length, 3);
});

test('playing again resets the retry budget, so every later expiry gets one fresh URL', async () => {
  const { source, calls, latest } = harness();
  source.show(item('v1'));
  await tick();
  await tick();
  for (const round of [1, 2, 3]) {
    source.failed();
    await tick();
    await tick();
    assert.deepEqual(
      [latest().status, latest().attempt],
      ['ready', round],
      `expiry ${round} after playing re-fetches`
    );
    source.played();
  }
  assert.equal(calls.length, 4);
  // Without playing in between, the fresh URL failing too is an error.
  source.failed();
  await tick();
  await tick();
  source.failed();
  assert.equal(latest().status, 'error');
  assert.equal(calls.length, 5);
  // A new video starts with a full budget.
  source.show(item('v2'));
  await tick();
  await tick();
  source.failed();
  assert.equal(latest().status, 'loading');
});

test('leaving a video aborts its request; photos and disposed viewers load nothing', async () => {
  const { source, calls, latest } = harness();
  source.show(item('v1'));
  source.show(item('v2'));
  assert.equal(calls[0].signal.aborted, true);
  await tick();
  await tick();
  assert.equal(latest().photoId, 'v2');
  source.show(item('p1', 'PHOTO'));
  assert.equal(latest().status, 'idle');
  assert.equal(calls.length, 2);
  source.show(item('v3'));
  source.dispose();
  assert.equal(calls[2].signal.aborted, true);
  await tick();
  await tick();
  assert.deepEqual(
    [latest().status, latest().src],
    ['loading', ''],
    'a late URL after close is never shown'
  );
});

test('play and download URLs come from the video endpoint with the API session', async (t: TestContext) => {
  const requested: string[] = [];
  const original = globalThis.fetch,
    base = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example';
  globalThis.fetch = async (input, init) => {
    assert.equal(init?.credentials, 'include');
    assert.equal(init?.cache, 'no-store');
    requested.push(String(input));
    return Response.json(
      access('/v1/groups/g/albums/a/photos/v%2F1/video/content?purpose=play')
    );
  };
  t.after(() => {
    globalThis.fetch = original;
    if (base === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = base;
  });
  const signal = new AbortController().signal;
  assert.equal(
    (await videoAccess('g', 'a', 'v/1', 'play', signal)).url,
    'https://api.example/v1/groups/g/albums/a/photos/v%2F1/video/content?purpose=play'
  );
  await videoAccess('g', 'a', 'v/1', 'download', signal);
  assert.deepEqual(requested, [
    'https://api.example/v1/groups/g/albums/a/photos/v%2F1/video?purpose=play',
    'https://api.example/v1/groups/g/albums/a/photos/v%2F1/video?purpose=download',
  ]);
});

test('a video access response from a prior session is rejected before playback or download', async (t) => {
  const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example';
  t.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previous;
  });
  t.mock.method(globalThis, 'fetch', async () => {
    advanceSessionRevision();
    return Response.json(
      access('/v1/groups/g/albums/a/photos/v/video/content')
    );
  });
  await assert.rejects(
    videoAccess('g', 'a', 'v', 'play', new AbortController().signal),
    { status: 401 }
  );
});
