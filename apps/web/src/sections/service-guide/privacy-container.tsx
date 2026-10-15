'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { DEMO_MODE } from '@/constants/app-mode';
import { ROUTES } from '@/constants/routes';
import { privacyGuide } from '@/content/service-guide';
import { authDestination, safeReturnTo } from '@/utils/auth-navigation';
import { privacyOperatorRows } from '@/utils/service-guidance';
import { PrivacyView } from './privacy-view';

// Public: reachable from signup before an account exists.
export function PrivacyContainer() {
  const router = useRouter(),
    params = useSearchParams(),
    { user } = useAuth();
  const fromSignup = params.has('next');
  const back =
    DEMO_MODE || user
      ? ROUTES.MY
      : fromSignup
        ? authDestination('/signup', safeReturnTo(params.get('next')))
        : ROUTES.HOME;
  return (
    <PrivacyView
      notice={privacyGuide.notice}
      topics={privacyGuide.topics}
      operatorHeading={privacyGuide.operatorHeading}
      operatorRows={privacyOperatorRows(
        privacyGuide.operatorInfo,
        privacyGuide.operatorLabels,
        privacyGuide.pendingMessage
      )}
      onBack={() => router.push(back)}
    />
  );
}
