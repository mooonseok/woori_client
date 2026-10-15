import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_OPTIONS,
  auditActionLabel,
  auditMetadataLabel,
  auditTargetLabel,
  isKnownAuditAction,
} from '../src/content/audit-actions.ts';
import { kstDateTimeLabel, kstTimeLabel, isFuture } from '../src/utils/time.ts';

test('known audit actions have Korean labels; unknown ones stay visible as raw codes', () => {
  assert.equal(auditActionLabel('ADMIN_LOGIN_SUCCEEDED'), '로그인 성공');
  assert.equal(
    auditActionLabel('ADMIN_MFA_RESET_BY_CLI'),
    '2단계 인증 초기화 (CLI)'
  );
  assert.equal(auditActionLabel('ADMIN_FUTURE_ACTION'), 'ADMIN_FUTURE_ACTION');
  // Inherited object keys are not labels.
  assert.equal(auditActionLabel('constructor'), 'constructor');
  assert.equal(auditActionLabel('toString'), 'toString');
  assert.equal(auditActionLabel(''), '알 수 없는 작업');
  assert.equal(auditActionLabel(null), '알 수 없는 작업');
  assert.equal(auditTargetLabel('ADMIN'), '관리자');
  assert.equal(auditTargetLabel('SOMETHING'), 'SOMETHING');
  assert.equal(auditTargetLabel(null), '');
});

test('slice C member and group actions have labels', () => {
  assert.equal(auditActionLabel('ADMIN_USER_VIEWED'), '회원 열람');
  assert.equal(auditActionLabel('ADMIN_USER_RENAMED'), '회원 이름 변경');
  assert.equal(auditActionLabel('ADMIN_USER_SUSPENDED'), '회원 이용 정지');
  assert.equal(auditActionLabel('ADMIN_USER_UNSUSPENDED'), '회원 정지 해제');
  assert.equal(auditActionLabel('ADMIN_USER_DELETED'), '회원 삭제');
  assert.equal(auditActionLabel('ADMIN_GROUP_VIEWED'), '그룹 열람');
  assert.equal(auditTargetLabel('ALBUM'), '앨범');
});

test('the action filter offers exactly the labelled actions', () => {
  assert.equal(
    AUDIT_ACTION_OPTIONS.length,
    Object.keys(AUDIT_ACTION_LABELS).length
  );
  for (const option of AUDIT_ACTION_OPTIONS) {
    assert.match(option.value, /^ADMIN_[A-Z_]+$/);
    assert.equal(isKnownAuditAction(option.value), true);
  }
  assert.equal(isKnownAuditAction('toString'), false);
  assert.equal(isKnownAuditAction(''), false);
});

test('audit metadata shows only primitive values as plain text', () => {
  assert.equal(
    auditMetadataLabel({
      stage: 'VERIFY',
      sessionRevoked: true,
      revokedSessions: 2,
      nested: { secret: 'x' },
      list: [1],
    }),
    'stage: VERIFY · sessionRevoked: true · revokedSessions: 2'
  );
  assert.equal(auditMetadataLabel(null), '');
  assert.equal(
    auditMetadataLabel([] as unknown as Record<string, unknown>),
    ''
  );
});

test('audit times are shown in KST', () => {
  assert.equal(
    kstDateTimeLabel('2026-10-15T15:30:05.000Z'),
    '2026.10.16 00:30:05'
  );
  assert.equal(kstTimeLabel('2026-10-15T01:02:00Z'), '10:02');
  assert.equal(kstDateTimeLabel('not a date'), '');
  assert.equal(kstDateTimeLabel(null), '');
  assert.equal(
    isFuture('2026-10-15T00:00:00Z', Date.parse('2026-10-14T00:00:00Z')),
    true
  );
  assert.equal(
    isFuture('2026-10-15T00:00:00Z', Date.parse('2026-10-16T00:00:00Z')),
    false
  );
  assert.equal(isFuture(null), false);
});
