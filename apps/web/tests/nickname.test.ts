import test from 'node:test';
import assert from 'node:assert/strict';
import {
  memberNickname,
  nicknameProblem,
  normalizeNickname,
} from '../src/utils/nickname.ts';
import { uploaderOf } from '../src/utils/blocks.ts';
import { commentModel } from '../src/utils/photo-interactions.ts';
import { notificationModel } from '../src/utils/notification-model.ts';
import type { InboxNotification } from '../src/dto/notification-api.dto.ts';

test('nickname normalizes Hangul and validates normalized Unicode codepoints', () => {
  assert.equal(normalizeNickname('  가족  '), '가족');
  for (const value of [
    '가족',
    '하늘 빛',
    'family_20-',
    '家族',
    'a'.repeat(20),
    '𐐀'.repeat(20),
  ])
    assert.equal(nicknameProblem(value), null, value);
  for (const value of [
    '',
    '  ',
    '나',
    'a'.repeat(21),
    '𐐀'.repeat(21),
    '하늘😀',
    '<가족>',
    '하늘\t빛',
    '하늘\n빛',
    '하늘\u200b빛',
  ])
    assert.ok(nicknameProblem(value), value);
});

test('legacy private displayName is never a member-facing fallback', () => {
  const legacy = { id: 'owner', displayName: '비공개 실명' };
  assert.equal(memberNickname(undefined), '회원');
  assert.equal(memberNickname({ nickname: ' ' }), '회원');
  assert.equal(uploaderOf({ uploader: legacy }).authorName, '회원');
  assert.equal(
    uploaderOf({ uploader: { ...legacy, nickname: '별빛' } }).authorName,
    '별빛'
  );
  const comment = {
    id: 'comment',
    photoId: 'photo',
    author: legacy,
    body: '안녕',
    kind: 'GENERAL' as const,
    x: null,
    y: null,
    createdAt: '2026-10-20T00:00:00Z',
    canEdit: false,
    canDelete: false,
  };
  assert.equal(commentModel(comment).authorName, '회원');
  assert.equal(
    commentModel({ ...comment, author: { ...legacy, nickname: '달빛' } })
      .authorName,
    '달빛'
  );
  const notification = {
    id: 'notice',
    kind: 'COMMENT',
    actor: legacy,
    albumTitle: '앨범',
    count: 1,
    createdAt: '2026-10-20T00:00:00Z',
    latestAt: '2026-10-20T00:00:00Z',
  } as InboxNotification;
  assert.equal(notificationModel(notification).actorName, '회원');
  const named = notificationModel({
    ...notification,
    actor: { ...legacy, nickname: '초록' },
  });
  assert.equal(named.actorName, '초록');
  assert.match(named.title, /초록/);
  assert.doesNotMatch(named.title, /비공개 실명/);
});
