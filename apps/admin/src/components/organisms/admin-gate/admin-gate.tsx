'use client';
import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box, Button, Heading, Main, Text } from '@/components/atoms/ui';
import { useAdminSession } from '@/hooks/use-admin-session';
import { gateDecision, routeKind } from '@/utils/admin-navigation';
// Session guard for every admin screen. /auth/me runs on load and focus (in
// the session provider); this only routes by its answer.
export function AdminGate({ children }: { children: ReactNode }) {
  const { status, session, error, endReason, refresh } = useAdminSession();
  const path = usePathname();
  const isAuthRoute = routeKind(path) !== 'protected';
  const mainClass = isAuthRoute ? 'gate-main auth-main' : 'gate-main';
  const router = useRouter();
  const mfa = session?.mfa ?? null;
  const decision = gateDecision({ path, search: '', status, mfa, endReason });
  useEffect(() => {
    // The pending destination (?next=) is read from the real URL here.
    const actual = gateDecision({
      path,
      search: window.location.search,
      status,
      mfa,
      endReason,
    });
    if (actual.type === 'redirect') router.replace(actual.to);
  }, [path, status, mfa, endReason, router]);
  if (decision.type === 'render') return children;
  if (decision.type === 'error')
    return (
      <Main className={mainClass}>
        <Box className={isAuthRoute ? 'gate-panel auth-panel' : 'gate-panel'}>
          <Heading>관리자 서버에 연결하지 못했어요</Heading>
          <Text role='alert'>{error}</Text>
          <Button className='primary' onClick={() => void refresh()}>
            다시 시도
          </Button>
        </Box>
      </Main>
    );
  return (
    <Main className={mainClass}>
      <Text className='console-state' role='status'>
        {decision.type === 'loading'
          ? '관리자 계정을 확인하고 있어요…'
          : '알맞은 화면으로 이동하고 있어요…'}
      </Text>
    </Main>
  );
}
