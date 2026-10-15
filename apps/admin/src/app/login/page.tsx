import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Text } from '@/components/atoms/ui';
import { LoginContainer } from '@/sections/login/login-container';
export const metadata: Metadata = { title: '로그인' };
export default function Page() {
  return (
    <Suspense
      fallback={
        <Text className='console-state' role='status'>
          화면을 준비하고 있어요…
        </Text>
      }
    >
      <LoginContainer />
    </Suspense>
  );
}
