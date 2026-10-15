import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { getNotice, listNotices } from '../src/services/notices.ts';
import {
  createInquiry,
  getInquiry,
  listInquiries,
} from '../src/services/inquiries.ts';
import {
  ApiError,
  GROUP_ACCESS_RECHECK,
  SESSION_EXPIRED,
} from '../src/services/api-client.ts';
import {
  INQUIRY_LIMIT_MESSAGE,
  fetchCursorPage,
  inquiryErrorMessage,
  isNotFound,
  isUuid,
  kstDateLabel,
  mergeCursorItems,
  noticeUpdatedLabel,
} from '../src/utils/service-guidance.ts';

const id = '0b7d4a52-8a8e-4c55-9a3c-4f1f3f6c2a10';
function withApi(t: TestContext) {
  const saved = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example';
  t.after(() => {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = saved;
  });
}
function withWindowEvents(t: TestContext) {
  const events: string[] = [];
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      dispatchEvent: (event: Event) => {
        events.push(event.type);
        return true;
      },
    },
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  });
  return events;
}

test('notice reads use the member cookie, cursor paging within the contract limit and an encoded id', async (t) => {
  withApi(t);
  const calls: Request[] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      calls.push(request);
      return Response.json(
        new URL(request.url).pathname === '/v1/notices'
          ? { items: [], nextCursor: null }
          : {
              id,
              title: '안내',
              body: '<b>본문</b>',
              publishedAt: '2026-10-14T15:00:00Z',
              updatedAt: '2026-10-14T15:00:00Z',
            }
      );
    }
  );
  const signal = new AbortController().signal;
  await listNotices(null, signal);
  await listNotices(id, signal);
  const notice = await getNotice('../v1/inquiries', signal);
  // Body is passed through as plain text; rendering never treats it as HTML.
  assert.equal(notice.body, '<b>본문</b>');
  const urls = calls.map((call) => new URL(call.url));
  assert.equal(urls[0].pathname, '/v1/notices');
  assert.deepEqual(Object.fromEntries(urls[0].searchParams), { limit: '20' });
  assert.deepEqual(Object.fromEntries(urls[1].searchParams), {
    limit: '20',
    cursor: id,
  });
  assert.equal(urls[2].pathname, '/v1/notices/..%2Fv1%2Finquiries');
  for (const call of calls) {
    assert.equal(call.method, 'GET');
    assert.equal(call.credentials, 'include');
    assert.equal(call.cache, 'no-store');
    assert.equal(call.headers.get('X-Woori-Request'), null);
  }
});

test('inquiry requests list/read only by cursor or id and create with exactly the contract fields', async (t) => {
  withApi(t);
  const calls: Request[] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      calls.push(request);
      if (request.method === 'POST')
        return Response.json(
          {
            id,
            category: 'BUG',
            title: '제목',
            body: '내용',
            status: 'RECEIVED',
            answer: null,
            createdAt: '2026-10-15T01:00:00Z',
            answeredAt: null,
          },
          { status: 201 }
        );
      return Response.json({ items: [], nextCursor: null });
    }
  );
  const signal = new AbortController().signal;
  await listInquiries(null, signal);
  await listInquiries(id, signal);
  await getInquiry(id, signal);
  const created = await createInquiry({
    category: 'BUG',
    title: '제목',
    body: '내용',
  });
  assert.equal(created.answer, null);
  const urls = calls.map((call) => new URL(call.url));
  assert.equal(urls[0].search, '?limit=20');
  assert.equal(urls[1].searchParams.get('cursor'), id);
  assert.equal(urls[2].pathname, `/v1/inquiries/${id}`);
  const post = calls[3];
  assert.equal(urls[3].pathname, '/v1/inquiries');
  assert.equal(urls[3].search, '');
  assert.equal(post.method, 'POST');
  assert.equal(post.credentials, 'include');
  assert.equal(post.headers.get('X-Woori-Request'), '1');
  assert.equal(post.headers.get('Content-Type'), 'application/json');
  assert.deepEqual(await post.json(), {
    category: 'BUG',
    title: '제목',
    body: '내용',
  });
});

test('missing records surface as 404 without triggering group access rechecks; 401 expires the session', async (t) => {
  withApi(t);
  const events = withWindowEvents(t);
  let status = 404;
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(
      { code: 'NOTICE_NOT_FOUND', message: '공지를 찾을 수 없어요.' },
      { status }
    )
  );
  const signal = new AbortController().signal;
  await assert.rejects(
    getNotice(id, signal),
    (error: unknown) => isNotFound(error) && error instanceof ApiError
  );
  await assert.rejects(getInquiry(id, signal), (error: unknown) =>
    isNotFound(error)
  );
  assert.equal(events.includes(GROUP_ACCESS_RECHECK), false);
  assert.equal(events.includes(SESSION_EXPIRED), false);
  status = 401;
  await assert.rejects(
    listInquiries(null, signal),
    (error: unknown) => error instanceof ApiError && error.status === 401
  );
  assert.equal(events.includes(SESSION_EXPIRED), true);
});

