import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  endReasonOf,
  gateDecision,
  loginDestination,
  mfaRoute,
  navHrefOf,
  routeKind,
  safeReturnTo,
  withNext,
  type GateInput,
} from '../src/utils/admin-navigation.ts';

test('return paths stay inside known admin console screens', () => {
  assert.equal(safeReturnTo('/audit-logs'), '/audit-logs');
  assert.equal(safeReturnTo('/audit-logs/'), '/audit-logs');
  assert.equal(safeReturnTo('/members?id=1#x'), '/members');
  assert.equal(safeReturnTo('/'), '/');
  for (const unsafe of [
    null,
    undefined,
    '',
    'audit-logs',
    '//evil.example/audit-logs',
    '/\\evil.example',
    'https://evil.example/audit-logs',
    'javascript:alert(1)',
    '/audit-logs\nSet-Cookie: x',
    '/login',
    '/mfa',
    '/mfa/setup',
    '/unknown',
    '/%2F%2Fevil.example',
    '/../audit-logs/..',
  ])
    assert.equal(safeReturnTo(unsafe), '/', String(unsafe));
});

test('password login always continues into the matching MFA step', () => {
  assert.equal(mfaRoute('SETUP_REQUIRED'), '/mfa/setup');
  assert.equal(mfaRoute('REQUIRED'), '/mfa');
  assert.equal(mfaRoute('VERIFIED'), null);
  assert.equal(
    loginDestination('SETUP_REQUIRED', '/audit-logs'),
    '/mfa/setup?next=%2Faudit-logs'
  );
  assert.equal(loginDestination('REQUIRED', '/'), '/mfa');
  assert.equal(loginDestination('REQUIRED', '//evil.example'), '/mfa');
  assert.equal(loginDestination('VERIFIED', '/audit-logs'), '/audit-logs');
  assert.equal(
    withNext('/login', '/members', 'expired'),
    '/login?next=%2Fmembers&reason=expired'
  );
  assert.equal(routeKind('/mfa/setup/'), 'mfa-setup');
  assert.equal(routeKind('/login'), 'login');
  assert.equal(routeKind('/whatever'), 'protected');
});

test('the gate routes each session state to exactly one screen', () => {
  const base: GateInput = {
    path: '/',
    search: '',
    status: 'authenticated',
    mfa: 'VERIFIED',
    endReason: null,
  };
  const decide = (input: Partial<GateInput>) =>
    gateDecision({ ...base, ...input });
  assert.deepEqual(decide({ status: 'loading', mfa: null }), {
    type: 'loading',
  });
  assert.deepEqual(decide({ status: 'error', mfa: null }), { type: 'error' });
  assert.deepEqual(decide({ status: 'error', mfa: null, path: '/login' }), {
    type: 'render',
  });
  // Anonymous: protected screens go to login and keep where they were.
  const anonymous = { status: 'anonymous' as const, mfa: null };
  assert.deepEqual(decide({ ...anonymous, path: '/audit-logs' }), {
    type: 'redirect',
    to: '/login?next=%2Faudit-logs',
  });
  assert.deepEqual(decide({ ...anonymous, path: '/login' }), {
    type: 'render',
  });
  assert.deepEqual(
    decide({ ...anonymous, path: '/mfa', search: '?next=%2Fmembers' }),
    { type: 'redirect', to: '/login?next=%2Fmembers' }
  );
  assert.deepEqual(
    decide({ ...anonymous, path: '/audit-logs', endReason: 'expired' }),
    { type: 'redirect', to: '/login?next=%2Faudit-logs&reason=expired' }
  );
  assert.deepEqual(
    decide({ ...anonymous, path: '/audit-logs', endReason: 'logout' }),
    { type: 'redirect', to: '/login?reason=logout' }
  );
  // Pre-MFA sessions only reach their own MFA step.
  assert.deepEqual(decide({ mfa: 'REQUIRED', path: '/audit-logs' }), {
    type: 'redirect',
    to: '/mfa?next=%2Faudit-logs',
  });
  assert.deepEqual(decide({ mfa: 'REQUIRED', path: '/mfa' }), {
    type: 'render',
  });
  assert.deepEqual(
    decide({ mfa: 'REQUIRED', path: '/mfa/setup', search: '?next=%2Fgroups' }),
    { type: 'redirect', to: '/mfa?next=%2Fgroups' }
  );
  assert.deepEqual(
    decide({
      mfa: 'SETUP_REQUIRED',
      path: '/login',
      search: '?next=%2Faudit-logs',
    }),
    { type: 'redirect', to: '/mfa/setup?next=%2Faudit-logs' }
  );
  // Verified sessions never see login/MFA again and ignore unsafe targets.
  assert.deepEqual(decide({ path: '/audit-logs' }), { type: 'render' });
  assert.deepEqual(decide({ path: '/login', search: '?next=%2Faudit-logs' }), {
    type: 'redirect',
    to: '/audit-logs',
  });
  assert.deepEqual(
    decide({ path: '/mfa', search: '?next=https%3A%2F%2Fevil.example' }),
    { type: 'redirect', to: '/' }
  );
});

test('login notices are chosen only from fixed reasons', () => {
  assert.equal(endReasonOf('expired'), 'expired');
  assert.equal(endReasonOf('mfa-failed'), 'mfa-failed');
  assert.equal(endReasonOf('<img src=x>'), null);
  assert.equal(endReasonOf(null), null);
});

test('record screens keep only a valid id across login and highlight their menu', () => {
  const id = '0b7c6f2e-1d2a-4c3b-9e8f-7a6b5c4d3e2f';
  assert.equal(safeReturnTo(`/report?id=${id}`), `/report?id=${id}`);
  assert.equal(safeReturnTo(`/report?id=${id}&x=1`), `/report?id=${id}`);
  assert.equal(safeReturnTo('/report?id=../../members'), '/reports');
  assert.equal(safeReturnTo('/inquiry'), '/inquiries');
  assert.equal(safeReturnTo('/notices/new'), '/notices/new');
  assert.equal(navHrefOf('/notice'), '/notices');
  assert.equal(navHrefOf('/notices/new'), '/notices');
  assert.equal(navHrefOf('/report/'), '/reports');
  assert.equal(navHrefOf('/audit-logs'), '/audit-logs');
  assert.equal(navHrefOf('/mfa'), null);
  assert.deepEqual(
    gateDecision({
      path: '/inquiry',
      search: `?id=${id}`,
      status: 'anonymous',
      mfa: null,
      endReason: 'expired',
    }),
    {
      type: 'redirect',
      to: `/login?next=%2Finquiry%3Fid%3D${id}&reason=expired`,
    }
  );
});

test('member and group detail screens are returnable and highlight their menu', () => {
  const id = '0b7c6f2e-1d2a-4c3b-9e8f-7a6b5c4d3e2f';
  assert.equal(safeReturnTo(`/member?id=${id}`), `/member?id=${id}`);
  assert.equal(safeReturnTo('/group?id=x'), '/groups');
  assert.equal(navHrefOf('/member'), '/members');
  assert.equal(navHrefOf('/group'), '/groups');
  assert.equal(safeReturnTo('/members'), '/members');
});
