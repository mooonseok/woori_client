'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { safeReturnTo, authDestination } from '@/utils/auth-navigation';
import { pendingInvite } from '@/services/invite-return';
import { ApiError } from '@/services/api-client';
import { emailVerificationState } from '@/utils/email-verification';
import { VerifyEmailView } from './verify-email-view';
export function VerifyEmailContainer() {
  const auth = useAuth(),
    params = useSearchParams();
  const token = params.get('token') || '';
  const next = safeReturnTo(params.get('next'));
  return (
    <VerificationSession
      key={`${auth.user?.id || 'anonymous'}:${token}:${next}`}
      auth={auth}
      token={token}
      next={next}
    />
  );
}

function VerificationSession({
  auth,
  token,
  next,
}: {
  auth: ReturnType<typeof useAuth>;
  token: string;
  next: string;
}) {
  const router = useRouter();
  const busy = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const returnTo = `/verify-email?${token ? `token=${encodeURIComponent(token)}&` : ''}next=${encodeURIComponent(next)}`;
  async function act(confirm: boolean) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    setMessage('');
    try {
      if (confirm) {
        await auth.confirm(token);
        // Only the server can validate the account-bound link. Remove its
        // one-time token from the address before rendering the success screen.
        if (mounted.current)
          router.replace(authDestination('/verify-email', next));
      } else {
        await auth.resend();
        if (mounted.current)
          setMessage('이메일을 보냈어요. 받은편지함과 스팸함을 확인해 주세요.');
      }
    } catch (error) {
      if (mounted.current)
        setError(
          error instanceof ApiError &&
            error.code === 'INVALID_VERIFICATION_TOKEN'
            ? '현재 계정에서 이 링크를 확인할 수 없어요. 메일을 받은 계정으로 로그인했는지 확인해 주세요. 같은 계정이라면 링크가 만료되었거나 이미 사용됐을 수 있어요.'
            : error instanceof Error
              ? error.message
              : '이메일을 확인하지 못했어요.'
        );
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }
  return (
    <VerifyEmailView
      email={auth.user?.email || ''}
      state={emailVerificationState(
        auth.status,
        !!auth.user,
        !!auth.user?.emailVerified,
        !!token
      )}
      pending={pending}
      canResend={!!auth.user && !auth.user.emailVerified}
      error={
        error ||
        (auth.status === 'error' ? auth.error : '') ||
        (!token &&
        !auth.user?.emailVerified &&
        auth.verificationDelivery === 'unavailable' &&
        !message
          ? '가입은 완료됐지만 확인 메일을 보내지 못했어요. 메일 다시 보내기를 눌러 주세요.'
          : '')
      }
      message={message}
      loginUrl={authDestination('/login', returnTo)}
      onConfirm={() => void act(true)}
      onResend={() => void act(false)}
      onContinue={() => router.replace(next === '/' ? pendingInvite() : next)}
      onRefresh={() => void auth.refresh()}
    />
  );
}
