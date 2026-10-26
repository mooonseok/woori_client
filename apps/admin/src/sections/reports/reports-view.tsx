import {
  Box,
  Caption,
  Label,
  Option,
  Section,
  Select,
  Span,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Time,
  Title,
  Tr,
} from '@/components/atoms/ui';
import { EmptyState } from '@/components/molecules/empty-state';
import { Link } from '@/components/molecules/link';
import { ListFooter, ListState } from '@/components/molecules/list-state';
export interface ReportRowViewModel {
  id: string;
  domId: string;
  href: string;
  target: string;
  targetUser: string;
  reason: string;
  group: string;
  groupStatus: string;
  reporter: string;
  status: string;
  statusLabel: string;
  resolution: string;
  openOnTarget: number;
  created: string;
  createdAt: string;
}
type Options = { value: string; label: string }[];
interface Props {
  status: string;
  targetType: string;
  statusOptions: Options;
  targetOptions: Options;
  orderNote: string;
  rows: ReportRowViewModel[];
  loading: boolean;
  loadingMore: boolean;
  error: string;
  moreError: string;
  notice: string;
  hasMore: boolean;
  onStatus: (value: string) => void;
  onTargetType: (value: string) => void;
  onRetry: () => void;
  onMore: () => void;
}
export function ReportsView(props: Props) {
  const { rows } = props;
  return (
    <Section className='console-page' aria-labelledby='page-title'>
      <Box className='page-head'>
        <Title id='page-title'>신고</Title>
        <Text className='muted'>
          회원 신고를 검토하고 처리해요. 신고 처리는 운영자만 하며 신고한 회원은
          처리 상태만 볼 수 있어요. {props.orderNote}
        </Text>
      </Box>
      <Box className='toolbar'>
        <Box className='filters'>
          <Box className='field field-inline'>
            <Label htmlFor='report-status'>상태</Label>
            <Select
              id='report-status'
              value={props.status}
              onChange={(event) => props.onStatus(event.target.value)}
            >
              {props.statusOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Box>
          <Box className='field field-inline'>
            <Label htmlFor='report-target'>대상</Label>
            <Select
              id='report-target'
              value={props.targetType}
              onChange={(event) => props.onTargetType(event.target.value)}
            >
              <Option value=''>전체</Option>
              {props.targetOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Box>
        </Box>
      </Box>
      <ListState
        loading={props.loading}
        error={props.error}
        empty={rows.length === 0}
        loadingLabel='신고를 불러오고 있어요…'
        errorTitle='신고를 불러오지 못했어요'
        onRetry={props.onRetry}
        emptyState={
          <EmptyState
            icon='flag'
            title={
              props.status === 'OPEN'
                ? '처리할 신고가 없어요'
                : '조건에 맞는 신고가 없어요'
            }
            body='다른 상태나 대상을 고르면 지난 신고도 볼 수 있어요.'
          />
        }
      >
        <ListFooter
          notice={props.notice}
          count={rows.length}
          hasMore={props.hasMore}
          loadingMore={props.loadingMore}
          moreError={props.moreError}
          moreLabel='신고 더 보기'
          onMore={props.onMore}
        >
          <Box
            className='table-scroll table-scroll--reports'
            role='region'
            aria-label='신고 목록 (가로로 스크롤할 수 있어요)'
            tabIndex={0}
          >
            <Table className='data-table'>
              <Caption className='sr-only'>신고 목록</Caption>
              <Thead>
                <Tr>
                  <Th scope='col' className='col-time'>
                    접수 (KST)
                  </Th>
                  <Th scope='col'>대상</Th>
                  <Th scope='col'>사유</Th>
                  <Th scope='col'>그룹</Th>
                  <Th scope='col' className='col-admin'>
                    신고자
                  </Th>
                  <Th scope='col' className='col-status'>
                    상태
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td className='cell-time'>
                      <Link id={row.domId} className='row-link' href={row.href}>
                        <Time dateTime={row.createdAt}>{row.created}</Time>
                        <Span className='sr-only'> 신고 열기</Span>
                      </Link>
                    </Td>
                    <Td>
                      <Span className='cell-title'>
                        {row.target} · {row.targetUser}
                      </Span>
                      {row.openOnTarget > 1 && (
                        <Span className='cell-meta'>
                          같은 대상 처리 대기 {row.openOnTarget}건
                        </Span>
                      )}
                    </Td>
                    <Td>{row.reason}</Td>
                    <Td>
                      {row.group}
                      {row.groupStatus && (
                        <Span className='cell-meta'>{row.groupStatus}</Span>
                      )}
                    </Td>
                    <Td>{row.reporter}</Td>
                    <Td>
                      <Span className='status-chip' data-status={row.status}>
                        {row.statusLabel}
                      </Span>
                      {row.resolution && (
                        <Span className='cell-meta'>{row.resolution}</Span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </ListFooter>
      </ListState>
    </Section>
  );
}
