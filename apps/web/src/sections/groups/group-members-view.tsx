import { memberNickname } from '@/utils/nickname';
import {
  Box,
  Section,
  Heading,
  Text,
  Button,
  Span,
} from '@/components/atoms/ui';
import { Avatar } from '@/components/atoms/avatar';
import type { Group } from '@/dto/album.dto';
import type { GroupAction, GroupMember } from '@/dto/group.dto';
import { ROSTER_TITLE_ID, rosterBlockButtonId } from '@/utils/group-members';
import { GroupMemberMenu, type MemberMenuItem } from './group-member-menu';
interface Props {
  group?: Group;
  currentUserId?: string;
  members: GroupMember[];
  nextCursor: string | null;
  loading: boolean;
  error: string;
  busy: boolean;
  setAction: (action: GroupAction) => void;
  loadMembers: (after?: string | null, keepVisible?: boolean) => Promise<void>;
  onReport?: (member: GroupMember) => void;
  onBlock?: (member: GroupMember, blocked: boolean) => void;
}
export function GroupMembersView(p: Props) {
  if (!p.group) return null;
  const owner = p.group.role === 'OWNER';
  // 내보내기 (destructive) stays last; 신고 · 차단 are there for everyone.
  const menuItems = (member: GroupMember): MemberMenuItem[] => {
    const manage = owner && member.role === 'MEMBER';
    const items: MemberMenuItem[] = [];
    if (manage)
      items.push({
        label: '그룹장 넘기기',
        onSelect: () => p.setAction({ kind: 'transfer', member }),
      });
    if (p.onReport && p.currentUserId)
      items.push({ label: '신고', onSelect: () => p.onReport?.(member) });
    if (p.onBlock && p.currentUserId)
      items.push({
        label: member.blockedByMe ? '차단 해제' : '차단',
        onSelect: () => p.onBlock?.(member, !member.blockedByMe),
      });
    if (manage)
      items.push({
        label: '내보내기',
        danger: true,
        onSelect: () => p.setAction({ kind: 'remove', member }),
      });
    return items;
  };
  return (
    <Section className='settings-card' aria-labelledby={ROSTER_TITLE_ID}>
      <Heading id={ROSTER_TITLE_ID} tabIndex={-1}>
        구성원
      </Heading>
      {p.loading && <Text role='status'>구성원을 불러오고 있어요…</Text>}
      {p.error && (
        <Box>
          <Text role='alert'>{p.error}</Text>
          <Button
            className='text-button'
            disabled={p.loading}
            onClick={() => void p.loadMembers()}
          >
            구성원 다시 불러오기
          </Button>
        </Box>
      )}
      {!p.loading && !p.error && !p.members.length && (
        <Text className='muted'>표시할 구성원이 없어요.</Text>
      )}
      <Box className='group-members'>
        {p.members.map((member) => {
          const items =
            member.userId === p.currentUserId ? [] : menuItems(member);
          return (
            <Box className='group-member-row' key={member.userId}>
              <Avatar name={memberNickname(member)} />
              <Box className='group-member-text'>
                <Text className='group-member-name'>
                  {memberNickname(member)}
                  {member.userId === p.currentUserId && (
                    <Span className='muted'> · 나</Span>
                  )}
                </Text>
                <Text className='muted group-member-role'>
                  {member.role === 'OWNER' ? '그룹장' : '멤버'}
                  {member.blockedByMe && ' · 차단함'}
                </Text>
              </Box>
              {items.length > 0 && (
                <GroupMemberMenu
                  id={rosterBlockButtonId(member.userId)}
                  label={`${memberNickname(member)} 님 메뉴`}
                  disabled={p.busy}
                  items={items}
                />
              )}
            </Box>
          );
        })}
      </Box>
      {p.nextCursor && (
        <Button
          className='secondary-button'
          disabled={p.loading || p.busy}
          onClick={() => void p.loadMembers(p.nextCursor)}
        >
          구성원 더 보기
        </Button>
      )}
    </Section>
  );
}
