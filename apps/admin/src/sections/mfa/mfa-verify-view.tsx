import type { FormEvent, Ref } from 'react';
import {
  Button,
  Form,
  Section,
  Strong,
  Text,
  Title,
} from '@/components/atoms/ui';
import { Notice } from '@/components/molecules/notice';
import { OtpField } from '@/components/molecules/otp-field';
import { PRE_MFA_MINUTES } from '@/constants/admin-auth';
interface Props {
  adminName: string;
  username: string;
  code: string;
  error: string;
  fieldError: string;
  pending: boolean;
  leaving: boolean;
  codeRef: Ref<HTMLInputElement>;
  onCode: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchAccount: () => void;
}
export function MfaVerifyView({
  adminName,
  username,
  code,
  error,
  fieldError,
  pending,
  leaving,
  codeRef,
  onCode,
  onSubmit,
  onSwitchAccount,
}: Props) {
  return (
    <Section className='auth-panel' aria-labelledby='mfa-title'>
      <Text className='eyebrow'>2단계 인증</Text>
      <Title id='mfa-title'>인증 코드를 입력해 주세요</Title>
      <Text className='muted'>
        <Strong>{adminName}</Strong>
        {username && ` (@${username})`} 계정이에요. 인증 앱에 표시된 6자리
        코드를 입력해 주세요. 로그인 후 {PRE_MFA_MINUTES}분 안에 완료해야 해요.
      </Text>
      <Form
        className='stack-form'
        onSubmit={onSubmit}
        aria-busy={pending}
        noValidate
      >
        <OtpField
          id='mfa-code'
          inputRef={codeRef}
          value={code}
          error={fieldError}
          disabled={pending || leaving}
          onChange={onCode}
        />
        {error && <Notice tone='error'>{error}</Notice>}
        <Button
          type='submit'
          className='primary full'
          aria-disabled={pending || leaving}
        >
          {pending ? '확인 중…' : '확인'}
        </Button>
      </Form>
      <Button
        className='text-button'
        aria-disabled={pending || leaving}
        onClick={onSwitchAccount}
      >
        {leaving ? '로그아웃 중…' : '다른 계정으로 로그인'}
      </Button>
    </Section>
  );
}
