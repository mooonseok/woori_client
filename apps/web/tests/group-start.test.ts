import test from 'node:test';
import assert from 'node:assert/strict';
import { activeInvitation, groupStartState } from '../src/utils/group-start.ts';
import {
  inviteCodeLabel,
  inviteExpiryDate,
  inviteExpiryLabel,
} from '../src/utils/invite-format.ts';
import type { Invitation } from '../src/dto/invitation.dto.ts';

const now = new Date('2026-10-20T06:00:00Z');
const invitation = (patch: Partial<Invitation> = {}): Invitation => ({
  id: 'i1',
  expiresAt: '2026-10-23T06:00:00Z',
  maxUses: 10,
  useCount: 0,
  revokedAt: null,
  ...patch,
});
const owner = { members: 1, role: 'OWNER' as const };
const base = { albums: [], invitations: [], verified: true, now };

test('a new group alone with no albums asks the owner to invite first', () => {
  assert.deepEqual(groupStartState({ ...base, group: owner }), {
    kind: 'starting',
    invite: { kind: 'todo' },
    album: { kind: 'todo' },
    primary: 'invite',
  });
});

test('an active invitation marks the invite as sent and moves the primary action to the album', () => {
  const state = groupStartState({
    ...base,
    group: owner,
    invitations: [
      invitation({ id: 'old', expiresAt: '2026-10-22T00:00:00Z' }),
      invitation({ id: 'new', expiresAt: '2026-10-23T06:00:00Z' }),
    ],
  });
  assert.deepEqual(state, {
    kind: 'starting',
    invite: { kind: 'sent', expiresAt: '2026-10-23T06:00:00Z' },
    album: { kind: 'todo' },
    primary: 'album',
  });
});

test('expired, used up or revoked invitations do not count as sent', () => {
  for (const stale of [
    invitation({ expiresAt: '2026-10-20T05:59:59Z' }),
    invitation({ useCount: 10 }),
    invitation({ uses: 10, useCount: undefined }),
    invitation({ revokedAt: '2026-10-20T05:00:00Z' }),
  ]) {
    assert.equal(activeInvitation(stale, now), false);
    const state = groupStartState({
      ...base,
      group: owner,
      invitations: [stale],
    });
    assert.equal(state.kind === 'starting' && state.invite.kind, 'todo');
  }
  assert.equal(activeInvitation(invitation({ useCount: 9 }), now), true);
});

test('members joined and an album without photos make uploading the one primary action', () => {
  assert.deepEqual(
    groupStartState({
      ...base,
      group: { members: 3, role: 'OWNER' },
      albums: [{ id: 'a1', title: '가을 소풍', photoCount: 0 }],
    }),
    {
      kind: 'starting',
      invite: { kind: 'done', members: 3 },
      album: { kind: 'done', album: { id: 'a1', title: '가을 소풍' } },
      primary: 'upload',
    }
  );
});

test('members never get the owner invite step; unverified owners get the email step', () => {
  const member = groupStartState({
    ...base,
    group: { members: 1, role: 'MEMBER' },
  });
  assert.equal(member.kind === 'starting' && member.invite.kind, 'member');
  assert.equal(member.kind === 'starting' && member.primary, 'album');
  const unverified = groupStartState({
    ...base,
    group: owner,
    verified: false,
  });
  assert.equal(
    unverified.kind === 'starting' && unverified.invite.kind,
    'unverified'
  );
});

test('any album with photos ends the start guide', () => {
  assert.deepEqual(
    groupStartState({
      ...base,
      group: owner,
      albums: [
        { id: 'a1', title: '빈 앨범', photoCount: 0 },
        { id: 'a2', title: '가을 소풍', photoCount: 2 },
      ],
    }),
    { kind: 'active' }
  );
});

test('invite codes and expiry use readable Korean labels in Korea time', () => {
  assert.equal(inviteCodeLabel('k7mq4r9txp'), 'K7MQ4-R9TXP');
  assert.equal(inviteCodeLabel('K7MQ4 R9TXP'), 'K7MQ4-R9TXP');
  assert.equal(inviteCodeLabel('SHORT'), 'SHORT');
  // 06:00Z is 15:00 KST on Friday 23 October 2026.
  assert.equal(
    inviteExpiryLabel('2026-10-23T06:00:00Z'),
    '10월 23일(금) 오후 3시까지'
  );
  // 15:30Z crosses midnight in Korea: Saturday 24 October, 00:30.
  assert.equal(
    inviteExpiryLabel('2026-10-23T15:30:00Z'),
    '10월 24일(토) 오전 12시 30분까지'
  );
  assert.equal(inviteExpiryDate('2026-10-23T15:30:00Z'), '10월 24일까지');
  assert.equal(inviteExpiryLabel('not a date'), '');
});
