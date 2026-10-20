import type { FormEvent } from 'react';
import type { RecoveryMode } from '@/dto/recovery.dto';
import {
  Box,
  Heading,
  Text,
  Form,
  Label,
  Input,
  Button,
} from '@/components/atoms/ui';
import { Link } from '@/components/molecules/link';
interface Props {
  mode: RecoveryMode;
  pending: boolean;
  done: boolean;
  invalidToken: boolean;
  error: string;
  loginHref: string;
  retryHref: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRetry: () => void;
}
export function RecoveryView({
  mode,
  pending,
  done,
  invalidToken,
  error,
  loginHref,
  retryHref,
  onSubmit,
  onRetry,
}: Props) {
  return (
    <Box className='auth-panel'>
      <Text className='eyebrow'>WOORI</Text>
      <Heading>
        {done
          ? mode === 'reset'
            ? '비밀번호를 바꿨어요'
            : '이메일을 확인해 주세요'
          : mode === 'username'
            ? '아이디 찾기'
            : mode === 'password'
              ? '비밀번호 찾기'
              : '새 비밀번호 설정'}
      </Heading>
      {done ? (
        <>
          <Text role='status' className='muted'>
            {mode === 'reset'
              ? '기존 기기의 로그인이 해제됐어요. 새 비밀번호로 다시 로그인해 주세요. 알림도 기기마다 다시 켜 주세요.'
              : '입력한 정보와 일치하는 계정이 있으면 이메일로 안내해 드려요. 스팸함도 확인해 주세요. 메일이 오지 않으면 계정에 등록한 이름과 이메일을 확인하고 잠시 후 다시 요청해 주세요.'}
          </Text>
          {mode !== 'reset' && (
            <Button className='text-button' onClick={onRetry}>
              다시 요청하기
            </Button>
          )}
        </>
      ) : invalidToken ? (
        <>
          <Text role='alert' className='form-error'>
            재설정 링크를 확인해 주세요. 이메일의 링크를 다시 열거나 새 링크를
            요청해 주세요.
          </Text>
          <Link href={retryHref}>새 링크 요청하기</Link>
        </>
      ) : (
        <>
          <Text className='muted'>
            {mode === 'reset'
              ? '12자 이상으로 정해 주세요. 저장하면 기존 기기의 로그인도 해제돼요.'
              : '계정에 등록한 이름과 가입한 이메일을 입력해 주세요.'}
          </Text>
          <Form className='stack-form' onSubmit={onSubmit} aria-busy={pending}>
            {mode === 'reset' ? (
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
                  />
                </Label>
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
              <>
                <Label>
                  이름
                  <Input
                    name='name'
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
                    spellCheck={false}
                    required
                    maxLength={254}
                    disabled={pending}
                  />
                </Label>
              </>
            )}
            {error && (
              <Text role='alert' className='form-error'>
                {error}
              </Text>
            )}
            <Button className='primary-button' type='submit' disabled={pending}>
              {pending
                ? '요청을 확인하고 있어요…'
                : mode === 'reset'
                  ? '비밀번호 저장'
                  : '이메일로 안내 받기'}
            </Button>
          </Form>
          {mode === 'reset' && <Link href={retryHref}>새 링크 요청하기</Link>}
        </>
      )}
      <Link className='text-button' href={loginHref}>
        로그인하기
      </Link>
    </Box>
  );
}
