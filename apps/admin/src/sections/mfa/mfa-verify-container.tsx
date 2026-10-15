'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminSession } from '@/hooks/use-admin-session';
import { mfaFailure, messageOf } from '@/utils/admin-errors';
import { safeReturnTo } from '@/utils/admin-navigation';
import { normalizeOtp, otpError } from '@/utils/otp';
import { MfaVerifyView } from './mfa-verify-view';
export function MfaVerifyContainer() {
  const session = useAdminSession(),
    router = useRouter(),
    search = useSearchParams();
  const { refresh, logout } = session;
  const next = safeReturnTo(search.get('next'));
  const [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [fieldError, setFieldError] = useState(''),
    [pending, setPending] = useState(false),
    [leaving, setLeaving] = useState(false),
    [failures, setFailures] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (failures) codeInput.current?.focus();
  }, [failures]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || leaving) return;
    const invalid = otpError(code);
    setFieldError(invalid);
    if (invalid) {
      setError('');
      setFailures((count) => count + 1);
      return;
    }
    setPending(true);
    setError('');
    try {
      await session.verifyMfa(code);
      setCode('');
      router.replace(next);
    } catch (cause) {
      const failure = mfaFailure(cause);
      setCode('');
      setError(failure.message);
      setFailures((count) => count + 1);
      // A wrong code may have been the one that revoked this session.
      if (failure.action === 'recheck')
        void refresh({ quiet: true, lostReason: failure.lostReason });
    } finally {
      setPending(false);
    }
  }
  async function switchAccount() {
    if (pending || leaving) return;
    setLeaving(true);
    try {
      await logout();
    } catch (cause) {
      setError(messageOf(cause, '로그아웃하지 못했어요. 다시 시도해 주세요.'));
      setLeaving(false);
    }
  }
  return (
    <MfaVerifyView
      adminName={session.session?.admin.displayName ?? ''}
      username={session.session?.admin.username ?? ''}
      code={code}
      error={error}
      fieldError={fieldError}
      pending={pending}
      leaving={leaving}
      codeRef={codeInput}
      onCode={(value) => {
        setCode(normalizeOtp(value));
        setFieldError('');
      }}
      onSubmit={submit}
      onSwitchAccount={() => void switchAccount()}
    />
  );
}
