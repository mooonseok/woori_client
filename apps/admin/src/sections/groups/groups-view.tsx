import type { FormEvent } from 'react';
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
import { SearchBar } from '@/components/molecules/search-bar';
import { UsageBar } from '@/components/molecules/usage-bar';
export interface GroupRowViewModel {
  id: string;
  domId: string;
  href: string;
  name: string;
  owner: string;
  ownerHref: string;
  members: string;
  albums: string;
  photos: string;
  usage: string;
  percent: number;
  percentLabel: string;
  status: string;
  statusLabel: string;
  created: string;
  createdAt: string;
}
interface Props {
  draft: string;
  query: string;
  searchMax: number;
  status: string;
  statusOptions: { value: string; label: string }[];
  rows: GroupRowViewModel[];
  loading: boolean;
  loadingMore: boolean;
  error: string;
  moreError: string;
  notice: string;
  hasMore: boolean;
  onDraft: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
  onStatus: (value: string) => void;
  onRetry: () => void;
  onMore: () => void;
}
export function GroupsView(props: Props) {
  const { rows } = props;
  const filtered = !!(props.query || props.status);
  return (
    <Section className='console-page' aria-labelledby='page-title'>
      <Box className='page-head'>
        <Title id='page-title'>그룹</Title>
        <Text className='muted'>
          그룹 현황을 조회해요. 관리자 화면에서는 그룹을 바꾸거나 삭제할 수
          없어요.
        </Text>
      </Box>
      <Box className='toolbar'>
        <SearchBar
          id='group-search'
          label='그룹 이름'
          placeholder='그룹 이름 일부'
          value={props.draft}
          active={props.query}
          max={props.searchMax}
          onChange={props.onDraft}
          onSubmit={props.onSearch}
          onClear={props.onClear}
        />
        <Box className='field field-inline'>
          <Label htmlFor='group-status'>상태</Label>
          <Select
            id='group-status'
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
      </Box>
      <ListState
        loading={props.loading}
        error={props.error}
        empty={rows.length === 0}
        loadingLabel='그룹을 불러오고 있어요…'
        errorTitle='그룹을 불러오지 못했어요'
        onRetry={props.onRetry}
        emptyState={
          <EmptyState
            icon='users'
            title={
              filtered ? '조건에 맞는 그룹이 없어요' : '아직 그룹이 없어요'
            }
            body={
              filtered
                ? '이름 일부로 찾아요. 상태 필터도 확인해 주세요.'
                : '회원이 그룹을 만들면 여기에 표시돼요.'
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
          moreLabel='그룹 더 보기'
          onMore={props.onMore}
        >
          <Box
            className='table-scroll table-scroll--groups'
            role='region'
            aria-label='그룹 목록 (가로로 스크롤할 수 있어요)'
            tabIndex={0}
          >
            <Table className='data-table'>
              <Caption className='sr-only'>그룹 목록</Caption>
              <Thead>
                <Tr>
                  <Th scope='col'>그룹</Th>
                  <Th scope='col' className='col-admin'>
                    그룹장
                  </Th>
                  <Th scope='col'>멤버 · 앨범 · 사진</Th>
                  <Th scope='col' className='col-target'>
                    저장 공간
                  </Th>
                  <Th scope='col' className='col-status'>
                    상태
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <Link id={row.domId} className='row-link' href={row.href}>
                        {row.name}
                      </Link>
                      <Span className='cell-meta'>
                        만든 날{' '}
                        <Time dateTime={row.createdAt}>{row.created}</Time>
                      </Span>
                    </Td>
                    <Td>
                      {row.ownerHref ? (
                        <Link className='text-link' href={row.ownerHref}>
                          {row.owner}
                        </Link>
                      ) : (
                        <Span className='muted'>{row.owner}</Span>
                      )}
                    </Td>
                    <Td>
                      {row.members}명 · {row.albums}개 · {row.photos}장
                    </Td>
                    <Td>
                      <UsageBar
                        label={row.usage}
                        percent={row.percent}
                        percentLabel={row.percentLabel}
                      />
                    </Td>
                    <Td>
                      <Span className='status-chip' data-status={row.status}>
                        {row.statusLabel}
                      </Span>
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
