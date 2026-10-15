import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  INQUIRY_CATEGORY_LABELS,
  INQUIRY_STATUS_LABELS,
  NOTICE_STATUS_LABELS,
  NOTICE_VISIBILITY_LABELS,
  REPORT_FILTER_LABELS,
  REPORT_REASON_LABELS,
  REPORT_RESOLUTION_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_TARGET_LABELS,
  labelOf,
  noticeConfirmCopy,
} from '../src/content/content-labels.ts';
import {
  INQUIRY_CATEGORIES,
  INQUIRY_STATUSES,
  NOTICE_STATUSES,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
} from '../src/constants/content-ops.ts';

test('every contract status has a Korean label', () => {
  for (const [values, labels] of [
    [NOTICE_STATUSES, NOTICE_STATUS_LABELS],
    [INQUIRY_STATUSES, INQUIRY_STATUS_LABELS],
    [INQUIRY_CATEGORIES, INQUIRY_CATEGORY_LABELS],
    [REPORT_STATUSES, REPORT_STATUS_LABELS],
    [REPORT_TARGET_TYPES, REPORT_TARGET_LABELS],
  ] as const)
    for (const value of values)
      assert.match((labels as Record<string, string>)[value], /[가-힣]/, value);
  assert.deepEqual(Object.keys(REPORT_REASON_LABELS).sort(), [
    'HARASSMENT',
    'INAPPROPRIATE',
    'OTHER',
    'PRIVACY',
    'SPAM',
  ]);
  assert.equal(REPORT_FILTER_LABELS.OPEN.startsWith('처리 대기'), true);
  assert.equal(REPORT_RESOLUTION_LABELS.USER_SUSPENDED, '회원 이용 정지');
});

test('member-facing wording matches the member web', () => {
  assert.equal(REPORT_STATUS_LABELS.RESOLVED, '조치 완료');
  assert.equal(REPORT_STATUS_LABELS.DISMISSED, '조치 없음');
  assert.equal(INQUIRY_STATUS_LABELS.ANSWERED, '답변 완료');
  assert.deepEqual(NOTICE_VISIBILITY_LABELS, {
    visible: '회원에게 보임',
    scheduled: '예약됨',
    hidden: '숨김',
  });
});

test('unknown values stay visible as raw codes, inherited keys never resolve', () => {
  assert.equal(labelOf(NOTICE_STATUS_LABELS, 'DRAFT'), '초안');
  assert.equal(labelOf(NOTICE_STATUS_LABELS, 'NEW_STATUS'), 'NEW_STATUS');
  assert.equal(labelOf(NOTICE_STATUS_LABELS, 'constructor'), 'constructor');
  assert.equal(labelOf(NOTICE_STATUS_LABELS, null, '없음'), '없음');
});

test('notice confirmations describe what members will see', () => {
  assert.match(
    noticeConfirmCopy('publish', '').consequences[0],
    /바로 모든 회원/
  );
  assert.match(
    noticeConfirmCopy('schedule', '2026.10.20 09:00:00').consequences[0],
    /2026\.10\.20 09:00:00\(KST\)부터/
  );
  const archive = noticeConfirmCopy('archive', '');
  assert.equal(archive.danger, true);
  assert.ok(archive.consequences.some((line) => /다시 게시/.test(line)));
});
