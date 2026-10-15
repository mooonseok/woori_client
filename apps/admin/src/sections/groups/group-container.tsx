'use client';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RecordFrame } from '@/components/molecules/record-frame';
import { ContentViewer } from '@/components/organisms/content-viewer/content-viewer';
import { useAdminRecord } from '@/hooks/use-admin-record';
import { useCursorList } from '@/hooks/use-cursor-list';
import { getGroup, listAlbumPhotos } from '@/services/groups';
import { ROUTES } from '@/constants/routes';
import {
  GROUP_STATUS_LABELS,
  MEMBER_ROLE_LABELS,
  MEMBER_STATUS_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  PHOTO_STATUS_LABELS,
  labelOf,
} from '@/content/content-labels';
import type { ContentViewTarget } from '@/dto/content-view.dto';
import type { AdminGroupAlbum, AdminGroupDetail } from '@/dto/group.dto';
import { detailHref, isUuid } from '@/utils/admin-navigation';
import { formatBytes, formatCount, usagePercent } from '@/utils/format';
import { kstMinuteLabel } from '@/utils/time';
import { AlbumPhotosView, GroupView } from './group-view';

const photoRowId = (id: string) => `photo-row-${id}`;
// A photo can be opened while its display variant still exists.
const VIEWABLE = new Set(['READY', 'DELETING']);
function AlbumPhotos({
  groupId,
  album,
  onView,
}: {
  groupId: string;
  album: AdminGroupAlbum;
  onView: (target: ContentViewTarget) => void;
}) {
  const fetchPage = useCallback(
    (cursor: string | null, signal: AbortSignal) =>
      listAlbumPhotos(groupId, album.id, cursor, signal),
    [groupId, album.id]
  );
  const list = useCursorList(
    fetchPage,
    photoRowId,
    '사진 목록을 불러오지 못했어요.'
  );
  return (
    <AlbumPhotosView
      title={album.title || '이름 없는 앨범'}
      rows={list.items.map((photo) => ({
        id: photo.id,
        domId: photoRowId(photo.id),
        uploader: photo.uploader?.displayName ?? '탈퇴한 회원',
        status: labelOf(PHOTO_STATUS_LABELS, photo.status),
        size:
          photo.width && photo.height
            ? `${photo.width} × ${photo.height}`
            : '—',
        bytes: formatBytes(photo.bytes),
        date: photo.effectiveDate ?? '',
        created: kstMinuteLabel(photo.createdAt),
        createdAt: photo.createdAt,
        viewable: VIEWABLE.has(photo.status),
      }))}
      loading={list.loading}
      loadingMore={list.loadingMore}
      error={list.error}
      moreError={list.moreError}
      notice={list.notice}
      hasMore={list.hasMore}
      onRetry={list.reload}
      onMore={list.more}
      onView={(id) =>
        onView({
          kind: 'photo',
          id,
          label: `‘${album.title || '이름 없는 앨범'}’ 앨범의 사진`,
        })
      }
    />
  );
}
function Group({ group }: { group: AdminGroupDetail }) {
  const [albumId, setAlbumId] = useState<string | null>(null),
    [viewing, setViewing] = useState<ContentViewTarget | null>(null);
  const album = group.albums?.find((item) => item.id === albumId) ?? null;
  const percent = usagePercent(group.usedBytes, group.quotaBytes);
  return (
    <>
      <GroupView
        listHref={ROUTES.GROUPS}
        name={group.name}
        status={group.status}
        statusLabel={labelOf(GROUP_STATUS_LABELS, group.status)}
        owner={group.owner?.displayName ?? '없음'}
        ownerHref={group.owner ? detailHref(ROUTES.MEMBER, group.owner.id) : ''}
        counts={`멤버 ${formatCount(group.memberCount)}명 · 앨범 ${formatCount(
          group.albumCount
        )}개 · 사진 ${formatCount(group.photoCount)}장`}
        usage={`${formatBytes(group.usedBytes)} / ${formatBytes(group.quotaBytes)}`}
        percent={percent ?? 0}
        percentLabel={percent === null ? '' : `${percent}%`}
        created={kstMinuteLabel(group.createdAt)}
        createdAt={group.createdAt}
        members={(group.members ?? []).map((member) => ({
          id: member.user.id,
          href: detailHref(ROUTES.MEMBER, member.user.id),
          name: member.user.displayName,
          userStatus:
            member.user.status !== 'ACTIVE'
              ? labelOf(MEMBER_STATUS_LABELS, member.user.status)
              : '',
          role: labelOf(MEMBER_ROLE_LABELS, member.role),
          status: labelOf(MEMBERSHIP_STATUS_LABELS, member.status),
          joined: kstMinuteLabel(member.joinedAt),
          joinedAt: member.joinedAt ?? '',
        }))}
        albums={(group.albums ?? []).map((item) => ({
          id: item.id,
          title: item.title || '이름 없는 앨범',
          photos: formatCount(item.photoCount),
          created: kstMinuteLabel(item.createdAt),
          createdAt: item.createdAt,
          deleted: !!item.deletedAt,
          selected: item.id === albumId,
        }))}
        listCapped={
          (group.members?.length ?? 0) >= 200 ||
          (group.albums?.length ?? 0) >= 200
        }
        onAlbum={(id) => setAlbumId((current) => (current === id ? null : id))}
      >
        {album && (
          <AlbumPhotos
            key={album.id}
            groupId={group.id}
            album={album}
            onView={setViewing}
          />
        )}
      </GroupView>
      {viewing && (
        <ContentViewer target={viewing} onClose={() => setViewing(null)} />
      )}
    </>
  );
}
export function GroupContainer() {
  const id = useSearchParams().get('id');
  const load = useCallback(
    (signal: AbortSignal) => getGroup(id as string, signal),
    [id]
  );
  const record = useAdminRecord(
    isUuid(id) ? load : null,
    '그룹 정보를 불러오지 못했어요.'
  );
  return (
    <RecordFrame
      title='그룹'
      ready={!!record.data}
      loading={record.loading}
      error={record.error}
      notFound={record.notFound}
      notFoundBody='주소가 잘못됐거나 없는 그룹이에요. 목록에서 다시 골라 주세요.'
      backHref={ROUTES.GROUPS}
      backLabel='그룹 목록'
      onRetry={record.reload}
    >
      {record.data && <Group key={record.data.id} group={record.data} />}
    </RecordFrame>
  );
}
