import { ThemePicker } from '@/components/molecules/theme-picker';
import {
  themeLabel,
  type ThemeName,
  type ThemePreference,
} from '@/utils/theme';
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
  themePreference: ThemePreference;
  resolvedTheme: ThemeName;
  onThemeChange: (value: ThemePreference) => void;
  themeOpen: boolean;
  onThemeOpen: () => void;
  onThemeClose: () => void;
  live: boolean;
  email: string;
  verified: boolean;
  logoutPending: boolean;
  onLogout: () => void;
  name: string;
  edit: boolean;
  guide: 'view' | 'pin' | null;
  groupCount: number;
  setName: (value: string) => void | Promise<void>;
  setEdit: (value: boolean) => void;
  setGuide: (value: 'view' | 'pin' | null) => void;
  onNavigate: (path: string) => void;
  onMessage: (message: string) => void;
}
export function MypageView({
  themePreference,
  resolvedTheme,
  onThemeChange,
  themeOpen,
  onThemeOpen,
  onThemeClose,
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
  if (themeOpen)
    return (
      <Section className='theme-settings'>
        <Box className='theme-settings-header'>
          <Button
            className='icon-button'
            aria-label='뒤로 가기'
            onClick={onThemeClose}
            autoFocus
          >
            <Icon name='arrow-left' />
          </Button>
          <Heading className='page-title'>화면 테마</Heading>
        </Box>
        <ThemePicker
          preference={themePreference}
          resolvedTheme={resolvedTheme}
          onChange={onThemeChange}
        />
        <Text className='theme-settings-note'>
          선택한 테마는 이 브라우저에 저장돼요. 자동 변경을 선택했을 때만 한국
          시간의 계절에 맞춰 바뀌어요.
        </Text>
        <Text className='theme-settings-note'>
          겨울 두 색상은 비교안이에요. 자동 테마에는 스노우를 적용해요.
        </Text>
      </Section>
    );
  return (
    <Box className='mypage'>
      <Heading className='page-title'>마이페이지</Heading>
      <Section className='profile'>
        <Box className='avatar' role='img' aria-label='기본 프로필'>
          <Icon name='user' size={30} />
        </Box>
        <Box>
          <Heading>{name}</Heading>
          <Text className='muted'>{live ? email : '미리보기 계정'}</Text>
        </Box>
        <Button className='text-button' onClick={() => setEdit(true)}>
          프로필 수정
        </Button>
      </Section>
      {live && (
        <Section>
          <Heading className='setting-heading'>계정</Heading>
          <Button
            className='menu-row'
            onClick={() => onNavigate('/account-settings')}
          >
            <Icon name='user' />
            <Span>계정 설정</Span>
            <Icon name='chevron-right' />
          </Button>
          <Button className='menu-row' onClick={() => onNavigate('/blocks')}>
            <Icon name='eye-off' />
            <Span>차단 관리</Span>
            <Icon name='chevron-right' />
          </Button>
        </Section>
      )}
      <Section>
        <Heading className='setting-heading'>화면</Heading>
        <Button
          id='theme-settings-button'
          className='menu-row'
          onClick={onThemeOpen}
        >
          <Icon name='palette' />
          <Span>화면 테마</Span>
          <Text className='muted'>{themeLabel(themePreference)}</Text>
          <Icon name='chevron-right' />
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
        {live && (
          <Button className='menu-row' onClick={() => onNavigate('/notices')}>
            <Icon name='info' />
            <Span>공지사항</Span>
            <Icon name='chevron-right' />
          </Button>
        )}
        <Button className='menu-row' onClick={() => onNavigate('/help')}>
          <Icon name='help' />
          <Span>도움말</Span>
          <Icon name='chevron-right' />
        </Button>
        {live && (
          <Button className='menu-row' onClick={() => onNavigate('/inquiries')}>
            <Icon name='comment' />
            <Span>문의하기</Span>
            <Icon name='chevron-right' />
          </Button>
        )}
        {live && (
          <Button className='menu-row' onClick={() => onNavigate('/reports')}>
            <Icon name='flag' />
            <Span>신고 내역</Span>
            <Icon name='chevron-right' />
          </Button>
        )}
        <Button className='menu-row' onClick={() => onNavigate('/privacy')}>
          <Icon name='shield' />
          <Span>개인정보 안내</Span>
          <Icon name='chevron-right' />
        </Button>
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
          note={
            live
              ? '아이디·비밀번호 찾기에도 변경한 이름을 사용해 주세요.'
              : undefined
          }
          onSubmit={setName}
          onClose={() => setEdit(false)}
        />
      )}
      {guide && <Guide kind={guide} onClose={() => setGuide(null)} />}
    </Box>
  );
}
