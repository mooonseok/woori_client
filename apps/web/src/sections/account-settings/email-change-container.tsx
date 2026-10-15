'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  emailChangeToken,
  forgetEmailChangeToken,
  rememberEmailChangeToken,
} from '@/services/email-change-token';
import { EmailChangeView } from './email-change-view';

export function EmailChangeContainer() {
  const auth = useAuth(),
    params = useSearchParams(),
    router = useRouter();
  const incomingToken = params.get('token');
  const [token, setToken] = useState(() => incomingToken || emailChangeToken());
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const mounted = useRef(true),
    busy = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (incomingToken === null) return;
    rememberEmailChangeToken(incomingToken);
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState(
      window.history.state,
      '',
      url.pathname + url.search
    );
    queueMicrotask(() => {
      if (mounted.current) setToken(emailChangeToken());
    });
  }, [incomingToken]);
  async function act(
    kind: 'login' | 'confirm' | 'logout',
    event?: FormEvent<HTMLFormElement>
  ) {
    event?.preventDefault();
    if (busy.current) return;
    const form = event?.currentTarget;
    const data = form ? new FormData(form) : null;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      if (kind === 'login' && data) {
        await auth.login({
          username: String(data.get('username')).trim(),
          password: String(data.get('password')),
        });
        form?.reset();
      } else if (kind === 'logout') await auth.logout();
      else {
        const currentToken = emailChangeToken();
        if (!currentToken) {
          setToken('');
          throw new Error(
            '링크의 보관 시간이 지났어요. 메일을 다시 열거나 계정 설정에서 새로 요청해 주세요.'
          );
        }
        await auth.confirmEmailChange(currentToken, () => {
          forgetEmailChangeToken();
          router.replace('/login?emailChanged=1');
        });
      }
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error ? cause.message : '요청을 처리하지 못했어요.'
        );
    } finally {
      if (mounted.current) {
        busy.current = false;
        setPending(false);
      }
    }
  }
  return (
    <EmailChangeView
      username={auth.user?.username || ''}
      email={auth.user?.email || ''}
      loading={auth.status === 'loading'}
      connectionError={auth.status === 'error' ? auth.error : ''}
      invalidToken={!/^[A-Za-z0-9_-]{43}$/.test(token)}
      pending={pending}
      error={error}
      onLogin={(event) => void act('login', event)}
      onConfirm={() => void act('confirm')}
      onLogout={() => void act('logout')}
      onRefresh={() => void auth.refresh()}
    />
  );
}
