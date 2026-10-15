import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../src/services/group-management.ts';
import { ApiError } from '../src/services/api-client.ts';

test('group lifecycle requests preserve cookie/CSRF protection, pagination and exact delete confirmation', async (t) => {
  const saved = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
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
      if (
        request.url.includes('/leave') ||
        request.url.includes('/members/member')
      )
        return new Response(null, { status: 204 });
      return Response.json(
        request.method === 'GET'
          ? { members: [], nextCursor: null }
          : {
              accepted: true,
              group: { id: 'group', name: '새 그룹', role: 'MEMBER' },
            }
      );
    }
  );
  const page = await api.listGroupMembers('group', 'cursor');
  assert.equal(page.nextCursor, null);
  await api.renameGroup('group', ' 새 그룹 ');
  await api.leaveGroup('group');
  await api.removeGroupMember('group', 'member');
  const transfer = await api.transferGroupOwnership('group', 'member');
  assert.equal(transfer.group.role, 'MEMBER');
  await api.deleteGroup('group', ' 그대로 확인 ');
  assert.equal(new URL(calls[0].url).searchParams.get('after'), 'cursor');
  assert.equal(new URL(calls[0].url).searchParams.get('limit'), '30');
  assert.deepEqual(
    calls.map((r) => r.method),
    ['GET', 'PATCH', 'POST', 'DELETE', 'POST', 'DELETE']
  );
  assert.deepEqual(await calls[1].json(), { name: '새 그룹' });
  assert.deepEqual(await calls[4].json(), { userId: 'member' });
  assert.deepEqual(await calls[5].json(), { name: ' 그대로 확인 ' });
  for (const call of calls) {
    assert.equal(call.credentials, 'include');
    assert.equal(call.cache, 'no-store');
    if (call.method !== 'GET')
      assert.equal(call.headers.get('X-Woori-Request'), '1');
  }
});

test('owner, removed membership and conflict failures remain visible; aborted scope cannot succeed', async (t) => {
  const saved = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
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
      return Response.json({ message: '권한이 변경됐어요.' }, { status });
    }
  );
  for (status of [403, 404, 409])
    await assert.rejects(
      api.transferGroupOwnership('group', 'member'),
      (error: unknown) => error instanceof ApiError && error.status === status
    );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    api.deleteGroup('group', 'name', controller.signal),
    (error: unknown) =>
      error instanceof DOMException && error.name === 'AbortError'
  );
});
