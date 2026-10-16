import {
  Box,
  Button,
  Code,
  Dd,
  Dl,
  Dt,
  Heading,
  Section,
  Span,
  Subheading,
  Table,
  Caption,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
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
import type { MetricGroup, QueueRow, WorkerSummary } from '@/dto/metrics.dto';
import type { AuditLogRowViewModel } from '@/dto/audit-log-view.dto';
interface Props {
  adminName: string;
  sessionExpires: string;
  sessionExpiresAt: string;
  reauthUntil: string;
  reauthUntilAt: string;
  reauthNotice: string;
  metricGroups: MetricGroup[];
  queueRows: QueueRow[];
  workers: WorkerSummary | null;
  opsUnavailable: string;
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
  queueRows,
  workers,
  opsUnavailable,
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
        {!metricsLoading && opsUnavailable && (
          <Text className='muted'>큐 지연·워커 상태: {opsUnavailable}</Text>
        )}
        {!metricsLoading && workers && (
          <Section className='ops-detail' aria-labelledby='workers-title'>
            <Box className='card-head'>
              <Subheading id='workers-title'>워커 상태</Subheading>
              <Span
                className='status-chip'
                data-status={workers.healthy ? 'RESOLVED' : 'SUSPENDED'}
              >
                {workers.status}
              </Span>
            </Box>
            {workers.warnings.map((warning) => (
              <Notice key={warning} tone='warning'>
                {warning}
              </Notice>
            ))}
            {workers.rows.length > 0 && (
              <Box
                className='table-scroll'
                role='region'
                aria-label='워커 상태 (가로로 스크롤할 수 있어요)'
                tabIndex={0}
              >
                <Table className='data-table compact'>
                  <Caption className='sr-only'>워커 상태</Caption>
                  <Thead>
                    <Tr>
                      <Th scope='col'>워커</Th>
                      <Th scope='col'>마지막 신호</Th>
                      <Th scope='col'>마지막 처리</Th>
                      <Th scope='col'>동영상 변환</Th>
                      {workers.showBusy && <Th scope='col'>현재 작업</Th>}
                      <Th scope='col'>시작</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {workers.rows.map((row) => (
                      <Tr
                        key={row.id}
                        data-attention={row.attention ? 'true' : undefined}
                      >
                        <Td>
                          <Code>{row.id}</Code>
                        </Td>
                        <Td>{row.beat}</Td>
                        <Td>{row.lastPass}</Td>
                        <Td>{row.video}</Td>
                        {workers.showBusy && (
                          <Td data-long={row.busyLong ? 'true' : undefined}>
                            {row.busy}
                          </Td>
                        )}
                        <Td>
                          <Time dateTime={row.startedAt}>{row.started}</Time>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </Section>
        )}
        {!metricsLoading && queueRows.length > 0 && (
          <Section className='ops-detail' aria-labelledby='queues-title'>
            <Subheading id='queues-title'>큐 지연</Subheading>
            <Box
              className='table-scroll'
              role='region'
              aria-label='큐 지연 (가로로 스크롤할 수 있어요)'
              tabIndex={0}
            >
              <Table className='data-table compact'>
                <Caption className='sr-only'>
                  큐 지연: 처리할 차례가 된 작업 수와 가장 오래 기다린 시간
                </Caption>
                <Thead>
                  <Tr>
                    <Th scope='col'>큐</Th>
                    <Th scope='col'>처리할 차례</Th>
                    <Th scope='col'>가장 오래 밀린 시간</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {queueRows.map((row) => (
                    <Tr
                      key={row.id}
                      data-attention={row.attention ? 'true' : undefined}
                    >
                      <Th scope='row'>{row.label}</Th>
                      <Td>{row.due}</Td>
                      <Td>
                        {row.oldest}
                        {row.attention && (
                          <Span className='status-chip' data-status='SUSPENDED'>
                            지연
                          </Span>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Section>
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
