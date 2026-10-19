'use client';
import { useEffect, useState } from 'react';
import { safeReturnTo, isPublicRoute } from '@/utils/auth-navigation';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { DEMO_MODE } from '@/constants/app-mode';
import { Box, Heading, Text, Button } from '@/components/atoms/ui';
import { GuestHome } from '@/components/organisms/guest-home/guest-home';
import type { ReactNode } from 'react';
export function AccountGate({ children }: { children: ReactNode }) {
  const auth = useAuth(),
    path = usePathname();
  const [next, setNext] = useState('/');
  useEffect(() => {
    queueMicrotask(() =>
      setNext(safeReturnTo(window.location.pathname + window.location.search))
    );
  }, [path]);
  if (DEMO_MODE || isPublicRoute(path)) return children;
  if (auth.status === 'loading')
    return (
      <Text className='state-panel' role='status'>
        계정을 확인하고 있어요…
      </Text>
    );
  if (auth.status === 'error')
    return (
      <Box className='state-panel'>
        <Heading>연결을 확인해 주세요</Heading>
        <Text role='alert'>{auth.error}</Text>
        <Button variant='primary' onClick={() => void auth.refresh()}>
          다시 시도
        </Button>
      </Box>
    );
  if (!auth.user) return <GuestHome next={next} />;
  return children;
}
