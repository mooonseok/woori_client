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
import { GroupInvitationsView } from './group-invitations-view';
import type { Invitation } from '@/dto/invitation.dto';
export interface GroupsViewProps {
  management?: ReactNode;
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
  created: Invitation | null;
  qr: string;
  listError: string;
  listLoading: boolean;
  load: () => Promise<void>;
  create: () => Promise<void>;
  invite: () => Promise<void>;
  revoke: (id: string) => Promise<void>;
  copy: (value: string) => Promise<void>;
}
export function GroupsView(p: GroupsViewProps) {
  return (
    <Box className='groups-page'>
      <Box className='section-heading'>
        <Heading className='page-title'>함께하는 그룹</Heading>
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
      <Section className='group-list' aria-label='참여 그룹'>
        {p.gallery.data.groups.map((group) => (
          <Button
            key={group.id}
            className='group-list-row'
            aria-pressed={group.id === p.gallery.groupId}
            onClick={() => p.gallery.setGroupId(group.id)}
            disabled={p.pending}
          >
            <Span>{group.name}</Span>
            <Span className='muted'>
              {group.members}명 · {group.role === 'OWNER' ? '그룹장' : '멤버'}
            </Span>
          </Button>
        ))}
      </Section>
      {p.management}
      {!p.gallery.loading &&
        !p.gallery.error &&
        !p.gallery.data.groups.length && (
          <Text className='muted'>
            아직 참여한 그룹이 없어요. 새 그룹을 만들거나 초대 코드를 입력해
            주세요.
          </Text>
        )}
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
              placeholder='예: 우리 가족'
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
      <GroupInvitationsView {...p} />
      {p.error && (
        <Text role='alert' className='form-error'>
          {p.error}
        </Text>
      )}
      {p.notice && <Text role='status'>{p.notice}</Text>}
    </Box>
  );
}
