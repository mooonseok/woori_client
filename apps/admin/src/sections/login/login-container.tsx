'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminSession } from '@/hooks/use-admin-session';
import { SESSION_END_MESSAGES } from '@/content/session-messages';
import { loginErrorMessage } from '@/utils/admin-errors';
import {
  endReasonOf,
  loginDestination,
  safeReturnTo,
} from '@/utils/admin-navigation';
import { LoginView } from './login-view';
export function LoginContainer() {
  const session = useAdminSession(),
    router = useRouter(),
    search = useSearchParams();
  const next = safeReturnTo(search.get('next'));
  const reason = endReasonOf(search.get('reason')) ?? session.endReason;
  const [username, setUsername] = useState(''),
    [password, setPassword] = useState('');
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [failures, setFailures] = useState(0);
  const passwordInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // After a refused login the password is cleared; continue from there.
    if (failures) passwordInput.current?.focus();
  }, [failures]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const name = username.trim().toLowerCase();
    if (!name || !password) {
      setError('아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }
    setPending(true);
    setError('');
    try {
      const result = await session.login({ username: name, password });
      setPassword('');
      router.replace(loginDestination(result.mfa, next));
    } catch (cause) {
      setPassword('');
      setError(loginErrorMessage(cause));
      setFailures((count) => count + 1);
    } finally {
      setPending(false);
    }
  }
  return (
    <LoginView
      username={username}
      password={password}
      pending={pending}
      error={error}
      notice={reason && !error ? SESSION_END_MESSAGES[reason] : ''}
      passwordRef={passwordInput}
      onUsername={setUsername}
      onPassword={setPassword}
      onSubmit={submit}
    />
  );
}
