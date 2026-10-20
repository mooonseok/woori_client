import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  requestRecovery,
  resetPassword,
  updateProfile,
} from '../src/services/recovery.ts';
import { ApiError } from '../src/services/api-client.ts';

test('recovery mutations use cookie/CSRF/no-store and keep tokens out of URLs', async (t) => {
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
    async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      calls.push(request);
      if (request.url.endsWith('/confirm'))
        return new Response(null, { status: 204 });
      return Response.json(
        request.method === 'PATCH'
          ? { user: { id: 'current', nickname: '새 별명' } }
          : { accepted: true }
      );
    }
  );
  await requestRecovery('username', {
    name: '이름',
    email: 'test@example.test',
  });
  await requestRecovery('password', {
    name: '이름',
    email: 'test@example.test',
  });
  await resetPassword({
    token: 'a'.repeat(43),
    newPassword: 'fixture-new-password',
  });
  const result = await updateProfile({ nickname: '새 별명' });
  assert.equal(result.user.nickname, '새 별명');
  assert.deepEqual(
    calls.map((r) => new URL(r.url).pathname),
    [
      '/v1/auth/recovery/username',
      '/v1/auth/recovery/password',
      '/v1/auth/recovery/password/confirm',
      '/v1/auth/profile',
    ]
  );
  for (const call of calls) {
    assert.equal(call.credentials, 'include');
    assert.equal(call.cache, 'no-store');
    assert.equal(call.headers.get('X-Woori-Request'), '1');
    assert.equal(new URL(call.url).search, '');
  }
  assert.deepEqual(await calls[3].json(), { nickname: '새 별명' });
});

test('expired links, rate limits and aborted requests remain failures', async (t) => {
  const saved = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
  t.after(() => {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = saved;
  });
  let status = 400;
  t.mock.method(
    globalThis,
    'fetch',
    async (_input: unknown, init?: RequestInit) => {
      if (init?.signal?.aborted)
        throw new DOMException('Aborted', 'AbortError');
      return Response.json({ message: '실패 안내' }, { status });
    }
  );
  await assert.rejects(
    resetPassword({
      token: 'a'.repeat(43),
      newPassword: 'fixture-new-password',
    }),
    (e: unknown) => e instanceof ApiError && e.status === 400
  );
  status = 429;
  await assert.rejects(
    requestRecovery('username', { name: '이름', email: 'test@example.test' }),
    (e: unknown) => e instanceof ApiError && e.status === 429
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    requestRecovery(
      'password',
      { name: '이름', email: 'test@example.test' },
      controller.signal
    ),
    (e: unknown) => e instanceof DOMException && e.name === 'AbortError'
  );
});

test('private account name edits remain separate from nickname edits', async (t) => {
  const saved = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
  t.after(() => {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = saved;
  });
  t.mock.method(
    globalThis,
    'fetch',
    async (_input: unknown, init?: RequestInit) => {
      assert.deepEqual(JSON.parse(String(init?.body)), {
        displayName: '복구 이름',
      });
      return Response.json({
        user: { displayName: '복구 이름', nickname: '별빛' },
      });
    }
  );
  const result = await updateProfile({ displayName: '복구 이름' });
  assert.equal(result.user.nickname, '별빛');
  assert.equal(result.user.displayName, '복구 이름');
});
