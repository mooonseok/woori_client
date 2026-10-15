'use client';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useReportSubmission } from '@/hooks/use-report-submission';
import { REPORT_DETAIL_MAX, REPORT_REASONS } from '@/constants/report';
import {
  reportPolicyNotice,
  reportReasonLabels,
  reportStatusLabels,
  reportTargetLabels,
  reportVisibilityNotice,
} from '@/content/service-guide';
import type { ReportResult, ReportTarget } from '@/dto/report.dto';
import { codePoints } from '@/utils/service-guidance';
import { ReportDialogView } from './report-dialog-view';

const reasons = REPORT_REASONS.map((value) => ({
  value,
  label: reportReasonLabels[value],
}));
export interface ReportDialogProps {
  target: ReportTarget;
  // Focus goes back here on close; defaults to the element focused at open.
  returnFocus?: RefObject<HTMLElement | null>;
  // Used when the trigger was removed meanwhile (e.g. comments reloaded on 404).
  fallbackFocus?: () => HTMLElement | null | undefined;
  onClose: () => void;
  // Refresh whatever showed the target when the server says it is gone.
  onTargetGone?: () => void;
  // Follow-up action shown after a report (e.g. 차단하기 for the person behind it).
  followUp?: (result: ReportResult, close: () => void) => ReactNode;
}
export function ReportDialog(props: ReportDialogProps) {
  const { user } = useAuth();
  // Opened for this member only; any account change closes it.
  const [owner] = useState(user?.id);
  const stale = !user || user.id !== owner;
  const { onClose } = props;
  useEffect(() => {
    if (stale) onClose();
  }, [stale, onClose]);
  return stale ? null : <ReportDialogContent {...props} />;
}
function ReportDialogContent({
  target,
  returnFocus,
  fallbackFocus,
  onClose,
  onTargetGone,
  followUp,
}: ReportDialogProps) {
  const model = useReportSubmission(target, onTargetGone);
  const dialog = useRef<HTMLDialogElement>(null),
    firstReason = useRef<HTMLInputElement>(null),
    done = useRef<HTMLButtonElement>(null);
  const id = useId();
  const fallback = useRef(fallbackFocus);
  useEffect(() => {
    fallback.current = fallbackFocus;
  });
  useEffect(() => {
    const previous =
        returnFocus?.current || (document.activeElement as HTMLElement | null),
      element = dialog.current,
      latest = fallback;
    element?.showModal();
    firstReason.current?.focus();
    return () => {
      element?.close();
      queueMicrotask(() => {
        const target = previous?.isConnected ? previous : latest.current?.();
        target?.focus({ preventScroll: true });
      });
    };
  }, [returnFocus]);
  const result = model.result;
  useEffect(() => {
    if (result) done.current?.focus();
  }, [result]);
  const close = () => {
    if (!model.pending) onClose();
  };
  return (
    <ReportDialogView
      dialogRef={dialog}
      firstReasonRef={firstReason}
      doneRef={done}
      ids={{
        title: `${id}-title`,
        notice: `${id}-notice`,
        detail: `${id}-detail`,
        count: `${id}-count`,
      }}
      title={`${target.name || reportTargetLabels[target.targetType]} 신고`}
      policyNotice={reportPolicyNotice}
      visibilityNotice={reportVisibilityNotice}
      reasons={reasons}
      reason={model.draft.reason}
      detail={model.draft.detail}
      detailMax={REPORT_DETAIL_MAX}
      detailCount={codePoints(model.draft.detail)}
      detailError={model.errors.detail}
      error={model.error}
      pending={model.pending}
      blocked={model.blocked}
      canSubmit={model.canSubmit}
      done={
        result && {
          duplicate: result.duplicate,
          statusLabel: reportStatusLabels[result.status] ?? '접수됨',
        }
      }
      followUp={result && followUp ? followUp(result, close) : undefined}
      onReason={model.setReason}
      onDetail={model.setDetail}
      onSubmit={(event) => {
        event.preventDefault();
        void model.submit();
      }}
      onClose={close}
    />
  );
}
