import type { FormEvent } from 'react';
import {
  Box,
  Button,
  Form,
  Heading,
  Input,
  Label,
  Text,
} from '@/components/atoms/ui';
import { Link } from '@/components/molecules/link';
interface Props {
  username: string;
  email: string;
  loading: boolean;
  connectionError: string;
  invalidToken: boolean;
  pending: boolean;
  error: string;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  onConfirm: () => void;
  onLogout: () => void;
  onRefresh: () => void;
}
export function EmailChangeView({
  username,
  email,
  loading,
  connectionError,
  invalidToken,
  pending,
  error,
  onLogin,
  onConfirm,
  onLogout,
  onRefresh,
}: Props) {
  return (
    <Box className='auth-panel'>
      <Text className='eyebrow'>WOORI</Text>
      <Heading>새 이메일 확인</Heading>
      {invalidToken ? (
        <>
          <Text role='alert' className='form-error'>
            변경 링크를 확인해 주세요. 새로고침하거나 화면을 떠났다면 이메일의
            링크를 다시 열어 주세요. 만료된 링크는 계정 설정에서 새로 요청할 수
            있어요.
          </Text>
          <Link href='/account-settings'>계정 설정으로</Link>
        </>
      ) : loading ? (
        <Text role='status'>계정을 확인하고 있어요…</Text>
      ) : connectionError ? (
        <>
          <Text role='alert' className='form-error'>
            {connectionError}
          </Text>
          <Button className='primary-button' onClick={onRefresh}>
            다시 시도
          </Button>
        </>
      ) : username ? (
        <>
          <Text className='notice-panel account-email'>
            {username} · 현재 이메일 {email}
          </Text>
          <Text className='muted'>
            이메일 변경을 요청한 계정인지 확인해 주세요. 아래 버튼을 누르면
            메일을 받은 새 주소로 변경하고 모든 기기의 로그인을 해제해요. 알림은
            로그인 후 다시 켜 주세요.
          </Text>
          {error && (
            <Text role='alert' className='form-error'>
              {error}
            </Text>
          )}
          <Button
            className='primary-button'
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? '요청을 확인하고 있어요…' : '이 계정의 이메일 변경 완료'}
          </Button>
          <Button className='text-button' disabled={pending} onClick={onLogout}>
            다른 계정으로 로그인
          </Button>
          <Link href='/account-settings'>계정 설정으로</Link>
        </>
      ) : (
        <>
          <Text className='muted'>
            이메일 변경을 요청한 계정으로 로그인해 주세요. 로그인 후 이메일
            변경을 한 번 더 확인해요.
          </Text>
          <Form className='stack-form' onSubmit={onLogin} aria-busy={pending}>
            <Label>
              아이디
              <Input
                name='username'
                autoComplete='username'
                autoCapitalize='none'
                spellCheck={false}
                required
                minLength={3}
                maxLength={32}
                disabled={pending}
              />
            </Label>
            <Label>
              비밀번호
              <Input
                name='password'
                type='password'
                autoComplete='current-password'
                required
                maxLength={128}
                disabled={pending}
              />
            </Label>
            {error && (
              <Text role='alert' className='form-error'>
                {error}
              </Text>
            )}
            <Button className='primary-button' type='submit' disabled={pending}>
              {pending ? '로그인하고 있어요…' : '로그인'}
            </Button>
          </Form>
          <Text className='field-help'>
            이 화면에서 로그인하면 링크를 다시 열 필요가 없어요. 비밀번호를
            재설정했다면 이메일 변경도 계정 설정에서 새로 요청해 주세요.
          </Text>
          <Link href='/forgot-password'>비밀번호 찾기</Link>
        </>
      )}
    </Box>
  );
}
