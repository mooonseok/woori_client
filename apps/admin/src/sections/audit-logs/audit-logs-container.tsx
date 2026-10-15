'use client';
import { useState } from 'react';
import { useAuditLogs } from '@/hooks/use-audit-logs';
import {
  AUDIT_ACTION_OPTIONS,
  auditActionLabel,
  isKnownAuditAction,
} from '@/content/audit-actions';
import { AuditLogsView } from './audit-logs-view';
export function AuditLogsContainer() {
  const [action, setAction] = useState('');
  const list = useAuditLogs(action || null);
  return (
    <AuditLogsView
      action={action}
      actionLabel={action ? auditActionLabel(action) : ''}
      options={AUDIT_ACTION_OPTIONS}
      rows={list.rows}
      loading={list.loading}
      loadingMore={list.loadingMore}
      error={list.error}
      moreError={list.moreError}
      notice={list.notice}
      hasMore={list.hasMore}
      onAction={(value) => setAction(isKnownAuditAction(value) ? value : '')}
      onRetry={list.reload}
      onMore={list.more}
    />
  );
}
