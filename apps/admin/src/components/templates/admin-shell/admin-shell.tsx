'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  Anchor,
  Box,
  Button,
  Header,
  Li,
  Main,
  Nav,
  Span,
  Time,
  Ul,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { Link } from '@/components/molecules/link';
import { Notice } from '@/components/molecules/notice';
import { AdminGate } from '@/components/organisms/admin-gate/admin-gate';
import { ReauthDialog } from '@/components/organisms/reauth-dialog/reauth-dialog';
import { NAV_ITEMS, ROUTES } from '@/constants/routes';
import type { AdminSession } from '@/dto/admin-auth.dto';
import {
  AdminSessionProvider,
  useAdminSession,
} from '@/hooks/use-admin-session';
import { ReauthProvider, useReauth } from '@/hooks/use-reauth';
import { messageOf } from '@/utils/admin-errors';
import { navHrefOf, routeKind, routeOf } from '@/utils/admin-navigation';
import { kstTimeLabel } from '@/utils/time';

function Console({
  session,
  children,
}: {
  session: AdminSession;
  children: ReactNode;
}) {
  const path = routeOf(usePathname());
  const menu = navHrefOf(path);
  const { logout } = useAdminSession();
  const reauth = useReauth();
  const [leaving, setLeaving] = useState(false),
    [logoutError, setLogoutError] = useState('');
  const expires = kstTimeLabel(session.sessionExpiresAt);
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    // On narrow screens the menu scrolls sideways; keep the current one visible.
    nav.current
      ?.querySelector('[aria-current]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [path]);
  async function signOut() {
    if (leaving) return;
    setLeaving(true);
    setLogoutError('');
    try {
      // On success the gate moves to the login screen.
      await logout();
    } catch (cause) {
      setLogoutError(
        messageOf(cause, '로그아웃하지 못했어요. 다시 시도해 주세요.')
      );
      setLeaving(false);
    }
  }
  return (
    <Box className='console'>
      <Anchor className='skip-link' href='#admin-main'>
        본문으로 건너뛰기
      </Anchor>
      <Header className='topbar'>
        <Link className='wordmark' href={ROUTES.DASHBOARD}>
          우리<Span className='wordmark-tag'>관리자</Span>
        </Link>
        <Box className='topbar-session'>
          <Span className='topbar-admin'>
            <Icon name='shield' size={18} />
            <Span>
              {session.admin.displayName}
              <Span className='topbar-username'>
                {' '}
                @{session.admin.username}
              </Span>
            </Span>
          </Span>
          {expires && (
            <Span className='topbar-expiry'>
              <Icon name='clock' size={16} />
              <Span>
                세션{' '}
                <Time dateTime={session.sessionExpiresAt ?? undefined}>
                  {expires}
                </Time>
                까지
              </Span>
            </Span>
          )}
          <Button
            className='ghost-button'
            aria-disabled={leaving}
            onClick={() => void signOut()}
          >
            <Icon name='logout' size={18} />
            {leaving ? '로그아웃 중…' : '로그아웃'}
          </Button>
        </Box>
      </Header>
      {logoutError && (
        <Box className='topbar-alert'>
          <Notice tone='error'>{logoutError}</Notice>
        </Box>
      )}
      <Box className='console-body'>
        <Nav ref={nav} className='console-nav' aria-label='관리 메뉴'>
          <Ul>
            {NAV_ITEMS.map((item) => (
              <Li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={
                    path === item.href
                      ? 'page'
                      : menu === item.href
                        ? 'true'
                        : undefined
                  }
                >
                  <Icon name={item.icon} size={18} />
                  <Span className='nav-label'>{item.label}</Span>
                  {!item.ready && <Span className='nav-badge'>준비 중</Span>}
                </Link>
              </Li>
            ))}
          </Ul>
        </Nav>
        <Main id='admin-main' className='console-main' tabIndex={-1}>
          {children}
        </Main>
      </Box>
      {reauth.open && (
        <ReauthDialog onSubmit={reauth.submit} onCancel={reauth.cancel} />
      )}
    </Box>
  );
}
function Frame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { session } = useAdminSession();
  if (routeKind(path) !== 'protected' || session?.mfa !== 'VERIFIED')
    return (
      <Main id='admin-main' className='auth-main'>
        {children}
      </Main>
    );
  // Keyed by admin: switching accounts remounts every screen and its data.
  return (
    <ReauthProvider key={session.admin.id}>
      <Console session={session}>{children}</Console>
    </ReauthProvider>
  );
}
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminSessionProvider>
      <AdminGate>
        <Frame>{children}</Frame>
      </AdminGate>
    </AdminSessionProvider>
  );
}
