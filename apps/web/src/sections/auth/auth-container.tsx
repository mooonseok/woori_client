'use client';
import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { authDestination, safeReturnTo } from '@/utils/auth-navigation';
import { rememberInvite } from '@/services/invite-return';
import { AuthView } from './auth-view';
export function AuthContainer({ signup = false }: { signup?: boolean }) {
  const auth = useAuth(),
    router = useRouter(),
    search = useSearchParams();
  const next = safeReturnTo(search.get('next'));
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    rememberInvite(next);
    try {
      const credentials = {
        username: String(data.get('username')).trim(),
        password: String(data.get('password')),
      };
      const user = signup
        ? await auth.signup({
            ...credentials,
            displayName: String(data.get('displayName')).trim(),
            email: String(data.get('email')).trim(),
          })
        : await auth.login(credentials);
      router.replace(
        next.startsWith('/verify-email') || user.emailVerified
          ? next
          : authDestination('/verify-email', next)
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : '요청을 처리하지 못했어요.'
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <AuthView
      signup={signup}
      pending={pending}
      error={error}
      alternate={authDestination(signup ? '/login' : '/signup', next)}
      onSubmit={submit}
    />
  );
}
