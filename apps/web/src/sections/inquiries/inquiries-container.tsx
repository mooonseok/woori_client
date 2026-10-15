'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePagedList } from '@/hooks/use-paged-list';
import { listInquiries } from '@/services/inquiries';
import { DEMO_MODE } from '@/constants/app-mode';
import { ROUTES } from '@/constants/routes';
import {
  inquiryCategoryLabels,
  inquiryStatusLabels,
} from '@/content/service-guide';
import { kstDateLabel } from '@/utils/service-guidance';
import type { InquirySummary } from '@/dto/inquiry.dto';
import { InquiriesView } from './inquiries-view';

const rowId = (inquiry: InquirySummary) => `inquiry-row-${inquiry.id}`;
function InquiryList() {
  const router = useRouter();
  const list = usePagedList(
    listInquiries,
    !DEMO_MODE,
    '문의 내역을 불러오지 못했어요.',
    rowId
  );
  return (
    <InquiriesView
      demo={DEMO_MODE}
      rows={list.items.map((inquiry) => ({
        id: inquiry.id,
        domId: rowId(inquiry),
        title: inquiry.title,
        href: `${ROUTES.INQUIRY}?id=${encodeURIComponent(inquiry.id)}`,
        category: inquiryCategoryLabels[inquiry.category] ?? '기타',
        status: inquiry.status,
        statusLabel: inquiryStatusLabels[inquiry.status] ?? '확인 중',
        date: kstDateLabel(inquiry.createdAt),
        dateTime: inquiry.createdAt,
      }))}
      newHref={ROUTES.INQUIRY_NEW}
      loading={list.loading}
      loadingMore={list.loadingMore}
      error={list.error}
      moreError={list.moreError}
      notice={list.notice}
      hasMore={!!list.nextCursor}
      onRetry={list.reload}
      onMore={list.more}
      onBack={() => router.push(ROUTES.MY)}
    />
  );
}
export function InquiriesContainer() {
  const { user } = useAuth();
  // Inquiries are private to one member; remount on any account change.
  return <InquiryList key={user?.id ?? 'anonymous'} />;
}
