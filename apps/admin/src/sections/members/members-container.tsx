'use client';
import { useCallback, useState, type FormEvent } from 'react';
import { useCursorList } from '@/hooks/use-cursor-list';
import { listMembers } from '@/services/members';
import { MEMBER_STATUSES, SEARCH_MAX } from '@/constants/content-ops';
import { ROUTES } from '@/constants/routes';
import { MEMBER_STATUS_LABELS } from '@/content/content-labels';
import type { AdminMemberStatus } from '@/dto/member.dto';
import { detailHref } from '@/utils/admin-navigation';
import { formatCount } from '@/utils/format';
import { normalizeSearch } from '@/utils/member-actions';
import { kstMinuteLabel } from '@/utils/time';
import { MembersView } from './members-view';
const rowId = (id: string) => `member-row-${id}`;
export function MembersContainer() {
  const [draft, setDraft] = useState(''),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState<AdminMemberStatus | ''>('');
  const fetchPage = useCallback(
    (cursor: string | null, signal: AbortSignal) =>
      listMembers({ query, status: status || null, cursor }, signal),
    [query, status]
  );
  const list = useCursorList(fetchPage, rowId, '회원을 불러오지 못했어요.');
  return (
    <MembersView
      draft={draft}
      query={query}
      searchMax={SEARCH_MAX}
      status={status}
      statusOptions={MEMBER_STATUSES.map((value) => ({
        value,
        label: MEMBER_STATUS_LABELS[value],
      }))}
      rows={list.items.map((member) => ({
        id: member.id,
        domId: rowId(member.id),
        href: detailHref(ROUTES.MEMBER, member.id),
        name: member.displayName || '이름 없음',
        username: member.username ?? '',
        email: member.emailMasked ?? '',
        status: member.status,
        statusLabel: MEMBER_STATUS_LABELS[member.status] ?? member.status,
        verified: !!member.emailVerified,
        groups: formatCount(member.activeGroupCount),
        created: kstMinuteLabel(member.createdAt),
        createdAt: member.createdAt,
      }))}
      loading={list.loading}
      loadingMore={list.loadingMore}
      error={list.error}
      moreError={list.moreError}
      notice={list.notice}
      hasMore={list.hasMore}
      onDraft={setDraft}
      onSearch={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setQuery(normalizeSearch(draft));
      }}
      onClear={() => {
        setDraft('');
        setQuery('');
      }}
      onStatus={(value) =>
        setStatus(
          (MEMBER_STATUSES as readonly string[]).includes(value)
            ? (value as AdminMemberStatus)
            : ''
        )
      }
      onRetry={list.reload}
      onMore={list.more}
    />
  );
}
