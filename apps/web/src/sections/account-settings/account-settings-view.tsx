import type { FormEvent } from 'react';
import {
  Box,
  Button,
  Form,
  Heading,
  Input,
  Label,
  Section,
  Span,
  Text,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
interface Props {
  username: string;
  email: string;
  mode: 'password' | 'email' | null;
  pending: boolean;
  error: string;
  sentEmail: string;
  onSelect: (mode: 'password' | 'email' | null) => void;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
export function AccountSettingsView({
  username,
  email,
  mode,
  pending,
  error,
  sentEmail,
  onSelect,
  onBack,
  onSubmit,
}: Props) {
  return (
    <Box className='auth-panel account-settings'>
      <Box className='inline-actions'>
        <Button
          className='icon-button'
          aria-label='뒤로 가기'
          disabled={pending}
          onClick={onBack}
        >
          <Icon name='back' />
        </Button>
        <Heading>계정 설정</Heading>
      </Box>
      <Section className='notice-panel'>
        <Text>아이디 · {username}</Text>
        <Text className='account-email'>이메일 · {email}</Text>
      </Section>
      {!mode ? (
        <Section>
          <Button className='menu-row' onClick={() => onSelect('password')}>
            <Span>비밀번호 변경</Span>
            <Icon name='chevron-right' />
          </Button>
          <Button className='menu-row' onClick={() => onSelect('email')}>
            <Span>이메일 변경</Span>
            <Icon name='chevron-right' />
          </Button>
        </Section>
      ) : (
        <>
          <Heading>
            {mode === 'password' ? '비밀번호 변경' : '이메일 변경'}
          </Heading>
          <Text className='muted'>
            {mode === 'password'
              ? '변경하면 모든 기기에서 로그아웃돼요. 다시 로그인한 뒤 기기마다 알림을 켜 주세요.'
              : '새 이메일을 확인하기 전까지 현재 이메일을 유지해요. 확인을 완료하면 모든 기기에서 로그아웃돼요.'}
          </Text>
          {sentEmail ? (
            <>
              <Text role='status' className='notice-panel account-email'>
                {sentEmail}으로 확인 메일을 보냈어요. 30분 안에 링크를 열고 이
                계정으로 로그인해 변경을 완료해 주세요. 받은편지함과 스팸함을
                확인해 주세요.
              </Text>
              <Text className='field-help'>
                새로 요청하면 이전 변경 링크는 사용할 수 없어요.
              </Text>
              <Button className='text-button' onClick={() => onSelect('email')}>
                메일 다시 요청하기
              </Button>
            </>
          ) : (
            <Form
              key={mode}
              className='stack-form'
              onSubmit={onSubmit}
              aria-busy={pending}
            >
              <Label>
                현재 비밀번호
                <Input
                  name='currentPassword'
                  type='password'
                  autoComplete='current-password'
                  required
                  maxLength={128}
                  disabled={pending}
                />
              </Label>
              {mode === 'password' ? (
                <>
                  <Label>
                    새 비밀번호
                    <Input
                      name='newPassword'
                      type='password'
                      autoComplete='new-password'
                      required
                      minLength={12}
                      maxLength={128}
                      disabled={pending}
                      aria-describedby='change-password-help'
                    />
                  </Label>
                  <Text id='change-password-help' className='field-help'>
                    현재 비밀번호와 다르게, 12자 이상으로 입력해 주세요.
                  </Text>
                  <Label>
                    새 비밀번호 확인
                    <Input
                      name='confirmPassword'
                      type='password'
                      autoComplete='new-password'
                      required
                      minLength={12}
                      maxLength={128}
                      disabled={pending}
                    />
                  </Label>
                </>
              ) : (
                <Label>
                  새 이메일
                  <Input
                    name='newEmail'
                    type='email'
                    autoComplete='email'
                    autoCapitalize='none'
                    spellCheck={false}
                    required
                    maxLength={254}
                    disabled={pending}
                  />
                </Label>
              )}
              {error && (
                <Text role='alert' className='form-error'>
                  {error}
                </Text>
              )}
              <Button
                type='submit'
                className='primary-button'
                disabled={pending}
              >
                {pending
                  ? '요청을 확인하고 있어요…'
                  : mode === 'password'
                    ? '비밀번호 변경하기'
                    : '확인 메일 보내기'}
              </Button>
            </Form>
          )}
          <Button
            className='text-button'
            disabled={pending}
            onClick={() => onSelect(null)}
          >
            계정 설정으로
          </Button>
        </>
      )}
    </Box>
  );
}
