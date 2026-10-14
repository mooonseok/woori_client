import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authDestination, safeReturnTo } from '../src/utils/auth-navigation.ts';
const token = 'a'.repeat(43);
test('external, protocol-relative and encoded destinations cannot escape the app', () => {
  for (const value of [
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/%2f%2fevil.example',
    'javascript:alert(1)',
    '/invite\n',
    '/admin',
    '/login?next=//evil.example',
  ])
    assert.equal(safeReturnTo(value), '/');
});
test('invitation destination survives signup/login without leaking arbitrary parameters', () => {
  const safe = safeReturnTo(`/invite?token=${token}&evil=abc`);
  assert.equal(safe, `/invite?token=${token}`);
  assert.equal(
    new URL(
      authDestination('/login', safe),
      'https://woori.invalid'
    ).searchParams.get('next'),
    safe
  );
});
test('email token is retained through login with only a safe invitation continuation', () => {
  const invite = '/invite?code=01ABCDEFGH';
  const safe = safeReturnTo(
    `/verify-email?token=${token}&next=${encodeURIComponent(invite)}`
  );
  const url = new URL(safe, 'https://woori.invalid');
  assert.equal(url.searchParams.get('token'), token);
  assert.equal(url.searchParams.get('next'), invite);
  assert.equal(
    safeReturnTo(`/verify-email?token=${token}&next=https://evil.example`),
    `/verify-email?token=${token}`
  );
});
test('invalid invitation tokens are not forwarded', () => {
  assert.equal(safeReturnTo('/invite?token=%3Cscript%3E'), '/invite');
  assert.equal(
    safeReturnTo('/invite?code=ABCDEF1234'),
    '/invite?code=ABCDEF1234'
  );
});
