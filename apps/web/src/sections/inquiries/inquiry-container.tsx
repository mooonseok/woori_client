'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useRecordDetail } from '@/hooks/use-record-detail';
import { getInquiry } from '@/services/inquiries';
import { DEMO_MODE } from '@/constants/app-mode';
import { ROUTES } from '@/constants/routes';
import {
  inquiryCategoryLabels,
  inquiryStatusLabels,
} from '@/content/service-guide';
import { kstDateLabel } from '@/utils/service-guidance';
import { InquiryView } from './inquiry-view';

function InquiryDetail({ id }: { id: string }) {
  const router = useRouter();
  const { state, reload } = useRecordDetail(
    id,
    getInquiry,
    !DEMO_MODE,
    '문의를 불러오지 못했어요.'
  );
  const inquiry = state.status === 'ready' ? state.record : null;
  return (
    <InquiryView
      status={state.status}
      error={state.status === 'error' ? state.error : ''}
      inquiry={
        inquiry && {
          title: inquiry.title,
          body: inquiry.body,
          category: inquiryCategoryLabels[inquiry.category] ?? '기타',
          status: inquiry.status,
          statusLabel: inquiryStatusLabels[inquiry.status] ?? '확인 중',
          created: kstDateLabel(inquiry.createdAt),
          createdAt: inquiry.createdAt,
          answer: inquiry.answer,
          answered: kstDateLabel(inquiry.answeredAt),
          answeredAt: inquiry.answeredAt ?? '',
        }
      }
      onRetry={reload}
      onBack={() => router.push(ROUTES.INQUIRIES)}
    />
  );
}
export function InquiryContainer() {
  const params = useSearchParams(),
    { user } = useAuth();
  const id = params.get('id') ?? '';
  return <InquiryDetail key={`${user?.id ?? 'anonymous'}:${id}`} id={id} />;
}
