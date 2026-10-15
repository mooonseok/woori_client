'use client';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import {
  Box,
  Button,
  Dialog,
  Form,
  Heading,
  Input,
  Label,
  Text,
} from '@/components/atoms/ui';
import { OtpField } from '@/components/molecules/otp-field';
import { Notice } from '@/components/molecules/notice';
import type { AdminReauthInput } from '@/dto/admin-auth.dto';
import { ADMIN_ERROR, REAUTH_WINDOW_MINUTES } from '@/constants/admin-auth';
import { codeOf, reauthErrorMessage } from '@/utils/admin-errors';
import { normalizeOtp, otpError } from '@/utils/otp';
// Password + authenticator code before a sensitive action. Values live only
// in this dialog's state and are dropped when it closes.
export function ReauthDialog({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: AdminReauthInput) => Promise<void>;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    passwordInput = useRef<HTMLInputElement>(null),
    codeInput = useRef<HTMLInputElement>(null),
    locked = useRef(false);
  const [password, setPassword] = useState(''),
    [code, setCode] = useState(''),
    [codeError, setCodeError] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [focusRequest, setFocusRequest] = useState<{
      target: 'password' | 'code';
      count: number;
    } | null>(null);
  const requestFocus = (target: 'password' | 'code') =>
    setFocusRequest((previous) => ({
      target,
      count: (previous?.count ?? 0) + 1,
    }));
  const titleId = useId(),
    bodyId = useId(),
    passwordId = useId(),
    codeId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      el = dialog.current;
    el?.showModal();
    passwordInput.current?.focus();
    return () => {
      el?.close();
      queueMicrotask(() => {
        // The trigger may be gone (e.g. the record was closed): use main.
        const target = previous?.isConnected
          ? previous
          : document.getElementById('admin-main');
        target?.focus({ preventScroll: true });
      });
    };
  }, []);
  useEffect(() => {
    if (!focusRequest) return;
    const input =
      focusRequest.target === 'password' ? passwordInput : codeInput;
    input.current?.focus();
  }, [focusRequest]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    const invalid = otpError(code);
    setCodeError(invalid);
    if (!password) {
      setError('비밀번호를 입력해 주세요.');
      requestFocus('password');
      return;
    }
    if (invalid) {
      setError('');
      requestFocus('code');
      return;
    }
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await onSubmit({ password, code });
    } catch (cause) {
      setError(reauthErrorMessage(cause));
      // Codes are single-use; a refused password is not kept either.
      setCode('');
      const refused = codeOf(cause) === ADMIN_ERROR.INVALID_CREDENTIALS;
      if (refused) setPassword('');
      requestFocus(refused ? 'password' : 'code');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      ref={dialog}
      className='console-dialog'
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!locked.current) onCancel();
      }}
    >
      <Heading id={titleId}>본인 확인</Heading>
      <Text id={bodyId} className='dialog-body'>
        민감한 작업 전에 비밀번호와 인증 앱의 6자리 코드를 다시 확인해요. 확인
        후 {REAUTH_WINDOW_MINUTES}분 동안은 다시 묻지 않아요.
      </Text>
      <Form className='stack-form' onSubmit={submit} noValidate>
        <Box className='field'>
          <Label htmlFor={passwordId}>비밀번호</Label>
          <Input
            ref={passwordInput}
            id={passwordId}
            name='password'
            type='password'
            autoComplete='current-password'
            required
            maxLength={128}
            value={password}
            readOnly={busy}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Box>
        <OtpField
          id={codeId}
          inputRef={codeInput}
          value={code}
          error={codeError}
          disabled={busy}
          onChange={(value) => {
            setCode(normalizeOtp(value));
            setCodeError('');
          }}
        />
        {error && <Notice tone='error'>{error}</Notice>}
        <Box className='dialog-actions'>
          <Button
            className='secondary-button'
            disabled={busy}
            onClick={onCancel}
          >
            취소
          </Button>
          <Button type='submit' className='primary' aria-disabled={busy}>
            {busy ? '확인 중…' : '확인'}
          </Button>
        </Box>
      </Form>
    </Dialog>
  );
}
