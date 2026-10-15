import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ReauthCancelledError,
  createReauthPrompt,
  isReauthRequired,
  runWithReauth,
} from '../src/utils/reauth.ts';

const reauthRequired = Object.assign(new Error('재인증 필요'), {
  status: 403,
  code: 'ADMIN_REAUTH_REQUIRED',
});
function counter<T>(results: Array<T | Error>) {
  let calls = 0;
  return {
    run: async () => {
      const result = results[Math.min(calls++, results.length - 1)];
      if (result instanceof Error) throw result;
      return result;
    },
    calls: () => calls,
  };
}

test('a sensitive action that is allowed runs once without a prompt', async () => {
  const action = counter(['done']);
  let prompts = 0;
  assert.equal(
    await runWithReauth(action.run, async () => {
      prompts++;
      return true;
    }),
    'done'
  );
  assert.equal(action.calls(), 1);
  assert.equal(prompts, 0);
});

test('403 ADMIN_REAUTH_REQUIRED prompts once and retries exactly once', async () => {
  const action = counter([reauthRequired, 'done']);
  let prompts = 0;
  const result = await runWithReauth(action.run, async () => {
    prompts++;
    return true;
  });
  assert.equal(result, 'done');
  assert.equal(action.calls(), 2);
  assert.equal(prompts, 1);
});

test('a second refusal after re-authentication is returned, not looped', async () => {
  const action = counter([reauthRequired, reauthRequired, 'never']);
  let prompts = 0;
  await assert.rejects(
    runWithReauth(action.run, async () => {
      prompts++;
      return true;
    }),
    (error: unknown) => error === reauthRequired
  );
  assert.equal(action.calls(), 2);
  assert.equal(prompts, 1);
});

test('a cancelled prompt does not retry the action', async () => {
  const action = counter([reauthRequired, 'never']);
  await assert.rejects(
    runWithReauth(action.run, async () => false),
    ReauthCancelledError
  );
  assert.equal(action.calls(), 1);
});

test('other failures never open the prompt', async () => {
  for (const error of [
    Object.assign(new Error('mfa'), {
      status: 403,
      code: 'ADMIN_MFA_REQUIRED',
    }),
    Object.assign(new Error('gone'), {
      status: 401,
      code: 'ADMIN_AUTHENTICATION_REQUIRED',
    }),
    Object.assign(new Error('origin'), {
      status: 403,
      code: 'REQUEST_ORIGIN_REJECTED',
    }),
    new Error('network'),
  ]) {
    let prompts = 0;
    await assert.rejects(
      runWithReauth(
        async () => {
          throw error;
        },
        async () => {
          prompts++;
          return true;
        }
      ),
      (thrown: unknown) => thrown === error
    );
    assert.equal(prompts, 0);
  }
  assert.equal(isReauthRequired(reauthRequired), true);
  assert.equal(
    isReauthRequired({ status: 401, code: 'ADMIN_REAUTH_REQUIRED' }),
    false
  );
  assert.equal(isReauthRequired(null), false);
});

test('a failed re-authentication is reported and the action is not retried', async () => {
  const action = counter([reauthRequired, 'never']);
  const failure = new Error('잘못된 코드');
  await assert.rejects(
    runWithReauth(action.run, async () => {
      throw failure;
    }),
    (error: unknown) => error === failure
  );
  assert.equal(action.calls(), 1);
});

test('concurrent sensitive actions share one prompt and all retry after it', async () => {
  const states: boolean[] = [];
  const prompt = createReauthPrompt((open) => states.push(open));
  const first = counter([reauthRequired, 'a']);
  const second = counter([reauthRequired, 'b']);
  const pending = [
    runWithReauth(first.run, prompt.request),
    runWithReauth(second.run, prompt.request),
  ];
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(prompt.isOpen(), true);
  assert.deepEqual(states, [true]);
  prompt.settle(true);
  assert.deepEqual(await Promise.all(pending), ['a', 'b']);
  assert.deepEqual(states, [true, false]);
  assert.equal(prompt.isOpen(), false);
  // Settling again (e.g. on unmount) is harmless.
  prompt.settle(false);
  assert.deepEqual(states, [true, false]);
  const cancelled = prompt.request();
  prompt.settle(false);
  assert.equal(await cancelled, false);
});
