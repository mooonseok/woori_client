import type { AdminMetrics, MetricGroup } from '../dto/metrics.dto.ts';
import { formatBytes, formatCount, usagePercent } from './format.ts';

export const MAIL_UNAVAILABLE = 'W07 메일 발송 기록 이후 제공';
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
      items: [],
      unavailable: metrics.mail ? undefined : MAIL_UNAVAILABLE,
    },
  ];
}
