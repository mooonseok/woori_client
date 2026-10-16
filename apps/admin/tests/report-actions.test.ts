import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DISMISS_COPY,
  reportActionCopy,
  reportResultMessage,
} from '../src/content/report-action-copy.ts';
import {
  allowedReportActions,
  isReportOpen,
  reporterTextState,
} from '../src/utils/report-actions.ts';

test('only photos and comments can be deleted; any target user can be suspended', () => {
  assert.deepEqual(allowedReportActions('PHOTO'), [
    'DELETE_CONTENT',
    'SUSPEND_USER',
  ]);
  assert.deepEqual(allowedReportActions('COMMENT'), [
    'DELETE_CONTENT',
    'SUSPEND_USER',
  ]);
  assert.deepEqual(allowedReportActions('USER'), ['SUSPEND_USER']);
  assert.equal(reportActionCopy('DELETE_CONTENT', 'USER', '민수'), null);
});

test('the strong confirm names each consequence of the chosen action', () => {
  const photo = reportActionCopy('DELETE_CONTENT', 'PHOTO', '민수')!;
  assert.equal(photo.irreversible, true);
  assert.equal(photo.confirmLabel, '사진 삭제');
  assert.ok(photo.consequences.some((line) => /되돌릴 수 없어요/.test(line)));
  assert.ok(photo.consequences.some((line) => /용량/.test(line)));
  assert.ok(
    photo.consequences.some((line) => /다른 처리 대기 신고/.test(line))
  );
  assert.match(photo.acknowledge, /복구할 수 없다/);
  const comment = reportActionCopy('DELETE_CONTENT', 'COMMENT', '')!;
  assert.equal(comment.title, '신고된 댓글을 삭제할까요?');
  const suspend = reportActionCopy('SUSPEND_USER', 'PHOTO', '민수')!;
  assert.equal(suspend.irreversible, false);
  assert.equal(suspend.title, '민수 회원을 이용 정지할까요?');
  assert.ok(suspend.consequences.some((line) => /로그아웃/.test(line)));
  assert.ok(suspend.consequences.some((line) => /알림 구독/.test(line)));
  assert.ok(suspend.consequences.some((line) => /그대로 남아요/.test(line)));
  assert.match(suspend.acknowledge, /로그인이 끊긴다/);
  assert.equal(
    reportActionCopy('SUSPEND_USER', 'USER', '')?.title,
    '대상 회원을 이용 정지할까요?'
  );
  assert.ok(DISMISS_COPY.consequences.some((line) => /조치 없음/.test(line)));
});

test('result messages include same-target closures only when there are some', () => {
  assert.equal(
    reportResultMessage('DELETE_CONTENT', 'PHOTO', 0),
    '신고된 사진을 삭제하고 신고를 종료했어요.'
  );
  assert.match(
    reportResultMessage('SUSPEND_USER', 'USER', 2),
    /다른 신고 2건도/
  );
  assert.equal(
    reportResultMessage('DISMISS', 'COMMENT', undefined),
    '조치 없이 신고를 종료했어요.'
  );
});

test('reporter text distinguishes written, none and removed by withdrawal', () => {
  const reporter = {
    id: 'r',
    displayName: '신고자',
    status: 'ACTIVE' as const,
  };
  const withdrawn = {
    id: 'w',
    displayName: '탈퇴한 회원',
    status: 'DELETED' as const,
  };
  assert.deepEqual(reporterTextState('<b>내용</b>', reporter), {
    kind: 'text',
    text: '<b>내용</b>',
  });
  assert.deepEqual(reporterTextState(null, reporter), { kind: 'none' });
  assert.deepEqual(reporterTextState('   ', reporter), { kind: 'none' });
  assert.deepEqual(reporterTextState(null, withdrawn), { kind: 'removed' });
  // Decided by status, never by the display name.
  assert.deepEqual(
    reporterTextState(null, {
      id: 'x',
      displayName: '탈퇴한 회원',
      status: 'ACTIVE',
    }),
    { kind: 'none' }
  );
  assert.deepEqual(
    reporterTextState(null, {
      id: 's',
      displayName: '정지',
      status: 'SUSPENDED',
    }),
    { kind: 'none' }
  );
  assert.equal(isReportOpen('RECEIVED'), true);
  assert.equal(isReportOpen('REVIEWING'), true);
  assert.equal(isReportOpen('RESOLVED'), false);
  assert.equal(isReportOpen('DISMISSED'), false);
});
