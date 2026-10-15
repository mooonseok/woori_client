import type { Ref } from 'react';
import {
  Box,
  Button,
  Caption,
  Dd,
  Dl,
  Dt,
  Heading,
  Input,
  Label,
  Li,
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
  Ul,
} from '@/components/atoms/ui';
import { BackLink } from '@/components/molecules/back-link';
import { Link } from '@/components/molecules/link';
import { Notice } from '@/components/molecules/notice';
import { ConfirmDialog } from '@/components/organisms/confirm-dialog/confirm-dialog';
import type { MemberAction } from '@/dto/member.dto';
interface Count {
  label: string;
  value: string;
  href?: string;
}
interface MembershipRow {
  id: string;
  href: string;
  group: string;
  groupStatus: string;
  role: string;
  status: string;
  joined: string;
  joinedAt: string;
}
interface DialogCopy {
  title: string;
  consequences: readonly string[];
  confirmLabel: string;
  danger: boolean;
  acknowledge?: string;
}
interface Props {
  listHref: string;
  name: string;
  username: string;
  status: string;
  statusLabel: string;
  email: string;
  verified: boolean;
  created: string;
  createdAt: string;
  counts: Count[];
  memberships: MembershipRow[];
  actions: MemberAction[];
  deleted: boolean;
  message: string;
  dialog: DialogCopy | null;
  action: MemberAction | null;
  newName: string;
  nameError: string;
  nameMax: number;
  reason: string;
  reasonError: string;
  confirmName: string;
  confirmMatches: boolean;
  acknowledged: boolean;
  ownedGroups: { id: string; name: string; href: string }[];
  ownedGroupsBlocked: boolean;
  ownedGroupsMessage: string;
  firstFieldRef: Ref<HTMLInputElement>;
  reasonFieldRef: Ref<HTMLInputElement>;
  onAction: (action: MemberAction) => void;
  onName: (value: string) => void;
  onReason: (value: string) => void;
  onConfirmName: (value: string) => void;
  onAcknowledge: (value: boolean) => void;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}
