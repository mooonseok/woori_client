import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  OWNED_GROUPS_MESSAGE,
  memberActionCopy,
} from '../src/content/member-copy.ts';
import {
  confirmUsernameMatches,
  memberActions,
  normalizeSearch,
} from '../src/utils/member-actions.ts';
import { plainTextError, RULES } from '../src/utils/plain-text.ts';

test('available actions follow the member status', () => {
  assert.deepEqual(memberActions('ACTIVE'), ['rename', 'suspend', 'delete']);
  assert.deepEqual(memberActions('SUSPENDED'), [
    'rename',
    'unsuspend',
    'delete',
  ]);
  assert.deepEqual(memberActions('DELETED'), []);
});

test('deletion needs the exact current username', () => {
  assert.equal(confirmUsernameMatches('woori_kim', 'woori_kim'), true);
  assert.equal(confirmUsernameMatches('  woori_kim ', 'woori_kim'), true);
  assert.equal(confirmUsernameMatches('WOORI_KIM', 'woori_kim'), false);
  assert.equal(confirmUsernameMatches('woori', 'woori_kim'), false);
  assert.equal(confirmUsernameMatches('', ''), false);
});

test('suspension copy explains what changes and what stays', () => {
  const copy = memberActionCopy('suspend', '김우리');
  assert.equal(copy.title, '김우리 회원을 이용 정지할까요?');
  const text = copy.consequences.join(' ');
  assert.match(text, /본인의 접근만 막아요/);
  assert.match(text, /공유한 사진과 댓글은 그룹에 그대로 남아/);
  assert.match(text, /로그인 세션과 알림 구독이 해제/);
  assert.match(text, /정지를 해제해도 복구되지 않아 회원이 다시 로그인/);
  assert.ok(copy.acknowledge);
  assert.equal(copy.danger, true);
  const lift = memberActionCopy('unsuspend', '김우리');
  assert.match(lift.consequences.join(' '), /복구되지 않아요/);
  assert.equal(lift.acknowledge, undefined);
});

test('deletion copy matches member account deletion and owned-group refusal', () => {
  const copy = memberActionCopy('delete', '');
  assert.equal(copy.title, '이 회원을 삭제할까요?');
  const text = copy.consequences.join(' ');
  assert.match(text, /되돌릴 수 없어요/);
  assert.match(text, /탈퇴한 회원/);
  assert.match(text, /문의와 차단 목록은 삭제/);
  assert.match(text, /소유한 그룹/);
  assert.match(OWNED_GROUPS_MESSAGE, /그룹을 삭제하는 기능이 없어요/);
  assert.match(
    memberActionCopy('rename', '김우리').consequences.join(' '),
    /이전 이름과 새 이름은 기록되지 않아요/
  );
});

test('search text and member reasons are normalized like the server', () => {
  assert.equal(normalizeSearch('  우리  '), '우리');
  assert.equal(normalizeSearch('😀'.repeat(70)), '😀'.repeat(64));
  assert.match(plainTextError('정책', RULES.memberReason), /5자 이상/);
  assert.equal(plainTextError('정책 위반 확인', RULES.memberReason), '');
  assert.match(
    plainTextError('a'.repeat(501), RULES.memberReason),
    /500자까지/
  );
});
