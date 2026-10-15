'use client';
import { useCallback, useState, type FormEvent } from 'react';
import { useCursorList } from '@/hooks/use-cursor-list';
import { listGroups } from '@/services/groups';
import { GROUP_STATUSES, SEARCH_MAX } from '@/constants/content-ops';
import { ROUTES } from '@/constants/routes';
import { GROUP_STATUS_LABELS, labelOf } from '@/content/content-labels';
import type { AdminGroupStatus } from '@/dto/group.dto';
import { detailHref } from '@/utils/admin-navigation';
import { formatBytes, formatCount, usagePercent } from '@/utils/format';
import { normalizeSearch } from '@/utils/member-actions';
import { kstMinuteLabel } from '@/utils/time';
import { GroupsView } from './groups-view';
const rowId = (id: string) => `group-row-${id}`;
export function GroupsContainer() {
  const [draft, setDraft] = useState(''),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState<AdminGroupStatus | ''>('');
  const fetchPage = useCallback(
    (cursor: string | null, signal: AbortSignal) =>
      listGroups({ query, status: status || null, cursor }, signal),
    [query, status]
  );
  const list = useCursorList(fetchPage, rowId, '그룹을 불러오지 못했어요.');
  return (
    <GroupsView
      draft={draft}
      query={query}
      searchMax={SEARCH_MAX}
      status={status}
      statusOptions={GROUP_STATUSES.map((value) => ({
        value,
        label: GROUP_STATUS_LABELS[value],
      }))}
      rows={list.items.map((group) => {
        const percent = usagePercent(group.usedBytes, group.quotaBytes);
        return {
          id: group.id,
          domId: rowId(group.id),
          href: detailHref(ROUTES.GROUP, group.id),
          name: group.name,
          owner: group.owner?.displayName ?? '없음',
          ownerHref: group.owner
            ? detailHref(ROUTES.MEMBER, group.owner.id)
            : '',
          members: formatCount(group.memberCount),
          albums: formatCount(group.albumCount),
          photos: formatCount(group.photoCount),
          usage: `${formatBytes(group.usedBytes)} / ${formatBytes(group.quotaBytes)}`,
          percent: percent ?? 0,
          percentLabel: percent === null ? '' : `${percent}%`,
          status: group.status,
          statusLabel: labelOf(GROUP_STATUS_LABELS, group.status),
          created: kstMinuteLabel(group.createdAt),
          createdAt: group.createdAt,
        };
      })}
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
          (GROUP_STATUSES as readonly string[]).includes(value)
            ? (value as AdminGroupStatus)
            : ''
        )
      }
      onRetry={list.reload}
      onMore={list.more}
    />
  );
}
