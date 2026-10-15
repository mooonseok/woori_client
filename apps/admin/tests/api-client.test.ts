import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import {
  ADMIN_SESSION_EXPIRED,
  ADMIN_SESSION_RECHECK,
  ApiError,
  advanceSessionRevision,
  apiRequest,
  isSessionLoss,
  post,
} from '../src/services/api-client.ts';
import { loginAdmin, verifyMfa } from '../src/services/admin-auth.ts';
import { auditLogsPath, listAuditLogs } from '../src/services/audit-logs.ts';

const BASE = 'http://localhost:3001';
function useEnvironment(t: TestContext) {
  const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const events = new EventTarget();
  const seen: string[] = [];
  for (const name of [ADMIN_SESSION_EXPIRED, ADMIN_SESSION_RECHECK])
    events.addEventListener(name, () => seen.push(name));
  Object.defineProperty(globalThis, 'window', {
    value: events,
    configurable: true,
  });
  process.env.NEXT_PUBLIC_API_BASE_URL = BASE;
  t.after(() => {
    if (originalWindow)
      Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previous;
  });
  return seen;
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

test('admin mutations send the cookie, the CSRF header and JSON; reads do not send the mutation header', async (t) => {
  useEnvironment(t);
  const calls: Request[] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (input: RequestInfo, init?: RequestInit) => {
      calls.push(new Request(input, init));
      return calls.length === 1
        ? json(200, {
            admin: { id: 'a', username: 'ops', displayName: '운영' },
            mfa: 'REQUIRED',
          })
        : new Response(null, { status: 204 });
    }
  );
  await loginAdmin({ username: 'ops', password: 'secret-password-1' });
  const [login] = calls;
  assert.equal(login.url, `${BASE}/v1/admin/auth/login`);
  assert.equal(login.method, 'POST');
  assert.equal(login.credentials, 'include');
  assert.equal(login.cache, 'no-store');
  assert.equal(login.headers.get('X-Woori-Request'), '1');
  assert.equal(login.headers.get('Content-Type'), 'application/json');
  assert.equal(login.headers.get('Accept'), 'application/json');
  assert.deepEqual(await login.json(), {
    username: 'ops',
    password: 'secret-password-1',
  });
  assert.equal(await apiRequest('/v1/admin/auth/me'), undefined);
  assert.equal(calls[1].method, 'GET');
  assert.equal(calls[1].credentials, 'include');
  assert.equal(calls[1].headers.get('X-Woori-Request'), null);
  assert.equal(calls[1].headers.get('Content-Type'), null);
});

test('only admin API paths on the configured base are requested', async (t) => {
  useEnvironment(t);
  const fetchMock = t.mock.method(globalThis, 'fetch', async () =>
    json(200, {})
  );
  for (const path of [
    '/v1/auth/me',
    'https://evil.example/v1/admin/auth/me',
    '//evil.example/v1/admin/auth/me',
    '/v1/admin/auth/me\r\nX: 1',
  ])
    await assert.rejects(
      apiRequest(path),
      (error: unknown) => error instanceof ApiError && error.status === 400
    );
  assert.equal(fetchMock.mock.callCount(), 0);
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
  await assert.rejects(
    apiRequest('/v1/admin/auth/me'),
    (error: unknown) => error instanceof ApiError && error.status === 503
  );
  process.env.NEXT_PUBLIC_API_BASE_URL = BASE;
  fetchMock.mock.mockImplementation(async () => {
    throw new TypeError('offline');
  });
  await assert.rejects(
    apiRequest('/v1/admin/auth/me'),
    (error: unknown) => error instanceof ApiError && error.status === 0
  );
});

test('server error codes are kept and mapped to Korean text; server text is used only for unknown codes', async (t) => {
  useEnvironment(t);
  const responses = [
    json(403, { code: 'ADMIN_REAUTH_REQUIRED', message: 'raw' }),
    json(503, { code: 'ADMIN_NOT_CONFIGURED' }),
    json(429, { code: 'TOO_MANY_REQUESTS', message: 'Too Many Requests' }),
    json(400, { code: 'SOMETHING_NEW', message: '서버가 보낸 설명' }),
    new Response('not json', { status: 500 }),
  ];
  t.mock.method(globalThis, 'fetch', async () => responses.shift()!);
  const failure = (path: string) =>
    apiRequest(path).then(
      () => assert.fail('expected an error'),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        return error;
      }
    );
  const reauth = await failure('/v1/admin/members');
  assert.equal(reauth.status, 403);
  assert.equal(reauth.code, 'ADMIN_REAUTH_REQUIRED');
  assert.match(reauth.message, /다시 확인/);
  const unconfigured = await failure('/v1/admin/auth/me');
  assert.equal(unconfigured.code, 'ADMIN_NOT_CONFIGURED');
  assert.match(unconfigured.message, /설정되지 않았어요/);
  assert.match(
    (await failure('/v1/admin/auth/me')).message,
    /요청이 너무 많아요/
  );
  assert.equal((await failure('/v1/admin/x')).message, '서버가 보낸 설명');
  const internal = await failure('/v1/admin/x');
  assert.equal(internal.status, 500);
  assert.equal(internal.code, undefined);
});

