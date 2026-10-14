import {
  Box,
  Heading,
  Text,
  Label,
  Input,
  Button,
  Form,
} from '@/components/atoms/ui';
import { Link } from '@/components/molecules/link';
interface Props {
  code: string;
  onCode: (value: string) => void;
  preview: { groupName: string; expiresAt: string } | null;
  pending: boolean;
  error: string;
  hasToken: boolean;
  onInspect: () => void;
  onJoin: () => void;
  joinLabel: string;
  signupUrl: string;
  showSignup: boolean;
}
export function InviteView(p: Props) {
  return (
    <Box className='auth-panel'>
      <Text className='eyebrow'>INVITATION</Text>
      <Heading>함께할 공간으로 초대받았어요</Heading>
      <Text className='muted'>
        초대를 확인한 뒤 참여해 주세요. 참여 전에는 가족 사진이 공개되지 않아요.
      </Text>
      {!p.hasToken && (
        <Form
          className='stack-form'
          onSubmit={(event) => {
            event.preventDefault();
            p.onInspect();
          }}
        >
          <Label>
            초대 코드
            <Input
              value={p.code}
              onChange={(event) => p.onCode(event.target.value)}
              autoComplete='off'
              autoCapitalize='characters'
              spellCheck={false}
              required
              minLength={10}
              maxLength={32}
              placeholder='전달받은 10자리 코드'
              disabled={p.pending}
            />
          </Label>
          <Button
            className='secondary-button'
            type='submit'
            disabled={p.pending}
          >
            {p.pending ? '확인 중…' : '초대 확인'}
          </Button>
        </Form>
      )}
      {p.hasToken && p.pending && (
        <Text role='status'>초대를 확인하고 있어요…</Text>
      )}
      {p.preview && (
        <Box className='invite-preview'>
          <Heading>{p.preview.groupName}</Heading>
          <Text className='muted'>
            {new Date(p.preview.expiresAt).toLocaleString('ko-KR')}까지 참여
            가능
          </Text>
          <Button
            className='primary-button'
            disabled={p.pending}
            onClick={p.onJoin}
          >
            {p.joinLabel}
          </Button>
          {p.showSignup && (
            <Link className='text-button' href={p.signupUrl}>
              계정이 없다면 회원가입
            </Link>
          )}
        </Box>
      )}
      {p.error && (
        <Text role='alert' className='form-error'>
          {p.error}
        </Text>
      )}
      {p.hasToken && p.error && (
        <Link className='text-button' href='/invite'>
          다른 초대 코드 입력
        </Link>
      )}
    </Box>
  );
}
