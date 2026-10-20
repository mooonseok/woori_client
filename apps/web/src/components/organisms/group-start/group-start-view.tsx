import {
  Box,
  Button,
  Heading,
  Li,
  Ol,
  Section,
  Span,
  Subheading,
  Text,
  Ul,
} from '@/components/atoms/ui';
import { Avatar } from '@/components/atoms/avatar';
import { Icon } from '@/components/atoms/icon';
import { Link } from '@/components/molecules/link';
import type { GroupStart } from '@/utils/group-start';
import { inviteExpiryDate } from '@/utils/invite-format';

export interface GroupStartPerson {
  id: string;
  name: string;
  me: boolean;
  owner: boolean;
}
export interface GroupStartViewProps {
  groupName: string;
  memberCount: number;
  /** I am the group owner. */
  owner: boolean;
  verified: boolean;
  /** First member page, me first (empty while it loads). */
  people: GroupStartPerson[];
  ownerName?: string;
  state: Extract<GroupStart, { kind: 'starting' }>;
  /** The owner's invitation list has not loaded yet. */
  invitePending: boolean;
  /** Latest expiry among the owner's open invitations. */
  openInviteUntil?: string;
  onInvite: () => void;
  onCreateAlbum: () => void;
}

const MAX_PEOPLE = 5;
const UPLOAD_HINT_ID = 'group-start-upload-hint';
/** The invite step's action; focus falls back here after the invite sheet. */
export const INVITE_ACTION_ID = 'group-start-invite-action';
function StepIcon({ name }: { name: string }) {
  return (
    <Span className='group-start-step-icon' aria-hidden='true'>
      <Icon name={name} size={20} />
    </Span>
  );
}

function InviteStep(p: GroupStartViewProps) {
  const step = p.state.invite;
  const title = '함께할 사람 초대하기';
  if (step.kind === 'done')
    return (
      <Li className='group-start-step is-done'>
        <StepIcon name='check' />
        <Box className='group-start-step-body'>
          <Box className='group-start-step-text'>
            <Subheading className='group-start-step-title'>{title}</Subheading>
            <Text className='group-start-step-desc'>
              <Span className='group-start-done'>완료</Span>
            </Text>
          </Box>
          {p.owner && p.verified && (
            <Button
              id={INVITE_ACTION_ID}
              className='text-button'
              onClick={p.onInvite}
            >
              <Icon name='plus' size={18} />더 초대하기
            </Button>
          )}
        </Box>
      </Li>
    );
  const waiting =
    p.invitePending && (step.kind === 'todo' || step.kind === 'sent');
  return (
    <Li className='group-start-step' aria-busy={waiting || undefined}>
      <StepIcon name={step.kind === 'sent' && !waiting ? 'clock' : 'users'} />
      <Box className='group-start-step-body'>
        <Box className='group-start-step-text'>
          <Subheading className='group-start-step-title'>{title}</Subheading>
          <Text className='group-start-step-desc'>
            {waiting
              ? '초대 상태를 확인하고 있어요.'
              : step.kind === 'todo'
                ? '링크나 코드를 받으면 바로 참여할 수 있어요.'
                : step.kind === 'sent'
                  ? `초대를 보냈어요 · ${inviteExpiryDate(step.expiresAt)}`
                  : step.kind === 'member'
                    ? p.ownerName
                      ? `초대는 그룹장 ${p.ownerName} 님이 할 수 있어요.`
                      : '초대는 그룹장이 할 수 있어요.'
                    : '이메일 확인 후 초대할 수 있어요.'}
          </Text>
        </Box>
        {/* One element for both labels: focus stays when an invite lands. */}
        {!waiting && (step.kind === 'todo' || step.kind === 'sent') && (
          <Button
            id={INVITE_ACTION_ID}
            variant={step.kind === 'todo' ? 'primary' : 'quiet'}
            onClick={p.onInvite}
          >
            {step.kind === 'sent' && <Icon name='plus' size={18} />}
            {step.kind === 'todo' ? '초대 링크 만들기' : '초대 더 만들기'}
          </Button>
        )}
        {step.kind === 'unverified' && (
          <Link className='text-button' href='/verify-email'>
            이메일 확인하기 <Icon name='arrow-right' size={18} />
          </Link>
        )}
      </Box>
    </Li>
  );
}

function AlbumStep(p: GroupStartViewProps) {
  const step = p.state.album;
  const title = '첫 앨범 만들기';
  if (step.kind === 'done')
    return (
      <Li className='group-start-step is-done'>
        <StepIcon name='check' />
        <Box className='group-start-step-body'>
          <Box className='group-start-step-text'>
            <Subheading className='group-start-step-title'>{title}</Subheading>
            <Text className='group-start-step-desc'>
              <Span className='group-start-done'>완료</Span>
              <Span className='group-start-album-name'>
                {' · '}
                {step.album.title}
              </Span>
            </Text>
          </Box>
        </Box>
      </Li>
    );
  return (
    <Li className='group-start-step'>
      <StepIcon name='album' />
      <Box className='group-start-step-body'>
        <Box className='group-start-step-text'>
          <Subheading className='group-start-step-title'>{title}</Subheading>
          <Text className='group-start-step-desc'>제목만 정하면 돼요.</Text>
        </Box>
        <Button
          variant={
            p.state.primary === 'album' && !p.invitePending
              ? 'primary'
              : 'secondary'
          }
          onClick={p.onCreateAlbum}
        >
          앨범 만들기
        </Button>
      </Box>
    </Li>
  );
}

