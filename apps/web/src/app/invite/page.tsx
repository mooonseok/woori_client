import { Suspense } from 'react';
import { Text } from '@/components/atoms/ui';
import { InviteContainer } from '@/sections/invite/invite-container';
export default function Page() {
  return (
    <Suspense
      fallback={
        <Text className='state-panel' role='status'>
          화면을 준비하고 있어요…
        </Text>
      }
    >
      <InviteContainer />
    </Suspense>
  );
}
