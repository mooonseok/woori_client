import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Text } from '@/components/atoms/ui';
import { MemberContainer } from '@/sections/members/member-container';
export const metadata: Metadata = { title: '회원 상세' };
export default function Page() {
  return (
    <Suspense
      fallback={
        <Text className='console-state' role='status'>
          화면을 준비하고 있어요…
        </Text>
      }
    >
      <MemberContainer />
    </Suspense>
  );
}
