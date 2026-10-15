import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Text } from '@/components/atoms/ui';
import { MfaVerifyContainer } from '@/sections/mfa/mfa-verify-container';
export const metadata: Metadata = { title: '2단계 인증' };
export default function Page() {
  return (
    <Suspense
      fallback={
        <Text className='console-state' role='status'>
          화면을 준비하고 있어요…
        </Text>
      }
    >
      <MfaVerifyContainer />
    </Suspense>
  );
}
