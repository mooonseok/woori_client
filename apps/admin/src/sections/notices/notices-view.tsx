import {
  Box,
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
  Caption,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { EmptyState } from '@/components/molecules/empty-state';
import { Link } from '@/components/molecules/link';
import { ListFooter, ListState } from '@/components/molecules/list-state';
import type { NoticeStatus, NoticeVisibility } from '@/dto/notice.dto';
export interface NoticeRowViewModel {
  id: string;
  domId: string;
  href: string;
  title: string;
  status: NoticeStatus;
  statusLabel: string;
  visibility: NoticeVisibility;
  visibilityLabel: string;
  published: string;
  publishedAt: string;
  updated: string;
  updatedAt: string;
}
interface Props {
  status: string;
  statusOptions: { value: string; label: string }[];
  newHref: string;
  rows: NoticeRowViewModel[];
  loading: boolean;
  loadingMore: boolean;
  error: string;
  moreError: string;
  notice: string;
  hasMore: boolean;
  onStatus: (value: string) => void;
  onRetry: () => void;
  onMore: () => void;
}
export function NoticesView(props: Props) {
  const { status, statusOptions, newHref, rows } = props;
  return (
    <Section className='console-page' aria-labelledby='page-title'>
      <Box className='page-head page-head-row'>
        <Box>
          <Title id='page-title'>공지</Title>
          <Text className='muted'>
            서비스 공지를 쓰고 게시해요. 초안과 보관한 공지는 회원에게 보이지
            않고, 예약한 공지는 게시 시각부터 보여요.
          </Text>
        </Box>
        <Link className='primary' href={newHref}>
          <Icon name='plus' size={18} />새 공지
        </Link>
      </Box>
      <Box className='toolbar'>
        <Box className='field field-inline'>
          <Label htmlFor='notice-status'>상태</Label>
          <Select
            id='notice-status'
            value={status}
            onChange={(event) => props.onStatus(event.target.value)}
          >
            <Option value=''>전체</Option>
            {statusOptions.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Box>
      </Box>
      <ListState
        loading={props.loading}
        error={props.error}
        empty={rows.length === 0}
        loadingLabel='공지를 불러오고 있어요…'
        errorTitle='공지를 불러오지 못했어요'
        onRetry={props.onRetry}
        emptyState={
          <EmptyState
            icon='bell'
            title={status ? '이 상태의 공지가 없어요' : '아직 공지가 없어요'}
            body='‘새 공지’로 초안을 만든 뒤 게시하거나 예약할 수 있어요.'
          />
        }
      >
        <ListFooter
          notice={props.notice}
          count={rows.length}
          hasMore={props.hasMore}
          loadingMore={props.loadingMore}
          moreError={props.moreError}
          moreLabel='공지 더 보기'
          onMore={props.onMore}
        >
          <Box
            className='table-scroll'
            role='region'
            aria-label='공지 목록 (가로로 스크롤할 수 있어요)'
            tabIndex={0}
          >
            <Table className='data-table'>
              <Caption className='sr-only'>공지 목록</Caption>
              <Thead>
                <Tr>
                  <Th scope='col'>제목</Th>
                  <Th scope='col' className='col-status'>
                    상태
                  </Th>
                  <Th scope='col' className='col-status'>
                    회원 노출
                  </Th>
                  <Th scope='col' className='col-time'>
                    게시 (KST)
                  </Th>
                  <Th scope='col' className='col-time'>
                    마지막 수정
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
                    <Td>
                      <Span className='status-chip' data-status={row.status}>
                        {row.statusLabel}
                      </Span>
                    </Td>
                    <Td>
                      <Span
                        className='visibility'
                        data-visibility={row.visibility}
                      >
                        {row.visibilityLabel}
                      </Span>
                    </Td>
                    <Td className='cell-time'>
                      {row.published ? (
                        <Time dateTime={row.publishedAt}>{row.published}</Time>
                      ) : (
                        <Span className='muted'>게시 전</Span>
                      )}
                    </Td>
                    <Td className='cell-time'>
                      <Time dateTime={row.updatedAt}>{row.updated}</Time>
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
