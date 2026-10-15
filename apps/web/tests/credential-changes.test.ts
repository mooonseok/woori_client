import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCredentialChanges } from '../src/services/credential-changes.ts';

test('same-session expiry after server commit still completes success and blocks login behind push cleanup', async () => {
  const response = Promise.withResolvers<void>();
  const cleanup = Promise.withResolvers<void>();
  let privateData = true,
    navigated = false,
    cleaned = false;
  const changes = createCredentialChanges(() => {
    cleaned = true;
    return cleanup.promise;
  });
  const request = changes.run(
    () => response.promise,
    () => {
      privateData = false;
      navigated = true;
    }
  );
  // Notification polling receives 401 after the commit, before its response.
  privateData = false;
  response.resolve();
  await Promise.resolve();
  assert.equal(navigated, true);
  assert.equal(cleaned, true);
  assert.equal(privateData, false);
  let nextLogin = false;
  const login = changes.waitForCleanup().then(() => {
    nextLogin = true;
  });
  await Promise.resolve();
  assert.equal(nextLogin, false);
  cleanup.resolve();
  await request;
  await login;
  assert.equal(nextLogin, true);
});

test('a new login fences an older successful credential response without clearing new-account push', async () => {
  const response = Promise.withResolvers<void>();
  let cleaned = false,
    applied = false;
  const changes = createCredentialChanges(async () => {
    cleaned = true;
  });
  const request = changes.run(
    () => response.promise,
    () => {
      applied = true;
    }
  );
  changes.identityChanged();
  let loginPosted = false;
  const login = changes.waitForCleanup().then(() => {
    loginPosted = true;
  });
  await Promise.resolve();
  assert.equal(
    loginPosted,
    false,
    'new login waits for the old Set-Cookie response'
  );
  response.resolve();
  await assert.rejects(request, /계정 상태/);
  await login;
  assert.equal(loginPosted, true);
  assert.equal(cleaned, false);
  assert.equal(applied, false);
});

test('mutation rejection preserves the current account, while unavailable browser cleanup still signs out after success', async () => {
  let applied = 0,
    cleaned = 0;
  const changes = createCredentialChanges(async () => {
    cleaned++;
    throw new Error('unsupported push runtime');
  });
  await assert.rejects(
    changes.run(
      async () => {
        throw new Error('wrong password');
      },
      () => {
        applied++;
      }
    ),
    /wrong password/
  );
  assert.equal(cleaned, 0);
  assert.equal(applied, 0);
  await changes.run(
    async () => undefined,
    () => {
      applied++;
    }
  );
  assert.equal(cleaned, 1);
  assert.equal(applied, 1);
});
