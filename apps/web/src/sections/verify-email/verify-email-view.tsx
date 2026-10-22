import { Box, Heading, Text, Button } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { Link } from '@/components/molecules/link';
import type { emailVerificationState } from '@/utils/email-verification';

interface Props {
  email: string;
  state: ReturnType<typeof emailVerificationState>;
  pending: boolean;
  canResend: boolean;
  error: string;
  message: string;
  loginUrl: string;
  onConfirm: () => void;
  onResend: () => void;
  onContinue: () => void;
  onRefresh: () => void;
}
const titles = {
  loading: '계정을 확인하고 있어요',
  'connection-error': '연결을 확인해 주세요',
  anonymous: '로그인하고 이메일을 확인해요',
  confirm: '이 계정의 이메일이 맞나요?',
  verified: '이메일 확인을 마쳤어요',
  waiting: '메일함을 확인해 주세요',
};
export function VerifyEmailView(p: Props) {
  const verified = p.state === 'verified';
  return (
    <Box
      className='auth-panel verification-panel'
      aria-labelledby='verification-title'
      aria-busy={p.pending || p.state === 'loading'}
    >
      <Box className='verification-symbol' aria-hidden='true'>
        <Icon name={verified ? 'check' : 'shield'} size={28} />
      </Box>
      <Box className='verification-copy'>
        <Heading id='verification-title'>{titles[p.state]}</Heading>
        <Text className='muted'>
          {p.state === 'loading'
            ? '잠시만 기다려 주세요.'
            : p.state === 'connection-error'
              ? '계정 정보를 불러오지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.'
              : p.state === 'anonymous'
                ? '확인 메일을 받은 계정으로 로그인하면 이어서 진행할 수 있어요.'
                : verified
                  ? '이제 그룹을 만들거나 초대받은 그룹에 참여할 수 있어요.'
                  : p.state === 'confirm'
                    ? '메일을 받은 주소와 아래 계정이 같은지 확인해 주세요.'
                    : '아래 주소로 보낸 메일의 확인 링크를 열어 주세요.'}
        </Text>
      </Box>
      {p.email &&
        !['loading', 'connection-error', 'anonymous'].includes(p.state) && (
          <Box className='verification-account'>
            <Text className='field-help'>현재 로그인한 계정</Text>
            <Text className='account-email'>{p.email}</Text>
          </Box>
        )}
      {p.message && (
        <Text className='notice-panel' role='status'>
          {p.message}
        </Text>
      )}
      {p.error && (
        <Text role='alert' className='form-error'>
          {p.error}
        </Text>
      )}
      <Box className='verification-actions'>
        {p.state === 'loading' ? (
          <Text role='status' className='field-help'>
            계정 확인 중…
          </Text>
        ) : p.state === 'connection-error' ? (
          <Button variant='primary' onClick={p.onRefresh}>
            다시 시도
          </Button>
        ) : p.state === 'anonymous' ? (
          <Link className='primary-button' href={p.loginUrl}>
            로그인하고 계속
          </Link>
        ) : verified ? (
          <Button variant='primary' onClick={p.onContinue}>
            계속하기
            <Icon name='arrow-right' size={18} />
          </Button>
        ) : (
          <>
            <Button
              variant='primary'
              disabled={p.pending}
              onClick={p.state === 'confirm' ? p.onConfirm : p.onResend}
            >
              {p.pending
                ? '처리 중…'
                : p.state === 'confirm'
                  ? '이 계정으로 이메일 확인'
                  : '확인 메일 다시 보내기'}
            </Button>
            {p.state === 'confirm' && p.error && p.canResend && (
              <Button disabled={p.pending} onClick={p.onResend}>
                새 확인 메일 받기
              </Button>
            )}
            {!p.pending && (
              <Link className='text-button' href={p.loginUrl}>
                다른 계정으로 로그인
              </Link>
            )}
          </>
        )}
      </Box>
      {p.state === 'waiting' && (
        <Text className='field-help verification-help'>
          메일이 보이지 않으면 스팸함도 확인해 주세요.
        </Text>
      )}
    </Box>
  );
}
