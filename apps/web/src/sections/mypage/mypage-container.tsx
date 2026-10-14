'use client';
import { useAuth } from '@/hooks/use-auth';
import { DEMO_MODE } from '@/constants/app-mode';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGallery } from '@/hooks/use-gallery';
import { MypageView } from './mypage-view';
export function MypageContainer() {
  const router = useRouter(),
    {
      data,
      setToast,
      profileName: name,
      setProfileName: setName,
    } = useGallery(),
    [edit, setEdit] = useState(false),
    [guide, setGuide] = useState<'view' | 'pin' | null>(null);
  const auth = useAuth();
  const [logoutPending, setLogoutPending] = useState(false);
  async function logout() {
    if (logoutPending) return;
    setLogoutPending(true);
    try {
      await auth.logout();
      router.replace('/login');
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : '로그아웃하지 못했어요.'
      );
    } finally {
      setLogoutPending(false);
    }
  }
  return (
    <MypageView
      live={!DEMO_MODE}
      email={auth.user?.email || ''}
      verified={!!auth.user?.emailVerified}
      logoutPending={logoutPending}
      onLogout={() => void logout()}
      name={name}
      edit={edit}
      guide={guide}
      groupCount={data.groups.length}
      setName={async (value) => {
        if (DEMO_MODE) setName(value);
        else {
          await auth.saveProfile(value.trim());
          setToast('이름을 저장했어요.');
        }
      }}
      setEdit={setEdit}
      setGuide={setGuide}
      onNavigate={router.push}
      onMessage={setToast}
    />
  );
}
