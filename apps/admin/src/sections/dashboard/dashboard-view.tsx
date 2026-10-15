import {
  Box,
  Button,
  Dd,
  Dl,
  Dt,
  Heading,
  Section,
  Span,
  Subheading,
  Text,
  Time,
  Title,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { EmptyState } from '@/components/molecules/empty-state';
import { Link } from '@/components/molecules/link';
import { LoadError, LoadingState } from '@/components/molecules/load-state';
import { Notice } from '@/components/molecules/notice';
import { AuditLogTableView } from '@/components/organisms/audit-log-table/audit-log-table-view';
import {
  IDLE_TIMEOUT_MINUTES,
  REAUTH_WINDOW_MINUTES,
} from '@/constants/admin-auth';
import type { MetricGroup } from '@/dto/metrics.dto';
import type { AuditLogRowViewModel } from '@/dto/audit-log-view.dto';
interface Props {
  adminName: string;
  sessionExpires: string;
  sessionExpiresAt: string;
  reauthUntil: string;
  reauthUntilAt: string;
  reauthNotice: string;
  metricGroups: MetricGroup[];
  metricsAt: string;
  metricsAtIso: string;
  metricsLoading: boolean;
  metricsRefreshing: boolean;
  metricsError: string;
  onRefreshMetrics: () => void;
  auditHref: string;
  rows: AuditLogRowViewModel[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onReauth: () => void;
}
export function DashboardView({
  adminName,
  sessionExpires,
  sessionExpiresAt,
  reauthUntil,
  reauthUntilAt,
  reauthNotice,
  metricGroups,
  metricsAt,
  metricsAtIso,
  metricsLoading,
  metricsRefreshing,
  metricsError,
  onRefreshMetrics,
  auditHref,
  rows,
  loading,
  error,
  onRetry,
  onReauth,
}: Props) {
  return (
    <Section className='console-page' aria-labelledby='page-title'>
      <Box className='page-head'>
        <Title id='page-title'>대시보드</Title>
        <Text className='muted'>
          {adminName}님으로 로그인했어요. 운영 메뉴와 최근 활동을 확인할 수
          있어요.
        </Text>
      </Box>
      <Section className='card' aria-labelledby='metrics-title'>
        <Box className='card-head'>
          <Heading id='metrics-title'>운영 지표</Heading>
          <Box className='card-head-actions'>
            {metricsAt && (
              <Text className='muted small'>
                기준 <Time dateTime={metricsAtIso}>{metricsAt}</Time> (KST)
              </Text>
            )}
            <Button
              className='secondary-button small'
              aria-disabled={metricsLoading || metricsRefreshing}
              onClick={onRefreshMetrics}
            >
              <Icon name='refresh' size={16} />
              {metricsRefreshing ? '불러오는 중…' : '새로고침'}
            </Button>
          </Box>
        </Box>
        {metricsError && (
          <Notice tone='error'>
            {metricsError}
            {metricGroups.length > 0 && ' 아래는 마지막으로 불러온 값이에요.'}
          </Notice>
        )}
        {metricsLoading ? (
          <LoadingState message='운영 지표를 불러오고 있어요…' />
        ) : metricGroups.length === 0 ? (
          !metricsError && <Text className='muted'>표시할 지표가 없어요.</Text>
        ) : (
          <Box className='metric-grid'>
            {metricGroups.map((group) => (
              <Section
                key={group.id}
                className='metric-group'
                aria-labelledby={`metric-${group.id}`}
              >
                <Subheading id={`metric-${group.id}`}>{group.title}</Subheading>
                {group.unavailable ? (
                  <Text className='muted'>{group.unavailable}</Text>
                ) : (
                  <Dl className='metric-list'>
                    {group.items.map((item) => (
                      <Box
                        key={item.label}
                        data-attention={item.attention ? 'true' : undefined}
                      >
                        <Dt>{item.label}</Dt>
                        <Dd>
                          {item.href ? (
                            <Link className='metric-value' href={item.href}>
                              {item.value}
                            </Link>
                          ) : (
                            <Span className='metric-value'>{item.value}</Span>
                          )}
                          {item.note && (
                            <Span className='metric-note'>{item.note}</Span>
                          )}
                        </Dd>
                      </Box>
                    ))}
                  </Dl>
                )}
              </Section>
            ))}
          </Box>
        )}
      </Section>
      <Box className='card-grid'>
        <Section className='card' aria-labelledby='session-title'>
          <Heading id='session-title'>현재 세션</Heading>
          <Dl className='facts'>
            <Box>
              <Dt>로그인 유지</Dt>
              <Dd>
                {sessionExpires ? (
                  <>
                    <Time dateTime={sessionExpiresAt}>{sessionExpires}</Time>
                    까지
                  </>
                ) : (
                  '확인 중'
                )}
              </Dd>
            </Box>
            <Box>
              <Dt>자동 로그아웃</Dt>
              <Dd>{IDLE_TIMEOUT_MINUTES}분 동안 활동이 없으면 종료돼요</Dd>
            </Box>
            <Box>
              <Dt>본인 확인</Dt>
              <Dd>
                {reauthUntil ? (
                  <>
                    <Time dateTime={reauthUntilAt}>{reauthUntil}</Time>
                    까지 유효
                  </>
                ) : (
                  '필요할 때 비밀번호와 인증 코드를 다시 확인해요'
                )}
              </Dd>
            </Box>
          </Dl>
          <Text className='field-help'>
            회원 사진 열람·회원 정지 같은 민감한 작업은 최근{' '}
            {REAUTH_WINDOW_MINUTES}분 안에 본인 확인을 해야 진행돼요.
          </Text>
          {reauthNotice && <Notice>{reauthNotice}</Notice>}
          <Button className='secondary-button' onClick={onReauth}>
            <Icon name='shield' size={18} />
            지금 본인 확인
          </Button>
        </Section>
      </Box>
      <Section className='card' aria-labelledby='recent-title'>
        <Box className='card-head'>
          <Heading id='recent-title'>최근 감사 기록</Heading>
          <Link className='text-link' href={auditHref}>
            전체 보기
            <Icon name='chevron-right' size={16} />
          </Link>
        </Box>
        {loading ? (
          <LoadingState message='최근 기록을 불러오고 있어요…' />
        ) : error ? (
          <LoadError
            title='최근 기록을 불러오지 못했어요'
            message={error}
            onRetry={onRetry}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon='clock'
            title='아직 감사 기록이 없어요'
            body='관리자 로그인·인증·계정 변경이 생기면 여기에 표시돼요.'
          />
        ) : (
          <AuditLogTableView caption='최근 감사 기록' rows={rows} />
        )}
      </Section>
    </Section>
  );
}
