import test from 'node:test';
import assert from 'node:assert/strict';
import {
  thumbnailFailure,
  reconcileThumbnails,
  thumbnailResult,
} from '../src/services/thumbnail-result.ts';
import { ApiError } from '../src/services/api-client.ts';

test('a transport failure preserves sibling thumbnails and the original page order', async () => {
  const controller = new AbortController();
  const result = await Promise.all(
    ['first', 'broken', 'last'].map((id) =>
      thumbnailResult(
        async () => {
          if (id === 'broken') throw new ApiError(503, 'temporary');
          return { id, src: `blob:${id}`, failed: false };
        },
        () => ({ id, src: '', failed: true }),
        controller.signal
      )
    )
  );
  assert.deepEqual(
    result.map((p) => p.id),
    ['first', 'broken', 'last']
  );
  assert.deepEqual(
    result.map((p) => p.failed),
    [false, true, false]
  );
  assert.equal(result[2].src, 'blob:last');
});
for (const status of [401, 403, 404])
  test(`access failure ${status} never becomes an ordinary retry tile`, async () => {
    const cause = new ApiError(status, 'access');
    let fallback = false;
    await assert.rejects(
      thumbnailResult(
        async () => {
          throw cause;
        },
        () => {
          fallback = true;
          return '';
        },
        new AbortController().signal
      ),
      (error) => error === cause
    );
    assert.equal(fallback, false);
    assert.equal(thumbnailFailure(cause), 'unavailable');
  });
test('a cancelled old group never creates a fallback item', async () => {
  const controller = new AbortController();
  controller.abort();
  let fallback = false;
  await assert.rejects(
    thumbnailResult(
      async () => {
        controller.signal.throwIfAborted();
        return '';
      },
      () => {
        fallback = true;
        return '';
      },
      controller.signal
    )
  );
  assert.equal(fallback, false);
});
test('a decoding failure has a retryable fallback; a later successful request uses its new result', async () => {
  const signal = new AbortController().signal;
  assert.equal(
    await thumbnailResult(
      async () => {
        throw new Error('decode');
      },
      () => 'error',
      signal
    ),
    'error'
  );
  assert.equal(
    await thumbnailResult(
      async () => 'blob:fresh',
      () => 'error',
      signal
    ),
    'blob:fresh'
  );
});

const preview = (
  src: string,
  previewStatus?: 'loading' | 'error'
): import('../src/dto/album.dto.ts').Photo => ({
  id: 'photo',
  albumId: 'album',
  src,
  previewStatus,
  width: 4000,
  height: 3000,
  alt: '',
  capturedAt: '2026-01-01',
  authorId: 'member',
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
test('a delayed refresh keeps a completed retry Blob instead of its captured loading preview', async () => {
  let current = [preview('blob:old', 'loading')];
  const captured = [...current];
  const server = deferred<import('../src/dto/album.dto.ts').Photo[]>();
  const refresh = server.promise.then((metadata) => {
    current = reconcileThumbnails(metadata, current, []);
  });
  current = [preview('blob:retried')];
  server.resolve([{ ...captured[0], alt: 'updated server title' }]);
  await refresh;
  assert.equal(current[0].src, 'blob:retried');
  assert.equal(current[0].previewStatus, undefined);
  assert.equal(current[0].alt, 'updated server title');
});
test('a refresh settling first preserves the in-flight preview identity so retry can finish', async () => {
  let current = [preview('blob:old', 'loading')];
  const pending = deferred<string>();
  const retry = pending.promise.then((src) => {
    current = current.map((photo) =>
      photo.src === 'blob:old'
        ? { ...photo, src, previewStatus: undefined }
        : photo
    );
  });
  current = reconcileThumbnails(
    [{ ...preview(''), alt: 'fresh metadata' }],
    current,
    []
  );
  assert.equal(current[0].previewStatus, 'loading');
  pending.resolve('blob:retried');
  await retry;
  assert.equal(current[0].src, 'blob:retried');
  assert.equal(current[0].previewStatus, undefined);
  assert.equal(current[0].alt, 'fresh metadata');
});
test('refresh keeps server deletion and uses newly fetched previews without reviving old entries', () => {
  const removed = { ...preview('blob:removed'), id: 'removed' };
  const added = { ...preview('blob:added'), id: 'added' };
  const result = reconcileThumbnails([added], [removed], [added]);
  assert.deepEqual(
    result.map((photo) => photo.id),
    ['added']
  );
  assert.equal(result[0].src, 'blob:added');
});
