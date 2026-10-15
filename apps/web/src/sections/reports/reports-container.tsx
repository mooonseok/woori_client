'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePagedList } from '@/hooks/use-paged-list';
import { listReports } from '@/services/reports';
import { DEMO_MODE } from '@/constants/app-mode';
import { ROUTES } from '@/constants/routes';
import {
  reportPolicyNotice,
  reportReasonLabels,
  reportStatusLabels,
  reportTargetLabels,
} from '@/content/service-guide';
import { kstDateLabel } from '@/utils/service-guidance';
import type { ReportSummary } from '@/dto/report.dto';
import { ReportsView } from './reports-view';

const rowId = (report: ReportSummary) => `report-row-${report.id}`;
function ReportList() {
  const router = useRouter();
  const list = usePagedList(
    listReports,
    !DEMO_MODE,
    '신고 내역을 불러오지 못했어요.',
    rowId
  );
  return (
    <ReportsView
      demo={DEMO_MODE}
      intro={reportPolicyNotice}
      rows={list.items.map((report) => ({
        id: report.id,
        domId: rowId(report),
        target: reportTargetLabels[report.targetType] ?? '신고',
        reason: reportReasonLabels[report.reason] ?? '기타',
        status: report.status,
        statusLabel: reportStatusLabels[report.status] ?? '접수됨',
        date: kstDateLabel(report.createdAt),
        dateTime: report.createdAt,
        resolved: kstDateLabel(report.resolvedAt),
        resolvedAt: report.resolvedAt ?? '',
      }))}
      loading={list.loading}
      loadingMore={list.loadingMore}
      error={list.error}
      moreError={list.moreError}
      notice={list.notice}
      hasMore={!!list.nextCursor}
      onRetry={list.reload}
      onMore={list.more}
      onBack={() => router.push(ROUTES.MY)}
    />
  );
}
export function ReportsContainer() {
  const { user } = useAuth();
  // Reports are private to one member; remount on any account change.
  return <ReportList key={user?.id ?? 'anonymous'} />;
}
