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
export interface InquiryRowViewModel {
  id: string;
  domId: string;
  href: string;
  title: string;
  category: string;
  status: string;
  statusLabel: string;
  memberName: string;
  memberUsername: string;
  created: string;
  createdAt: string;
  answered: string;
  answeredAt: string;
}
type Options = { value: string; label: string }[];
interface Props {
  status: string;
  category: string;
  statusOptions: Options;
  categoryOptions: Options;
  rows: InquiryRowViewModel[];
  loading: boolean;
  loadingMore: boolean;
  error: string;
  moreError: string;
  notice: string;
  hasMore: boolean;
  onStatus: (value: string) => void;
  onCategory: (value: string) => void;
  onRetry: () => void;
  onMore: () => void;
}
export function InquiriesView(props: Props) {
  const { rows } = props;
  const filtered = !!(props.status || props.category);
  return (
    <Section className='console-page' aria-labelledby='page-title'>
      <Box className='page-head'>
        <Title id='page-title'>문의</Title>
        <Text className='muted'>
          회원 문의를 확인하고 답변해요. 최신 문의부터 보여요. 문의 본문은 상세
          화면에서 열람하며 열람 기록이 남아요.
        </Text>
      </Box>
      <Box className='toolbar'>
        <Box className='filters'>
          <Box className='field field-inline'>
            <Label htmlFor='inquiry-status'>상태</Label>
            <Select
              id='inquiry-status'
              value={props.status}
              onChange={(event) => props.onStatus(event.target.value)}
            >
              <Option value=''>전체</Option>
              {props.statusOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Box>
          <Box className='field field-inline'>
            <Label htmlFor='inquiry-category'>분류</Label>
            <Select
              id='inquiry-category'
              value={props.category}
              onChange={(event) => props.onCategory(event.target.value)}
            >
              <Option value=''>전체</Option>
              {props.categoryOptions.map((option) => (
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
        loadingLabel='문의를 불러오고 있어요…'
        errorTitle='문의를 불러오지 못했어요'
        onRetry={props.onRetry}
        emptyState={
          <EmptyState
            icon='comment'
            title={
              filtered ? '조건에 맞는 문의가 없어요' : '아직 문의가 없어요'
            }
            body={
              filtered
                ? '다른 상태나 분류를 골라 주세요.'
                : '회원이 문의를 보내면 여기에 표시돼요.'
            }
          />
        }
      >
        <ListFooter
          notice={props.notice}
          count={rows.length}
          hasMore={props.hasMore}
          loadingMore={props.loadingMore}
          moreError={props.moreError}
          moreLabel='문의 더 보기'
          onMore={props.onMore}
        >
          <Box
            className='table-scroll table-scroll--inquiries'
            role='region'
            aria-label='문의 목록 (가로로 스크롤할 수 있어요)'
            tabIndex={0}
          >
            <Table className='data-table'>
              <Caption className='sr-only'>문의 목록</Caption>
              <Thead>
                <Tr>
                  <Th scope='col'>제목</Th>
                  <Th scope='col' className='col-status'>
                    분류
                  </Th>
                  <Th scope='col' className='col-admin'>
                    회원
                  </Th>
                  <Th scope='col' className='col-status'>
                    상태
                  </Th>
                  <Th scope='col' className='col-time'>
                    접수 (KST)
                  </Th>
                  <Th scope='col' className='col-time'>
                    답변
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <Link id={row.domId} className='row-link' href={row.href}>
                        {row.title}
                      </Link>
                    </Td>
                    <Td>{row.category}</Td>
                    <Td>
                      <Span className='cell-title'>{row.memberName}</Span>
                      {row.memberUsername && (
                        <Span className='cell-meta'>@{row.memberUsername}</Span>
                      )}
                    </Td>
                    <Td>
                      <Span className='status-chip' data-status={row.status}>
                        {row.statusLabel}
                      </Span>
                    </Td>
                    <Td className='cell-time'>
                      <Time dateTime={row.createdAt}>{row.created}</Time>
                    </Td>
                    <Td className='cell-time'>
                      {row.answered ? (
                        <Time dateTime={row.answeredAt}>{row.answered}</Time>
                      ) : (
                        <Span className='muted'>답변 전</Span>
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