function People(p: GroupStartViewProps) {
  if (p.memberCount <= 1) {
    const me = p.people.find((person) => person.me);
    return (
      <Text className='group-start-people'>
        {me && <Avatar name={me.name} label />}
        <Span>{p.owner ? '1명 · 그룹장' : '1명'}</Span>
      </Text>
    );
  }
  const shown = p.people.slice(0, MAX_PEOPLE);
  const rest = p.memberCount - shown.length;
  // Keeps the steps below from jumping when the member page lands.
  if (!shown.length)
    return <Box className='group-start-chips' aria-hidden='true' />;
  return (
    <Ul className='group-start-chips' aria-label='구성원'>
      {shown.map((person) => (
        <Li className='group-start-chip' key={person.id}>
          <Avatar name={person.name} size={24} />
          <Span className='group-start-chip-name'>
            {person.name}
            {person.me && <Span className='group-start-me'> · 나</Span>}
          </Span>
        </Li>
      ))}
      {rest > 0 && <Li className='group-start-chip-more'>외 {rest}명</Li>}
    </Ul>
  );
}

function Rail(p: GroupStartViewProps) {
  const shown = p.people.slice(0, MAX_PEOPLE);
  const inviteLine = !p.owner
    ? p.ownerName
      ? `초대는 그룹장 ${p.ownerName} 님이 할 수 있어요.`
      : '초대는 그룹장이 할 수 있어요.'
    : !p.verified
      ? '이메일 확인 후 초대할 수 있어요.'
      : p.invitePending
        ? '초대 상태를 확인하고 있어요.'
        : p.openInviteUntil
          ? `열려 있는 초대 · ${inviteExpiryDate(p.openInviteUntil)}`
          : '열려 있는 초대가 없어요.';
  return (
    <Section className='group-start-rail' aria-label='그룹 정보'>
      <Section
        className='group-start-rail-block'
        aria-labelledby='group-start-members-title'
      >
        <Box className='group-start-rail-head'>
          <Heading id='group-start-members-title'>구성원</Heading>
          <Span className='group-start-rail-count'>{p.memberCount}명</Span>
        </Box>
        {shown.length > 0 && (
          <Ul className='group-start-roster'>
            {shown.map((person) => (
              <Li key={person.id}>
                <Avatar name={person.name} size={36} />
                <Span className='group-start-roster-text'>
                  <Span className='group-start-roster-name'>
                    {person.name}
                    {person.me && <Span className='group-start-me'> · 나</Span>}
                  </Span>
                  <Span className='group-start-roster-role'>
                    {person.owner ? '그룹장' : '구성원'}
                  </Span>
                </Span>
              </Li>
            ))}
          </Ul>
        )}
      </Section>
      <Section
        className='group-start-rail-block'
        aria-labelledby='group-start-invite-title'
      >
        <Heading id='group-start-invite-title'>초대</Heading>
        <Text className='group-start-rail-line'>
          <Icon name='clock' size={18} />
          {inviteLine}
        </Text>
      </Section>
      <Link className='group-start-settings' href='/groups'>
        <Icon name='settings' size={20} />
        <Span>그룹 설정</Span>
        <Icon name='arrow-right' size={18} />
      </Link>
    </Section>
  );
}

// Home while a group has no photos yet (A안): who is here, two start steps
// with exactly one primary action, and a note that photos will gather here.
export function GroupStartView(p: GroupStartViewProps) {
  const { state } = p;
  const together = p.memberCount > 1;
  const upload = state.album.kind === 'done' ? state.album.album : null;
  return (
    <Box className='group-start'>
      <Box className='group-start-main'>
        <Section
          className='group-start-intro'
          aria-labelledby='group-start-title'
        >
          <Heading
            id='group-start-title'
            className='group-start-title'
            tabIndex={-1}
          >
            {together ? (
              `${p.memberCount}명이 함께하고 있어요`
            ) : (
              <>
                <Span className='group-start-name'>‘{p.groupName}’</Span>
                <Span className='group-start-title-rest'>공간이 생겼어요</Span>
              </>
            )}
          </Heading>
          <Text className='group-start-lede'>
            {together
              ? '첫 사진을 올리면 모두 함께 볼 수 있어요.'
              : '함께할 사람을 초대하고 첫 사진을 올려 보세요.'}
          </Text>
          <People {...p} />
        </Section>
        <Section
          className='group-start-steps'
          aria-labelledby='group-start-steps-title'
        >
          <Heading id='group-start-steps-title' className='sr-only'>
            시작 안내
          </Heading>
          <Ol className='group-start-list'>
            <InviteStep {...p} />
            <AlbumStep {...p} />
          </Ol>
          {upload && (
            <Box className='group-start-upload'>
              <Link
                href={`/album?id=${encodeURIComponent(upload.id)}`}
                className={`ui-button ui-button--${
                  state.primary === 'upload' && !p.invitePending
                    ? 'primary'
                    : 'secondary'
                }`}
                aria-describedby={UPLOAD_HINT_ID}
              >
                <Icon name='upload' size={20} />
                <Span className='group-start-upload-label'>
                  ‘{upload.title}’에 사진 담기
                </Span>
              </Link>
              <Text id={UPLOAD_HINT_ID} className='group-start-hint'>
                사진 30MB · 동영상 1분 200MB까지, 한 번에 30개
              </Text>
            </Box>
          )}
        </Section>
        <Text className='group-start-moments-note'>
          사진이 모이면 여기에서 한눈에 봐요.
        </Text>
      </Box>
      <Rail {...p} />
    </Box>
  );
}
