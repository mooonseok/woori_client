'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { DEMO_MODE } from '@/constants/app-mode';
import { ROUTES } from '@/constants/routes';
import { helpTopics } from '@/content/service-guide';
import { HelpView } from './help-view';

// Public: works without login, and never calls the API.
export function HelpContainer() {
  const router = useRouter(),
    { user } = useAuth();
  const [guide, setGuide] = useState<'view' | 'pin' | null>(null);
  const member = DEMO_MODE || !!user;
  return (
    <HelpView
      topics={helpTopics}
      guide={guide}
      inquiryHref={!DEMO_MODE && user ? ROUTES.INQUIRY_NEW : ''}
      onGuide={setGuide}
      onBack={() => router.push(member ? ROUTES.MY : ROUTES.HOME)}
    />
  );
}
