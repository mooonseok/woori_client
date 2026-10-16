'use client';
import { useState } from 'react';
import { useAdminSession } from '@/hooks/use-admin-session';
import { useAuditLogs } from '@/hooks/use-audit-logs';
import { useMetrics } from '@/hooks/use-metrics';
import { useReauth } from '@/hooks/use-reauth';
import { DASHBOARD_AUDIT_LIMIT } from '@/constants/admin-auth';
import { ROUTES } from '@/constants/routes';
import {
  OPS_UNAVAILABLE,
  metricGroups,
  queueRows,
  workerSummary,
} from '@/utils/metrics';
import { isFuture, kstDateTimeLabel, kstTimeLabel } from '@/utils/time';
import { DashboardView } from './dashboard-view';
export function DashboardContainer() {
  const { session } = useAdminSession();
  const reauth = useReauth();
  const recent = useAuditLogs(null, DASHBOARD_AUDIT_LIMIT);
  const metrics = useMetrics();
  const [reauthNotice, setReauthNotice] = useState('');
  const reauthUntil = session?.reauthValidUntil ?? null;
  async function reauthenticate() {
    setReauthNotice('');
    if (await reauth.request())
      setReauthNotice('본인 확인을 마쳤어요. 민감한 작업을 진행할 수 있어요.');
  }
  return (
    <DashboardView
      adminName={session?.admin.displayName ?? ''}
      sessionExpires={kstDateTimeLabel(session?.sessionExpiresAt)}
      sessionExpiresAt={session?.sessionExpiresAt ?? ''}
      reauthUntil={isFuture(reauthUntil) ? kstTimeLabel(reauthUntil) : ''}
      reauthUntilAt={reauthUntil ?? ''}
      reauthNotice={reauthNotice}
      metricGroups={
        metrics.data
          ? metricGroups(metrics.data, {
              reports: ROUTES.REPORTS,
              inquiries: ROUTES.INQUIRIES,
              members: ROUTES.MEMBERS,
              groups: ROUTES.GROUPS,
            })
          : []
      }
      queueRows={queueRows(metrics.data?.queues)}
      workers={workerSummary(metrics.data?.workers)}
      opsUnavailable={
        metrics.data && !metrics.data.queues && !metrics.data.workers
          ? OPS_UNAVAILABLE
          : ''
      }
      metricsAt={kstDateTimeLabel(metrics.data?.generatedAt)}
      metricsAtIso={metrics.data?.generatedAt ?? ''}
      metricsLoading={metrics.loading}
      metricsRefreshing={metrics.refreshing}
      metricsError={metrics.error}
      onRefreshMetrics={metrics.refresh}
      auditHref={ROUTES.AUDIT_LOGS}
      rows={recent.rows}
      loading={recent.loading}
      error={recent.error}
      onRetry={recent.reload}
      onReauth={() => void reauthenticate()}
    />
  );
}
