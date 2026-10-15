'use client';
import { useCallback, useState } from 'react';
import { useCursorList } from '@/hooks/use-cursor-list';
import { listReports } from '@/services/reports';
import { REPORT_STATUSES, REPORT_TARGET_TYPES } from '@/constants/content-ops';
import { ROUTES } from '@/constants/routes';
import {
  GROUP_STATUS_LABELS,
  REPORT_FILTER_LABELS,
  REPORT_REASON_LABELS,
  REPORT_RESOLUTION_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_TARGET_LABELS,
  labelOf,
} from '@/content/content-labels';
import type { ReportStatusFilter, ReportTargetType } from '@/dto/report.dto';
import { detailHref } from '@/utils/admin-navigation';
import { kstDateTimeLabel } from '@/utils/time';
import { ReportsView } from './reports-view';
const rowId = (id: string) => `report-row-${id}`;
const FILTERS: readonly ReportStatusFilter[] = ['OPEN', ...REPORT_STATUSES];
export function ReportsContainer() {
  const [status, setStatus] = useState<ReportStatusFilter>('OPEN'),
    [targetType, setTargetType] = useState<ReportTargetType | ''>('');
  const fetchPage = useCallback(
    (cursor: string | null, signal: AbortSignal) =>
      listReports({ status, targetType: targetType || null, cursor }, signal),
    [status, targetType]
  );
  const list = useCursorList(fetchPage, rowId, '신고를 불러오지 못했어요.');
  return (
    <ReportsView
      status={status}
      targetType={targetType}
      statusOptions={FILTERS.map((value) => ({
        value,
        label: REPORT_FILTER_LABELS[value],
      }))}
      targetOptions={REPORT_TARGET_TYPES.map((value) => ({
        value,
        label: REPORT_TARGET_LABELS[value],
      }))}
      orderNote={
        status === 'OPEN'
          ? '처리 대기 신고는 오래된 신고부터 보여요.'
          : '최신 신고부터 보여요.'
      }
      rows={list.items.map((report) => ({
        id: report.id,
        domId: rowId(report.id),
        href: detailHref(ROUTES.REPORT, report.id),
        target: labelOf(REPORT_TARGET_LABELS, report.targetType),
        targetUser: report.targetUser?.displayName ?? '알 수 없는 회원',
        reason: labelOf(REPORT_REASON_LABELS, report.reason),
        group: report.group?.name ?? '—',
        groupStatus:
          report.group && report.group.status !== 'ACTIVE'
            ? labelOf(GROUP_STATUS_LABELS, report.group.status)
            : '',
        reporter: report.reporter?.displayName ?? '탈퇴한 회원',
        status: report.status,
        statusLabel: labelOf(REPORT_STATUS_LABELS, report.status),
        resolution: report.resolution
          ? labelOf(REPORT_RESOLUTION_LABELS, report.resolution)
          : '',
        openOnTarget: report.openReportsOnTarget ?? 0,
        created: kstDateTimeLabel(report.createdAt),
        createdAt: report.createdAt,
      }))}
      loading={list.loading}
      loadingMore={list.loadingMore}
      error={list.error}
      moreError={list.moreError}
      notice={list.notice}
      hasMore={list.hasMore}
      onStatus={(value) =>
        setStatus(
          (FILTERS as readonly string[]).includes(value)
            ? (value as ReportStatusFilter)
            : 'OPEN'
        )
      }
      onTargetType={(value) =>
        setTargetType(
          (REPORT_TARGET_TYPES as readonly string[]).includes(value)
            ? (value as ReportTargetType)
            : ''
        )
      }
      onRetry={list.reload}
      onMore={list.more}
    />
  );
}
