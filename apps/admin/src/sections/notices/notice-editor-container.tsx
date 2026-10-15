'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminRecord } from '@/hooks/use-admin-record';
import {
  archiveNotice,
  createNotice,
  getNotice,
  publishNotice,
  updateNotice,
} from '@/services/notices';
import {
  NOTICE_BODY_MAX,
  NOTICE_SCHEDULE_MAX_DAYS,
  NOTICE_TITLE_MAX,
} from '@/constants/content-ops';
import { ROUTES } from '@/constants/routes';
import {
  NOTICE_STATUS_LABELS,
  NOTICE_VISIBILITY_LABELS,
  noticeConfirmCopy,
  type NoticeConfirmKind,
} from '@/content/content-labels';
import { RecordFrame } from '@/components/molecules/record-frame';
import type { AdminNoticeDetail, NoticeFieldErrors } from '@/dto/notice.dto';
import { actionErrorMessage } from '@/utils/admin-errors';
import { detailHref, isUuid } from '@/utils/admin-navigation';
import {
  codePoints,
  noticePatch,
  validateNoticeDraft,
} from '@/utils/plain-text';
import {
  kstInputToIso,
  noticeVisibility,
  scheduleBounds,
  scheduleError,
} from '@/utils/schedule';
import { kstDateTimeLabel, kstMinuteLabel } from '@/utils/time';
import { NoticeEditorView } from './notice-editor-view';

