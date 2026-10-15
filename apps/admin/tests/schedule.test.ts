import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  kstInputToIso,
  kstInputValue,
  noticeVisibility,
  scheduleBounds,
  scheduleError,
} from '../src/utils/schedule.ts';
import { kstMinuteLabel } from '../src/utils/time.ts';

const NOW = Date.parse('2026-10-15T03:00:00.000Z'); // 12:00 KST
const DAY = 24 * 60 * 60 * 1000;

test('datetime-local values are read as KST regardless of the browser zone', () => {
  assert.equal(kstInputToIso('2026-10-20T09:00'), '2026-10-20T00:00:00.000Z');
  assert.equal(kstInputToIso('2026-10-20T08:59'), '2026-10-19T23:59:00.000Z');
  assert.equal(kstInputToIso('2027-01-01T00:00'), '2026-12-31T15:00:00.000Z');
  for (const bad of [
    '',
    '2026-02-30T10:00',
    '2026-10-20T24:00',
    '2026-13-01T00:00',
    '2026-10-20 09:00',
    '2026-10-20T09:00:00',
  ])
    assert.equal(kstInputToIso(bad), null, bad);
});

test('ISO times turn back into the same KST picker value', () => {
  assert.equal(kstInputValue('2026-10-19T23:59:00.000Z'), '2026-10-20T08:59');
  assert.equal(
    kstInputValue(kstInputToIso('2026-11-03T18:30')!),
    '2026-11-03T18:30'
  );
  assert.equal(kstInputValue('nope'), '');
  assert.deepEqual(scheduleBounds(NOW), {
    min: '2026-10-15T12:01',
    max: '2027-01-13T12:00',
  });
});

test('schedules must be in the future and within 90 days', () => {
  assert.match(scheduleError('', NOW), /골라 주세요/);
  assert.match(scheduleError('2026-10-15T12:00', NOW), /지났어요/);
  assert.match(scheduleError('2026-10-15T11:59', NOW), /지났어요/);
  assert.equal(scheduleError('2026-10-15T12:01', NOW), '');
  assert.equal(scheduleError(kstInputValue(NOW + 90 * DAY), NOW), '');
  assert.match(
    scheduleError(kstInputValue(NOW + 90 * DAY + 60_000), NOW),
    /90일 이내/
  );
  assert.match(scheduleError('2026-02-30T10:00', NOW), /다시 골라/);
});

test('member visibility follows status and publish time', () => {
  assert.equal(noticeVisibility('DRAFT', null, NOW), 'hidden');
  assert.equal(
    noticeVisibility('ARCHIVED', '2026-10-01T00:00:00Z', NOW),
    'hidden'
  );
  assert.equal(
    noticeVisibility('PUBLISHED', '2026-10-15T02:59:00Z', NOW),
    'visible'
  );
  assert.equal(
    noticeVisibility('PUBLISHED', '2026-10-15T03:01:00Z', NOW),
    'scheduled'
  );
  assert.equal(noticeVisibility('PUBLISHED', null, NOW), 'visible');
});

test('schedule labels are shown in KST to the minute', () => {
  assert.equal(kstMinuteLabel('2026-10-20T00:00:00.000Z'), '2026.10.20 09:00');
  assert.equal(
    kstMinuteLabel(kstInputToIso('2026-12-31T23:59')),
    '2026.12.31 23:59'
  );
  assert.equal(kstMinuteLabel(null), '');
});
