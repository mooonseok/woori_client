import {
  Box,
  Heading,
  Text,
  Form,
  Input,
  Label,
  Button,
} from '@/components/atoms/ui';
import { NICKNAME_HELP } from '@/utils/nickname';
import { Icon } from '@/components/atoms/icon';
import { Link } from '@/components/molecules/link';
import type { FocusEvent, FormEvent } from 'react';
interface Props {
  signup: boolean;
  passwordVisible: boolean;
  onPasswordVisibilityChange: () => void;
  // Sign-up only: mismatch text under the confirmation field (null = none).
  confirmationProblem?: string | null;
  onPasswordInput?: (event: FormEvent<HTMLInputElement>) => void;
  onConfirmationBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  invitation: boolean;
  pending: boolean;
  error: string;
  // 403 ACCOUNT_SUSPENDED: shown as its own notice, not a field error.
  suspended?: boolean;
  alternate: string;
  recoveryNext: string;
  passwordReset: boolean;
  emailChanged: boolean;
  privacyHref?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
export function AuthView({
  signup,
  passwordVisible,
  onPasswordVisibilityChange,
  confirmationProblem,
  onPasswordInput,
  onConfirmationBlur,
  invitation,
  pending,
  error,
  suspended,
  alternate,
  recoveryNext,
  passwordReset,
  emailChanged,
  privacyHref,
  onSubmit,
}: Props) {
  return (
    <Box className='auth-panel auth-entry-panel'>
      <Heading id='auth-entry-title'>
        {signup ? '우리의 첫 순간' : '다시 만나 반가워요'}
      </Heading>
      <Text className='muted'>
        {signup
          ? '간단한 정보로 우리를 시작해 보세요.'
          : '함께 나눈 순간을 다시 만나 보세요.'}
      </Text>
      {invitation && (
        <Text className='notice-panel'>
          로그인과 이메일 확인을 마치면 초대받은 그룹으로 이어져요.
        </Text>
      )}
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
        <Box className='form-field'>
          <Label htmlFor='auth-password'>비밀번호</Label>
          <Box className='auth-password-field'>
            <Input
              id='auth-password'
              name='password'
              aria-describedby={signup ? 'signup-password-help' : undefined}
              type={passwordVisible ? 'text' : 'password'}
              autoComplete={signup ? 'new-password' : 'current-password'}
              required
              minLength={signup ? 12 : 1}
              maxLength={128}
              disabled={pending}
              onInput={signup ? onPasswordInput : undefined}
            />
            <Button
              variant='icon'
              aria-label={passwordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
              aria-pressed={passwordVisible}
              disabled={pending}
              onClick={onPasswordVisibilityChange}
            >
              <Icon name={passwordVisible ? 'eye-off' : 'eye'} size={20} />
            </Button>
          </Box>
          {signup && (
            <Text id='signup-password-help' className='field-help'>
              12자 이상으로 입력해 주세요.
            </Text>
          )}
        </Box>
        {signup && (
          <>
            <Box className='form-field'>
              <Label>
                비밀번호 확인
                <Input
                  name='confirmPassword'
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete='new-password'
                  required
                  minLength={12}
                  maxLength={128}
                  aria-describedby='signup-password-confirm-help'
                  aria-invalid={confirmationProblem ? true : undefined}
                  disabled={pending}
                  onInput={onPasswordInput}
                  onBlur={onConfirmationBlur}
                />
              </Label>
              <Text
                id='signup-password-confirm-help'
                className={
                  confirmationProblem
                    ? 'field-help field-help-error'
                    : 'field-help'
                }
                aria-live='polite'
              >
                {confirmationProblem ??
                  '같은 비밀번호를 한 번 더 입력해 주세요.'}
              </Text>
            </Box>
            <Box className='form-field'>
              <Label>
                이름
                <Input
                  name='displayName'
                  autoComplete='name'
                  aria-describedby='signup-name-help'
                  required
                  maxLength={80}
                  disabled={pending}
                />
              </Label>
              <Text id='signup-name-help' className='field-help'>
                이름은 아이디·비밀번호 찾기에 사용해요. 다른 사람에게는 닉네임이
                보여요.
              </Text>
            </Box>
            <Box className='form-field'>
              <Label>
                닉네임
                <Input
                  name='nickname'
                  autoComplete='nickname'
                  required
                  maxLength={80}
                  aria-describedby='signup-nickname-help'
                  disabled={pending}
                />
              </Label>
              <Text id='signup-nickname-help' className='field-help'>
                {NICKNAME_HELP}
              </Text>
            </Box>
            <Box className='form-field'>
              <Label>
                이메일
                <Input
                  name='email'
                  type='email'
                  autoComplete='email'
                  autoCapitalize='none'
                  required
                  maxLength={254}
                  aria-describedby='signup-email-help'
                  disabled={pending}
                />
              </Label>
              <Text id='signup-email-help' className='field-help'>
                이메일 확인 후 그룹을 만들거나 초대로 참여할 수 있어요.
              </Text>
            </Box>
          </>
        )}
        {error &&
          (suspended ? (
            <Text role='alert' className='notice-panel suspended-notice'>
              {error}
            </Text>
          ) : (
            <Text role='alert' className='form-error'>
              {error}
            </Text>
          ))}
        <Button type='submit' variant='primary' disabled={pending}>
          {pending ? '잠시만 기다려 주세요…' : signup ? '회원가입' : '로그인'}
        </Button>
      </Form>
      {!signup && !pending && (
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
      {signup && privacyHref && !pending && (
        <Text className='field-help auth-privacy'>
          회원 정보와 사진을 다루는 방식은{' '}
          <Link href={privacyHref}>개인정보 안내</Link>에서 확인할 수 있어요.
        </Text>
      )}
      {!pending && (
        <Text className='auth-alternate'>
          {signup ? '이미 계정이 있나요?' : '처음 오셨나요?'}{' '}
          <Link href={alternate}>{signup ? '로그인' : '회원가입'}</Link>
        </Text>
      )}
    </Box>
  );
}
