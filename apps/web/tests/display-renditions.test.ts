import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDisplayRenditions,
  displayLoader,
  displayWindow,
} from '../src/services/display-renditions.ts';
import type { Photo } from '../src/dto/album.dto.ts';

const grid = (id: string): Photo => ({
  id,
  albumId: 'album',
  src: `blob:thumbnail-${id}`,
  variant: 'thumbnail',
  width: 4032,
  height: 3024,
  alt: '',
  capturedAt: '2026-10-01',
  authorId: 'member',
});
const album = ['p1', 'p2', 'p3', 'p4', 'p5'].map(grid);

// Records object URLs so every created URL can be checked for revocation.
function objectUrls(t: TestContext) {
  const live = new Set<string>(),
    created: string[] = [];
  const create = URL.createObjectURL,
    revoke = URL.revokeObjectURL;
  t.mock.method(URL, 'createObjectURL', (blob: Blob) => {
    const url = create(blob);
    live.add(url);
    created.push(url);
    return url;
  });
  t.mock.method(URL, 'revokeObjectURL', (url: string) => {
    live.delete(url);
    revoke(url);
  });
  return { live, created };
}

// A loader whose responses the test settles explicitly, in any order.
function manualLoader() {
  const calls: {
    id: string;
    signal: AbortSignal;
    resolve: () => void;
    reject: () => void;
  }[] = [];
  const load = (photo: Photo, signal: AbortSignal) =>
    new Promise<Blob>((resolve, reject) => {
      calls.push({
        id: photo.id,
        signal,
        resolve: () => resolve(new Blob([`display-${photo.id}`])),
        reject: () => reject(new Error('network')),
      });
    });
  const settle = async (id: string, ok = true) => {
    const call = calls.findLast((item) => item.id === id);
    assert.ok(call, `no request for ${id}`);
    if (ok) call.resolve();
    else call.reject();
    await new Promise((resolve) => setImmediate(resolve));
  };
  return { calls, load, settle };
}

function harness(t: TestContext, limit?: number) {
  const urls = objectUrls(t);
  const loader = manualLoader();
  const states: ReadonlyMap<string, string>[] = [];
  const failures: string[] = [];
  const renditions = createDisplayRenditions(
    loader.load,
    {
      onChange: (sources) => states.push(sources),
      onFailure: (id) => failures.push(id),
    },
    limit
  );
  const latest = () => states.at(-1) ?? new Map<string, string>();
  return { ...urls, ...loader, renditions, latest, failures };
}

