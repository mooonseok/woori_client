import type { ReactNode } from 'react';
import {
  Box,
  Button,
  Caption,
  Dd,
  Dl,
  Dt,
  Heading,
  Section,
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
import { Icon } from '@/components/atoms/icon';
import { BackLink } from '@/components/molecules/back-link';
import { EmptyState } from '@/components/molecules/empty-state';
import { Link } from '@/components/molecules/link';
import { ListFooter, ListState } from '@/components/molecules/list-state';
import { Notice } from '@/components/molecules/notice';
import { UsageBar } from '@/components/molecules/usage-bar';
interface MemberRow {
  id: string;
  href: string;
  name: string;
  userStatus: string;
  role: string;
  status: string;
  joined: string;
  joinedAt: string;
}
interface AlbumRow {
  id: string;
  title: string;
  photos: string;
  created: string;
  createdAt: string;
  deleted: boolean;
  selected: boolean;
}
interface Props {
  listHref: string;
  name: string;
  status: string;
  statusLabel: string;
  owner: string;
  ownerHref: string;
  counts: string;
  usage: string;
  percent: number;
  percentLabel: string;
  created: string;
  createdAt: string;
  members: MemberRow[];
  albums: AlbumRow[];
  listCapped: boolean;
  onAlbum: (id: string) => void;
  children?: ReactNode;
}
export function GroupView(p: Props) {
  return (
    <Section className='console-page' aria-labelledby='page-title'>
      <BackLink href={p.listHref} label='그룹 목록' />
      <Box className='page-head'>
        <Title id='page-title' className='record-title'>
          {p.name}
        </Title>
        <Box className='meta-row'>
          <Span className='status-chip' data-status={p.status}>
            {p.statusLabel}
          </Span>
          <Span className='muted'>{p.counts}</Span>
        </Box>
      </Box>
      <Notice>
        읽기 전용이에요. 관리자 화면에서는 그룹을 바꾸거나 삭제할 수 없고,
        사진은 사유와 본인 확인을 거쳐 표시용 이미지로만 열람해요.
      </Notice>
      <Section className='card' aria-labelledby='group-info'>
        <Heading id='group-info'>그룹 정보</Heading>
        <Dl className='facts'>
          <Box>
            <Dt>그룹장</Dt>
            <Dd>
              {p.ownerHref ? (
                <Link className='text-link' href={p.ownerHref}>
                  {p.owner}
                </Link>
              ) : (
                p.owner
              )}
            </Dd>
          </Box>
          <Box>
            <Dt>만든 날</Dt>
            <Dd>
              <Time dateTime={p.createdAt}>{p.created}</Time>
            </Dd>
          </Box>
          <Box>
            <Dt>저장 공간</Dt>
            <Dd>
              <UsageBar
                label={p.usage}
                percent={p.percent}
                percentLabel={p.percentLabel}
              />
            </Dd>
          </Box>
        </Dl>
      </Section>
      {p.listCapped && (
        <Text className='field-help'>
          멤버와 앨범은 최대 200개까지만 보여요.
        </Text>
      )}
      <Section className='card' aria-labelledby='group-members'>
        <Heading id='group-members'>멤버</Heading>
        {p.members.length === 0 ? (
          <Text className='muted'>멤버가 없어요.</Text>
        ) : (
          <Box
            className='table-scroll'
            role='region'
            aria-label='멤버 (가로로 스크롤할 수 있어요)'
            tabIndex={0}
          >
            <Table className='data-table compact'>
              <Caption className='sr-only'>멤버</Caption>
              <Thead>
                <Tr>
                  <Th scope='col'>회원</Th>
                  <Th scope='col' className='col-status'>
                    역할
                  </Th>
                  <Th scope='col' className='col-status'>
                    참여 상태
                  </Th>
                  <Th scope='col' className='col-time'>
                    참여일 (KST)
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {p.members.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <Link className='row-link' href={row.href}>
                        {row.name}
                      </Link>
                      {row.userStatus && (
                        <Span className='cell-meta'>{row.userStatus}</Span>
                      )}
                    </Td>
                    <Td>{row.role}</Td>
                    <Td>{row.status}</Td>
                    <Td className='cell-time'>
                      {row.joined ? (
                        <Time dateTime={row.joinedAt}>{row.joined}</Time>
                      ) : (
                        '—'
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Section>
      <Section className='card' aria-labelledby='group-albums'>
        <Heading id='group-albums'>앨범</Heading>
        {p.albums.length === 0 ? (
          <Text className='muted'>앨범이 없어요.</Text>
        ) : (
          <Box
            className='table-scroll'
            role='region'
            aria-label='앨범 (가로로 스크롤할 수 있어요)'
            tabIndex={0}
          >
            <Table className='data-table compact'>
              <Caption className='sr-only'>앨범</Caption>
              <Thead>
                <Tr>
                  <Th scope='col'>앨범</Th>
                  <Th scope='col' className='col-status'>
                    사진
                  </Th>
                  <Th scope='col' className='col-time'>
                    만든 날 (KST)
                  </Th>
                  <Th scope='col' className='col-status'>
                    사진 목록
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {p.albums.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <Span className='cell-title'>{row.title}</Span>
                      {row.deleted && (
                        <Span className='cell-meta'>삭제된 앨범</Span>
                      )}
                    </Td>
                    <Td>{row.photos}장</Td>
                    <Td className='cell-time'>
                      <Time dateTime={row.createdAt}>{row.created}</Time>
                    </Td>
                    <Td>
                      <Button
                        className='secondary-button small'
                        aria-expanded={row.selected}
                        aria-controls='album-photos'
                        onClick={() => p.onAlbum(row.id)}
                      >
                        {row.selected ? '닫기' : '보기'}
                        <Span className='sr-only'> {row.title} 사진 목록</Span>
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Section>
      <Box id='album-photos'>{p.children}</Box>
    </Section>
  );
}
interface PhotoRow {
  id: string;
  domId: string;
  uploader: string;
  status: string;
  size: string;
  bytes: string;
  date: string;
  created: string;
  createdAt: string;
  viewable: boolean;
}
export function AlbumPhotosView({
  title,
  rows,
  loading,
  loadingMore,
  error,
  moreError,
  notice,
  hasMore,
  onRetry,
  onMore,
  onView,
}: {
  title: string;
  rows: PhotoRow[];
  loading: boolean;
  loadingMore: boolean;
  error: string;
  moreError: string;
  notice: string;
  hasMore: boolean;
  onRetry: () => void;
  onMore: () => void;
  onView: (id: string) => void;
}) {
  return (
    <Section className='card' aria-labelledby='album-photos-title'>
      <Heading id='album-photos-title'>‘{title}’ 사진 정보</Heading>
      <Notice>
        앨범 사진 목록을 열면 감사로그에 열람 기록이 남아요. 사진 보기는 사유와
        함께 따로 기록돼요.
      </Notice>
      <Text className='field-help'>
        촬영 위치·EXIF 같은 상세 정보와 원본 파일은 제공하지 않아요.
      </Text>
      <ListState
        loading={loading}
        error={error}
        empty={rows.length === 0}
        loadingLabel='사진 정보를 불러오고 있어요…'
        errorTitle='사진 정보를 불러오지 못했어요'
        onRetry={onRetry}
        emptyState={
          <EmptyState
            icon='album'
            title='사진이 없어요'
            body='이 앨범에 올라온 사진이 없어요.'
          />
        }
      >
        <ListFooter
          notice={notice}
          count={rows.length}
          hasMore={hasMore}
          loadingMore={loadingMore}
          moreError={moreError}
          moreLabel='사진 정보 더 보기'
          onMore={onMore}
        >
          <Box
            className='table-scroll'
            role='region'
            aria-label={`‘${title}’ 사진 정보 (가로로 스크롤할 수 있어요)`}
            tabIndex={0}
          >
            <Table className='data-table compact'>
              <Caption className='sr-only'>‘{title}’ 사진 정보</Caption>
              <Thead>
                <Tr>
                  <Th scope='col'>올린 회원</Th>
                  <Th scope='col' className='col-status'>
                    상태
                  </Th>
                  <Th scope='col'>크기 · 용량</Th>
                  <Th scope='col' className='col-time'>
                    날짜 · 올린 시각
                  </Th>
                  <Th scope='col' className='col-status'>
                    열람
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row) => (
                  <Tr key={row.id} id={row.domId} tabIndex={-1}>
                    <Td>{row.uploader}</Td>
                    <Td>{row.status}</Td>
                    <Td>
                      {row.size}
                      <Span className='cell-meta'>{row.bytes}</Span>
                    </Td>
                    <Td className='cell-time'>
                      {row.date || '—'}
                      <Span className='cell-meta'>
                        <Time dateTime={row.createdAt}>{row.created}</Time>
                      </Span>
                    </Td>
                    <Td>
                      {row.viewable ? (
                        <Button
                          className='secondary-button small'
                          onClick={() => onView(row.id)}
                        >
                          <Icon name='eye' size={16} />
                          사진 보기
                        </Button>
                      ) : (
                        <Span className='muted'>볼 수 없음</Span>
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
