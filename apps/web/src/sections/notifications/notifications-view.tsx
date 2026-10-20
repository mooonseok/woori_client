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
  image?: string;
  onImageError?: () => void;
  group: string;
  when: string;
  read: boolean;
  count: number;
  onOpen: () => void;
}
interface Props {
  groups: { label: string; rows: NotificationRowViewModel[] }[];
  unreadCount: number;
  live: boolean;
  error: string;
  pending: boolean;
  hasMore: boolean;
  loading: boolean;
  onRefresh: () => void;
  onMore: () => void;
  onReadAll: () => void;
  onBack: () => void;
  onSettings: () => void;
}
export function NotificationsView({
  groups,
  unreadCount,
  live,
  error,
  pending,
  hasMore,
  loading,
  onRefresh,
  onMore,
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
        {/* Focus lands here if a photo viewer closes and its row is gone. */}
        <Heading id='notification-title' tabIndex={-1} data-photo-viewer-return>
          알림
        </Heading>
        <Button
          className='notification-icon-button'
          onClick={onSettings}
          aria-label='알림 설정'
        >
          <Icon name='settings' />
        </Button>
      </Header>
      <Text className='notification-demo-note'>
        {live
          ? '그룹의 새로운 소식을 확인해 보세요. 기기 알림은 알림 설정에서 켤 수 있어요.'
          : '지금은 예시 소식이에요. 데모에서는 기기 알림을 보내지 않아요.'}
      </Text>
      {live && (
        <Box className='notification-list-tools'>
          <Button disabled={loading || pending} onClick={onRefresh}>
            새로고침
          </Button>
        </Box>
      )}
      {error && (
        <Box className='notification-error' role='alert'>
          <Text>{error}</Text>
          <Button disabled={loading || pending} onClick={onRefresh}>
            다시 불러오기
          </Button>
        </Box>
      )}
      {pending && <Text role='status'>알림을 확인하고 있어요.</Text>}
      {loading && !groups.length ? (
        <Box className='notification-loading' role='status'>
          알림을 불러오고 있어요.
        </Box>
      ) : groups.length === 0 && !error ? (
        <Box className='notification-empty'>
          <Icon name='bell' size={32} />
          <Heading>아직 받은 알림이 없어요</Heading>
          <Text>새로 올라온 사진·동영상과 댓글·반응 소식이 여기에 모여요.</Text>
        </Box>
      ) : (
        <>
          <Box className='notification-list-tools'>
            <Text aria-live='polite'>
              {unreadCount
                ? `읽지 않은 소식 ${unreadCount}개`
                : '새 소식을 모두 확인했어요'}
            </Text>
            <Button
              onClick={onReadAll}
              disabled={
                loading ||
                pending ||
                !groups.some((group) => group.rows.some((row) => !row.read))
              }
            >
              {live ? '표시된 알림 읽음' : '모두 읽음'}
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
                      disabled={loading || pending}
                      onClick={row.onOpen}
                      aria-label={`${row.read ? '' : '읽지 않음. '}${row.title}. ${row.group}. ${row.when}`}
                    >
                      {row.image ? (
                        <Image
                          className='notification-thumbnail'
                          src={row.image}
                          alt=''
                          width={56}
                          height={56}
                          onError={row.onImageError}
                        />
                      ) : (
                        <Span
                          className='notification-thumbnail notification-placeholder'
                          aria-hidden='true'
                        >
                          <Icon name='bell' />
                        </Span>
                      )}
                      <Span className='notification-item-copy'>
                        {/* Bundle counts are part of the title. */}
                        <Span>{row.title}</Span>
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
          {hasMore && (
            <Button
              className='notification-new'
              disabled={loading || pending}
              onClick={onMore}
            >
              {loading ? '불러오는 중…' : '이전 알림 더 보기'}
            </Button>
          )}
        </>
      )}
    </Section>
  );
}