const ACTION_BUTTONS: Record<MemberAction, { label: string; tone: string }> = {
  rename: { label: '이름 바꾸기', tone: 'secondary-button' },
  suspend: { label: '이용 정지', tone: 'primary danger' },
  unsuspend: { label: '정지 해제', tone: 'primary' },
  delete: { label: '회원 삭제', tone: 'secondary-button danger-text' },
};
// Refs are kept apart from the other props so render never reads them.
export function MemberView({ firstFieldRef, reasonFieldRef, ...p }: Props) {
  const deleting = p.action === 'delete';
  return (
    <Section className='console-page' aria-labelledby='page-title'>
      <BackLink href={p.listHref} label='회원 목록' />
      <Box className='page-head'>
        <Title id='page-title' className='record-title'>
          {p.name}
        </Title>
        <Box className='meta-row'>
          <Span className='status-chip' data-status={p.status}>
            {p.statusLabel}
          </Span>
          {p.username && <Span className='muted'>@{p.username}</Span>}
        </Box>
      </Box>
      {p.message && <Notice>{p.message}</Notice>}
      <Box className='card-grid'>
        <Section className='card' aria-labelledby='member-info'>
          <Heading id='member-info'>계정</Heading>
          <Dl className='facts'>
            <Box>
              <Dt>이메일</Dt>
              <Dd>
                {p.email ? (
                  <>
                    {p.email}{' '}
                    <Span className='muted'>
                      ({p.verified ? '인증됨' : '인증 전'})
                    </Span>
                  </>
                ) : (
                  '없음'
                )}
              </Dd>
            </Box>
            <Box>
              <Dt>가입</Dt>
              <Dd>
                <Time dateTime={p.createdAt}>{p.created}</Time>
              </Dd>
            </Box>
          </Dl>
          <Text className='field-help'>
            전체 이메일 주소, 비밀번호, 로그인 기기 정보는 관리자 화면에 보이지
            않아요.
          </Text>
        </Section>
        <Section className='card' aria-labelledby='member-counts'>
          <Heading id='member-counts'>활동</Heading>
          <Dl className='facts wide'>
            {p.counts.map((count) => (
              <Box key={count.label}>
                <Dt>{count.label}</Dt>
                <Dd>
                  {count.href ? (
                    <Link className='text-link' href={count.href}>
                      {count.value}건
                    </Link>
                  ) : (
                    `${count.value}건`
                  )}
                </Dd>
              </Box>
            ))}
          </Dl>
        </Section>
      </Box>
      <Section className='card' aria-labelledby='member-groups'>
        <Heading id='member-groups'>참여 그룹</Heading>
        {p.memberships.length === 0 ? (
          <Text className='muted'>참여한 그룹이 없어요.</Text>
        ) : (
          <Box
            className='table-scroll'
            role='region'
            aria-label='참여 그룹 (가로로 스크롤할 수 있어요)'
            tabIndex={0}
          >
            <Table className='data-table compact'>
              <Caption className='sr-only'>참여 그룹</Caption>
              <Thead>
                <Tr>
                  <Th scope='col'>그룹</Th>
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
                {p.memberships.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <Link className='row-link' href={row.href}>
                        {row.group}
                      </Link>
                      {row.groupStatus && (
                        <Span className='cell-meta'>{row.groupStatus}</Span>
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
      <Section className='card stack-form' aria-labelledby='member-actions'>
        <Heading id='member-actions'>관리</Heading>
        {p.deleted ? (
          <Notice>
            탈퇴했거나 삭제된 회원이에요. 계정 정보가 지워져 바꿀 수 없어요.
          </Notice>
        ) : (
          <>
            <Text className='muted'>
              이용 정지·해제·삭제는 비밀번호와 인증 코드로 본인 확인을 한 뒤
              진행돼요. 모든 조치는 사유와 함께 감사로그에 남아요.
            </Text>
            <Box className='inline-actions'>
              {p.actions.map((action) => (
                <Button
                  key={action}
                  className={ACTION_BUTTONS[action].tone}
                  onClick={() => p.onAction(action)}
                >
                  {ACTION_BUTTONS[action].label}
                </Button>
              ))}
            </Box>
          </>
        )}
      </Section>
      {p.dialog && (
        <ConfirmDialog
          title={p.dialog.title}
          consequences={p.dialog.consequences}
          confirmLabel={p.dialog.confirmLabel}
          danger={p.dialog.danger}
          acknowledge={p.dialog.acknowledge}
          acknowledged={p.acknowledged}
          onAcknowledge={p.onAcknowledge}
          canConfirm={!deleting || (p.confirmMatches && !p.ownedGroupsBlocked)}
          onConfirm={p.onConfirm}
          onClose={p.onClose}
        >
          {p.action === 'rename' && (
            <Box className='field'>
              <Label htmlFor='member-name'>새 이름</Label>
              <Input
                ref={firstFieldRef}
                id='member-name'
                autoComplete='off'
                maxLength={p.nameMax * 2}
                value={p.newName}
                aria-invalid={p.nameError ? true : undefined}
                aria-describedby={p.nameError ? 'member-name-error' : undefined}
                onChange={(event) => p.onName(event.target.value)}
              />
              {p.nameError && (
                <Text id='member-name-error' className='field-error'>
                  {p.nameError}
                </Text>
              )}
            </Box>
          )}
          <Box className='field'>
            <Label htmlFor='member-reason'>사유 (감사로그에 남아요)</Label>
            <Input
              ref={reasonFieldRef}
              id='member-reason'
              autoComplete='off'
              value={p.reason}
              aria-invalid={p.reasonError ? true : undefined}
              aria-describedby={
                p.reasonError
                  ? 'member-reason-help member-reason-error'
                  : 'member-reason-help'
              }
              onChange={(event) => p.onReason(event.target.value)}
            />
            <Text id='member-reason-help' className='field-help'>
              5~500자로 적어 주세요. 회원에게는 보이지 않아요.
            </Text>
            {p.reasonError && (
              <Text id='member-reason-error' className='field-error'>
                {p.reasonError}
              </Text>
            )}
          </Box>
          {deleting && (
            <Box className='field'>
              <Label htmlFor='member-confirm'>
                확인을 위해 아이디 <Span className='mono'>{p.username}</Span>을
                그대로 입력해 주세요
              </Label>
              <Input
                id='member-confirm'
                autoComplete='off'
                autoCapitalize='none'
                spellCheck={false}
                value={p.confirmName}
                aria-describedby='member-confirm-state'
                onChange={(event) => p.onConfirmName(event.target.value)}
              />
              <Text
                id='member-confirm-state'
                className={p.confirmMatches ? 'field-help' : 'field-error'}
              >
                {p.confirmMatches
                  ? '아이디가 일치해요.'
                  : '아이디가 일치해야 삭제할 수 있어요.'}
              </Text>
            </Box>
          )}
          {deleting && p.ownedGroupsBlocked && (
            <Box className='notice' data-tone='error' role='alert'>
              <Box>
                <Text>{p.ownedGroupsMessage}</Text>
                {p.ownedGroups.length > 0 && (
                  <Ul className='owned-groups'>
                    {p.ownedGroups.map((group) => (
                      <Li key={group.id}>
                        <Link className='text-link' href={group.href}>
                          {group.name}
                        </Link>
                      </Li>
                    ))}
                  </Ul>
                )}
              </Box>
            </Box>
          )}
        </ConfirmDialog>
      )}
    </Section>
  );
}
