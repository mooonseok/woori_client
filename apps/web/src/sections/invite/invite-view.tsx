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
import { Icon } from '@/components/atoms/icon';
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
    <Box className='auth-panel task-panel'>
      <Box className='task-symbol' aria-hidden='true'>
        <Icon name='users' size={28} />
      </Box>
      <Heading>
        {p.hasToken || p.preview
          ? '그룹에 초대받았어요'
          : '초대 코드로 참여하기'}
      </Heading>
      <Text className='muted'>
        {p.hasToken || p.preview
          ? '어떤 그룹인지 확인하고 참여해 주세요. 함께 나눈 사진과 동영상을 볼 수 있어요.'
          : '전달받은 코드를 입력하면 초대받은 그룹을 확인할 수 있어요.'}
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
