import {
  Box,
  Button,
  Header,
  Heading,
  Input,
  Label,
  Option,
  Section,
  Select,
  Span,
  Text,
} from '../../components/atoms/ui';
import { Icon } from '../../components/atoms/icon';
import { NotificationSwitchView } from '../../components/molecules/notification-switch-view';
import type { NotificationGroupMode } from '../../dto/notification.dto';
import type { NotificationSettingsViewProps } from '../../dto/notification-settings-view.dto';

export function SettingsView(props: NotificationSettingsViewProps) {
  const {
    devicePush,
    preferences: prefs,
    status,
    ready,
    live,
    settingsError,
    rows,
    quietRow,
    previewRow,
    groups,
    error,
    permissionHelp,
    onToggle,
    onTime,
    onGroup,
    onRetry,
    onReload,
    onDiscard,
    onBack,
    onPermissionHelp,
  } = props;
  return (
    <Section
      className='notification-screen notification-settings'
      aria-labelledby='notification-settings-title'
    >
      <Header className='notification-header'>
        <Button
          className='notification-icon-button'
          onClick={onBack}
          aria-label='뒤로 가기'
        >
          <Icon name='back' />
        </Button>
        <Heading id='notification-settings-title'>알림 설정</Heading>
        <Span className='notification-save-state' role='status'>
          {settingsError
            ? '확인 필요'
            : !ready && status !== 'saving'
              ? '불러오는 중'
              : status === 'saving'
                ? '저장 중…'
                : status === 'saved'
                  ? '저장됨'
                  : ''}
        </Span>
      </Header>
      <Text className='notification-demo-note'>
        {live
          ? '받을 소식은 계정에 저장돼요. 기기 연결은 브라우저마다 설정해 주세요.'
          : '예시 설정은 이 브라우저에만 저장돼요.'}
      </Text>
      {(status === 'error' || settingsError) && (
        <Box className='notification-error' role='alert'>
          <Text>
            {settingsError || '설정을 저장하지 못했어요. 다시 시도해 주세요.'}
          </Text>
          <Button onClick={onRetry}>다시 시도</Button>
          {onDiscard && (
            <Button onClick={onDiscard}>저장하지 않고 나가기</Button>
          )}
          {onReload && <Button onClick={onReload}>최신 설정 불러오기</Button>}
          {onReload && (
            <Text>
              최신 설정을 불러오면 아직 저장되지 않은 선택은 취소돼요.
            </Text>
          )}
        </Box>
      )}
      <Section
        className='notification-setting-section'
        aria-labelledby='notification-device'
      >
        <Heading id='notification-device'>이 기기 알림</Heading>
        <Box className='notification-device-row'>
          <Box>
            <Text role='status'>
              {
                {
                  loading: '기기 연결 확인 중…',
                  unsupported: live
                    ? '이 브라우저에서는 연결할 수 없어요'
                    : '데모에서는 기기 알림을 보내지 않아요',
                  unconfigured: '서버 알림 설정이 필요해요',
                  denied: '브라우저에서 알림이 차단됐어요',
                  off: '이 브라우저 알림 꺼짐',
                  on: '이 브라우저 알림 켜짐',
                  busy: '연결 변경 중…',
                  error: '기기 연결 확인 필요',
                }[devicePush.state]
              }
            </Text>
            <Text className='notification-description'>
              {devicePush.state === 'denied'
                ? '브라우저의 사이트 설정에서 알림을 허용한 뒤 다시 확인해 주세요.'
                : devicePush.state === 'unsupported'
                  ? '최신 브라우저와 보안 연결이 필요해요. iPhone은 Safari에서 홈 화면에 추가한 후 앱을 열어 주세요.'
                  : '여러 기기를 쓰면 각 기기에서 한 번씩 연결해 주세요.'}
            </Text>
          </Box>
          {devicePush.state === 'off' && (
            <Button
              className='notification-outline-button'
              onClick={devicePush.onEnable}
            >
              알림 켜기
            </Button>
          )}
          {devicePush.state === 'on' && (
            <Button
              className='notification-outline-button'
              onClick={devicePush.onDisable}
            >
              이 기기 끄기
            </Button>
          )}
          {['denied', 'error', 'unconfigured'].includes(devicePush.state) && (
            <Button
              className='notification-outline-button'
              onClick={devicePush.onRetry}
            >
              다시 확인
            </Button>
          )}
        </Box>
        {devicePush.error && (
          <Text className='notification-field-error' role='alert'>
            {devicePush.error}
          </Text>
        )}
        <Button
          className='text-button'
          onClick={onPermissionHelp}
          aria-expanded={permissionHelp}
        >
          기기 알림 도움말
        </Button>
        {permissionHelp && (
          <Text className='notification-help'>
            알림 켜기를 누르면 브라우저가 권한을 물어봐요. iPhone·iPad는 iOS
            16.4 이상에서 홈 화면에 추가한 웹앱을 열어야 해요. 로그아웃하면 이
            기기의 연결이 해제돼요. 다시 로그인한 뒤 알림을 켜 주세요.
          </Text>
        )}
      </Section>
      <Section
        className='notification-setting-section'
        aria-labelledby='notification-types'
      >
        <Heading id='notification-types'>받을 소식</Heading>
        {rows.map((row) => (
          <NotificationSwitchView
            key={row.key}
            row={row}
            checked={prefs[row.key]}
            disabled={!ready || (row.key !== 'master' && !prefs.master)}
            onChange={() => onToggle(row.key)}
          />
        ))}
      </Section>
      <Section
        className='notification-setting-section'
        aria-labelledby='notification-groups'
      >
        <Heading id='notification-groups'>그룹별 알림</Heading>
        <Text className='notification-description'>
          계정에서 끈 알림은 그룹 설정으로 다시 켜지지 않아요.
        </Text>
        {ready && !groups.length && (
          <Text className='notification-description'>
            참여한 그룹이 없어요. 그룹에 참여하면 여기에서 따로 설정할 수
            있어요.
          </Text>
        )}
        {groups.map((group) => (
          <Label className='notification-group-setting' key={group.id}>
            <Span>{group.name}</Span>
            <Select
              aria-label={`${group.name} 알림`}
              value={prefs.groups[group.id] ?? 'default'}
              disabled={!ready}
              onChange={(event) =>
                onGroup(group.id, event.target.value as NotificationGroupMode)
              }
            >
              <Option value='default'>기본 설정 따르기</Option>
              <Option value='mine'>댓글·반응만</Option>
              <Option value='off'>끄기</Option>
            </Select>
          </Label>
        ))}
      </Section>
      <Section
        className='notification-setting-section'
        aria-labelledby='notification-quiet'
      >
        <Heading id='notification-quiet'>방해금지 시간</Heading>
        <NotificationSwitchView
          row={quietRow}
          checked={prefs.quiet}
          disabled={!ready}
          onChange={() => onToggle('quiet')}
        />
        {prefs.quiet && (
          <>
            <Box className='notification-time-row'>
              <Label>
                시작
                <Input
                  type='time'
                  disabled={!ready}
                  value={prefs.quietStart}
                  aria-describedby={
                    error ? 'notification-time-error' : undefined
                  }
                  onChange={(event) => onTime('quietStart', event.target.value)}
                />
              </Label>
              <Label>
                끝
                <Input
                  type='time'
                  disabled={!ready}
                  value={prefs.quietEnd}
                  aria-describedby={
                    error ? 'notification-time-error' : undefined
                  }
                  onChange={(event) => onTime('quietEnd', event.target.value)}
                />
              </Label>
            </Box>
            <Text className='notification-description'>
              설정한 시간에는 푸시를 쉬어요. 알림함에서는 소식을 확인할 수
              있어요.
            </Text>
          </>
        )}
        {error && (
          <Text
            id='notification-time-error'
            className='notification-field-error'
            role='alert'
          >
            {error}
          </Text>
        )}
      </Section>
      <Section
        className='notification-setting-section'
        aria-labelledby='notification-preview'
      >
        <Heading id='notification-preview'>알림 내용 미리 보기</Heading>
        <NotificationSwitchView
          row={previewRow}
          checked={prefs.preview}
          disabled={!ready}
          onChange={() => onToggle('preview')}
        />
        <Box className='notification-lock-preview' aria-label='잠금 화면 예시'>
          <Span className='notification-app-mark' aria-hidden='true'>
            우리
          </Span>
          <Box>
            <Text>우리</Text>
            <Text>
              {prefs.preview
                ? '하은님이 새 사진을 올렸어요'
                : '새로운 소식이 있어요'}
            </Text>
          </Box>
        </Box>
      </Section>
      <Text className='notification-help'>
        푸시를 꺼도 앱 안 알림함의 소식은 그대로 남아요.
      </Text>
    </Section>
  );
}
