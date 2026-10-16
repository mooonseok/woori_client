import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { ApiError } from '../src/services/api-client.ts';
import {
  archiveNotice,
  createNotice,
  listNotices,
  publishNotice,
  updateNotice,
} from '../src/services/notices.ts';
import {
  answerInquiry,
  changeInquiryStatus,
  listInquiries,
} from '../src/services/inquiries.ts';
import {
  dismissReport,
  listReports,
  resolveReport,
  reviewReport,
} from '../src/services/reports.ts';
import { viewComment, viewPhoto } from '../src/services/content-viewing.ts';

const BASE = 'http://localhost:3001';
const ID = '0b7c6f2e-1d2a-4c3b-9e8f-7a6b5c4d3e2f';
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
function capture(
  t: TestContext,
  respond: () => Response = () => json(200, { id: ID })
) {
  const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = BASE;
  t.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previous;
  });
  const calls: Request[] = [];
  const mock = t.mock.method(
    globalThis,
    'fetch',
    async (input: RequestInfo, init?: RequestInit) => {
      calls.push(new Request(input, init));
      return respond();
    }
  );
  const last = async () => {
    const request = calls.at(-1)!;
    const text = await request.clone().text();
    return {
      method: request.method,
      path: request.url.slice(BASE.length),
      body: text ? JSON.parse(text) : undefined,
      guard: request.headers.get('X-Woori-Request'),
      credentials: request.credentials,
    };
  };
  return { calls, last, mock };
}

test('notice requests use the documented paths, methods and bodies', async (t) => {
  const http = capture(t);
  await createNotice({ title: '점검', body: '본문' });
  assert.deepEqual(await http.last(), {
    method: 'POST',
    path: '/v1/admin/notices',
    body: { title: '점검', body: '본문' },
    guard: '1',
    credentials: 'include',
  });
  await updateNotice(ID, { body: '새 본문' });
  assert.deepEqual((await http.last()).method, 'PATCH');
  assert.deepEqual((await http.last()).body, { body: '새 본문' });
  assert.equal((await http.last()).path, `/v1/admin/notices/${ID}`);
  await publishNotice(ID);
  assert.deepEqual((await http.last()).body, {});
  assert.equal((await http.last()).path, `/v1/admin/notices/${ID}/publish`);
  await publishNotice(ID, '2026-10-20T00:00:00.000Z');
  assert.deepEqual((await http.last()).body, {
    publishAt: '2026-10-20T00:00:00.000Z',
  });
  await archiveNotice(ID);
  assert.equal((await http.last()).path, `/v1/admin/notices/${ID}/archive`);
  assert.equal((await http.last()).guard, '1');
});

test('list queries send only chosen filters and the page size', async (t) => {
  const http = capture(t, () => json(200, { items: [], nextCursor: null }));
  await listNotices({ status: null, cursor: null });
  assert.equal((await http.last()).path, '/v1/admin/notices?limit=20');
  await listNotices({ status: 'ARCHIVED', cursor: 'c 1' });
  assert.equal(
    (await http.last()).path,
    '/v1/admin/notices?status=ARCHIVED&cursor=c+1&limit=20'
  );
  await listInquiries({ status: 'RECEIVED', category: 'BUG', cursor: null });
  assert.equal(
    (await http.last()).path,
    '/v1/admin/inquiries?status=RECEIVED&category=BUG&limit=20'
  );
  await listReports({ status: 'OPEN', targetType: null, cursor: null });
  assert.equal(
    (await http.last()).path,
    '/v1/admin/reports?status=OPEN&limit=20'
  );
  assert.equal((await http.last()).method, 'GET');
  assert.equal((await http.last()).guard, '1');
});

test('inquiry and report actions send exactly the contract fields', async (t) => {
  const http = capture(t);
  await answerInquiry(ID, '답변');
  assert.deepEqual(await http.last(), {
    method: 'POST',
    path: `/v1/admin/inquiries/${ID}/answer`,
    body: { answer: '답변' },
    guard: '1',
    credentials: 'include',
  });
  await changeInquiryStatus(ID, 'CLOSED');
  assert.deepEqual((await http.last()).body, { status: 'CLOSED' });
  await reviewReport(ID);
  assert.equal((await http.last()).path, `/v1/admin/reports/${ID}/review`);
  await dismissReport(ID, '사실 아님');
  assert.deepEqual((await http.last()).body, { reason: '사실 아님' });
  await resolveReport(ID, 'SUSPEND_USER', '반복 괴롭힘');
  assert.deepEqual(await http.last(), {
    method: 'POST',
    path: `/v1/admin/reports/${ID}/resolve`,
    body: { action: 'SUSPEND_USER', reason: '반복 괴롭힘' },
    guard: '1',
    credentials: 'include',
  });
});

test('record ids are validated before any request is sent', async (t) => {
  const http = capture(t);
  for (const bad of ['../members', `${ID}/../x`, '', 'not-a-uuid'])
    await assert.rejects(
      resolveReport(bad, 'DELETE_CONTENT', '사유'),
      (error: unknown) => error instanceof ApiError && error.status === 400
    );
  assert.equal(http.mock.mock.callCount(), 0);
});

test('photo view posts the reason, asks for an image and returns its bytes', async (t) => {
  const http = capture(
    t,
    () =>
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'Content-Type': 'image/webp' },
      })
  );
  const blob = await viewPhoto(ID, '신고 내용 확인');
  assert.equal(blob.type, 'image/webp');
  assert.equal(blob.size, 3);
  const request = http.calls.at(-1)!;
  assert.equal(request.method, 'POST');
  assert.equal(request.url, `${BASE}/v1/admin/photos/${ID}/view`);
  assert.equal(request.headers.get('Accept'), 'image/*');
  assert.equal(request.cache, 'no-store');
  assert.deepEqual(await request.json(), { reason: '신고 내용 확인' });
});

test('a non-image photo response and view errors are reported, not shown', async (t) => {
  let next = () => json(200, { url: 'https://example.invalid/original.jpg' });
  capture(t, () => next());
  await assert.rejects(
    viewPhoto(ID, '신고 내용 확인'),
    (error: unknown) => error instanceof ApiError && error.status === 502
  );
  next = () =>
    new Response('<svg xmlns="http://www.w3.org/2000/svg"/>', {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  await assert.rejects(viewPhoto(ID, '신고 내용 확인'), { status: 502 });
  next = () => json(403, { code: 'ADMIN_REAUTH_REQUIRED' });
  await assert.rejects(viewPhoto(ID, '신고 내용 확인'), {
    status: 403,
    code: 'ADMIN_REAUTH_REQUIRED',
  });
  next = () => json(200, { id: ID, body: '<b>댓글</b>' });
  const comment = await viewComment(ID, '신고 내용 확인');
  assert.equal(comment.body, '<b>댓글</b>');
});
