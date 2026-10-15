import {
  Box,
  Section,
  Heading,
  Text,
  Button,
  Span,
} from '@/components/atoms/ui';
import type { Group } from '@/dto/album.dto';
import type { GroupAction, GroupMember } from '@/dto/group.dto';
interface Props {
  group?: Group;
  currentUserId?: string;
  members: GroupMember[];
  nextCursor: string | null;
  loading: boolean;
  error: string;
  busy: boolean;
  setAction: (action: GroupAction) => void;
  loadMembers: (after?: string | null) => Promise<void>;
}
export function GroupMembersView(p: Props) {
  if (!p.group) return null;
  const owner = p.group.role === 'OWNER';
  return (
    <Section className='settings-card' aria-label='그룹 관리'>
      <Box className='section-heading'>
        <Heading>{p.group.name} 구성원</Heading>
        {owner && (
          <Button
            className='text-button'
            disabled={p.busy}
            onClick={() => p.setAction({ kind: 'rename' })}
          >
            그룹 이름 수정
          </Button>
        )}
      </Box>
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
        {p.members.map((member) => (
          <Box className='group-member-row' key={member.userId}>
            <Box>
              <Text>
                {member.displayName}
                {member.userId === p.currentUserId && (
                  <Span className='muted'> · 나</Span>
                )}
              </Text>
              <Text className='muted'>
                {member.role === 'OWNER' ? '그룹장' : '멤버'}
              </Text>
            </Box>
            {owner &&
              member.role === 'MEMBER' &&
              member.userId !== p.currentUserId && (
                <Box className='inline-actions'>
                  <Button
                    className='text-button'
                    disabled={p.busy}
                    aria-label={`${member.displayName} 님에게 그룹장 넘기기`}
                    onClick={() => p.setAction({ kind: 'transfer', member })}
                  >
                    그룹장 넘기기
                  </Button>
                  <Button
                    className='text-button danger-text'
                    disabled={p.busy}
                    aria-label={`${member.displayName} 님 내보내기`}
                    onClick={() => p.setAction({ kind: 'remove', member })}
                  >
                    내보내기
                  </Button>
                </Box>
              )}
          </Box>
        ))}
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
      {owner ? (
        <>
          <Text className='muted'>
            그룹장은 다른 구성원에게 그룹장을 넘긴 후 나갈 수 있어요.
          </Text>
          <Button
            className='text-button danger-text'
            disabled={p.busy}
            onClick={() => p.setAction({ kind: 'delete' })}
          >
            그룹 삭제
          </Button>
        </>
      ) : (
        <Button
          className='text-button danger-text'
          disabled={p.busy}
          onClick={() => p.setAction({ kind: 'leave' })}
        >
          그룹 나가기
        </Button>
      )}
    </Section>
  );
}
