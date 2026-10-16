import type {
  AdminMetrics,
  AdminQueueMetrics,
  AdminWorkerInstance,
  AdminWorkers,
  MetricGroup,
  QueueRow,
  WorkerSummary,
} from '../dto/metrics.dto.ts';
import { formatBytes, formatCount, usagePercent } from './format.ts';
import { kstMinuteLabel } from './time.ts';

// Servers before OpenAPI 0.23.0 send mail: null and no queues/workers.
export const MAIL_UNAVAILABLE = 'W07 메일 발송 기록 이후 제공';
export const OPS_UNAVAILABLE = '서버 0.23.0 이후 제공';
const n = (value: number | undefined) => formatCount(value);
// Dashboard tiles from GET /v1/admin/metrics. Values that need attention
// (failures, open work) are flagged so the view can mark them.
export function metricGroups(
  metrics: AdminMetrics,
  links: { reports: string; inquiries: string; members: string; groups: string }
): MetricGroup[] {
  const storage = metrics.storage ?? { usedBytes: 0, quotaBytes: 0 };
  const percent = usagePercent(storage.usedBytes, storage.quotaBytes);
  return [
    {
      id: 'work',
      title: '처리할 일',
      items: [
        {
          label: '처리 대기 신고',
          value: n(metrics.reports?.open),
          href: links.reports,
          attention: (metrics.reports?.open ?? 0) > 0,
        },
        {
          label: '답변 대기 문의',
          value: n(metrics.inquiries?.open),
          href: links.inquiries,
          attention: (metrics.inquiries?.open ?? 0) > 0,
        },
      ],
    },
    {
      id: 'users',
      title: '회원',
      items: [
        {
          label: '이용 중',
          value: n(metrics.users?.active),
          href: links.members,
        },
        {
          label: '이용 정지',
          value: n(metrics.users?.suspended),
        },
        { label: '탈퇴', value: n(metrics.users?.deleted) },
      ],
    },
    {
      id: 'groups',
      title: '그룹과 저장 공간',
      items: [
        {
          label: '운영 중 그룹',
          value: n(metrics.groups?.active),
          href: links.groups,
        },
        { label: '삭제 진행 중', value: n(metrics.groups?.deleting) },
        {
          label: '사용 중인 저장 공간',
          value: formatBytes(storage.usedBytes),
          note:
            percent === null
              ? undefined
              : `전체 한도 ${formatBytes(storage.quotaBytes)}의 ${percent}%`,
        },
      ],
    },
    {
      id: 'processing',
      title: '사진 처리와 정리',
      items: [
        { label: '처리 대기', value: n(metrics.photoProcessing?.queued) },
        { label: '처리 중', value: n(metrics.photoProcessing?.processing) },
        {
          label: '최근 24시간 실패',
          value: n(metrics.photoProcessing?.failed24h),
          attention: (metrics.photoProcessing?.failed24h ?? 0) > 0,
        },
        { label: '파일 정리 대기', value: n(metrics.mediaCleanup?.pending) },
        {
          label: '파일 정리 재시도',
          value: n(metrics.mediaCleanup?.retrying),
          attention: (metrics.mediaCleanup?.retrying ?? 0) > 0,
        },
      ],
    },
    {
      id: 'delivery',
      title: '알림 발송',
      items: [
        { label: '푸시 발송 대기', value: n(metrics.push?.pendingDeliveries) },
        {
          label: '푸시 24시간 실패',
          value: n(metrics.push?.failed24h),
          attention: (metrics.push?.failed24h ?? 0) > 0,
        },
        { label: '아웃박스 대기', value: n(metrics.outbox?.pending) },
      ],
    },
    {
      id: 'mail',
      title: '메일 발송',
      items: metrics.mail
        ? [
            { label: '보내기 전', value: n(metrics.mail.pending) },
            { label: '24시간 발송', value: n(metrics.mail.sent24h) },
            {
              label: '24시간 실패',
              value: n(metrics.mail.failed24h),
              attention: metrics.mail.failed24h > 0,
            },
          ]
        : [],
      unavailable: metrics.mail ? undefined : MAIL_UNAVAILABLE,
    },
  ];
}

const QUEUES: { id: keyof AdminQueueMetrics; label: string; stale: number }[] =
  [
    // Videos transcode for minutes; cleanups and deletions run in batches.
    { id: 'photoProcessing', label: '사진·동영상 처리', stale: 10 * 60 },
    { id: 'pushOutbox', label: '알림 만들기', stale: 5 * 60 },
    { id: 'pushDeliveries', label: '푸시 발송', stale: 5 * 60 },
    { id: 'mailOutbox', label: '메일 재시도', stale: 20 * 60 },
    { id: 'mediaCleanup', label: '파일 정리', stale: 60 * 60 },
    { id: 'groupCleanup', label: '그룹 삭제 정리', stale: 60 * 60 },
  ];
