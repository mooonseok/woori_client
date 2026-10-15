import {
  Box,
  Heading,
  Text,
  Form,
  Input,
  Label,
  Button,
} from '@/components/atoms/ui';
import { Link } from '@/components/molecules/link';
import type { FormEvent } from 'react';
interface Props {
  signup: boolean;
  pending: boolean;
  error: string;
  alternate: string;
  recoveryNext: string;
  passwordReset: boolean;
  emailChanged: boolean;
  privacyHref?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
export function AuthView({
  signup,
  pending,
  error,
  alternate,
  recoveryNext,
  passwordReset,
  emailChanged,
  privacyHref,
  onSubmit,
}: Props) {
  return (
    <Box className='auth-panel'>
      <Text className='eyebrow'>WOORI</Text>
      <Heading>
        {signup ? '우리와 함께 시작해요' : '다시 만나 반가워요'}
      </Heading>
      <Text className='muted'>
        {signup
          ? '간단한 정보로 가족의 사진 공간을 만들어요.'
          : '가족의 새로운 순간이 기다리고 있어요.'}
      </Text>
      {!signup && passwordReset && (
        <Text role='status' className='notice-panel'>
          비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요. 기존 기기의
          로그인이 해제됐으니 알림도 다시 켜 주세요.
        </Text>
      )}
      {!signup && emailChanged && (
        <Text role='status' className='notice-panel'>
          이메일을 바꿨어요. 기존 아이디와 비밀번호로 다시 로그인해 주세요. 모든
          기기의 로그인이 해제됐으니 알림도 기기마다 다시 켜 주세요.
        </Text>
      )}
      <Form className='stack-form' onSubmit={onSubmit} aria-busy={pending}>
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
            pattern='[a-zA-Z0-9_]+'
            title='영문, 숫자, 밑줄 3~32자'
            disabled={pending}
          />
        </Label>
        <Box>
          <Label>
            비밀번호
            <Input
              name='password'
              aria-describedby={signup ? 'signup-password-help' : undefined}
              type='password'
              autoComplete={signup ? 'new-password' : 'current-password'}
              required
              minLength={signup ? 12 : 1}
              maxLength={128}
              disabled={pending}
            />
          </Label>
          {signup && (
            <Text id='signup-password-help' className='field-help'>
              12자 이상으로 입력해 주세요.
            </Text>
          )}
        </Box>
        {signup && (
          <>
            <Label>
              이름
              <Input
                name='displayName'
                autoComplete='name'
                required
                maxLength={80}
                disabled={pending}
              />
            </Label>
            <Label>
              이메일
              <Input
                name='email'
                type='email'
                autoComplete='email'
                autoCapitalize='none'
                required
                maxLength={254}
                disabled={pending}
              />
            </Label>
            <Text className='field-help'>
              이메일 확인 후 그룹을 만들거나 초대로 참여할 수 있어요.
            </Text>
          </>
        )}
        {error && (
          <Text role='alert' className='form-error'>
            {error}
          </Text>
        )}
        <Button type='submit' className='primary-button' disabled={pending}>
          {pending ? '잠시만 기다려 주세요…' : signup ? '회원가입' : '로그인'}
        </Button>
      </Form>
      {!signup && (
        <Box className='inline-actions'>
          <Link href={`/find-id?next=${encodeURIComponent(recoveryNext)}`}>
            아이디 찾기
          </Link>
          <Link
            href={`/forgot-password?next=${encodeURIComponent(recoveryNext)}`}
          >
            비밀번호 찾기
          </Link>
        </Box>
      )}
      {signup && privacyHref && (
        <Text className='field-help auth-privacy'>
          회원 정보와 사진을 다루는 방식은{' '}
          <Link href={privacyHref}>개인정보 안내</Link>에서 확인할 수 있어요.
        </Text>
      )}
      <Text className='auth-alternate'>
        {signup ? '이미 계정이 있나요?' : '처음 오셨나요?'}{' '}
        <Link href={alternate}>{signup ? '로그인' : '회원가입'}</Link>
      </Text>
    </Box>
  );
}
