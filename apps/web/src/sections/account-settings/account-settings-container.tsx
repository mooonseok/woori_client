'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { requestEmailChange } from '@/services/account-settings';
import { AccountSettingsView } from './account-settings-view';

export function AccountSettingsContainer() {
  const auth = useAuth(),
    router = useRouter();
  const [mode, setMode] = useState<'password' | 'email' | null>(null);
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  function select(next: typeof mode) {
    if (active.current) return;
    setMode(next);
    setError('');
    setSentEmail('');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current || !auth.user || !mode) return;
    const form = event.currentTarget,
      data = new FormData(form);
    setError('');
    setSentEmail('');
    const currentPassword = String(data.get('currentPassword'));
    const newPassword = String(data.get('newPassword'));
    if (
      mode === 'password' &&
      newPassword !== String(data.get('confirmPassword'))
    ) {
      setError('두 비밀번호가 같지 않아요. 다시 확인해 주세요.');
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    try {
      if (mode === 'password') {
        await auth.changePassword({ currentPassword, newPassword }, () => {
          form.reset();
          router.replace('/login?passwordReset=1');
        });
      } else {
        const newEmail = String(data.get('newEmail')).trim().toLowerCase();
        await requestEmailChange(
          { currentPassword, newEmail },
          controller.signal
        );
        if (controller.signal.aborted) return;
        form.reset();
        setSentEmail(newEmail);
      }
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error ? cause.message : '계정을 변경하지 못했어요.'
        );
    } finally {
      if (!controller.signal.aborted) {
        active.current = null;
        setPending(false);
      }
    }
  }
  return (
    <AccountSettingsView
      username={auth.user?.username || ''}
      email={auth.user?.email || ''}
      mode={mode}
      pending={pending}
      error={error}
      sentEmail={sentEmail}
      onSelect={select}
      onBack={() => router.push('/mypage')}
      onSubmit={submit}
    />
  );
}
