import type { FormEvent, Ref } from 'react';
import {
  Box,
  Button,
  Code,
  Details,
  Form,
  Image,
  Li,
  Ol,
  Section,
  Strong,
  Summary,
  Text,
  Title,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { LoadError, LoadingState } from '@/components/molecules/load-state';
import { Notice } from '@/components/molecules/notice';
import { AuthBrand } from '@/components/molecules/auth-brand';
import { OtpField } from '@/components/molecules/otp-field';
import { PRE_MFA_MINUTES } from '@/constants/admin-auth';
interface Props {
  adminName: string;
  username: string;
  loading: boolean;
  loadError: string;
  qrDataUrl: string;
  secretGroups: string;
  copyStatus: string;
  code: string;
  error: string;
  fieldError: string;
  pending: boolean;
  leaving: boolean;
  codeRef: Ref<HTMLInputElement>;
  onRetry: () => void;
  onCopy: () => void;
  onCode: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchAccount: () => void;
}
export function MfaSetupView({
  adminName,
  username,
  loading,
  loadError,
  qrDataUrl,
  secretGroups,
  copyStatus,
  code,
  error,
  fieldError,
  pending,
  leaving,
  codeRef,
  onRetry,
  onCopy,
  onCode,
  onSubmit,
  onSwitchAccount,
}: Props) {
  return (
    <Section
      className='auth-panel auth-panel-wide'
      aria-labelledby='setup-title'
    >
      <AuthBrand />
      <Box className='auth-heading'>
        <Title id='setup-title'>인증 앱 연결</Title>
        <Text className='auth-description'>
          처음 로그인할 때 인증 앱을 연결해요. 로그인 후 {PRE_MFA_MINUTES}분
          안에 완료해 주세요.
        </Text>
      </Box>
      <Text className='auth-account'>
        <Strong>{adminName}</Strong>
        {username && ` (@${username})`}
      </Text>
      {loading ? (
        <LoadingState message='등록용 키를 만들고 있어요…' />
      ) : loadError ? (
        <LoadError
          title='등록용 키를 받지 못했어요'
          message={loadError}
          onRetry={onRetry}
        />
      ) : qrDataUrl ? (
        <>
          <Notice tone='warning'>
            설정 키는 지금 이 화면에서만 볼 수 있어요. 화면을 벗어나면 새 키가
            발급되고 이전 키는 쓸 수 없어요. 키를 캡처하거나 메모·메신저에
            저장하지 마세요.
          </Notice>
          <Ol className='setup-steps'>
            <Li>
              <Text className='step-title'>
                인증 앱에서 QR 코드를 스캔해 주세요.
              </Text>
              <Text className='field-help'>
                Google Authenticator, 1Password 등 TOTP 인증 앱을 사용할 수
                있어요.
              </Text>
              <Box className='qr-frame'>
                <Image
                  src={qrDataUrl}
                  width={224}
                  height={224}
                  alt='관리자 2단계 인증 등록용 QR 코드'
                />
              </Box>
              <Details className='secret-details'>
                <Summary>QR 대신 키로 등록하기</Summary>
                <Box className='secret-box'>
                  <Code className='secret-code' translate='no'>
                    {secretGroups}
                  </Code>
                  <Button className='secondary-button' onClick={onCopy}>
                    <Icon name='copy' size={18} />키 복사
                  </Button>
                </Box>
                <Text className='field-help'>
                  앱에서 ‘키 직접 입력’을 고르고 시간 기준(TOTP), 6자리로 등록해
                  주세요. 띄어쓰기는 입력하지 않아도 돼요.
                </Text>
                <Text className='field-help' role='status'>
                  {copyStatus}
                </Text>
              </Details>
            </Li>
            <Li>
              <Text className='step-title'>
                앱에 표시된 6자리 코드를 입력해 등록을 마쳐 주세요.
              </Text>
              <Form
                className='stack-form'
                onSubmit={onSubmit}
                aria-busy={pending}
                noValidate
              >
                <OtpField
                  id='setup-code'
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
                  {pending ? '등록 중…' : '등록 완료'}
                </Button>
              </Form>
            </Li>
          </Ol>
        </>
      ) : (
        <LoadingState message='인증 상태를 확인하고 있어요…' />
      )}
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