test('only a missing admin session signals session loss; wrong codes, login failures and stale answers do not', async (t) => {
  const seen = useEnvironment(t);
  assert.equal(
    isSessionLoss('/v1/admin/auth/me', 401, 'ADMIN_AUTHENTICATION_REQUIRED'),
    true
  );
  assert.equal(isSessionLoss('/v1/admin/auth/me', 401), true);
  assert.equal(
    isSessionLoss('/v1/admin/auth/mfa/verify', 401, 'ADMIN_MFA_INVALID'),
    false
  );
  assert.equal(
    isSessionLoss('/v1/admin/auth/reauth', 401, 'ADMIN_INVALID_CREDENTIALS'),
    false
  );
  assert.equal(isSessionLoss('/v1/admin/auth/login', 401), false);
  assert.equal(
    isSessionLoss('/v1/admin/auth/me', 403, 'ADMIN_MFA_REQUIRED'),
    false
  );
  let respond!: (response: Response) => void;
  t.mock.method(
    globalThis,
    'fetch',
    () =>
      new Promise<Response>((resolve) => {
        respond = resolve;
      })
  );
  const wrongCode = verifyMfa('123456');
  respond(json(401, { code: 'ADMIN_MFA_INVALID' }));
  await assert.rejects(wrongCode, { code: 'ADMIN_MFA_INVALID' });
  const login = loginAdmin({ username: 'ops', password: 'x' });
  respond(json(401, { code: 'ADMIN_INVALID_CREDENTIALS' }));
  await assert.rejects(login, { status: 401 });
  assert.deepEqual(seen, []);
  const stale = apiRequest('/v1/admin/audit-logs');
  advanceSessionRevision();
  respond(json(401, { code: 'ADMIN_AUTHENTICATION_REQUIRED' }));
  await assert.rejects(stale);
  assert.deepEqual(seen, []);
  const expired = apiRequest('/v1/admin/audit-logs');
  respond(json(401, { code: 'ADMIN_AUTHENTICATION_REQUIRED' }));
  await assert.rejects(expired);
  assert.deepEqual(seen, [ADMIN_SESSION_EXPIRED]);
  const preMfa = apiRequest('/v1/admin/audit-logs');
  respond(json(403, { code: 'ADMIN_MFA_REQUIRED' }));
  await assert.rejects(preMfa, { code: 'ADMIN_MFA_REQUIRED' });
  assert.deepEqual(seen, [ADMIN_SESSION_EXPIRED, ADMIN_SESSION_RECHECK]);
  const controller = new AbortController();
  const aborted = apiRequest('/v1/admin/audit-logs', {
    signal: controller.signal,
  });
  controller.abort();
  respond(json(401, { code: 'ADMIN_AUTHENTICATION_REQUIRED' }));
  await assert.rejects(aborted);
  assert.equal(seen.length, 2);
});

test('logout accepts 204 and audit-log queries encode cursor, limit and action', async (t) => {
  useEnvironment(t);
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo) => {
    urls.push(String(input));
    return urls.length === 1
      ? new Response(null, { status: 204 })
      : json(200, { items: [{ id: '1' }], nextCursor: 'next-1' });
  });
  assert.equal(await post('/v1/admin/auth/logout'), undefined);
  assert.equal(
    auditLogsPath({ cursor: null, action: null }),
    '/v1/admin/audit-logs?limit=50'
  );
  assert.equal(
    auditLogsPath({ cursor: 'a b&c', action: 'ADMIN_LOCKED', limit: 5 }),
    '/v1/admin/audit-logs?cursor=a+b%26c&limit=5&action=ADMIN_LOCKED'
  );
  const page = await listAuditLogs({ cursor: 'c1', action: 'ADMIN_LOCKED' });
  assert.equal(page.nextCursor, 'next-1');
  assert.equal(
    urls[1],
    `${BASE}/v1/admin/audit-logs?cursor=c1&limit=50&action=ADMIN_LOCKED`
  );
});

test('a malformed audit page is an error, never an empty success', async (t) => {
  useEnvironment(t);
  t.mock.method(globalThis, 'fetch', async () => json(200, { rows: [] }));
  await assert.rejects(listAuditLogs({ cursor: null, action: null }), /형식/);
});
