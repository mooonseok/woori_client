import { Suspense } from 'react';
import { Text } from '@/components/atoms/ui';
import { EmailChangeContainer } from '@/sections/account-settings/email-change-container';
export default function Page() {
  return (
    <Suspense
      fallback={
        <Text role='status' className='state-panel'>
          화면을 준비하고 있어요…
        </Text>
      }
    >
      <EmailChangeContainer />
    </Suspense>
  );
}