test('inquiry submission errors describe the real server state: limit, validation, network and abort', async (t) => {
  withApi(t);
  let mode: 'limit' | 'invalid' | 'offline' = 'limit';
  t.mock.method(
    globalThis,
    'fetch',
    async (_input: unknown, init?: RequestInit) => {
      if (init?.signal?.aborted)
        throw new DOMException('Aborted', 'AbortError');
      if (mode === 'offline') throw new TypeError('Failed to fetch');
      return mode === 'limit'
        ? Response.json(
            {
              code: 'TOO_MANY_REQUESTS',
              message: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
            },
            { status: 429 }
          )
        : Response.json(
            { message: ['title must be shorter'], statusCode: 400 },
            { status: 400 }
          );
    }
  );
  const input = { category: 'OTHER', title: '제목', body: '내용' } as const;
  const failure = (promise: Promise<unknown>) =>
    promise.then(
      () => assert.fail('expected rejection'),
      (error: unknown) => error
    );
  const limited = await failure(createInquiry(input));
  assert.equal(inquiryErrorMessage(limited), INQUIRY_LIMIT_MESSAGE);
  assert.match(INQUIRY_LIMIT_MESSAGE, /하루 5건/);
  mode = 'invalid';
  const invalid = await failure(createInquiry(input));
  assert.equal((invalid as ApiError).status, 400);
  assert.match(inquiryErrorMessage(invalid), /100자.*2,000자/);
  mode = 'offline';
  const offline = await failure(createInquiry(input));
  assert.equal((offline as ApiError).status, 0);
  assert.match(inquiryErrorMessage(offline), /서버에 연결할 수 없어요/);
  const cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(
    createInquiry(input, cancelled.signal),
    (error: unknown) => error instanceof DOMException
  );
  assert.match(inquiryErrorMessage(null), /문의를 보내지 못했어요/);
});

test('record ids and dates are validated before use and shown as KST calendar dates', () => {
  assert.equal(isUuid(id), true);
  assert.equal(isUuid(id.toUpperCase()), true);
  for (const value of [
    '',
    null,
    undefined,
    'not-a-uuid',
    `${id}x`,
    `../${id}`,
    `${id}\n`,
  ])
    assert.equal(isUuid(value), false, String(value));
  assert.equal(kstDateLabel('2026-10-14T14:59:59Z'), '2026.10.14');
  assert.equal(kstDateLabel('2026-10-14T15:00:00Z'), '2026.10.15');
  assert.equal(kstDateLabel('2023-12-31T15:00:00.000Z'), '2024.01.01');
  assert.equal(kstDateLabel('invalid'), '');
  assert.equal(kstDateLabel(null), '');
});

test('a vanished list cursor restarts from the first page; other failures are not retried', async (t) => {
  withApi(t);
  const cursors: (string | null)[] = [];
  let status = 404;
  t.mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request, init?: RequestInit) => {
      const cursor = new URL(new Request(input, init).url).searchParams.get(
        'cursor'
      );
      cursors.push(cursor);
      if (cursor)
        return Response.json(
          { code: 'NOTICE_NOT_FOUND', message: '공지사항을 찾을 수 없어요.' },
          { status }
        );
      return Response.json({
        items: [
          {
            id,
            title: '새 공지',
            publishedAt: '2026-10-15T00:00:00Z',
            updatedAt: '2026-10-15T00:00:00Z',
          },
        ],
        nextCursor: null,
      });
    }
  );
  const signal = new AbortController().signal;
  const restarted = await fetchCursorPage(listNotices, id, signal);
  assert.equal(restarted.restarted, true);
  assert.deepEqual(cursors, [id, null]);
  assert.equal(restarted.page.items[0].title, '새 공지');
  const first = await fetchCursorPage(listNotices, null, signal);
  assert.equal(first.restarted, false);
  status = 500;
  cursors.length = 0;
  await assert.rejects(
    fetchCursorPage(listInquiries, id, signal),
    (error: unknown) => error instanceof ApiError && error.status === 500
  );
  assert.deepEqual(cursors, [id]);
});

test('pages append without duplicates and a restart replaces the shown list', () => {
  const a = { id: 'a' },
    b = { id: 'b' },
    c = { id: 'c' };
  const appended = mergeCursorItems([a, b], [b, c, c], true);
  assert.deepEqual(appended.items, [a, b, c]);
  assert.deepEqual(appended.added, [c]);
  const replaced = mergeCursorItems([a, b], [c, a], false);
  assert.deepEqual(replaced.items, [c, a]);
  assert.deepEqual(replaced.added, [c, a]);
});

test('a notice shows an edit date only for a later edit on a different KST day', () => {
  // Scheduled: edited before it was published → no edit date.
  assert.equal(
    noticeUpdatedLabel('2026-10-20T00:00:00Z', '2026-10-14T00:00:00Z'),
    ''
  );
  // Edited later the same KST day → no separate edit date.
  assert.equal(
    noticeUpdatedLabel('2026-10-14T00:00:00Z', '2026-10-14T14:00:00Z'),
    ''
  );
  assert.equal(
    noticeUpdatedLabel('2026-10-14T00:00:00Z', '2026-10-14T15:00:00Z'),
    '2026.10.15'
  );
  assert.equal(
    noticeUpdatedLabel('2026-10-14T00:00:00Z', '2026-10-14T00:00:00Z'),
    ''
  );
  assert.equal(noticeUpdatedLabel('invalid', '2026-10-14T00:00:00Z'), '');
});
