'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePagedList } from '@/hooks/use-paged-list';
import { listNotices } from '@/services/notices';
import { DEMO_MODE } from '@/constants/app-mode';
import { ROUTES } from '@/constants/routes';
import { kstDateLabel } from '@/utils/service-guidance';
import type { NoticeSummary } from '@/dto/notice.dto';
import { NoticesView } from './notices-view';

const rowId = (notice: NoticeSummary) => `notice-row-${notice.id}`;
function NoticeList() {
  const router = useRouter();
  const list = usePagedList(
    listNotices,
    !DEMO_MODE,
    '공지사항을 불러오지 못했어요.',
    rowId
  );
  return (
    <NoticesView
      demo={DEMO_MODE}
      rows={list.items.map((notice) => ({
        id: notice.id,
        domId: rowId(notice),
        title: notice.title,
        href: `${ROUTES.NOTICE}?id=${encodeURIComponent(notice.id)}`,
        date: kstDateLabel(notice.publishedAt),
        dateTime: notice.publishedAt,
      }))}
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
export function NoticesContainer() {
  const { user } = useAuth();
  // A different member gets a fresh list; nothing from the previous session carries over.
  return <NoticeList key={user?.id ?? 'anonymous'} />;
}
