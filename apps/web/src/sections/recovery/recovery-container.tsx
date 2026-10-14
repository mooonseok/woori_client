'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { requestRecovery, resetPassword } from '@/services/recovery';
import { pendingInvite, rememberInvite } from '@/services/invite-return';
import { safeReturnTo, authDestination } from '@/utils/auth-navigation';
import type { RecoveryMode } from '@/dto/recovery.dto';
import { RecoveryView } from './recovery-view';
export function RecoveryContainer({ mode }: { mode: RecoveryMode }) {
  const router = useRouter();
  const search = useSearchParams(),
    auth = useAuth();
  const [token, setToken] = useState(() =>
    mode === 'reset' ? search.get('token') || '' : ''
  );
  const [pending, setPending] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState('');
  const [next, setNext] = useState(() => safeReturnTo(search.get('next')));
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    if (auth.status === 'loading') return;
    if (mode === 'reset') {
      // Keep the bearer token only in component memory; refresh requires reopening the email.
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState(
        window.history.state,
        '',
        url.pathname + url.search
      );
    }
    const target = safeReturnTo(search.get('next'));
    if (target !== '/') rememberInvite(target);
    else queueMicrotask(() => setNext(pendingInvite()));
    return () => {
      active.current?.abort();
      active.current = null;
    };
  }, [mode, search, auth.status]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current) return;
    const form = event.currentTarget,
      data = new FormData(form);
    setError('');
    if (
      mode === 'reset' &&
      String(data.get('newPassword')) !== String(data.get('confirmPassword'))
    ) {
      setError('두 비밀번호가 같지 않아요. 다시 확인해 주세요.');
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    try {
      if (mode === 'reset')
        await resetPassword(
          { token, newPassword: String(data.get('newPassword')) },
          controller.signal
        );
      else
        await requestRecovery(
          mode,
          {
            name: String(data.get('name')).trim(),
            email: String(data.get('email')).trim().toLowerCase(),
          },
          controller.signal
        );
      if (controller.signal.aborted) return;
      form.reset();
      setDone(true);
      if (mode === 'reset') {
        setToken('');
        router.replace(`${authDestination('/login', next)}&passwordReset=1`);
        await auth.refresh(true);
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error instanceof Error ? error.message : '요청을 처리하지 못했어요.'
        );
    } finally {
      if (active.current === controller) {
        active.current = null;
        setPending(false);
      }
    }
  }
  return (
    <RecoveryView
      mode={mode}
      pending={pending}
      done={done}
      invalidToken={
        mode === 'reset' && !/^[A-Za-z0-9_-]{43}$/.test(token) && !done
      }
      error={error}
      loginHref={authDestination('/login', next)}
      retryHref={`/forgot-password?next=${encodeURIComponent(next)}`}
      onSubmit={submit}
      onRetry={() => {
        setDone(false);
        setError('');
      }}
    />
  );
}
