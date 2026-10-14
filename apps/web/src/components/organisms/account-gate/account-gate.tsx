'use client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { DEMO_MODE } from '@/constants/app-mode';
import { Box, Heading, Text, Button } from '@/components/atoms/ui';
import { Link } from '@/components/molecules/link';
import type { ReactNode } from 'react';
export function AccountGate({ children }: { children: ReactNode }) {
  const auth = useAuth(),
    path = usePathname();
  if (
    DEMO_MODE ||
    ['/login', '/signup', '/invite', '/verify-email'].includes(
      path.replace(/\/$/, '')
    )
  )
    return children;
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
        <Button className='primary-button' onClick={() => void auth.refresh()}>
          다시 시도
        </Button>
      </Box>
    );
  if (!auth.user)
    return (
      <Box className='welcome-panel'>
        <Text className='eyebrow'>WOORI</Text>
        <Heading>우리의 순간을, 가까운 사람들과.</Heading>
        <Text>초대받은 가족과 친구만 볼 수 있는 사진 공간.</Text>
        <Box className='inline-actions'>
          <Link className='primary-button' href='/login'>
            로그인
          </Link>
          <Link className='secondary-button' href='/signup'>
            회원가입
          </Link>
        </Box>
        <Link className='text-button' href='/invite'>
          초대 코드로 참여하기
        </Link>
      </Box>
    );
  return children;
}