function NoticeEditor({
  notice,
  created,
  onSaved,
}: {
  notice: AdminNoticeDetail | null;
  created: boolean;
  onSaved: (response: unknown) => void;
}) {
  const router = useRouter();
  const saved = { title: notice?.title ?? '', body: notice?.body ?? '' };
  const [draft, setDraft] = useState(saved),
    [errors, setErrors] = useState<NoticeFieldErrors>({}),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState(
      created
        ? '초안을 저장했어요. 게시하기 전까지 회원에게 보이지 않아요.'
        : ''
    ),
    [error, setError] = useState(''),
    [mode, setMode] = useState<'now' | 'later'>('now'),
    [when, setWhen] = useState(''),
    [whenError, setWhenError] = useState(''),
    [confirm, setConfirm] = useState<NoticeConfirmKind | null>(null);
  const dirty = !!notice && !!noticePatch(saved, draft);
  const visibility = notice
    ? noticeVisibility(notice.status, notice.publishedAt)
    : 'hidden';
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const { input, errors: found } = validateNoticeDraft(draft);
    setErrors(found);
    setMessage('');
    setError('');
    if (!input) {
      document
        .getElementById(found.title ? 'notice-title' : 'notice-body')
        ?.focus();
      return;
    }
    setSaving(true);
    try {
      if (!notice) {
        const result = await createNotice(input);
        router.replace(`${detailHref(ROUTES.NOTICE, result.id)}&created=1`);
        return;
      }
      const patch = noticePatch(saved, input);
      if (!patch) {
        setDraft(input);
        setMessage('바뀐 내용이 없어요.');
        return;
      }
      const result = await updateNotice(notice.id, patch);
      setDraft(input);
      onSaved(result);
      setMessage(
        visibility === 'visible'
          ? '저장했어요. 게시 중인 공지라 회원에게 바로 반영되고 수정일이 표시돼요.'
          : '저장했어요.'
      );
    } catch (cause) {
      setError(actionErrorMessage(cause, '공지를 저장하지 못했어요.'));
    } finally {
      setSaving(false);
    }
  }
  function askPublish() {
    if (!notice || dirty) return;
    if (mode === 'later') {
      const invalid = scheduleError(when);
      setWhenError(invalid);
      if (invalid) return;
    }
    setConfirm(mode === 'later' ? 'schedule' : 'publish');
  }
  async function runConfirmed() {
    if (!notice || !confirm) return;
    try {
      if (confirm === 'archive') {
        onSaved(await archiveNotice(notice.id));
        setMessage('보관했어요. 이제 회원에게 보이지 않아요.');
      } else {
        const iso = confirm === 'schedule' ? kstInputToIso(when) : null;
        if (confirm === 'schedule') {
          // Re-check at confirm time: the chosen minute may have passed.
          const invalid = scheduleError(when);
          if (invalid || !iso) throw new Error(invalid);
        }
        onSaved(await publishNotice(notice.id, iso ?? undefined));
        setMessage(
          iso
            ? `${kstMinuteLabel(iso)}(KST)에 게시되도록 예약했어요. 그 전까지는 회원에게 보이지 않아요.`
            : '게시했어요. 이제 모든 회원에게 보여요.'
        );
        setWhen('');
        setMode('now');
      }
      setConfirm(null);
    } catch (cause) {
      throw new Error(actionErrorMessage(cause, '처리하지 못했어요.'));
    }
  }
  const bounds = scheduleBounds();
  const scheduledIso = mode === 'later' ? kstInputToIso(when) : null;
  return (
    <NoticeEditorView
      isNew={!notice}
      status={notice?.status ?? null}
      statusLabel={notice ? NOTICE_STATUS_LABELS[notice.status] : ''}
      visibility={visibility}
      visibilityLabel={NOTICE_VISIBILITY_LABELS[visibility]}
      published={kstMinuteLabel(notice?.publishedAt)}
      publishedAt={notice?.publishedAt ?? ''}
      updated={kstDateTimeLabel(notice?.updatedAt)}
      updatedAt={notice?.updatedAt ?? ''}
      title={draft.title}
      body={draft.body}
      titleCount={codePoints(draft.title.trim())}
      bodyCount={codePoints(draft.body.trim())}
      titleMax={NOTICE_TITLE_MAX}
      bodyMax={NOTICE_BODY_MAX}
      errors={errors}
      saving={saving}
      dirty={dirty}
      message={message}
      error={error}
      mode={mode}
      when={when}
      whenMin={bounds.min}
      whenMax={bounds.max}
      whenError={whenError}
      maxDays={NOTICE_SCHEDULE_MAX_DAYS}
      confirm={
        confirm
          ? noticeConfirmCopy(confirm, kstMinuteLabel(scheduledIso))
          : null
      }
      listHref={ROUTES.NOTICES}
      onTitle={(value) => {
        setDraft((current) => ({ ...current, title: value }));
        setErrors((current) => ({ ...current, title: undefined }));
      }}
      onBody={(value) => {
        setDraft((current) => ({ ...current, body: value }));
        setErrors((current) => ({ ...current, body: undefined }));
      }}
      onSave={save}
      onMode={setMode}
      onWhen={(value) => {
        setWhen(value);
        setWhenError('');
      }}
      onPublish={askPublish}
      onArchive={() => setConfirm('archive')}
      onConfirm={runConfirmed}
      onCloseConfirm={() => setConfirm(null)}
    />
  );
}
export function NoticeEditorContainer({ isNew = false }: { isNew?: boolean }) {
  const search = useSearchParams();
  const id = isNew ? null : search.get('id');
  const created = search.get('created') === '1';
  const router = useRouter();
  useEffect(() => {
    // The "saved" notice is shown once; a reload should not repeat it.
    if (created && isUuid(id)) router.replace(detailHref(ROUTES.NOTICE, id));
  }, [created, id, router]);
  const load = useCallback(
    (signal: AbortSignal) => getNotice(id as string, signal),
    [id]
  );
  const record = useAdminRecord(
    !isNew && isUuid(id) ? load : null,
    '공지를 불러오지 못했어요.'
  );
  if (isNew)
    return <NoticeEditor notice={null} created={false} onSaved={() => {}} />;
  return (
    <RecordFrame
      title='공지'
      ready={!!record.data}
      loading={record.loading}
      error={record.error}
      notFound={record.notFound}
      notFoundBody='주소가 잘못됐거나 없는 공지예요. 목록에서 다시 골라 주세요.'
      backHref={ROUTES.NOTICES}
      backLabel='공지 목록'
      onRetry={record.reload}
    >
      {record.data && (
        <NoticeEditor
          key={record.data.id}
          notice={record.data}
          created={created}
          onSaved={record.apply}
        />
      )}
    </RecordFrame>
  );
}
