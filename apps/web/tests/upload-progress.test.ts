import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { putToStorage, queuePhoto } from '../src/services/media-client.ts';
import { spokenPercent, uploadPercent } from '../src/utils/media.ts';
import { probeVideoDuration } from '../src/services/video-probe.ts';
import type { PendingUpload } from '../src/dto/media.dto.ts';

// A scripted XMLHttpRequest: the test drives progress and the response.
class FakeXhr {
  static last: FakeXhr | null = null;
  method = '';
  url = '';
  withCredentials = true;
  headers: Record<string, string> = {};
  body: unknown = null;
  status = 0;
  aborted = false;
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: unknown) {
    this.body = body;
    FakeXhr.last = this;
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
  progress(loaded: number, total: number) {
    this.upload.onprogress?.({
      lengthComputable: true,
      loaded,
      total,
    } as ProgressEvent);
  }
  respond(status: number) {
    this.status = status;
    this.onload?.();
  }
}
function useFakeXhr(t: TestContext) {
  const previous = (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest;
  (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = FakeXhr;
  FakeXhr.last = null;
  t.after(() => {
    (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = previous;
  });
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('storage PUT reports byte progress, sends only the signed headers and no cookies', async (t) => {
  useFakeXhr(t);
  const file = new File([new Uint8Array(1000)], 'clip.mp4', {
    type: 'video/mp4',
  });
  const seen: [number, number][] = [];
  const done = putToStorage(
    'https://r2.example/put',
    file,
    { 'Content-Type': 'video/mp4' },
    new AbortController().signal,
    (sent, size) => seen.push([sent, size])
  );
  const xhr = FakeXhr.last!;
  assert.deepEqual(
    [xhr.method, xhr.url, xhr.withCredentials, xhr.headers, xhr.body],
    [
      'PUT',
      'https://r2.example/put',
      false,
      { 'Content-Type': 'video/mp4' },
      file,
    ]
  );
  xhr.progress(250, 1000);
  xhr.progress(1000, 1000);
  xhr.respond(200);
  assert.equal(await done, 200);
  assert.deepEqual(seen, [
    [250, 1000],
    [1000, 1000],
  ]);
});

test('aborting stops the PUT; a network error is reported, not retried here', async (t) => {
  useFakeXhr(t);
  const controller = new AbortController();
  const aborted = putToStorage(
    'https://r2.example/put',
    new Blob(['x']),
    {},
    controller.signal
  );
  controller.abort();
  await assert.rejects(aborted, { name: 'AbortError' });
  assert.equal(FakeXhr.last!.aborted, true);
  const failed = putToStorage(
    'https://r2.example/put',
    new Blob(['x']),
    {},
    new AbortController().signal
  );
  FakeXhr.last!.onerror!();
  await assert.rejects(failed, TypeError);
  // Already aborted: nothing is sent.
  FakeXhr.last = null;
  await assert.rejects(
    putToStorage(
      'https://r2.example/put',
      new Blob(['x']),
      {},
      controller.signal
    )
  );
  assert.equal(FakeXhr.last, null);
});

test('the upload flow streams UPLOADING percentages and keeps the retry state rules', async (t) => {
  useFakeXhr(t);
  const original = globalThis.fetch,
    base = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example';
  const ticket = {
    photoId: 'p1',
    uploadUrl: 'https://r2.example/put/p1',
    headers: { 'Content-Type': 'image/jpeg' },
    expiresAt: '2099-01-01T00:00:00Z',
  };
  globalThis.fetch = async (input) =>
    String(input).endsWith('/uploads')
      ? Response.json(ticket)
      : Response.json({
          photoId: 'p1',
          status: 'PROCESSING',
          phase: 'QUEUED',
          retryAfterSeconds: null,
          errorCode: null,
        });
  t.after(() => {
    globalThis.fetch = original;
    if (base === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = base;
  });
  const file = new File([new Uint8Array(400)], 'a.jpg', { type: 'image/jpeg' });
  const events: string[] = [];
  const pending: PendingUpload = { uploaded: false };
  const listener = (phase: string, bytes?: { sent: number; size: number }) =>
    events.push(bytes ? `${phase} ${bytes.sent}/${bytes.size}` : phase);
  // Storage refuses (expired signature): the ticket is dropped for a retry.
  let run = queuePhoto(
    'g',
    'a',
    file,
    pending,
    new AbortController().signal,
    listener
  );
  await tick();
  await tick();
  FakeXhr.last!.respond(403);
  await assert.rejects(run, /전송에 실패/);
  assert.equal(pending.ticket, undefined);
  assert.equal(pending.uploaded, false);
  // Retry: progress, then the queue.
  events.length = 0;
  run = queuePhoto(
    'g',
    'a',
    file,
    pending,
    new AbortController().signal,
    listener
  );
  await tick();
  await tick();
  FakeXhr.last!.progress(200, 400);
  FakeXhr.last!.respond(200);
  assert.equal((await run).photoId, 'p1');
  assert.equal(pending.uploaded, true);
  assert.deepEqual(events, [
    'RESERVING',
    'UPLOADING 0/400',
    'UPLOADING 200/400',
    'QUEUING',
  ]);
});

test('percent is whole, reaches 100 only when complete, and is spoken in 10% steps', () => {
  assert.equal(uploadPercent(0, 400), 0);
  assert.equal(uploadPercent(1, 400), 0);
  assert.equal(uploadPercent(200, 400), 50);
  assert.equal(uploadPercent(399, 400), 99);
  assert.equal(uploadPercent(400, 400), 100);
  assert.equal(uploadPercent(10, 0), 0);
  assert.equal(spokenPercent(0), 0);
  assert.equal(spokenPercent(49), 40);
  assert.equal(spokenPercent(99), 90);
  assert.equal(spokenPercent(100), 100);
});

// A <video> that never reads metadata (a slow or huge file).
function stalledVideo(t: TestContext) {
  const element = {
    preload: '',
    muted: false,
    duration: NaN,
    src: '',
    loads: 0,
    onloadedmetadata: null as (() => void) | null,
    onerror: null as (() => void) | null,
    removeAttribute(name: string) {
      if (name === 'src') this.src = '';
    },
    load() {
      this.loads++;
    },
  };
  const revoked: string[] = [];
  const revoke = URL.revokeObjectURL;
  t.mock.method(URL, 'revokeObjectURL', (url: string) => {
    revoked.push(url);
    revoke(url);
  });
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => element },
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'document', original);
    else delete (globalThis as { document?: unknown }).document;
  });
  return { element, revoked };
}

test('canceling ends the duration probe at once and releases the file', async (t) => {
  const { element, revoked } = stalledVideo(t);
  const controller = new AbortController();
  const started = Date.now();
  const probe = probeVideoDuration(new Blob(['x']), controller.signal, 60_000);
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(element.src.startsWith('blob:'));
  controller.abort();
  assert.equal(await probe, null);
  assert.ok(Date.now() - started < 1000, 'did not wait for the timeout');
  assert.equal(element.src, '');
  assert.equal(element.onloadedmetadata, null);
  assert.equal(revoked.length, 1);
  // Already canceled: nothing is read at all.
  assert.equal(
    await probeVideoDuration(new Blob(['x']), controller.signal),
    null
  );
  assert.equal(revoked.length, 1);
});

test('the probe reports a readable length in milliseconds', async (t) => {
  const { element } = stalledVideo(t);
  const probe = probeVideoDuration(new Blob(['x']), undefined, 60_000);
  element.duration = 12.3456;
  element.onloadedmetadata?.();
  assert.equal(await probe, 12346);
  assert.equal(element.loads, 1);
});
