'use client';
import { memberNickname } from '@/utils/nickname';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Header,
  Nav,
  Main,
  Button,
  Span,
  Details,
  Summary,
  Text,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { Link } from '@/components/molecules/link';
import { HeaderLogin } from '@/components/organisms/header-login/header-login';
import { BrandMark } from '@/components/molecules/brand-mark';
import { EntryDialog } from '@/components/organisms/entry-dialog/entry-dialog';
import { InviteSheet } from '@/components/organisms/invite-sheet/invite-sheet';
import { MemberAvatar } from '@/components/organisms/member-avatar/member-avatar';
import { PhotoViewer } from '@/components/organisms/photo-viewer/photo-viewer';
import { GalleryProvider, useGallery } from '@/hooks/use-gallery';
import { useCreateGroup } from '@/hooks/use-create-group';
import {
  NotificationProvider,
  useNotifications,
} from '@/hooks/use-notifications';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AccountGate } from '@/components/organisms/account-gate/account-gate';
import { DEMO_MODE } from '@/constants/app-mode';
import { ROUTES } from '@/constants/routes';
import { forgetEmailChangeToken } from '@/services/email-change-token';
import { ThemeProvider } from '@/hooks/use-theme';
import { currentTab } from '@/utils/auth-navigation';
function Shell({ children }: { children: ReactNode }) {
  const path = usePathname(),
    gallery = useGallery(),
    { unreadCount } = useNotifications();
  const auth = useAuth();
  const { user } = auth;
  const entryRoute = ['/login', '/signup'].includes(path.replace(/\/$/, ''));
  const member = DEMO_MODE || !!user;
  const memberShell = member && !entryRoute;
  const [logoutPending, setLogoutPending] = useState(false);
  async function logout() {
    if (logoutPending) return;
    setLogoutPending(true);
    try {
      await auth.logout();
      router.replace('/');
    } catch (error) {
      gallery.setToast(
        error instanceof Error ? error.message : '로그아웃하지 못했어요.'
      );
    } finally {
      setLogoutPending(false);
    }
  }
  const router = useRouter();
  const createGroup = useCreateGroup();
  // The invite sheet belongs to the group it was opened for.
  const [create, setCreate] = useState(false),
    [inviteFor, setInviteFor] = useState<string | null>(null);
  // The picker closes on every choice. Focus moves to its summary first so a
  // dialog or sheet opened from the menu returns there, not to a hidden item.
  const picker = useRef<HTMLDetailsElement>(null),
    pickerSummary = useRef<HTMLElement>(null);
  function closePicker() {
    pickerSummary.current?.focus();
    picker.current?.removeAttribute('open');
  }
  useEffect(() => {
    if (path.replace(/\/$/, '') !== '/change-email') forgetEmailChangeToken();
  }, [path]);
  const group = gallery.data.groups.find((g) => g.id === gallery.groupId);
  const tabs = [
    { href: ROUTES.HOME, label: '홈', icon: 'home' },
    { href: ROUTES.ALBUMS, label: '앨범', icon: 'album' },
    { href: ROUTES.MY, label: '마이페이지', icon: 'user' },
  ];
  return (
    <Box className={`app-root ${memberShell ? 'member-shell' : 'entry-shell'}`}>
      {DEMO_MODE && (
        <Box className='preview-bar'>
          개발 미리보기 · 예시 사진 · 데이터는 서버에 전송되지 않아요
        </Box>
      )}
      <Header className='desktop-header'>
        <Link className='brand-home' href={ROUTES.HOME} aria-label='우리 홈'>
          <BrandMark />
        </Link>
        {memberShell && (
          <Nav aria-label='데스크톱 메뉴'>
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                aria-current={
                  currentTab(path, member) === t.href ? 'page' : undefined
                }
              >
                {t.label}
              </Link>
            ))}
          </Nav>
        )}
        {memberShell && !DEMO_MODE ? (
          <Details className='account-menu'>
            <Summary aria-label='내 계정 메뉴'>
              <MemberAvatar
                userId={user?.id}
                name={memberNickname(user)}
                version={user?.avatarVersion}
                size={24}
              />
              <Span>{memberNickname(user)} 님</Span>
              <Icon name='chevron-down' size={16} />
            </Summary>
            <Box className='account-menu-items'>
              <Link
                href='/mypage'
                className='account-menu-item'
                onClick={(e) =>
                  e.currentTarget.closest('details')?.removeAttribute('open')
                }
              >
                <Icon name='user' size={18} />
                마이페이지
              </Link>
              <Button
                className='account-menu-item account-menu-logout'
                disabled={logoutPending}
                onClick={() => void logout()}
              >
                <Icon name='logout' size={18} />
                {logoutPending ? '로그아웃 중…' : '로그아웃'}
              </Button>
            </Box>
          </Details>
        ) : (
          !member &&
          auth.status === 'anonymous' &&
          path.replace(/\/$/, '') !== '/change-email' && <HeaderLogin />
        )}
      </Header>
      {memberShell && (
        <Header className='group-header'>
          <Details
            ref={picker}
            className='group-picker'
            onKeyDown={(e) => {
              if (e.key === 'Escape' && picker.current?.open) {
                e.stopPropagation();
                closePicker();
              }
            }}
          >
            <Summary ref={pickerSummary}>
              {group?.name || '그룹 선택'}
              <Icon name='chevron-down' size={20} />
            </Summary>
            <Box className='group-menu'>
              {gallery.data.groups.map((g) => (
                <Button
                  key={g.id}
                  onClick={() => {
                    gallery.setGroupId(g.id);
                    closePicker();
                  }}
                >
                  <Span>{g.name}</Span>
                  <Span className='muted'>
                    {g.members}명 {g.id === gallery.groupId ? '· 선택됨' : ''}
                  </Span>
                </Button>
              ))}
              <Box className='group-menu-actions'>
                {!DEMO_MODE && !user?.emailVerified && (
                  <Link href='/verify-email' onClick={closePicker}>
                    <Icon name='shield' />
                    <Span>이메일 확인하기</Span>
                  </Link>
                )}
                {!DEMO_MODE &&
                  user?.emailVerified &&
                  group?.role === 'OWNER' && (
                    <Button
                      onClick={() => {
                        closePicker();
                        setInviteFor(group.id);
                      }}
                    >
                      <Icon name='users' />
                      <Span>초대하기</Span>
                    </Button>
                  )}
                {(DEMO_MODE || user?.emailVerified) && (
                  <Button
                    onClick={() => {
                      closePicker();
                      setCreate(true);
                    }}
                  >
                    <Icon name='plus' />
                    <Span>새 그룹 만들기</Span>
                  </Button>
                )}
                {!DEMO_MODE && (
                  <>
                    <Link href='/invite' onClick={closePicker}>
                      <Icon name='arrow-right' />
                      <Span>초대 코드 입력</Span>
                    </Link>
                    <Link href='/groups' onClick={closePicker}>
                      <Icon name='settings' />
                      <Span>그룹 설정</Span>
                    </Link>
                  </>
                )}
              </Box>
            </Box>
          </Details>
          <Link
            href={ROUTES.NOTIFICATIONS}
            className='icon-button notification-bell'
            aria-label={`알림, 읽지 않은 알림 ${unreadCount}개`}
          >
            <Icon name='bell' />
            {unreadCount > 0 && <Span className='badge-dot' />}
          </Link>
        </Header>
      )}
      <Main className='app-content' id='main-content'>
        <AccountGate>{children}</AccountGate>
      </Main>
      {memberShell && (
        <Nav className='bottom-nav' aria-label='주요 메뉴'>
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={
                currentTab(path, DEMO_MODE || !!user) === t.href
                  ? 'page'
                  : undefined
              }
            >
              <Icon name={t.icon} />
              <Span>{t.label}</Span>
            </Link>
          ))}
        </Nav>
      )}
      {create && (
        <EntryDialog
          title='새 그룹 만들기'
          label='그룹 이름'
          maxLength={40}
          submitLabel='만들기'
          note={DEMO_MODE ? undefined : '만든 그룹으로 바로 이동해요.'}
          onSubmit={DEMO_MODE ? gallery.createGroup : createGroup}
          onClose={() => setCreate(false)}
        />
      )}
      {memberShell &&
        !DEMO_MODE &&
        user?.emailVerified &&
        group?.role === 'OWNER' && (
          <InviteSheet
            key={group.id}
            group={group}
            open={inviteFor === group.id}
            onClose={() => setInviteFor(null)}
          />
        )}
      {gallery.viewer && (
        <PhotoViewer
          key={`${user?.id || 'demo'}:${gallery.groupId}:${gallery.viewer.id}`}
          live={gallery.mode === 'live'}
          loadDisplay={gallery.loadDisplay}
          loadVideo={gallery.loadVideo}
          photos={gallery.viewer.photos}
          initialPhotoId={gallery.viewer.id}
          comments={gallery.data.comments}
          reactions={gallery.data.reactions}
          onAddComment={gallery.addComment}
          onReact={gallery.react}
          onClose={gallery.closeViewer}
          onDownloadOriginal={gallery.downloadOriginal}
          onDeletePhoto={gallery.deletePhoto}
          onSetCaptureDate={gallery.setCaptureDate}
        />
      )}
      {gallery.toast && (
        <Text className='toast' role='status'>
          {gallery.toast}
        </Text>
      )}
    </Box>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GalleryProvider>
          <NotificationProvider>
            <Shell>{children}</Shell>
          </NotificationProvider>
        </GalleryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
