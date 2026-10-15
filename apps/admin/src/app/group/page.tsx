import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Text } from '@/components/atoms/ui';
import { GroupContainer } from '@/sections/groups/group-container';
export const metadata: Metadata = { title: '그룹 상세' };
export default function Page() {
  return (
    <Suspense
      fallback={
        <Text className='console-state' role='status'>
          화면을 준비하고 있어요…
        </Text>
      }
    >
      <GroupContainer />
    </Suspense>
  );
}