// 42 → "42초", 3600 → "1시간", 90061 → "1일 1시간"; null → "—".
export function formatWait(seconds: number | null | undefined) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0)
    return '—';
  const s = Math.floor(seconds);
  if (s < 60) return `${s}초`;
  if (s < 3600) return `${Math.floor(s / 60)}분`;
  const days = Math.floor(s / 86400),
    hours = Math.floor((s % 86400) / 3600),
    minutes = Math.floor((s % 3600) / 60);
  if (days) return hours ? `${days}일 ${hours}시간` : `${days}일`;
  return minutes ? `${hours}시간 ${minutes}분` : `${hours}시간`;
}
// Queue lag table; a queue whose oldest due job waited past its limit stands out.
export function queueRows(queues: AdminQueueMetrics | undefined): QueueRow[] {
  if (!queues) return [];
  return QUEUES.map(({ id, label, stale }) => {
    const lag = queues[id];
    return {
      id,
      label,
      due: formatCount(lag?.due),
      oldest:
        lag?.oldestDueSeconds == null
          ? '없음'
          : formatWait(lag.oldestDueSeconds),
      attention: (lag?.oldestDueSeconds ?? 0) > stale,
    };
  });
}
// One job running this long (a 1-minute clip converts in far less) is
// probably stuck; the card emphasizes it.
export const BUSY_LONG_SECONDS = 600;
const JOB_LABEL: Record<string, string> = {
  'photo-processing': '사진 처리',
  'video-transcode': '동영상 변환',
};
const busyLong = (worker: AdminWorkerInstance) =>
  !!worker.busyJob && (worker.busySeconds ?? 0) >= BUSY_LONG_SECONDS;
// "작업 중: 동영상 변환 (754초)"; idle "없음"; "" when the server predates it.
export function busyLabel(worker: AdminWorkerInstance) {
  if (worker.busyJob === undefined) return '';
  if (!worker.busyJob) return '없음';
  const job = JOB_LABEL[worker.busyJob] ?? worker.busyJob;
  const seconds =
    typeof worker.busySeconds === 'number'
      ? ` (${formatCount(worker.busySeconds)}초)`
      : '';
  return `작업 중: ${job}${seconds}${busyLong(worker) ? ' · 10분 넘게 걸리는 중' : ''}`;
}
// Worker card: unhealthy, stale, failing or video-less workers are warnings,
// and so is a live worker stuck on one job for 10 minutes or more.
export function workerSummary(
  workers: AdminWorkers | undefined
): WorkerSummary | null {
  if (!workers) return null;
  const live = workers.instances.filter(
    (worker) => worker.beatAgeSeconds <= workers.staleAfterSeconds
  );
  const warnings: string[] = [];
  if (!workers.instances.length)
    warnings.push('최근 24시간에 기록된 워커가 없어요. 큐가 처리되지 않아요.');
  else if (!workers.healthy)
    warnings.push(
      `${workers.staleAfterSeconds}초 안에 정상 처리한 워커가 없어요. 큐가 멈췄을 수 있어요.`
    );
  if (live.some((worker) => !worker.videoReady))
    warnings.push(
      '동영상 변환 도구(ffmpeg)를 쓸 수 없는 워커가 있어요. 동영상이 처리되지 않을 수 있어요.'
    );
  if (live.some(busyLong))
    warnings.push(
      '한 작업을 10분 넘게 처리 중인 워커가 있어요. 변환이 멈췄는지 확인해 주세요.'
    );
  return {
    healthy: workers.healthy,
    status: workers.healthy ? '정상' : '확인 필요',
    warnings,
    showBusy: workers.instances.some((worker) => worker.busyJob !== undefined),
    rows: workers.instances.map((worker) => {
      const stale = worker.beatAgeSeconds > workers.staleAfterSeconds;
      return {
        id: worker.instanceId,
        started: kstMinuteLabel(worker.startedAt),
        startedAt: worker.startedAt,
        beat: `${formatWait(worker.beatAgeSeconds)} 전${stale ? ' (멈춤)' : ''}`,
        lastPass: worker.lastPassOk ? '성공' : '실패',
        video: worker.videoReady ? '가능' : '불가',
        busy: busyLabel(worker),
        busyLong: busyLong(worker),
        attention:
          stale || !worker.lastPassOk || !worker.videoReady || busyLong(worker),
      };
    }),
  };
}
