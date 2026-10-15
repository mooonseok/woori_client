'use client';
import { useGroupManagement } from '@/hooks/use-group-management';
import { useGroupLifecycle } from '@/hooks/use-group-lifecycle';
import { useGallery } from '@/hooks/use-gallery';
import { GroupsView } from './groups-view';
import { GroupMembersView } from './group-members-view';
import { EntryDialog } from '@/components/organisms/entry-dialog/entry-dialog';
import { ActionConfirm } from '@/components/organisms/action-confirm/action-confirm';
function GroupContent() {
  const model = useGroupManagement(),
    lifecycle = useGroupLifecycle();
  const { group, action, setAction, submit } = lifecycle;
  const title =
    action?.kind === 'leave'
      ? '그룹에서 나갈까요?'
      : action?.kind === 'delete'
        ? '그룹을 삭제할까요?'
        : action?.kind === 'remove'
          ? `${action.member.displayName} 님을 내보낼까요?`
          : action?.kind === 'transfer'
            ? `${action.member.displayName} 님에게 그룹장을 넘길까요?`
            : '';
  const description =
    action?.kind === 'delete'
      ? `${group?.name}의 모든 앨범·사진·댓글이 숨겨지고 사진 파일도 삭제됩니다. 되돌릴 수 없어요.`
      : action?.kind === 'transfer'
        ? '나는 일반 멤버가 되고 기존 초대 링크와 코드는 모두 취소돼요. 새 그룹장이 초대를 다시 만들 수 있어요.'
        : '공유한 사진과 댓글은 그룹에 남지만, 그룹의 앨범과 알림에 더 이상 접근할 수 없어요.';
  const confirmLabel =
    action?.kind === 'leave'
      ? '그룹 나가기'
      : action?.kind === 'transfer'
        ? '그룹장 넘기기'
        : action?.kind === 'remove'
          ? '내보내기'
          : '그룹 삭제';
  return (
    <>
      <GroupsView
        {...model}
        pending={model.pending || lifecycle.busy}
        management={
          <GroupMembersView
            {...lifecycle}
            busy={model.pending || lifecycle.busy}
          />
        }
      />
      {group && action?.kind === 'rename' && (
        <EntryDialog
          title='그룹 이름 수정'
          label='그룹 이름'
          initialValue={group.name}
          maxLength={40}
          submitLabel='저장'
          note=''
          onSubmit={submit}
          onClose={() => setAction(null)}
        />
      )}
      {group && action && action.kind !== 'rename' && (
        <ActionConfirm
          title={title}
          description={description}
          confirmLabel={confirmLabel}
          exactText={action.kind === 'delete' ? group.name : undefined}
          onConfirm={() => submit(action.kind === 'delete' ? group.name : '')}
          onClose={() => setAction(null)}
        />
      )}
    </>
  );
}
export function GroupsContainer() {
  const { groupId, data } = useGallery();
  const group = data.groups.find((g) => g.id === groupId);
  return <GroupContent key={`${groupId}:${group?.role || ''}`} />;
}
