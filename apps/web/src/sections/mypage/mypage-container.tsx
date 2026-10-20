'use client';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { DEMO_MODE } from '@/constants/app-mode';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGallery } from '@/hooks/use-gallery';
import { nicknameProblem, normalizeNickname } from '@/utils/nickname';
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
  const theme = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  async function logout() {
    if (logoutPending) return;
    setLogoutPending(true);
    try {
      await auth.logout();
      router.replace('/');
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
      themePreference={theme.preference}
      resolvedTheme={theme.resolvedTheme}
      onThemeChange={theme.setPreference}
      themeOpen={themeOpen}
      onThemeOpen={() => setThemeOpen(true)}
      onThemeClose={() => {
        setThemeOpen(false);
        requestAnimationFrame(() =>
          document.getElementById('theme-settings-button')?.focus()
        );
      }}
      live={!DEMO_MODE}
      email={auth.user?.email || ''}
      verified={!!auth.user?.emailVerified}
      logoutPending={logoutPending}
      onLogout={() => void logout()}
      name={name}
      userId={auth.user?.id}
      avatarVersion={auth.user?.avatarVersion}
      avatarOpen={avatarOpen}
      onAvatarOpen={() => setAvatarOpen(true)}
      onAvatarClose={() => setAvatarOpen(false)}
      nicknameNeedsUpdate={!!auth.user?.nicknameNeedsUpdate}
      edit={edit}
      guide={guide}
      groupCount={data.groups.length}
      setName={async (value) => {
        const nickname = normalizeNickname(value);
        const problem = nicknameProblem(nickname);
        if (problem) throw new Error(problem);
        if (DEMO_MODE) setName(nickname);
        else {
          await auth.saveProfile({ nickname });
          setToast('닉네임을 저장했어요.');
        }
      }}
      setEdit={setEdit}
      setGuide={setGuide}
      onNavigate={router.push}
      onMessage={setToast}
    />
  );
}
