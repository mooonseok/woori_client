import { Suspense } from 'react';
import { Text } from '@/components/atoms/ui';
import { NoticeContainer } from '@/sections/notices/notice-container';
export default function Page() {
  return (
    <Suspense
      fallback={
        <Text className='state-panel' role='status'>
          화면을 준비하고 있어요…
        </Text>
      }
    >
      <NoticeContainer />
    </Suspense>
  );
}
