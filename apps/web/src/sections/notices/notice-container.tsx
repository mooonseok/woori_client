'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useRecordDetail } from '@/hooks/use-record-detail';
import { getNotice } from '@/services/notices';
import { DEMO_MODE } from '@/constants/app-mode';
import { ROUTES } from '@/constants/routes';
import { kstDateLabel, noticeUpdatedLabel } from '@/utils/service-guidance';
import { NoticeView } from './notice-view';

function NoticeDetail({ id }: { id: string }) {
  const router = useRouter();
  const { state, reload } = useRecordDetail(
    id,
    getNotice,
    !DEMO_MODE,
    '공지를 불러오지 못했어요.'
  );
  const notice = state.status === 'ready' ? state.record : null;
  const published = notice ? kstDateLabel(notice.publishedAt) : '',
    updated = notice
      ? noticeUpdatedLabel(notice.publishedAt, notice.updatedAt)
      : '';
  return (
    <NoticeView
      status={state.status}
      error={state.status === 'error' ? state.error : ''}
      notice={
        notice && {
          title: notice.title,
          body: notice.body,
          published,
          publishedAt: notice.publishedAt,
          updated,
          updatedAt: notice.updatedAt,
        }
      }
      onRetry={reload}
      onBack={() => router.push(ROUTES.NOTICES)}
    />
  );
}
export function NoticeContainer() {
  const params = useSearchParams(),
    { user } = useAuth();
  const id = params.get('id') ?? '';
  return <NoticeDetail key={`${user?.id ?? 'anonymous'}:${id}`} id={id} />;
}
