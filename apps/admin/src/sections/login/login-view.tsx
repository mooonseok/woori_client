import type { FormEvent, Ref } from 'react';
import {
  Box,
  Button,
  Form,
  Input,
  Label,
  Section,
  Text,
  Title,
} from '@/components/atoms/ui';
import { Notice } from '@/components/molecules/notice';
import { AuthBrand } from '@/components/molecules/auth-brand';
interface Props {
  username: string;
  password: string;
  pending: boolean;
  error: string;
  notice: string;
  passwordRef: Ref<HTMLInputElement>;
  onUsername: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
export function LoginView({
  username,
  password,
  pending,
  error,
  notice,
  passwordRef,
  onUsername,
  onPassword,
  onSubmit,
}: Props) {
  return (
    <Section className='auth-panel' aria-labelledby='login-title'>
      <AuthBrand />
      <Box className='auth-heading'>
        <Title id='login-title'>관리자 로그인</Title>
        <Text className='auth-description'>
          회원 계정과 별도인 관리자 계정으로 로그인해 주세요. 로그인 후 인증
          앱으로 본인을 확인해요.
        </Text>
      </Box>
      {notice && <Notice>{notice}</Notice>}
      <Form
        className='stack-form'
        onSubmit={onSubmit}
        aria-busy={pending}
        noValidate
      >
        <Box className='field'>
          <Label htmlFor='admin-username'>아이디</Label>
          <Input
            id='admin-username'
            name='username'
            autoComplete='username'
            autoCapitalize='none'
            spellCheck={false}
            required
            maxLength={64}
            value={username}
            readOnly={pending}
            onChange={(event) => onUsername(event.target.value)}
          />
        </Box>
        <Box className='field'>
          <Label htmlFor='admin-password'>비밀번호</Label>
          <Input
            ref={passwordRef}
            id='admin-password'
            name='password'
            type='password'
            autoComplete='current-password'
            required
            maxLength={128}
            value={password}
            readOnly={pending}
            onChange={(event) => onPassword(event.target.value)}
          />
        </Box>
        {error && <Notice tone='error'>{error}</Notice>}
        <Button type='submit' className='primary full' aria-disabled={pending}>
          {pending ? '확인 중…' : '로그인'}
        </Button>
      </Form>
    </Section>
  );
}
