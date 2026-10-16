'use client';
import { useEffect, useState, type ReactNode } from 'react';
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
import { EntryDialog } from '@/components/organisms/entry-dialog/entry-dialog';
import { PhotoViewer } from '@/components/organisms/photo-viewer/photo-viewer';
import { GalleryProvider, useGallery } from '@/hooks/use-gallery';
import {
  NotificationProvider,
  useNotifications,
} from '@/hooks/use-notifications';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AccountGate } from '@/components/organisms/account-gate/account-gate';
import { DEMO_MODE } from '@/constants/app-mode';
import { ROUTES } from '@/constants/routes';
import { forgetEmailChangeToken } from '@/services/email-change-token';
import { currentTab } from '@/utils/auth-navigation';
function Shell({ children }: { children: ReactNode }) {
  const path = usePathname(),
    gallery = useGallery(),
    { unreadCount } = useNotifications();
  const { user } = useAuth();
  const router = useRouter();
  const [create, setCreate] = useState(false);
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
    <Box className='app-root'>
      {DEMO_MODE && (
        <Box className='preview-bar'>
          개발 미리보기 · 예시 사진 · 데이터는 서버에 전송되지 않아요
        </Box>
      )}
      <Header className='desktop-header'>
        <Link className='wordmark' href={ROUTES.HOME}>
          우리
        </Link>
        <Nav aria-label='데스크톱 메뉴'>
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
              {t.label}
            </Link>
          ))}
        </Nav>
      </Header>
      {(DEMO_MODE || user) && (
        <Header className='group-header'>
          <Details className='group-picker'>
            <Summary>
              {group?.name || '그룹 선택'}
              <Icon name='chevron-down' size={20} />
            </Summary>
            <Box className='group-menu'>
              {gallery.data.groups.map((g) => (
                <Button
                  key={g.id}
                  onClick={(e) => {
                    gallery.setGroupId(g.id);
                    e.currentTarget.closest('details')?.removeAttribute('open');
                  }}
                >
                  <Span>{g.name}</Span>
                  <Span className='muted'>
                    {g.members}명 {g.id === gallery.groupId ? '· 선택됨' : ''}
                  </Span>
                </Button>
              ))}
              <Button
                onClick={(e) => {
                  if (DEMO_MODE) setCreate(true);
                  else router.push('/groups');
                  e.currentTarget.closest('details')?.removeAttribute('open');
                }}
              >
                <Icon name='plus' />
                {DEMO_MODE ? '그룹 만들기' : '그룹 관리·초대'}
              </Button>
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
      <Main className='app-content'>
        <AccountGate>{children}</AccountGate>
      </Main>
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
      {create && (
        <EntryDialog
          title='그룹 만들기'
          label='그룹 이름'
          onSubmit={gallery.createGroup}
          onClose={() => setCreate(false)}
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
    <AuthProvider>
      <GalleryProvider>
        <NotificationProvider>
          <Shell>{children}</Shell>
        </NotificationProvider>
      </GalleryProvider>
    </AuthProvider>
  );
}
