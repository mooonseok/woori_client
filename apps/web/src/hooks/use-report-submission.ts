'use client';
import { useEffect, useRef, useState } from 'react';
import { DEMO_MODE } from '@/constants/app-mode';
import { GROUP_ACCESS_RECHECK } from '@/services/api-client';
import { createReport } from '@/services/reports';
import {
  isOwnTargetError,
  isReportTargetGone,
  reportErrorMessage,
  validateReportDraft,
} from '@/utils/reports';
import type {
  ReportDraft,
  ReportReason,
  ReportResult,
  ReportTarget,
} from '@/dto/report.dto';

// One report attempt for one target. The owner component unmounts on close,
// logout or account change; aborting there drops any late response.
export function useReportSubmission(
  target: ReportTarget,
  onTargetGone?: () => void
) {
  const [draft, setDraft] = useState<ReportDraft>({ reason: '', detail: '' });
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [blocked, setBlocked] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const active = useRef<AbortController | null>(null);
  const gone = useRef(onTargetGone);
  useEffect(() => {
    gone.current = onTargetGone;
  });
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    []
  );
  const { input, errors } = validateReportDraft(draft);
  async function submit() {
    if (DEMO_MODE || active.current || result || blocked) return;
    const checked = validateReportDraft(draft);
    if (!checked.input) return;
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    setError('');
    try {
      const report = await createReport(
        {
          targetType: target.targetType,
          targetId: target.targetId,
          groupId: target.groupId,
          ...checked.input,
        },
        controller.signal
      );
      if (controller.signal.aborted) return;
      setResult(report);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(reportErrorMessage(cause, target.targetType));
      // Retrying cannot succeed for a vanished target or the reporter's own content.
      if (isReportTargetGone(cause) || isOwnTargetError(cause))
        setBlocked(true);
      if (isReportTargetGone(cause)) {
        window.dispatchEvent(new Event(GROUP_ACCESS_RECHECK));
        gone.current?.();
      }
    } finally {
      if (active.current === controller) {
        active.current = null;
        setPending(false);
      }
    }
  }
  return {
    draft,
    errors,
    pending,
    error,
    blocked,
    result,
    canSubmit: !!input && !pending && !blocked && !result,
    setReason: (reason: ReportReason) =>
      setDraft((current) => ({ ...current, reason })),
    setDetail: (detail: string) =>
      setDraft((current) => ({ ...current, detail })),
    submit,
  };
}
