'use client';
import { useCallback, useState } from 'react';
import { useCursorList } from '@/hooks/use-cursor-list';
import { listNotices } from '@/services/notices';
import { NOTICE_STATUSES } from '@/constants/content-ops';
import { ROUTES } from '@/constants/routes';
import {
  NOTICE_STATUS_LABELS,
  NOTICE_VISIBILITY_LABELS,
} from '@/content/content-labels';
import type { NoticeStatus } from '@/dto/notice.dto';
import { detailHref } from '@/utils/admin-navigation';
import { noticeVisibility } from '@/utils/schedule';
import { kstDateTimeLabel } from '@/utils/time';
import { NoticesView } from './notices-view';
const rowId = (id: string) => `notice-row-${id}`;
export function NoticesContainer() {
  const [status, setStatus] = useState<NoticeStatus | ''>('');
  const fetchPage = useCallback(
    (cursor: string | null, signal: AbortSignal) =>
      listNotices({ status: status || null, cursor }, signal),
    [status]
  );
  const list = useCursorList(fetchPage, rowId, '공지를 불러오지 못했어요.');
  return (
    <NoticesView
      status={status}
      statusOptions={NOTICE_STATUSES.map((value) => ({
        value,
        label: NOTICE_STATUS_LABELS[value],
      }))}
      newHref={ROUTES.NOTICE_NEW}
      rows={list.items.map((notice) => {
        const visibility = notice.scheduled
          ? 'scheduled'
          : noticeVisibility(notice.status, notice.publishedAt);
        return {
          id: notice.id,
          domId: rowId(notice.id),
          href: detailHref(ROUTES.NOTICE, notice.id),
          title: notice.title,
          status: notice.status,
          statusLabel: NOTICE_STATUS_LABELS[notice.status] ?? notice.status,
          visibility,
          visibilityLabel: NOTICE_VISIBILITY_LABELS[visibility],
          published: kstDateTimeLabel(notice.publishedAt),
          publishedAt: notice.publishedAt ?? '',
          updated: kstDateTimeLabel(notice.updatedAt),
          updatedAt: notice.updatedAt,
        };
      })}
      loading={list.loading}
      loadingMore={list.loadingMore}
      error={list.error}
      moreError={list.moreError}
      notice={list.notice}
      hasMore={list.hasMore}
      onStatus={(value) =>
        setStatus(
          (NOTICE_STATUSES as readonly string[]).includes(value)
            ? (value as NoticeStatus)
            : ''
        )
      }
      onRetry={list.reload}
      onMore={list.more}
    />
  );
}
