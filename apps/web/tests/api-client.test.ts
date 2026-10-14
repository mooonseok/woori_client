import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advanceSessionRevision,
  SESSION_EXPIRED,
  apiRequest,
  ApiError,
  post,
} from '../src/services/api-client.ts';
test('authenticated API requests enforce credential cookies and mutation guard headers; logout accepts 204', async () => {
  const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
  const original = globalThis.fetch;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
  const calls: Request[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push(new Request(input, init));
    return new Response(null, { status: 204 });
  };
  try {
    assert.equal(await post('/v1/auth/logout'), undefined);
    assert.equal(calls[0].credentials, 'include');
    assert.equal(calls[0].cache, 'no-store');
    assert.equal(calls[0].headers.get('X-Woori-Request'), '1');
    assert.equal(calls[0].headers.get('Content-Type'), 'application/json');
    await assert.rejects(
      apiRequest('https://evil.example'),
      (error: unknown) => error instanceof ApiError && error.status === 400
    );
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = original;
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previous;
  }
});
test('unconfigured or failed API never falls back to sample data', async () => {
  const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
  const original = globalThis.fetch;
  try {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    await assert.rejects(
      apiRequest('/v1/groups'),
      (error: unknown) => error instanceof ApiError && error.status === 503
    );
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
    globalThis.fetch = async () => {
      throw new TypeError('offline');
    };
    await assert.rejects(
      apiRequest('/v1/groups'),
      (error: unknown) => error instanceof ApiError && error.status === 0
    );
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: '인증이 만료됐어요.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    await assert.rejects(
      apiRequest('/v1/groups'),
      (error: unknown) => error instanceof ApiError && error.status === 401
    );
  } finally {
    globalThis.fetch = original;
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previous;
  }
});

test('a stale unauthorized response cannot erase the next authenticated session', async () => {
  const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
  const original = globalThis.fetch;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const events = new EventTarget();
  let expired = 0;
  events.addEventListener(SESSION_EXPIRED, () => expired++);
  Object.defineProperty(globalThis, 'window', {
    value: events,
    configurable: true,
  });
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
  let respond!: (response: Response) => void;
  globalThis.fetch = () =>
    new Promise<Response>((resolve) => {
      respond = resolve;
    });
  try {
    const oldRequest = apiRequest('/v1/auth/me');
    advanceSessionRevision();
    respond(new Response(null, { status: 401 }));
    await assert.rejects(oldRequest);
    assert.equal(expired, 0);
    globalThis.fetch = async () => new Response(null, { status: 401 });
    await assert.rejects(post('/v1/auth/login', {}));
    assert.equal(expired, 0);
    await assert.rejects(apiRequest('/v1/groups'));
    assert.equal(expired, 1);
  } finally {
    globalThis.fetch = original;
    if (originalWindow)
      Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previous;
  }
});
