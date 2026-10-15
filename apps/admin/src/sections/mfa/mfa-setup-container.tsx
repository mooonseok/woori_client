'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminSession } from '@/hooks/use-admin-session';
import { useMfaSetup } from '@/hooks/use-mfa-setup';
import { mfaFailure, messageOf } from '@/utils/admin-errors';
import { safeReturnTo } from '@/utils/admin-navigation';
import { groupSecret, normalizeOtp, otpError } from '@/utils/otp';
import { MfaSetupView } from './mfa-setup-view';
export function MfaSetupContainer() {
  const session = useAdminSession(),
    router = useRouter(),
    search = useSearchParams();
  const { refresh, logout } = session;
  const next = safeReturnTo(search.get('next'));
  const setup = useMfaSetup(session.session?.mfa === 'SETUP_REQUIRED');
  const [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [fieldError, setFieldError] = useState(''),
    [copyStatus, setCopyStatus] = useState(''),
    [pending, setPending] = useState(false),
    [leaving, setLeaving] = useState(false),
    [failures, setFailures] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (failures) codeInput.current?.focus();
  }, [failures]);
  useEffect(() => {
    // Already enabled/verified elsewhere: let the gate pick the screen.
    if (setup.failure?.action === 'recheck') void refresh({ quiet: true });
  }, [setup.failure, refresh]);
  async function copySecret() {
    const secret = setup.enrollment?.secret;
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopyStatus(
        '키를 복사했어요. 인증 앱에 붙여 넣은 뒤 다른 곳에는 저장하지 마세요.'
      );
    } catch {
      setCopyStatus('복사하지 못했어요. 표시된 키를 직접 입력해 주세요.');
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || leaving || !setup.enrollment) return;
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
      await session.activateMfa(code);
      // The secret is no longer needed anywhere once the server accepts it.
      setup.forget();
      setCopyStatus('');
      setCode('');
      router.replace(next);
    } catch (cause) {
      const failure = mfaFailure(cause);
      setCode('');
      setError(failure.message);
      setFailures((count) => count + 1);
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
  const failure = setup.failure;
  return (
    <MfaSetupView
      adminName={session.session?.admin.displayName ?? ''}
      username={session.session?.admin.username ?? ''}
      loading={setup.loading}
      loadError={failure && failure.action === 'retry' ? failure.message : ''}
      qrDataUrl={setup.enrollment?.qrDataUrl ?? ''}
      secretGroups={groupSecret(setup.enrollment?.secret ?? '')}
      copyStatus={copyStatus}
      code={code}
      error={error}
      fieldError={fieldError}
      pending={pending}
      leaving={leaving}
      codeRef={codeInput}
      onRetry={setup.retry}
      onCopy={() => void copySecret()}
      onCode={(value) => {
        setCode(normalizeOtp(value));
        setFieldError('');
      }}
      onSubmit={submit}
      onSwitchAccount={() => void switchAccount()}
    />
  );
}
