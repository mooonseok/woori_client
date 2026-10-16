import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AdminMetrics } from '../src/dto/metrics.dto.ts';
import { formatBytes, formatCount, usagePercent } from '../src/utils/format.ts';
import {
  MAIL_UNAVAILABLE,
  OPS_UNAVAILABLE,
  formatWait,
  metricGroups,
  queueRows,
  workerSummary,
  busyLabel,
  BUSY_LONG_SECONDS,
} from '../src/utils/metrics.ts';

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

// The full OpenAPI 0.23.0 shape: an object literal typed as AdminMetrics, so
// a field the DTO lacks (or misnames) fails typecheck (additionalProperties).
const current: AdminMetrics = {
  ...metrics,
  mail: { pending: 2, failed24h: 1, sent24h: 40 },
  queues: {
    photoProcessing: { due: 3, oldestDueSeconds: 900 },
    mediaCleanup: { due: 0, oldestDueSeconds: null },
    pushOutbox: { due: 1, oldestDueSeconds: 20 },
    pushDeliveries: { due: 0, oldestDueSeconds: null },
    mailOutbox: { due: 1, oldestDueSeconds: 1500 },
    groupCleanup: { due: 1, oldestDueSeconds: null },
  },
  workers: {
    healthy: true,
    staleAfterSeconds: 120,
    instances: [
      {
        instanceId: 'worker-a',
        startedAt: '2026-10-16T00:00:00.000Z',
        beatAgeSeconds: 8,
        lastPassOk: true,
        videoReady: true,
      },
      {
        instanceId: 'worker-b',
        startedAt: '2026-10-15T23:00:00.000Z',
        beatAgeSeconds: 4000,
        lastPassOk: false,
        videoReady: false,
      },
    ],
  },
};

test('mail shows real counts from 0.23.0 and stays unavailable on older servers', () => {
  const older = metricGroups(metrics, links).find((g) => g.id === 'mail');
  assert.equal(older?.unavailable, MAIL_UNAVAILABLE);
  assert.equal(older?.items.length, 0);
  const groups = metricGroups(current, links);
  assert.equal(groups.find((g) => g.id === 'mail')?.unavailable, undefined);
  assert.deepEqual(
    [item(groups, '보내기 전')?.value, item(groups, '24시간 발송')?.value],
    ['2', '40']
  );
  assert.equal(item(groups, '24시간 실패')?.attention, true);
});

test('queue lag rows name each queue, format the wait and flag long backlogs', () => {
  assert.deepEqual(queueRows(undefined), []);
  const rows = queueRows(current.queues);
  assert.deepEqual(
    rows.map((row) => row.id),
    [
      'photoProcessing',
      'pushOutbox',
      'pushDeliveries',
      'mailOutbox',
      'mediaCleanup',
      'groupCleanup',
    ]
  );
  const by = Object.fromEntries(rows.map((row) => [row.id, row]));
  assert.deepEqual(
    { ...by.photoProcessing },
    {
      id: 'photoProcessing',
      label: '사진·동영상 처리',
      due: '3',
      oldest: '15분',
      attention: true,
    }
  );
  assert.equal(by.pushOutbox.attention, false);
  assert.equal(by.mailOutbox.attention, true, '25분 > 20분');
  assert.equal(by.mediaCleanup.oldest, '없음');
  assert.equal(
    by.groupCleanup.attention,
    false,
    'null wait (pre-0.23 request)'
  );
  assert.equal(formatWait(42), '42초');
  assert.equal(formatWait(3600), '1시간');
  assert.equal(formatWait(3660), '1시간 1분');
  assert.equal(formatWait(90061), '1일 1시간');
  assert.equal(formatWait(null), '—');
});

test('worker card warns when unhealthy, stale, failing or without ffmpeg', () => {
  assert.equal(workerSummary(undefined), null);
  assert.equal(OPS_UNAVAILABLE, '서버 0.23.0 이후 제공');
  const ok = workerSummary(current.workers)!;
  assert.equal(ok.status, '정상');
  assert.deepEqual(ok.warnings, []);
  assert.deepEqual(
    ok.rows.map((row) => [row.id, row.beat, row.attention]),
    [
      ['worker-a', '8초 전', false],
      ['worker-b', '1시간 6분 전 (멈춤)', true],
    ]
  );
  const down = workerSummary({
    ...current.workers!,
    healthy: false,
    instances: [{ ...current.workers!.instances[0], videoReady: false }],
  })!;
  assert.equal(down.status, '확인 필요');
  assert.equal(down.warnings.length, 2);
  assert.match(down.warnings[0], /120초 안에 정상 처리한 워커가 없어요/);
  assert.match(down.warnings[1], /ffmpeg/);
  assert.match(
    workerSummary({ healthy: false, staleAfterSeconds: 120, instances: [] })!
      .warnings[0],
    /기록된 워커가 없어요/
  );
});

test('0.25.0 busy jobs show on the worker card and a 10-minute job stands out', () => {
  const [a, b] = current.workers!.instances;
  const busy = workerSummary({
    ...current.workers!,
    instances: [
      { ...a, busyJob: 'video-transcode', busySeconds: 754 },
      {
        ...a,
        instanceId: 'worker-c',
        busyJob: 'photo-processing',
        busySeconds: 12,
      },
      { ...a, instanceId: 'worker-d', busyJob: null, busySeconds: null },
      // A stopped worker's last job is history, not a live warning.
      { ...b, busyJob: 'video-transcode', busySeconds: 5000 },
    ],
  })!;
  assert.equal(busy.showBusy, true);
  assert.deepEqual(
    busy.rows.map((row) => [row.id, row.busy, row.busyLong, row.attention]),
    [
      [
        'worker-a',
        '작업 중: 동영상 변환 (754초) · 10분 넘게 걸리는 중',
        true,
        true,
      ],
      ['worker-c', '작업 중: 사진 처리 (12초)', false, false],
      ['worker-d', '없음', false, false],
      [
        'worker-b',
        '작업 중: 동영상 변환 (5,000초) · 10분 넘게 걸리는 중',
        true,
        true,
      ],
    ]
  );
  assert.equal(
    busy.warnings.filter((warning) => /10분 넘게/.test(warning)).length,
    1
  );
  // Just under the limit is not emphasized.
  const edge = workerSummary({
    ...current.workers!,
    instances: [
      { ...a, busyJob: 'video-transcode', busySeconds: BUSY_LONG_SECONDS - 1 },
    ],
  })!;
  assert.deepEqual([edge.rows[0].busyLong, edge.warnings], [false, []]);
  assert.equal(
    workerSummary({
      ...current.workers!,
      instances: [
        { ...a, busyJob: 'video-transcode', busySeconds: BUSY_LONG_SECONDS },
      ],
    })!.rows[0].busyLong,
    true
  );
});

test('servers before 0.25.0 send no busy fields: the column stays hidden', () => {
  const older = workerSummary(current.workers)!;
  assert.equal(older.showBusy, false);
  assert.deepEqual(
    older.rows.map((row) => [row.busy, row.busyLong]),
    [
      ['', false],
      ['', false],
    ]
  );
  assert.equal(
    busyLabel({
      ...current.workers!.instances[0],
      busyJob: 'video-transcode',
      busySeconds: null,
    }),
    '작업 중: 동영상 변환'
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
