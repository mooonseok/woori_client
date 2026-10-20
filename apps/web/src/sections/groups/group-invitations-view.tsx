import { Box, Section, Heading, Text, Button } from '@/components/atoms/ui';
import { inviteExpiryLabel } from '@/utils/invite-format';
import { activeInvitation } from '@/utils/group-start';
import type { Invitation } from '@/dto/invitation.dto';

// Why an invitation can no longer be used, if it cannot.
function closedReason(invitation: Invitation, now: Date) {
  if (invitation.revokedAt) return '취소됨';
  if (activeInvitation(invitation, now)) return '';
  return (invitation.useCount ?? invitation.uses ?? 0) >= invitation.maxUses
    ? '모두 사용됨'
    : '기간 끝남';
}
import type { GroupsViewProps } from './groups-view';
// Invitation status and cancelling. New invitations are issued in the invite
// sheet, which shows the one-time link, code and QR.
export function GroupInvitationsView(p: GroupsViewProps) {
  if (!p.group) return null;
  return (
    <Section className='settings-card' aria-labelledby='group-invite-title'>
      <Heading id='group-invite-title'>초대</Heading>
      {p.group.role !== 'OWNER' ? (
        <Text className='muted'>
          그룹장이 초대 링크와 코드를 만들 수 있어요.
        </Text>
      ) : (
        <>
          <Text className='muted'>
            초대는 3일 동안, 최대 10명이 사용할 수 있어요. 아는 사람에게만
            공유해 주세요.
          </Text>
          <Button
            className='secondary-button'
            onClick={p.onInvite}
            disabled={p.pending || !p.verified}
          >
            새 초대 만들기
          </Button>
          {p.listLoading && (
            <Text role='status'>초대 목록을 확인하고 있어요…</Text>
          )}
          {p.listError && (
            <Box>
              <Text role='alert'>{p.listError}</Text>
              <Button onClick={() => void p.load()}>목록 다시 불러오기</Button>
            </Box>
          )}
          {!p.listLoading && !p.listError && !p.invitations.length && (
            <Text className='muted'>아직 만든 초대가 없어요.</Text>
          )}
          {p.invitations.map((invitation) => {
            const expiry = inviteExpiryLabel(invitation.expiresAt);
            const closed = closedReason(invitation, new Date(p.listLoadedAt));
            return (
              <Box key={invitation.id} className='invitation-row'>
                <Box>
                  <Text>{expiry}</Text>
                  <Text className='muted'>
                    {invitation.useCount ?? invitation.uses ?? 0}/
                    {invitation.maxUses}명 참여
                    {closed ? ` · ${closed}` : ''}
                  </Text>
                </Box>
                {!closed && (
                  <Button
                    className='text-button'
                    disabled={p.pending}
                    aria-label={`${expiry} 초대 취소`}
                    onClick={() => void p.revoke(invitation.id)}
                  >
                    초대 취소
                  </Button>
                )}
              </Box>
            );
          })}
        </>
      )}
    </Section>
  );
}
