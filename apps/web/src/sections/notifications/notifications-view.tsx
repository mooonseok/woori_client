import {
  Box,
  Button,
  Header,
  Heading,
  Image,
  Li,
  Section,
  Span,
  Text,
  Ul,
} from '../../components/atoms/ui';
import { Icon } from '../../components/atoms/icon';

export interface NotificationRowViewModel {
  id: string;
  title: string;
  image: string;
  group: string;
  when: string;
  read: boolean;
  count: number;
  onOpen: () => void;
}
interface Props {
  groups: { label: string; rows: NotificationRowViewModel[] }[];
  unreadCount: number;
  pendingCount: number;
  loading: boolean;
  onShowNew: () => void;
  onReadAll: () => void;
  onBack: () => void;
  onSettings: () => void;
}
export function NotificationsView({
  groups,
  unreadCount,
  pendingCount,
  loading,
  onShowNew,
  onReadAll,
  onBack,
  onSettings,
}: Props) {
  return (
    <Section
      className='notification-screen'
      aria-labelledby='notification-title'
    >
      <Header className='notification-header'>
        <Button
          className='notification-icon-button'
          onClick={onBack}
          aria-label='뒤로 가기'
        >
          <Icon name='back' />
        </Button>
        <Heading id='notification-title'>알림</Heading>
        <Button
          className='notification-icon-button'
          onClick={onSettings}
          aria-label='알림 설정'
        >
          <Icon name='settings' />
        </Button>
      </Header>
      <Text className='notification-demo-note'>
        지금은 예시 소식이에요. 실제 계정의 푸시 연결은 준비 중이에요.
      </Text>
      {pendingCount > 0 && (
        <Button className='notification-new' onClick={onShowNew}>
          새 소식 {pendingCount}개 보기
        </Button>
      )}
      {loading ? (
        <Box className='notification-loading' role='status'>
          알림을 불러오고 있어요.
        </Box>
      ) : groups.length === 0 ? (
        <Box className='notification-empty'>
          <Icon name='bell' size={32} />
          <Heading>아직 받은 알림이 없어요</Heading>
          <Text>가족이 올린 사진과 내 사진에 남긴 이야기가 여기에 모여요.</Text>
        </Box>
      ) : (
        <>
          <Box className='notification-list-tools'>
            <Text aria-live='polite'>
              {unreadCount
                ? `읽지 않은 소식 ${unreadCount}개`
                : '새 소식을 모두 확인했어요'}
            </Text>
            <Button onClick={onReadAll} disabled={!unreadCount}>
              모두 읽음
            </Button>
          </Box>
          {groups.map((group) => (
            <Section
              key={group.label}
              className='notification-day'
              aria-label={group.label}
            >
              <Heading>{group.label}</Heading>
              <Ul className='notification-list'>
                {group.rows.map((row) => (
                  <Li key={row.id}>
                    <Button
                      className='notification-item'
                      onClick={row.onOpen}
                      aria-label={`${row.read ? '' : '읽지 않음. '}${row.title}${row.count > 1 ? `. 반응 ${row.count}개` : ''}. ${row.when}`}
                    >
                      <Image
                        className='notification-thumbnail'
                        src={row.image}
                        alt=''
                        width={56}
                        height={56}
                      />
                      <Span className='notification-item-copy'>
                        <Span>
                          {row.title}
                          {row.count > 1 ? ` 외 반응 ${row.count - 1}개` : ''}
                        </Span>
                        <Span className='notification-description'>
                          {row.group} · {row.when}
                        </Span>
                      </Span>
                      {!row.read && (
                        <Span
                          className='notification-unread'
                          aria-hidden='true'
                        />
                      )}
                    </Button>
                  </Li>
                ))}
              </Ul>
            </Section>
          ))}
        </>
      )}
    </Section>
  );
}
