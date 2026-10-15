import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ACCOUNT_SUSPENDED_MESSAGE,
  isAccountSuspended,
  loginFailure,
} from '../src/utils/auth-errors.ts';
import {
  ApiError,
  GROUP_ACCESS_RECHECK,
  SESSION_EXPIRED,
  apiRequest,
  post,
} from '../src/services/api-client.ts';

test('a suspended account gets its own message; wrong passwords keep the generic text', () => {
  const suspended = new ApiError(403, '서버 문구', 'ACCOUNT_SUSPENDED');
  assert.deepEqual(loginFailure(suspended), {
    message: ACCOUNT_SUSPENDED_MESSAGE,
    suspended: true,
  });
  assert.equal(
    ACCOUNT_SUSPENDED_MESSAGE,
    '이용이 정지된 계정이에요. 문의가 필요하면 운영자에게 연락해 주세요.'
  );
  const wrong = new ApiError(
    401,
    '아이디와 비밀번호를 확인해 주세요.',
    'INVALID_CREDENTIALS'
  );
  assert.deepEqual(loginFailure(wrong), {
    message: '아이디와 비밀번호를 확인해 주세요.',
    suspended: false,
  });
  assert.equal(isAccountSuspended(new ApiError(403, 'x', 'FORBIDDEN')), false);
  assert.equal(
    isAccountSuspended(new ApiError(401, 'x', 'ACCOUNT_SUSPENDED')),
    false
  );
  assert.equal(loginFailure(null).message, '요청을 처리하지 못했어요.');
});

test('a suspended login is not a session loss; a revoked session still returns to login', async (t) => {
  const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const events = new EventTarget();
  const seen: string[] = [];
  for (const name of [SESSION_EXPIRED, GROUP_ACCESS_RECHECK])
    events.addEventListener(name, () => seen.push(name));
  Object.defineProperty(globalThis, 'window', {
    value: events,
    configurable: true,
  });
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
  t.after(() => {
    if (originalWindow)
      Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previous;
  });
  let next = () =>
    new Response(
      JSON.stringify({
        code: 'ACCOUNT_SUSPENDED',
        message: ACCOUNT_SUSPENDED_MESSAGE,
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => next());
  await assert.rejects(
    post('/v1/auth/login', { username: 'a', password: 'b' }),
    {
      status: 403,
      code: 'ACCOUNT_SUSPENDED',
    }
  );
  // One request, no follow-up retry and no session/group events.
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.deepEqual(seen, []);
  // An open tab whose session was revoked (e.g. by suspension) still goes
  // back to login through the existing SESSION_EXPIRED path.
  next = () =>
    new Response(JSON.stringify({ code: 'AUTHENTICATION_REQUIRED' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  await assert.rejects(apiRequest('/v1/groups'), { status: 401 });
  assert.deepEqual(seen, [SESSION_EXPIRED]);
});
