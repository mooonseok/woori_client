import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  changePassword,
  requestEmailChange,
  confirmEmailChange,
} from '../src/services/account-settings.ts';
import {
  emailChangeToken,
  forgetEmailChangeToken,
  rememberEmailChangeToken,
} from '../src/services/email-change-token.ts';
import { ApiError, SESSION_EXPIRED } from '../src/services/api-client.ts';

test('account changes keep credentials in cookie-protected POST bodies with no URL/cache exposure', async (t) => {
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
      const call = new Request(input, init);
      calls.push(call);
      return call.url.endsWith('/request')
        ? Response.json({ accepted: true }, { status: 202 })
        : new Response(null, { status: 204 });
    }
  );
  await changePassword({
    currentPassword: 'current-fixture',
    newPassword: 'changed-fixture',
  });
  const result = await requestEmailChange({
    currentPassword: 'current-fixture',
    newEmail: 'new@example.test',
  });
  await confirmEmailChange('t'.repeat(43));
  assert.equal(result.accepted, true);
  assert.deepEqual(
    calls.map((r) => new URL(r.url).pathname),
    [
      '/v1/auth/password/change',
      '/v1/auth/email-change/request',
      '/v1/auth/email-change/confirm',
    ]
  );
  for (const call of calls) {
    assert.equal(call.method, 'POST');
    assert.equal(call.credentials, 'include');
    assert.equal(call.cache, 'no-store');
    assert.equal(call.headers.get('X-Woori-Request'), '1');
    assert.equal(new URL(call.url).search, '');
  }
  assert.deepEqual(await calls[0].json(), {
    currentPassword: 'current-fixture',
    newPassword: 'changed-fixture',
  });
  assert.deepEqual(await calls[2].json(), { token: 't'.repeat(43) });
});

test('wrong current passwords and invalid/duplicate emails do not expire a valid login', async (t) => {
  const saved = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
  const events: string[] = [];
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
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
    if (previousWindow)
      Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
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
      return Response.json(
        { message: '현재 비밀번호를 확인해 주세요.' },
        { status }
      );
    }
  );
  await assert.rejects(
    changePassword({
      currentPassword: 'wrong',
      newPassword: 'changed-fixture',
    }),
    (e: unknown) => e instanceof ApiError && e.status === 400
  );
  status = 409;
  await assert.rejects(
    requestEmailChange({
      currentPassword: 'current-fixture',
      newEmail: 'taken@example.test',
    }),
    (e: unknown) => e instanceof ApiError && e.status === 409
  );
  status = 400;
  await assert.rejects(
    confirmEmailChange('t'.repeat(43)),
    (e: unknown) => e instanceof ApiError && e.status === 400
  );
  assert.equal(events.includes(SESSION_EXPIRED), false);
  const cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(
    requestEmailChange(
      { currentPassword: 'current-fixture', newEmail: 'new@example.test' },
      cancelled.signal
    ),
    (e: unknown) => e instanceof DOMException && e.name === 'AbortError'
  );
});

test('email link survives a login remount in memory, replaces old links, expires, and clears explicitly', (t) => {
  let now = 1000;
  t.mock.method(Date, 'now', () => now);
  t.after(forgetEmailChangeToken);
  rememberEmailChangeToken('a'.repeat(43));
  assert.equal(emailChangeToken(), 'a'.repeat(43));
  assert.equal(emailChangeToken(), 'a'.repeat(43));
  rememberEmailChangeToken('b'.repeat(43));
  assert.equal(emailChangeToken(), 'b'.repeat(43));
  now += 30 * 60 * 1000;
  assert.equal(emailChangeToken(), '');
  rememberEmailChangeToken('c'.repeat(43));
  forgetEmailChangeToken();
  assert.equal(emailChangeToken(), '');
  rememberEmailChangeToken('invalid-token');
  assert.equal(emailChangeToken(), '');
});
