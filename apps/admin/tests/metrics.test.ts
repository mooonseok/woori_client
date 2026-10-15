import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AdminMetrics } from '../src/dto/metrics.dto.ts';
import { formatBytes, formatCount, usagePercent } from '../src/utils/format.ts';
import { MAIL_UNAVAILABLE, metricGroups } from '../src/utils/metrics.ts';

const links = {
  reports: '/reports',
  inquiries: '/inquiries',
  members: '/members',
  groups: '/groups',
};
const metrics: AdminMetrics = {
  users: { active: 1200, suspended: 3, deleted: 40 },
  groups: { active: 300, deleting: 1 },
  photoProcessing: { queued: 5, processing: 2, failed24h: 0 },
  mediaCleanup: { pending: 0, retrying: 1 },
  push: { pendingDeliveries: 7, failed24h: 2 },
  outbox: { pending: 0 },
  storage: { usedBytes: 50 * 1024 ** 3, quotaBytes: 200 * 1024 ** 3 },
  reports: { open: 4 },
  inquiries: { open: 0 },
  mail: null,
  generatedAt: '2026-10-15T03:00:00.000Z',
};
const item = (groups: ReturnType<typeof metricGroups>, label: string) =>
  groups.flatMap((group) => group.items).find((entry) => entry.label === label);

test('mail metrics stay unavailable until the W07 mail outbox', () => {
  const groups = metricGroups(metrics, links);
  const mail = groups.find((group) => group.id === 'mail');
  assert.equal(mail?.unavailable, 'W07 메일 발송 기록 이후 제공');
  assert.equal(MAIL_UNAVAILABLE, 'W07 메일 발송 기록 이후 제공');
  const later = metricGroups({ ...metrics, mail: { sent24h: 3 } }, links);
  assert.equal(
    later.find((group) => group.id === 'mail')?.unavailable,
    undefined
  );
});

test('numbers are formatted and work that needs attention is flagged', () => {
  const groups = metricGroups(metrics, links);
  assert.equal(item(groups, '이용 중')?.value, '1,200');
  assert.deepEqual(
    { ...item(groups, '처리 대기 신고') },
    { label: '처리 대기 신고', value: '4', href: '/reports', attention: true }
  );
  assert.equal(item(groups, '답변 대기 문의')?.attention, false);
  assert.equal(item(groups, '푸시 24시간 실패')?.attention, true);
  assert.equal(item(groups, '최근 24시간 실패')?.attention, false);
  assert.equal(item(groups, '사용 중인 저장 공간')?.value, '50 GB');
  assert.equal(
    item(groups, '사용 중인 저장 공간')?.note,
    '전체 한도 200 GB의 25%'
  );
});

test('byte, percent and count formatting', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(5 * 1024 ** 2), '5 MB');
  assert.equal(formatBytes(150 * 1024 ** 3), '150 GB');
  assert.equal(formatBytes(null), '—');
  assert.equal(formatBytes(-1), '—');
  assert.equal(usagePercent(1, 3), 33);
  assert.equal(usagePercent(5, 0), null);
  assert.equal(usagePercent(500, 100), 100);
  assert.equal(formatCount(12345), '12,345');
  assert.equal(formatCount(undefined), '—');
});
