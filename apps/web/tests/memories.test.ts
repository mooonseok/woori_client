import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  listMemories,
  setMemoryHidden,
  updateCaptureDate,
} from '../src/services/memories.ts';
import { ApiError } from '../src/services/api-client.ts';
import {
  photoDateLabel,
  todayInSeoul,
  validCaptureDate,
} from '../src/utils/photo-date.ts';

test('capture dates reject impossible, future, incomplete and out-of-range input while preserving leap days', () => {
  for (const date of [
    '2025-02-29',
    '2024-02-30',
    '2024-13-01',
    '1799-12-31',
    '2026-10-16',
    '',
    '2026-1-01',
  ])
    assert.equal(validCaptureDate(date, '2026-10-15'), false, date);
  for (const date of ['1800-01-01', '2024-02-29', '2026-10-15'])
    assert.equal(validCaptureDate(date, '2026-10-15'), true, date);
});
test('KST date rolls over at UTC 15:00 independent of the browser timezone', () => {
  assert.equal(todayInSeoul(new Date('2026-10-14T14:59:59Z')), '2026-10-14');
  assert.equal(todayInSeoul(new Date('2026-10-14T15:00:00Z')), '2026-10-15');
  assert.equal(todayInSeoul(new Date('2023-12-31T15:00:00Z')), '2024-01-01');
});
test('photo date labels distinguish uploaded, manually chosen and EXIF dates', () => {
  assert.equal(
    photoDateLabel('2020-04-01', 'UPLOAD'),
    '2020.04.01 · 업로드일 기준'
  );
  assert.match(photoDateLabel('2020-04-01', 'USER'), /직접 지정/);
  assert.match(photoDateLabel('2020-04-01', 'EXIF'), /사진에 기록/);
});
test('memories requests keep session, scope, pagination, personal visibility and nullable reset contract', async (t) => {
  const saved = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example';
  t.after(() => {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = saved;
  });
  const calls: Request[] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (url: string | URL | Request, init?: RequestInit) => {
      const request = new Request(url, init);
      calls.push(request);
      if (request.url.endsWith('/hidden'))
        return new Response(null, { status: 204 });
      return Response.json(
        request.method === 'GET'
          ? {
              items: [],
              nextCursor: null,
              kind: 'today',
              asOf: '2026-10-15',
              timeZone: 'Asia/Seoul',
            }
          : { photo: { id: 'photo' } }
      );
    }
  );
  const signal = new AbortController().signal;
  await listMemories('group', 'today', null, signal);
  await listMemories('group', 'month', 'cursor', signal);
  await listMemories('group', 'hidden', null, signal);
  await setMemoryHidden('group', 'photo', true, signal);
  await setMemoryHidden('group', 'photo', false, signal);
  await updateCaptureDate('group', 'album', 'photo', '2020-04-01', signal);
  await updateCaptureDate('group', 'album', 'photo', null, signal);
  assert.equal(new URL(calls[0].url).searchParams.get('limit'), '12');
  assert.equal(new URL(calls[1].url).searchParams.get('cursor'), 'cursor');
  assert.equal(new URL(calls[2].url).searchParams.get('kind'), 'hidden');
  assert.deepEqual(
    calls.map((request) => request.method),
    ['GET', 'GET', 'GET', 'PUT', 'DELETE', 'PATCH', 'PATCH']
  );
  assert.match(
    calls[5].url,
    /\/groups\/group\/albums\/album\/photos\/photo\/capture-date$/
  );
  assert.deepEqual(await calls[5].json(), { date: '2020-04-01' });
  assert.deepEqual(await calls[6].json(), { date: null });
  for (const call of calls) {
    assert.equal(call.credentials, 'include');
    assert.equal(call.cache, 'no-store');
    if (call.method !== 'GET')
      assert.equal(call.headers.get('X-Woori-Request'), '1');
  }
});
test('memories forbidden, deleted and invalid dates remain errors and aborted requests do not succeed', async (t) => {
  const saved = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example';
  t.after(() => {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = saved;
  });
  let status = 403;
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: unknown, init?: RequestInit) => {
      if (init?.signal?.aborted)
        throw new DOMException('Aborted', 'AbortError');
      return Response.json({ message: '요청할 수 없어요.' }, { status });
    }
  );
  const signal = new AbortController().signal;
  for (status of [400, 403, 404])
    await assert.rejects(
      updateCaptureDate('group', 'album', 'photo', '2020-04-01', signal),
      (error: unknown) => error instanceof ApiError && error.status === status
    );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    listMemories('group', 'hidden', null, controller.signal),
    (error: unknown) =>
      error instanceof DOMException && error.name === 'AbortError'
  );
});
