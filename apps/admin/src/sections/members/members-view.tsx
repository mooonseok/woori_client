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
export interface MemberRowViewModel {
  id: string;
  domId: string;
  href: string;
  name: string;
  username: string;
  email: string;
  status: string;
  statusLabel: string;
  verified: boolean;
  groups: string;
  created: string;
  createdAt: string;
}
interface Props {
  draft: string;
  query: string;
  searchMax: number;
  status: string;
  statusOptions: { value: string; label: string }[];
  rows: MemberRowViewModel[];
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
export function MembersView(props: Props) {
  const { rows } = props;
  const filtered = !!(props.query || props.status);
  return (
    <Section className='console-page' aria-labelledby='page-title'>
      <Box className='page-head'>
        <Title id='page-title'>회원</Title>
        <Text className='muted'>
          회원을 찾아 상태를 확인하고 관리해요. 이메일은 일부만 보여요. 기본
          목록에는 탈퇴한 회원이 포함되지 않아요.
        </Text>
      </Box>
      <Box className='toolbar'>
        <SearchBar
          id='member-search'
          label='아이디 또는 이름'
          placeholder='아이디 앞부분이나 이름 일부'
          value={props.draft}
          active={props.query}
          max={props.searchMax}
          onChange={props.onDraft}
          onSubmit={props.onSearch}
          onClear={props.onClear}
        />
        <Box className='field field-inline'>
          <Label htmlFor='member-status'>상태</Label>
          <Select
            id='member-status'
            value={props.status}
            onChange={(event) => props.onStatus(event.target.value)}
          >
            <Option value=''>전체 (탈퇴 제외)</Option>
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
        loadingLabel='회원을 불러오고 있어요…'
        errorTitle='회원을 불러오지 못했어요'
        onRetry={props.onRetry}
        emptyState={
          <EmptyState
            icon='user'
            title={
              filtered ? '조건에 맞는 회원이 없어요' : '아직 회원이 없어요'
            }
            body={
              filtered
                ? '아이디는 앞부분, 이름은 일부로 찾아요. 상태 필터도 확인해 주세요.'
                : '회원이 가입하면 여기에 표시돼요.'
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
          moreLabel='회원 더 보기'
          onMore={props.onMore}
        >
          <Box
            className='table-scroll'
            role='region'
            aria-label='회원 목록 (가로로 스크롤할 수 있어요)'
            tabIndex={0}
          >
            <Table className='data-table'>
              <Caption className='sr-only'>회원 목록</Caption>
              <Thead>
                <Tr>
                  <Th scope='col'>회원</Th>
                  <Th scope='col'>이메일</Th>
                  <Th scope='col' className='col-status'>
                    상태
                  </Th>
                  <Th scope='col' className='col-status'>
                    참여 그룹
                  </Th>
                  <Th scope='col' className='col-time'>
                    가입 (KST)
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
                      {row.username && (
                        <Span className='cell-meta'>@{row.username}</Span>
                      )}
                    </Td>
                    <Td>
                      {row.email ? (
                        <>
                          <Span>{row.email}</Span>
                          <Span className='cell-meta'>
                            {row.verified ? '인증됨' : '인증 전'}
                          </Span>
                        </>
                      ) : (
                        <Span className='muted'>없음</Span>
                      )}
                    </Td>
                    <Td>
                      <Span className='status-chip' data-status={row.status}>
                        {row.statusLabel}
                      </Span>
                    </Td>
                    <Td>{row.groups}개</Td>
                    <Td className='cell-time'>
                      <Time dateTime={row.createdAt}>{row.created}</Time>
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