test('the viewer requests the display rendition, the photo on screen before its neighbours', async (t) => {
  const requested: string[] = [];
  const base = process.env.NEXT_PUBLIC_API_BASE_URL,
    original = globalThis.fetch;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example';
  globalThis.fetch = async (input, init) => {
    assert.equal(init?.credentials, 'include');
    assert.equal(init?.cache, 'no-store');
    requested.push(String(input));
    return new Response('pixels', {
      headers: { 'Content-Type': 'image/webp' },
    });
  };
  t.after(() => {
    globalThis.fetch = original;
    if (base === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = base;
  });
  const { live } = objectUrls(t);
  let sources: ReadonlyMap<string, string> = new Map();
  const renditions = createDisplayRenditions(displayLoader('group'), {
    onChange: (next) => (sources = next),
    onFailure: () => assert.fail('no failure expected'),
  });
  renditions.show(album, 2);
  assert.equal(requested.length, 1, 'neighbours wait for the photo on screen');
  for (let tick = 0; tick < 50 && sources.size < 3; tick++)
    await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(
    requested.map((url) => new URL(url).pathname.split('/').at(-2)),
    ['p3', 'p4', 'p2']
  );
  for (const url of requested) {
    assert.match(
      url,
      /\/v1\/groups\/group\/albums\/album\/photos\/p\d\/content/
    );
    assert.equal(new URL(url).searchParams.get('variant'), 'display');
  }
  assert.deepEqual([...sources.keys()].sort(), ['p2', 'p3', 'p4']);
  renditions.dispose();
  assert.equal(live.size, 0);
});

test('only grid thumbnails are upgraded; demo, memory and notification photos pass through', (t) => {
  const { renditions, calls } = harness(t);
  const memory: Photo = { ...grid('memory'), variant: 'display' };
  const demo: Photo = { ...grid('demo'), variant: undefined };
  assert.deepEqual(displayWindow([demo, memory, demo], 1), {
    current: undefined,
    neighbours: [],
  });
  renditions.show([memory], 0);
  renditions.show([demo, { ...demo, id: 'demo-2' }], 1);
  assert.equal(calls.length, 0);
  renditions.show([memory, grid('p1')], 0);
  assert.deepEqual(
    calls.map((call) => call.id),
    ['p1'],
    'a thumbnail neighbour still loads beside a display photo'
  );
  renditions.dispose();
});

test('closing the viewer aborts loads, revokes every rendition, and late responses never create URLs', async (t) => {
  const { renditions, calls, settle, live, created } = harness(t);
  renditions.show(album, 0);
  await settle('p1');
  assert.deepEqual(
    calls.map((call) => call.id),
    ['p1', 'p2']
  );
  renditions.dispose();
  assert.equal(live.size, 0);
  assert.equal(calls[1].signal.aborted, true);
  await settle('p2');
  assert.equal(created.length, 1, 'the late neighbour created no URL');
  renditions.show(album, 3);
  assert.equal(calls.length, 2, 'a disposed viewer starts nothing');
});

test('navigation aborts loads that left the window and evicts the oldest renditions, never the window', async (t) => {
  const { renditions, calls, settle, live, latest } = harness(t, 4);
  renditions.show(album, 0);
  await settle('p1');
  await settle('p2');
  renditions.show(album, 1);
  await settle('p3');
  renditions.show(album, 4);
  assert.ok(
    calls.filter((call) => call.id === 'p5').length === 1 &&
      calls.every((call) => call.id === 'p5' || !call.signal.aborted)
  );
  await settle('p5');
  await settle('p4');
  // p1..p5 were shown or prefetched; the limit keeps the newest four.
  assert.deepEqual([...latest().keys()].sort(), ['p2', 'p3', 'p4', 'p5']);
  assert.equal(live.size, 4);
  renditions.show(album, 2);
  assert.ok(['p2', 'p3', 'p4'].every((id) => latest().has(id)));
  // Swiping past a photo before it loads cancels its request.
  renditions.show(album, 0);
  const p1 = calls.findLast((call) => call.id === 'p1')!;
  renditions.show(album, 3);
  assert.equal(p1.signal.aborted, true);
  renditions.dispose();
  assert.equal(live.size, 0);
});

test('photos removed from an open viewer (deleted or blocked) lose their renditions', async (t) => {
  const { renditions, settle, live, latest } = harness(t);
  renditions.show(album, 1);
  await settle('p2');
  await settle('p3');
  await settle('p1');
  const removed = latest().get('p1')!;
  renditions.show(
    album.filter((photo) => photo.id !== 'p1'),
    0
  );
  assert.equal(latest().has('p1'), false);
  assert.equal(live.has(removed), false);
  renditions.dispose();
});

test('a failed display load reports only the photo on screen and retries on demand', async (t) => {
  const { renditions, calls, settle, failures, latest } = harness(t);
  renditions.show(album, 1);
  await settle('p2', false);
  assert.deepEqual(failures, ['p2']);
  // Neighbours still load after the photo on screen settles.
  await settle('p3', false);
  await settle('p1');
  assert.deepEqual(failures, ['p2'], 'a neighbour failure is not reported');
  renditions.show(album, 2);
  assert.equal(
    calls.filter((call) => call.id === 'p3').length,
    2,
    'a failed neighbour is retried once it is on screen'
  );
  await settle('p3');
  renditions.show(album, 1);
  assert.equal(failures.at(-1), 'p2', 'returning to a failed photo re-reports');
  assert.equal(calls.filter((call) => call.id === 'p2').length, 1);
  renditions.retry();
  await settle('p2');
  assert.ok(latest().has('p2'));
  renditions.dispose();
});

test('a video whose poster upgrade fails keeps the thumbnail poster without a photo error', async (t) => {
  const { renditions, calls, settle, failures, latest } = harness(t);
  const clip: Photo = { ...grid('v1'), mediaKind: 'VIDEO', durationMs: 4000 };
  const items = [grid('p1'), clip, grid('p3')];
  renditions.show(items, 1);
  await settle('v1', false);
  assert.deepEqual(failures, [], 'no "photo failed" overlay over a video');
  assert.equal(latest().has('v1'), false);
  await settle('p3');
  await settle('p1');
  renditions.show(items, 2);
  renditions.show(items, 1);
  assert.deepEqual(failures, []);
  assert.equal(
    calls.filter((call) => call.id === 'v1').length,
    2,
    'the poster upgrade is tried again when the video is shown again'
  );
  await settle('v1');
  assert.ok(latest().has('v1'));
  renditions.dispose();
});
