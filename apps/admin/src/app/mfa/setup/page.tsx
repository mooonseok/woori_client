import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Text } from '@/components/atoms/ui';
import { MfaSetupContainer } from '@/sections/mfa/mfa-setup-container';
export const metadata: Metadata = {
  title: '2단계 인증 등록',
  // Repeated here so this screen stays referrer-free even if the layout changes.
  referrer: 'no-referrer',
};
export default function Page() {
  return (
    <Suspense
      fallback={
        <Text className='console-state' role='status'>
          화면을 준비하고 있어요…
        </Text>
      }
    >
      <MfaSetupContainer />
    </Suspense>
  );
}
