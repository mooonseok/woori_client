import type { ReactNode } from 'react';
import {
  Box,
  Section,
  Heading,
  Text,
  Form,
  Label,
  Input,
  Button,
  Span,
} from '@/components/atoms/ui';
import { Link } from '@/components/molecules/link';
import type { Group } from '@/dto/album.dto';
import type { GroupAction } from '@/dto/group.dto';
import { GroupInvitationsView } from './group-invitations-view';
import type { Invitation } from '@/dto/invitation.dto';
export interface GroupsViewProps {
  /** The roster of the current group (구성원). */
  members?: ReactNode;
  gallery: {
    data: { groups: Group[] };
    groupId: string;
    setGroupId: (id: string) => void;
    loading: boolean;
    error: string;
    reload: () => Promise<void>;
  };
  verified: boolean;
  group?: Group;
  name: string;
  setName: (name: string) => void;
  pending: boolean;
  error: string;
  notice: string;
  invitations: Invitation[];
  listError: string;
  listLoading: boolean;
  listLoadedAt: number;
  load: () => Promise<void>;
  create: () => Promise<void>;
  revoke: (id: string) => Promise<void>;
  /** Opens the invite sheet (owner). */
  onInvite: () => void;
  setAction: (action: GroupAction) => void;
}
const roleLabel = (group: Group) =>
  group.role === 'OWNER' ? '그룹장' : '멤버';
export function GroupsView(p: GroupsViewProps) {
  const groups = p.gallery.data.groups;
  const owner = p.group?.role === 'OWNER';
  const empty = !p.gallery.loading && !p.gallery.error && !groups.length;
  return (
    <Box className='groups-page'>
      <Box className='section-heading'>
        <Heading className='page-title'>그룹 설정</Heading>
        <Link className='text-button' href='/invite'>
          초대 코드 입력
        </Link>
      </Box>
      {!p.verified && (
        <Box className='notice-panel'>
          <Text>이메일 확인 후 그룹을 만들고 초대할 수 있어요.</Text>
          <Link className='secondary-button' href='/verify-email'>
            이메일 확인
          </Link>
        </Box>
      )}
      {p.gallery.loading && <Text role='status'>그룹을 불러오고 있어요…</Text>}
      {p.gallery.error && (
        <Box>
          <Text role='alert'>{p.gallery.error}</Text>
          <Button onClick={() => void p.gallery.reload()}>다시 시도</Button>
        </Box>
      )}
      {groups.length > 1 && (
        <Section className='group-switch' aria-labelledby='group-switch-title'>
          <Heading id='group-switch-title' className='group-switch-title'>
            참여 그룹 {groups.length}개
          </Heading>
          <Box className='group-list'>
            {groups.map((group) => (
              <Button
                key={group.id}
                className='group-list-row'
                aria-pressed={group.id === p.gallery.groupId}
                onClick={() => p.gallery.setGroupId(group.id)}
                disabled={p.pending}
              >
                <Span>{group.name}</Span>
                <Span className='muted'>
                  {group.members}명 · {roleLabel(group)}
                </Span>
              </Button>
            ))}
          </Box>
        </Section>
      )}
      {p.group && (
        <Section
          className='settings-card group-summary'
          aria-labelledby='group-summary-title'
        >
          <Box className='section-heading'>
            <Box className='group-summary-text'>
              <Heading id='group-summary-title'>{p.group.name}</Heading>
              <Text className='muted'>
                {p.group.members}명 · {roleLabel(p.group)}
              </Text>
            </Box>
            {owner && (
              <Button
                className='text-button'
                disabled={p.pending}
                onClick={() => p.setAction({ kind: 'rename' })}
              >
                그룹 이름 수정
              </Button>
            )}
          </Box>
        </Section>
      )}
      {p.members}
      {p.group && <GroupInvitationsView {...p} />}
      {empty && (
        <>
          <Text className='muted'>
            아직 참여한 그룹이 없어요. 새 그룹을 만들거나 초대 코드를 입력해
            주세요.
          </Text>
          <Section className='settings-card'>
            <Heading>새 그룹 만들기</Heading>
            <Form
              className='stack-form'
              onSubmit={(event) => {
                event.preventDefault();
                void p.create();
              }}
            >
              <Label>
                그룹 이름
                <Input
                  required
                  maxLength={40}
                  value={p.name}
                  onChange={(event) => p.setName(event.target.value)}
                  placeholder='예: 주말 산책 모임'
                  disabled={p.pending || !p.verified}
                />
              </Label>
              <Button
                type='submit'
                className='primary-button'
                disabled={p.pending || !p.verified || !p.name.trim()}
              >
                그룹 만들기
              </Button>
            </Form>
          </Section>
        </>
      )}
      {p.error && (
        <Text role='alert' className='form-error'>
          {p.error}
        </Text>
      )}
      {p.notice && <Text role='status'>{p.notice}</Text>}
      {p.group && (
        <Section className='group-danger' aria-labelledby='group-danger-title'>
          <Heading id='group-danger-title'>
            {owner ? '그룹 나가기·삭제' : '그룹 나가기'}
          </Heading>
          <Text className='muted'>
            {owner
              ? '그룹장은 다른 구성원에게 그룹장을 넘긴 후 나갈 수 있어요.'
              : '나가면 이 그룹의 앨범과 알림을 더 이상 볼 수 없어요.'}
          </Text>
          <Button
            className='secondary-button danger-text'
            disabled={p.pending}
            onClick={() => p.setAction({ kind: owner ? 'delete' : 'leave' })}
          >
            {owner ? '그룹 삭제' : '그룹 나가기'}
          </Button>
        </Section>
      )}
    </Box>
  );
}
