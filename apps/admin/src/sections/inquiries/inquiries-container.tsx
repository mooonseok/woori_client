'use client';
import { useCallback, useState } from 'react';
import { useCursorList } from '@/hooks/use-cursor-list';
import { listInquiries } from '@/services/inquiries';
import { INQUIRY_CATEGORIES, INQUIRY_STATUSES } from '@/constants/content-ops';
import { ROUTES } from '@/constants/routes';
import {
  INQUIRY_CATEGORY_LABELS,
  INQUIRY_STATUS_LABELS,
  labelOf,
} from '@/content/content-labels';
import type { InquiryCategory, InquiryStatus } from '@/dto/inquiry.dto';
import { detailHref } from '@/utils/admin-navigation';
import { kstDateTimeLabel } from '@/utils/time';
import { InquiriesView } from './inquiries-view';
const rowId = (id: string) => `inquiry-row-${id}`;
const pick = <T extends string>(options: readonly T[], value: string) =>
  (options as readonly string[]).includes(value) ? (value as T) : '';
export function InquiriesContainer() {
  const [status, setStatus] = useState<InquiryStatus | ''>(''),
    [category, setCategory] = useState<InquiryCategory | ''>('');
  const fetchPage = useCallback(
    (cursor: string | null, signal: AbortSignal) =>
      listInquiries(
        { status: status || null, category: category || null, cursor },
        signal
      ),
    [status, category]
  );
  const list = useCursorList(fetchPage, rowId, '문의를 불러오지 못했어요.');
  return (
    <InquiriesView
      status={status}
      category={category}
      statusOptions={INQUIRY_STATUSES.map((value) => ({
        value,
        label: INQUIRY_STATUS_LABELS[value],
      }))}
      categoryOptions={INQUIRY_CATEGORIES.map((value) => ({
        value,
        label: INQUIRY_CATEGORY_LABELS[value],
      }))}
      rows={list.items.map((inquiry) => ({
        id: inquiry.id,
        domId: rowId(inquiry.id),
        href: detailHref(ROUTES.INQUIRY, inquiry.id),
        title: inquiry.title,
        category: labelOf(INQUIRY_CATEGORY_LABELS, inquiry.category),
        status: inquiry.status,
        statusLabel: labelOf(INQUIRY_STATUS_LABELS, inquiry.status),
        memberName: inquiry.member?.displayName ?? '알 수 없는 회원',
        memberUsername: inquiry.member?.username ?? '',
        created: kstDateTimeLabel(inquiry.createdAt),
        createdAt: inquiry.createdAt,
        answered: kstDateTimeLabel(inquiry.answeredAt),
        answeredAt: inquiry.answeredAt ?? '',
      }))}
      loading={list.loading}
      loadingMore={list.loadingMore}
      error={list.error}
      moreError={list.moreError}
      notice={list.notice}
      hasMore={list.hasMore}
      onStatus={(value) => setStatus(pick(INQUIRY_STATUSES, value))}
      onCategory={(value) => setCategory(pick(INQUIRY_CATEGORIES, value))}
      onRetry={list.reload}
      onMore={list.more}
    />
  );
}
