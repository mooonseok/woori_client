import {
  Box,
  Heading,
  Text,
  Button,
  Section,
  Span,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { Guide } from '@/components/organisms/guide/guide';
import { EntryDialog } from '@/components/organisms/entry-dialog/entry-dialog';
interface Props {
  live: boolean;
  email: string;
  verified: boolean;
  logoutPending: boolean;
  onLogout: () => void;
  name: string;
  edit: boolean;
  guide: 'view' | 'pin' | null;
  groupCount: number;
  setName: (value: string) => void;
  setEdit: (value: boolean) => void;
  setGuide: (value: 'view' | 'pin' | null) => void;
  onNavigate: (path: string) => void;
  onMessage: (message: string) => void;
}
export function MypageView({
  name,
  live,
  email,
  verified,
  logoutPending,
  onLogout,
  edit,
  guide,
  groupCount,
  setName,
  setEdit,
  setGuide,
  onNavigate,
}: Props) {
  return (
    <Box className='mypage'>
      <Heading className='page-title'>마이페이지</Heading>
      <Section className='profile'>
        <Box className='avatar'>{name.slice(-2)}</Box>
        <Box>
          <Heading>{name}</Heading>
          <Text className='muted'>{live ? email : '미리보기 계정'}</Text>
        </Box>
        <Button
          className='text-button'
          disabled={live}
          onClick={() => setEdit(true)}
        >
          {live ? '프로필 수정 준비 중' : '프로필 수정'}
        </Button>
      </Section>
      <Section>
        <Heading className='setting-heading'>알림</Heading>
        <Button
          className='menu-row'
          onClick={() => onNavigate('/notification-settings')}
        >
          <Icon name='bell' />
          <Span>알림 설정</Span>
          <Icon name='chevron-right' />
        </Button>
      </Section>
      <Section>
        <Heading className='setting-heading'>그룹</Heading>
        <Button
          className='menu-row'
          onClick={() => onNavigate(live ? '/groups' : '/albums')}
        >
          <Icon name='users' />
          <Span>참여 그룹</Span>
          <Text className='muted'>{groupCount}개</Text>
          <Icon name='chevron-right' />
        </Button>
      </Section>
      <Section>
        <Heading className='setting-heading'>사용법 다시 보기</Heading>
        <Button className='menu-row' onClick={() => setGuide('view')}>
          <Icon name='photo' />
          <Span>사진 감상</Span>
          <Icon name='chevron-right' />
        </Button>
        <Button className='menu-row' onClick={() => setGuide('pin')}>
          <Icon name='pin' />
          <Span>위치 댓글</Span>
          <Icon name='chevron-right' />
        </Button>
      </Section>
      <Section>
        <Heading className='setting-heading'>서비스 안내</Heading>
        {live ? (
          <>
            <Text className='muted'>
              {verified
                ? '이메일 확인 완료'
                : '그룹 생성과 참여 전 이메일 확인이 필요해요.'}
            </Text>
            {!verified && (
              <Button
                className='text-button'
                onClick={() => onNavigate('/verify-email')}
              >
                이메일 확인하기
              </Button>
            )}
            <Button
              className='text-button'
              disabled={logoutPending}
              onClick={onLogout}
            >
              {logoutPending ? '로그아웃 중…' : '로그아웃'}
            </Button>
          </>
        ) : (
          <Text className='muted'>예시 사진과 계정으로 미리보고 있어요.</Text>
        )}
      </Section>
      {edit && (
        <EntryDialog
          title='프로필 수정'
          label='이름'
          initialValue={name}
          submitLabel='저장'
          onSubmit={setName}
          onClose={() => setEdit(false)}
        />
      )}
      {guide && <Guide kind={guide} onClose={() => setGuide(null)} />}
    </Box>
  );
}
