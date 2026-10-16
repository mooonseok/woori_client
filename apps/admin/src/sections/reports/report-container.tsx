'use client';
import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RecordFrame } from '@/components/molecules/record-frame';
import { ContentViewer } from '@/components/organisms/content-viewer/content-viewer';
import { useAdminRecord } from '@/hooks/use-admin-record';
import { useReauth } from '@/hooks/use-reauth';
import {
  dismissReport,
  getReport,
  resolveReport,
  reviewReport,
} from '@/services/reports';
import { ADMIN_ERROR } from '@/constants/admin-auth';
import { ROUTES } from '@/constants/routes';
import {
  COMMENT_KIND_LABELS,
  GROUP_STATUS_LABELS,
  MEMBER_STATUS_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  PHOTO_STATUS_LABELS,
  REPORT_REASON_LABELS,
  REPORT_RESOLUTION_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_TARGET_LABELS,
  labelOf,
} from '@/content/content-labels';
import {
  DISMISS_COPY,
  reportActionCopy,
  reportResultMessage,
} from '@/content/report-action-copy';
import type { ContentViewTarget } from '@/dto/content-view.dto';
import type {
  AdminReportDetail,
  CommentReportTarget,
  PhotoReportTarget,
  ReportAction,
  ReportActionResult,
  UserReportTarget,
} from '@/dto/report.dto';
import { actionErrorMessage, codeOf } from '@/utils/admin-errors';
import { isUuid } from '@/utils/admin-navigation';
import { plainTextError, RULES } from '@/utils/plain-text';
import {
  allowedReportActions,
  isReportOpen,
  reporterTextState,
} from '@/utils/report-actions';
import { kstDateTimeLabel } from '@/utils/time';
import { ReportView, type ReportTargetFact } from './report-view';

