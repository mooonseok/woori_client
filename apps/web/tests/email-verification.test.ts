import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emailVerificationState } from '../src/utils/email-verification.ts';

test('an incoming email link must be validated even for an already verified account', () => {
  assert.equal(
    emailVerificationState('authenticated', true, true, true),
    'confirm'
  );
  assert.equal(
    emailVerificationState('authenticated', true, false, true),
    'confirm'
  );
  assert.equal(
    emailVerificationState('authenticated', true, true, false),
    'verified'
  );
  assert.equal(
    emailVerificationState('authenticated', true, false, false),
    'waiting'
  );
});

test('loading, failed account lookup and logged-out links never imply verification success', () => {
  assert.equal(emailVerificationState('loading', true, true, true), 'loading');
  assert.equal(
    emailVerificationState('error', true, true, false),
    'connection-error'
  );
  assert.equal(
    emailVerificationState('anonymous', false, false, true),
    'anonymous'
  );
});
