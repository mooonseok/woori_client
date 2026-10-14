'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { safeReturnTo, authDestination } from '@/utils/auth-navigation';
import { pendingInvite } from '@/services/invite-return';
import { VerifyEmailView } from './verify-email-view';
export function VerifyEmailContainer() {
  const auth = useAuth(),
    params = useSearchParams(),
    router = useRouter();
  const token = params.get('token') || '';
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const next = safeReturnTo(params.get('next'));
  const returnTo = token
    ? `/verify-email?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`
    : next;
  async function act(confirm: boolean) {
    if (pending) return;
    setPending(true);
    setError('');
    setMessage('');
    try {
      if (confirm) {
        await auth.confirm(token);
        router.replace(next === '/' ? pendingInvite() : next);
      } else {
        await auth.resend();
        setMessage('이메일을 보냈어요. 받은편지함과 스팸함을 확인해 주세요.');
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : '이메일을 확인하지 못했어요.'
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <VerifyEmailView
      email={auth.user?.email || ''}
      verified={!!auth.user?.emailVerified}
      loading={auth.status === 'loading'}
      signedIn={!!auth.user}
      token={!!token}
      pending={pending}
      error={
        error ||
        (auth.verificationDelivery === 'unavailable' && !message
          ? '가입은 완료됐지만 확인 메일을 보내지 못했어요. 메일 다시 보내기를 눌러 주세요.'
          : '')
      }
      message={message}
      loginUrl={authDestination('/login', returnTo)}
      onConfirm={() => void act(true)}
      onResend={() => void act(false)}
      onContinue={() => router.replace(next === '/' ? pendingInvite() : next)}
    />
  );
}
