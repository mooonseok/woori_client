import { Suspense } from 'react';
import { Text } from '@/components/atoms/ui';
import { RecoveryContainer } from '@/sections/recovery/recovery-container';
export default function Page() {
  return (
    <Suspense
      fallback={
        <Text role='status' className='state-panel'>
          화면을 준비하고 있어요…
        </Text>
      }
    >
      <RecoveryContainer mode='password' />
    </Suspense>
  );
}