function targetFacts(report: AdminReportDetail): {
  facts: ReportTargetFact[];
  view: ContentViewTarget | null;
} {
  const target = report.target;
  if (!target) return { facts: [], view: null };
  if (report.targetType === 'PHOTO') {
    const photo = target as PhotoReportTarget;
    return {
      facts: [
        { label: '앨범', value: photo.albumTitle || '이름 없는 앨범' },
        {
          label: '종류',
          value: photo.mediaKind === 'VIDEO' ? '동영상' : '사진',
        },
        {
          label: '상태',
          value: labelOf(PHOTO_STATUS_LABELS, photo.status),
        },
        {
          label: '올린 날',
          value: kstDateTimeLabel(photo.uploadedAt) || '알 수 없음',
          dateTime: photo.uploadedAt ?? undefined,
        },
      ],
      view:
        photo.photoId && photo.status !== 'DELETED'
          ? photo.mediaKind === 'VIDEO'
            ? { kind: 'video', id: photo.photoId, label: '신고된 동영상' }
            : { kind: 'photo', id: photo.photoId, label: '신고된 사진' }
          : null,
    };
  }
  if (report.targetType === 'COMMENT') {
    const comment = target as CommentReportTarget;
    return {
      facts: [
        { label: '종류', value: labelOf(COMMENT_KIND_LABELS, comment.kind) },
        { label: '삭제 여부', value: comment.deleted ? '삭제됨' : '보이는 중' },
        {
          label: '작성일',
          value: kstDateTimeLabel(comment.createdAt),
          dateTime: comment.createdAt,
        },
      ],
      view: comment.commentId
        ? { kind: 'comment', id: comment.commentId, label: '신고된 댓글' }
        : null,
    };
  }
  const user = target as UserReportTarget;
  return {
    facts: [
      {
        label: '그룹 참여',
        value: labelOf(MEMBERSHIP_STATUS_LABELS, user.membershipStatus),
      },
    ],
    view: null,
  };
}
function Report({
  report,
  onChanged,
  onReload,
}: {
  report: AdminReportDetail;
  onChanged: (response: unknown) => void;
  onReload: () => void;
}) {
  const reauth = useReauth();
  const actions = allowedReportActions(report.targetType);
  const [dialog, setDialog] = useState<'dismiss' | 'resolve' | null>(null),
    [action, setAction] = useState<ReportAction>(actions[0]),
    [reason, setReason] = useState(''),
    [reasonError, setReasonError] = useState(''),
    [acknowledged, setAcknowledged] = useState(false),
    [reviewing, setReviewing] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [viewing, setViewing] = useState<ContentViewTarget | null>(null);
  const reasonInput = useRef<HTMLInputElement>(null);
  const targetName = report.targetUser?.displayName ?? '';
  const open = isReportOpen(report.status);
  // A report closed elsewhere is shown read-only with the latest state.
  function closedElsewhere(cause: unknown) {
    if (codeOf(cause) !== ADMIN_ERROR.REPORT_ALREADY_CLOSED) return false;
    setDialog(null);
    setError(actionErrorMessage(cause, ''));
    onReload();
    return true;
  }
  async function review() {
    if (reviewing) return;
    setReviewing(true);
    setMessage('');
    setError('');
    try {
      onChanged(await reauth.run(() => reviewReport(report.id)));
      setMessage('검토를 시작했어요. 신고한 회원에게 ‘검토 중’으로 보여요.');
    } catch (cause) {
      if (!closedElsewhere(cause))
        setError(actionErrorMessage(cause, '검토를 시작하지 못했어요.'));
    } finally {
      setReviewing(false);
    }
  }
  function openDialog(kind: 'dismiss' | 'resolve') {
    setDialog(kind);
    setAction(actions[0]);
    setReason('');
    setReasonError('');
    setAcknowledged(false);
    setMessage('');
    setError('');
  }
  async function confirm() {
    const invalid = plainTextError(reason, RULES.actionReason);
    setReasonError(invalid);
    if (invalid) {
      reasonInput.current?.focus();
      return;
    }
    const text = reason.trim(),
      outcome = dialog === 'dismiss' ? 'DISMISS' : action;
    try {
      const response: ReportActionResult | undefined = await reauth.run(() =>
        outcome === 'DISMISS'
          ? dismissReport(report.id, text)
          : resolveReport(report.id, outcome, text)
      );
      onChanged(response);
      setMessage(
        reportResultMessage(outcome, report.targetType, response?.alsoResolved)
      );
      setDialog(null);
    } catch (cause) {
      if (closedElsewhere(cause)) return;
      throw new Error(actionErrorMessage(cause, '신고를 처리하지 못했어요.'));
    }
  }
  const copy =
    dialog === 'resolve'
      ? reportActionCopy(action, report.targetType, targetName)
      : null;
  const reporterText = reporterTextState(report.detail, report.reporter);
  const { facts, view } = targetFacts(report);
  return (
    <>
      <ReportView
        listHref={ROUTES.REPORTS}
        title={`${labelOf(REPORT_TARGET_LABELS, report.targetType)} 신고`}
        status={report.status}
        statusLabel={labelOf(REPORT_STATUS_LABELS, report.status)}
        resolution={
          report.resolution
            ? labelOf(REPORT_RESOLUTION_LABELS, report.resolution)
            : ''
        }
        reasonLabel={labelOf(REPORT_REASON_LABELS, report.reason)}
        reporterText={reporterText}
        reporter={report.reporter.displayName}
        group={report.group?.name ?? '알 수 없는 그룹'}
        groupStatus={
          report.group && report.group.status !== 'ACTIVE'
            ? labelOf(GROUP_STATUS_LABELS, report.group.status)
            : ''
        }
        targetUser={targetName || '알 수 없는 회원'}
        targetUserStatus={
          report.targetUser && report.targetUser.status !== 'ACTIVE'
            ? labelOf(MEMBER_STATUS_LABELS, report.targetUser.status)
            : ''
        }
        openOnTarget={report.openReportsOnTarget ?? 0}
        created={kstDateTimeLabel(report.createdAt)}
        createdAt={report.createdAt}
        resolved={kstDateTimeLabel(report.resolvedAt)}
        resolvedAt={report.resolvedAt ?? ''}
        targetFacts={facts}
        viewLabel={
          view
            ? view.kind === 'photo'
              ? '사진 보기'
              : view.kind === 'video'
                ? '동영상 보기'
                : '댓글 보기'
            : ''
        }
        open={open}
        canReview={report.status === 'RECEIVED'}
        reviewing={reviewing}
        message={message}
        error={error}
        dialog={
          dialog === 'dismiss'
            ? { ...DISMISS_COPY, danger: false }
            : copy
              ? {
                  title: copy.title,
                  consequences: copy.consequences,
                  confirmLabel: copy.confirmLabel,
                  danger: true,
                  acknowledge: copy.acknowledge,
                }
              : null
        }
        actionOptions={
          dialog === 'resolve'
            ? actions.map((value) => ({
                value,
                label:
                  reportActionCopy(value, report.targetType, targetName)
                    ?.option ?? value,
              }))
            : []
        }
        action={action}
        reason={reason}
        reasonError={reasonError}
        reasonRef={reasonInput}
        acknowledged={acknowledged}
        onView={() => view && setViewing(view)}
        onReview={() => void review()}
        onDismiss={() => openDialog('dismiss')}
        onResolve={() => openDialog('resolve')}
        onAction={(value) => {
          const next = actions.find((item) => item === value);
          if (next) setAction(next);
          setAcknowledged(false);
        }}
        onReason={(value) => {
          setReason(value);
          setReasonError('');
        }}
        onAcknowledge={setAcknowledged}
        onConfirm={confirm}
        onCloseDialog={() => setDialog(null)}
      />
      {viewing && (
        <ContentViewer target={viewing} onClose={() => setViewing(null)} />
      )}
    </>
  );
}
export function ReportContainer() {
  const id = useSearchParams().get('id');
  const load = useCallback(
    (signal: AbortSignal) => getReport(id as string, signal),
    [id]
  );
  const record = useAdminRecord(
    isUuid(id) ? load : null,
    '신고를 불러오지 못했어요.'
  );
  return (
    <RecordFrame
      title='신고'
      ready={!!record.data}
      loading={record.loading}
      error={record.error}
      notFound={record.notFound}
      notFoundBody='주소가 잘못됐거나 없는 신고예요. 목록에서 다시 골라 주세요.'
      backHref={ROUTES.REPORTS}
      backLabel='신고 목록'
      onRetry={record.reload}
    >
      {record.data && (
        <Report
          key={record.data.id}
          report={record.data}
          onChanged={record.apply}
          onReload={record.reload}
        />
      )}
    </RecordFrame>
  );
}
