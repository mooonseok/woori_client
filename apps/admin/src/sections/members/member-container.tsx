'use client';
import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RecordFrame } from '@/components/molecules/record-frame';
import { useAdminRecord } from '@/hooks/use-admin-record';
import { useReauth } from '@/hooks/use-reauth';
import {
  deleteMember,
  getMember,
  renameMember,
  suspendMember,
  unsuspendMember,
} from '@/services/members';
import { DISPLAY_NAME_MAX } from '@/constants/content-ops';
import { ROUTES } from '@/constants/routes';
import {
  GROUP_STATUS_LABELS,
  MEMBER_ROLE_LABELS,
  MEMBER_STATUS_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  labelOf,
} from '@/content/content-labels';
import { memberActionCopy, OWNED_GROUPS_MESSAGE } from '@/content/member-copy';
import type {
  AdminMemberDetail,
  MemberAction,
  OwnedGroup,
} from '@/dto/member.dto';
import { actionErrorMessage } from '@/utils/admin-errors';
import { detailHref, isUuid } from '@/utils/admin-navigation';
import { formatCount } from '@/utils/format';
import {
  confirmUsernameMatches,
  memberActions,
  ownedGroupsOf,
} from '@/utils/member-actions';
import { plainTextError, RULES } from '@/utils/plain-text';
import { kstMinuteLabel } from '@/utils/time';
import { MemberView } from './member-view';

const NAME_RULE = { label: '새 이름', max: DISPLAY_NAME_MAX, multiline: false };
function Member({
  member,
  onChanged,
}: {
  member: AdminMemberDetail;
  onChanged: (response: unknown) => void;
}) {
  const reauth = useReauth();
  const [action, setAction] = useState<MemberAction | null>(null),
    [name, setName] = useState(''),
    [nameError, setNameError] = useState(''),
    [reason, setReason] = useState(''),
    [reasonError, setReasonError] = useState(''),
    [confirmName, setConfirmName] = useState(''),
    [acknowledged, setAcknowledged] = useState(false),
    [ownedGroups, setOwnedGroups] = useState<OwnedGroup[] | null>(null),
    [message, setMessage] = useState('');
  const firstField = useRef<HTMLInputElement>(null),
    reasonField = useRef<HTMLInputElement>(null);
  function open(next: MemberAction) {
    setAction(next);
    setName(next === 'rename' ? member.displayName : '');
    setNameError('');
    setReason('');
    setReasonError('');
    setConfirmName('');
    setAcknowledged(false);
    setOwnedGroups(null);
    setMessage('');
  }
  async function confirm() {
    if (!action) return;
    const invalidName =
      action === 'rename' ? plainTextError(name, NAME_RULE) : '';
    // Member actions take a 5–500 character reason (audit log only).
    const invalidReason = plainTextError(reason, RULES.memberReason);
    setNameError(invalidName);
    setReasonError(invalidReason);
    if (invalidName) return firstField.current?.focus();
    if (invalidReason) return reasonField.current?.focus();
    if (
      action === 'delete' &&
      !confirmUsernameMatches(confirmName, member.username)
    )
      return;
    const text = reason.trim();
    try {
      const response = await reauth.run(() => {
        if (action === 'rename')
          return renameMember(member.id, name.trim(), text);
        if (action === 'suspend') return suspendMember(member.id, text);
        if (action === 'unsuspend') return unsuspendMember(member.id, text);
        return deleteMember(member.id, text, confirmName.trim());
      });
      onChanged(response);
      setMessage(memberActionCopy(action, member.displayName).done);
      setAction(null);
    } catch (cause) {
      const owned = ownedGroupsOf(cause);
      if (owned) {
        setOwnedGroups(owned);
        return;
      }
      throw new Error(actionErrorMessage(cause, '처리하지 못했어요.'));
    }
  }
  const copy = action ? memberActionCopy(action, member.displayName) : null;
  const deleted = member.status === 'DELETED';
  return (
    <MemberView
      listHref={ROUTES.MEMBERS}
      name={member.displayName || '이름 없음'}
      nickname={member.nickname || '미등록'}
      username={member.username ?? ''}
      status={member.status}
      statusLabel={labelOf(MEMBER_STATUS_LABELS, member.status)}
      email={member.emailMasked ?? ''}
      verified={!!member.emailVerified}
      created={kstMinuteLabel(member.createdAt)}
      createdAt={member.createdAt}
      counts={[
        { label: '공개 중인 사진', value: formatCount(member.counts?.photos) },
        { label: '남긴 댓글', value: formatCount(member.counts?.comments) },
        {
          label: '받은 신고 (처리 대기)',
          value: formatCount(member.counts?.openReportsAgainst),
          href: ROUTES.REPORTS,
        },
        {
          label: '보낸 신고 (처리 대기)',
          value: formatCount(member.counts?.openReportsFiled),
        },
        { label: '문의', value: formatCount(member.counts?.inquiries) },
      ]}
      memberships={(member.memberships ?? []).map((membership) => ({
        id: membership.group.id,
        href: detailHref(ROUTES.GROUP, membership.group.id),
        group: membership.group.name,
        groupStatus:
          membership.group.status !== 'ACTIVE'
            ? labelOf(GROUP_STATUS_LABELS, membership.group.status)
            : '',
        role: labelOf(MEMBER_ROLE_LABELS, membership.role),
        status: labelOf(MEMBERSHIP_STATUS_LABELS, membership.status),
        joined: kstMinuteLabel(membership.joinedAt),
        joinedAt: membership.joinedAt ?? '',
      }))}
      actions={memberActions(member.status)}
      deleted={deleted}
      message={message}
      dialog={copy}
      action={action}
      newName={name}
      nameError={nameError}
      nameMax={DISPLAY_NAME_MAX}
      reason={reason}
      reasonError={reasonError}
      confirmName={confirmName}
      confirmMatches={confirmUsernameMatches(confirmName, member.username)}
      acknowledged={acknowledged}
      ownedGroups={(ownedGroups ?? []).map((group) => ({
        id: group.id,
        name: group.name,
        href: detailHref(ROUTES.GROUP, group.id),
      }))}
      ownedGroupsBlocked={ownedGroups !== null}
      ownedGroupsMessage={OWNED_GROUPS_MESSAGE}
      firstFieldRef={firstField}
      reasonFieldRef={reasonField}
      onAction={open}
      onName={(value) => {
        setName(value);
        setNameError('');
      }}
      onReason={(value) => {
        setReason(value);
        setReasonError('');
      }}
      onConfirmName={setConfirmName}
      onAcknowledge={setAcknowledged}
      onConfirm={confirm}
      onClose={() => setAction(null)}
    />
  );
}
export function MemberContainer() {
  const id = useSearchParams().get('id');
  const load = useCallback(
    (signal: AbortSignal) => getMember(id as string, signal),
    [id]
  );
  const record = useAdminRecord(
    isUuid(id) ? load : null,
    '회원 정보를 불러오지 못했어요.'
  );
  return (
    <RecordFrame
      title='회원'
      ready={!!record.data}
      loading={record.loading}
      error={record.error}
      notFound={record.notFound}
      notFoundBody='주소가 잘못됐거나 없는 회원이에요. 목록에서 다시 골라 주세요.'
      backHref={ROUTES.MEMBERS}
      backLabel='회원 목록'
      onRetry={record.reload}
    >
      {record.data && (
        <Member
          key={record.data.id}
          member={record.data}
          onChanged={record.apply}
        />
      )}
    </RecordFrame>
  );
}
