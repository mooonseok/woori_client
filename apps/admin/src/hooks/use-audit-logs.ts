'use client';
import { useCallback } from 'react';
import { AUDIT_PAGE_SIZE } from '@/constants/admin-auth';
import type { AuditLogEntry } from '@/dto/audit-log.dto';
import type { AuditLogRowViewModel } from '@/dto/audit-log-view.dto';
import { listAuditLogs } from '@/services/audit-logs';
import {
  auditActionLabel,
  auditMetadataLabel,
  auditTargetLabel,
} from '@/content/audit-actions';
import { kstDateTimeLabel } from '@/utils/time';
import { useCursorList } from './use-cursor-list';

export const auditRowDomId = (id: string) => `audit-row-${id}`;
export function toAuditRow(entry: AuditLogEntry): AuditLogRowViewModel {
  return {
    id: entry.id,
    domId: auditRowDomId(entry.id),
    adminName: entry.admin?.displayName || '확인되지 않은 계정',
    knownAdmin: !!entry.admin,
    action: entry.action,
    actionLabel: auditActionLabel(entry.action),
    target: auditTargetLabel(entry.targetType),
    targetId: entry.targetId ?? '',
    reason: entry.reason ?? '',
    details: auditMetadataLabel(entry.metadata),
    time: kstDateTimeLabel(entry.createdAt),
    dateTime: entry.createdAt,
  };
}
export function useAuditLogs(action: string | null, limit = AUDIT_PAGE_SIZE) {
  const fetchPage = useCallback(
    (cursor: string | null, signal: AbortSignal) =>
      listAuditLogs({ cursor, action, limit }, signal),
    [action, limit]
  );
  const list = useCursorList(
    fetchPage,
    auditRowDomId,
    '감사 기록을 불러오지 못했어요.'
  );
  return { ...list, rows: list.items.map(toAuditRow) };
}
