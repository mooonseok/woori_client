import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deleteAccount,
  getAccountDeletionPreview,
} from '../src/services/account-settings.ts';
import { ApiError, SESSION_EXPIRED } from '../src/services/api-client.ts';
import { createCredentialChanges } from '../src/services/credential-changes.ts';

test('deletion checks owned groups privately and keeps password/confirmation only in the authenticated POST body', async (t) => {
  const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
  t.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previous;
  });
  const calls: Request[] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request, init?: RequestInit) => {
      const call = new Request(input, init);
      calls.push(call);
      return call.method === 'GET'
        ? Response.json({
            canDelete: false,
            ownedGroupCount: 101,
            ownedGroups: [{ id: 'group-owner', name: '가족' }],
          })
        : new Response(null, { status: 204 });
    }
  );
  const preview = await getAccountDeletionPreview();
  assert.equal(preview.canDelete, false);
  assert.equal(preview.ownedGroupCount, 101);
  assert.equal(preview.ownedGroups[0].id, 'group-owner');
  await deleteAccount({
    currentPassword: 'fixture-password',
    confirmation: '탈퇴',
  });
  assert.deepEqual(
    calls.map((c) => c.method),
    ['GET', 'POST']
  );
  for (const call of calls) {
    assert.equal(new URL(call.url).pathname, '/v1/auth/account-deletion');
    assert.equal(new URL(call.url).search, '');
    assert.equal(call.credentials, 'include');
    assert.equal(call.cache, 'no-store');
  }
  assert.equal(calls[1].headers.get('X-Woori-Request'), '1');
  assert.deepEqual(await calls[1].json(), {
    currentPassword: 'fixture-password',
    confirmation: '탈퇴',
  });
});

test('ownership or password rejection preserves auth/push, and later deletion succeeds through the existing cleanup barrier', async (t) => {
  const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const events: string[] = [];
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
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previous;
    if (previousWindow)
      Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  });
  let status = 409,
    cleanups = 0,
    successes = 0;
  const changes = createCredentialChanges(async () => {
    cleanups++;
  });
  t.mock.method(globalThis, 'fetch', async () =>
    status === 204
      ? new Response(null, { status })
      : Response.json(
          {
            code:
              status === 409
                ? 'ACCOUNT_OWNS_GROUPS'
                : 'INVALID_CURRENT_PASSWORD',
            message: '계정을 다시 확인해 주세요.',
          },
          { status }
        )
  );
  const run = () =>
    changes.run(
      () =>
        deleteAccount({
          currentPassword: 'fixture-password',
          confirmation: '탈퇴',
        }),
      () => {
        successes++;
      }
    );
  await assert.rejects(
    run(),
    (error: unknown) => error instanceof ApiError && error.status === 409
  );
  status = 400;
  await assert.rejects(
    run(),
    (error: unknown) => error instanceof ApiError && error.status === 400
  );
  assert.equal(cleanups, 0);
  assert.equal(successes, 0);
  assert.equal(events.includes(SESSION_EXPIRED), false);
  status = 204;
  await run();
  assert.equal(cleanups, 1);
  assert.equal(successes, 1);
});

test('cancelling the ownership preview does not convert the request into deletion or a network failure', async (t) => {
  const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
  t.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previous;
  });
  const controller = new AbortController();
  controller.abort();
  t.mock.method(
    globalThis,
    'fetch',
    async (_input: unknown, init?: RequestInit) => {
      assert.equal(init?.method, undefined);
      assert.equal(init?.signal, controller.signal);
      throw new DOMException('Aborted', 'AbortError');
    }
  );
  await assert.rejects(
    getAccountDeletionPreview(controller.signal),
    (error: unknown) =>
      error instanceof DOMException && error.name === 'AbortError'
  );
});
