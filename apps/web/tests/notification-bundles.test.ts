import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../src/services/notifications.ts';
import {
  applyRead,
  mergeNotificationItems,
  notificationDestination,
  notificationModel,
  notificationTitle,
  observeSequences,
  readRequests,
  targetMediaKind,
} from '../src/utils/notification-model.ts';
import { createNotificationFixtures } from '../src/content/notification-content.ts';
import type {
  InboxNotification,
  NotificationTarget,
} from '../src/dto/notification-api.dto.ts';

const bundle = (patch: Partial<InboxNotification> = {}): InboxNotification => ({
  id: '00000000-0000-4000-8000-000000000001',
  kind: 'PHOTOS',
  groupId: 'group',
  groupName: '우리 가족',
  actor: { id: 'member', displayName: '하은', nickname: '하은' },
  albumId: 'album',
  albumTitle: '제주 여행',
  photoId: 'photo',
  commentId: null,
  count: 1,
  createdAt: '2026-10-16T01:00:00Z',
  latestAt: '2026-10-16T01:00:00Z',
  latestSequence: 1,
  readThroughSequence: 0,
  unread: true,
  navigation: 'ALBUM',
  ...patch,
});

test('bundle rows read "사진 N장" and "외 N명" for one or many, and sort by the latest activity', () => {
  assert.equal(
    notificationModel(bundle()).title,
    "하은님이 '제주 여행'에 사진 1장을 올렸어요"
  );
  const grown = notificationModel(
    bundle({ count: 12, latestAt: '2026-10-16T03:00:00Z' })
  );
  assert.equal(grown.title, "하은님이 '제주 여행'에 사진 12장을 올렸어요");
  assert.equal(grown.timestamp, Date.parse('2026-10-16T03:00:00Z'));
  assert.equal(grown.createdAt, Date.parse('2026-10-16T01:00:00Z'));
  const reaction = (count: number) =>
    notificationModel(bundle({ kind: 'REACTION', count, navigation: 'PHOTO' }))
      .title;
  assert.equal(reaction(1), '하은님이 내 사진에 반응했어요');
  assert.equal(reaction(3), '하은님 외 2명이 내 사진에 반응했어요');
  // A malformed count never reads "0장" or "외 -1명".
  assert.equal(reaction(0), '하은님이 내 사진에 반응했어요');
  assert.equal(
    notificationModel(bundle({ kind: 'PIN', navigation: 'COMMENT' })).title,
    '하은님이 위치 댓글을 남겼어요'
  );
  // Demo rows use the same wording (no "외 반응 N개").
  const demo = createNotificationFixtures(Date.now());
  const photos = demo.find((item) => item.type === 'photos')!;
  const reacted = demo.find((item) => item.type === 'reaction')!;
  assert.equal(
    photos.title,
    notificationTitle(
      'PHOTOS',
      photos.actorName!,
      '가을 단풍 나들이',
      photos.count
    )
  );
  assert.equal(
    reacted.title,
    notificationTitle('REACTION', reacted.actorName!, '', reacted.count)
  );
  assert.ok(demo.every((item) => item.groupName));
});

test('a read bundle turns unread again when new activity raises its latestSequence', () => {
  const shown = [notificationModel(bundle({ latestSequence: 3 }))];
  const read = applyRead(shown, [{ id: shown[0].id, throughSequence: 3 }]);
  assert.equal(read[0].read, true);
  // Two more photos join the bundle; the server reports unread again.
  const refreshed = mergeNotificationItems(read, [
    notificationModel(
      bundle({
        count: 3,
        latestSequence: 5,
        readThroughSequence: 3,
        unread: true,
        latestAt: '2026-10-16T02:00:00Z',
      })
    ),
  ]);
  assert.equal(refreshed.length, 1);
  assert.equal(refreshed[0].read, false);
  assert.equal(refreshed[0].count, 3);
  // Confirming an older sequence than the row shows does not mark it read.
  assert.equal(
    applyRead(refreshed, [{ id: shown[0].id, throughSequence: 3 }])[0].read,
    false
  );
});

test('refreshes replace rows by id without duplicates and move grown bundles up', () => {
  const a = notificationModel(
    bundle({ id: 'a', latestAt: '2026-10-16T01:00:00Z', count: 2 })
  );
  const b = notificationModel(
    bundle({ id: 'b', latestAt: '2026-10-16T02:00:00Z' })
  );
  const c = notificationModel(
    bundle({ id: 'c', latestAt: '2026-10-16T00:00:00Z' })
  );
  const grownA = notificationModel(
    bundle({ id: 'a', latestAt: '2026-10-16T05:00:00Z', count: 4 })
  );
  const merged = mergeNotificationItems([b, a, c], [grownA, b]);
  assert.deepEqual(
    merged.map((item) => [item.id, item.count]),
    [
      ['a', 4],
      ['b', 1],
      ['c', 1],
    ]
  );
  // Same latestAt: server order (id descending) keeps it stable.
  const tie = mergeNotificationItems(
    [],
    [
      { ...c, id: 'x' },
      { ...c, id: 'y' },
    ]
  );
  assert.deepEqual(
    tie.map((item) => item.id),
    ['y', 'x']
  );
});

test('opening follows navigation: ALBUM to the album screen, PHOTO and COMMENT to the viewer', () => {
  const target = (patch: Partial<NotificationTarget>): NotificationTarget => ({
    groupId: 'group',
    albumId: 'album',
    photoId: 'photo',
    commentId: null,
    latestSequence: 4,
    navigation: 'PHOTO',
    ...patch,
  });
  assert.deepEqual(notificationDestination(target({ navigation: 'ALBUM' })), {
    kind: 'album',
    groupId: 'group',
    albumId: 'album',
  });
  assert.deepEqual(notificationDestination(target({})), {
    kind: 'photo',
    commentId: null,
  });
  assert.deepEqual(
    notificationDestination(
      target({ navigation: 'COMMENT', commentId: 'comment' })
    ),
    { kind: 'photo', commentId: 'comment' }
  );
  // Rows from a server without navigation keep the contract's mapping.
  const legacy = {
    ...bundle(),
    navigation: undefined,
  } as unknown as InboxNotification;
  assert.equal(notificationModel(legacy).navigation, 'ALBUM');
});

function setup(t: TestContext, fetcher: typeof fetch) {
  const original = globalThis.fetch,
    base = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example';
  globalThis.fetch = fetcher;
  t.after(() => {
    globalThis.fetch = original;
    if (base === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = base;
  });
}

test('read requests send the observed latestSequence, or the fresher one from /target', async (t) => {
  const rows = [
    notificationModel(bundle({ id: 'n1', latestSequence: 5 })),
    notificationModel(bundle({ id: 'n2', latestSequence: 2 })),
    notificationModel(bundle({ id: 'n3', latestSequence: 9, unread: false })),
  ];
  assert.deepEqual(readRequests(rows, ['n1', 'n2', 'n3']), [
    { id: 'n1', throughSequence: 5 },
    { id: 'n2', throughSequence: 2 },
  ]);
  // The bundle grew to 7 between the list and opening it: read through 7.
  assert.deepEqual(readRequests(rows, ['n1'], { n1: 7 }), [
    { id: 'n1', throughSequence: 7 },
  ]);
  const bodies: unknown[] = [];
  setup(t, async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { throughSequence: number };
    bodies.push(body);
    // A sequence the server never assigned is refused, not silently accepted.
    return body.throughSequence > 7
      ? Response.json(
          {
            code: 'NOTIFICATION_SEQUENCE_INVALID',
            message: '확인할 수 없는 알림이에요.',
          },
          { status: 400 }
        )
      : Response.json({ id: 'n1', readThroughSequence: 7 });
  });
  const [request] = readRequests(rows, ['n1'], { n1: 7 });
  await api.readNotification(
    request.id,
    request.throughSequence,
    new AbortController().signal
  );
  assert.deepEqual(bodies, [{ throughSequence: 7 }]);
  await assert.rejects(
    api.readNotification('n1', 99, new AbortController().signal),
    (error: unknown) =>
      (error as { code?: string }).code === 'NOTIFICATION_SEQUENCE_INVALID'
  );
});

test('opening a row shown as read whose bundle grew reads through the newer sequence', () => {
  // On screen: read through 9. The server has 11 now; /target says 11.
  const shown = [
    notificationModel(
      bundle({
        id: 'grown',
        latestSequence: 9,
        readThroughSequence: 9,
        unread: false,
      })
    ),
  ];
  assert.deepEqual(readRequests(shown, ['grown'], { grown: 11 }), [
    { id: 'grown', throughSequence: 11 },
  ]);
  // Not newer than what was read: nothing to send.
  assert.deepEqual(readRequests(shown, ['grown'], { grown: 9 }), []);
  assert.deepEqual(readRequests(shown, ['grown']), []);
  // After the read the row stays read and carries the sequence it read.
  const read = applyRead(shown, [{ id: 'grown', throughSequence: 11 }]);
  assert.deepEqual([read[0].read, read[0].latestSequence], [true, 11]);
  // With nothing sent, a newer observed sequence still updates the row.
  const synced = observeSequences(shown, { grown: 11 });
  assert.deepEqual([synced[0].read, synced[0].latestSequence], [false, 11]);
  assert.equal(observeSequences(shown, { grown: 9 })[0], shown[0]);
});

test('bundles with videos say 동영상 N개 or 사진·동영상 N개, and reactions to a video say 내 동영상', () => {
  const title = (patch: Partial<InboxNotification>) =>
    notificationModel(bundle(patch)).title;
  assert.equal(
    title({ count: 3, videoCount: 0 }),
    "하은님이 '제주 여행'에 사진 3장을 올렸어요"
  );
  assert.equal(
    title({ count: 2, videoCount: 2, mediaKind: 'VIDEO' }),
    "하은님이 '제주 여행'에 동영상 2개를 올렸어요"
  );
  assert.equal(
    title({ count: 5, videoCount: 1 }),
    "하은님이 '제주 여행'에 사진·동영상 5개를 올렸어요"
  );
  assert.equal(
    title({
      kind: 'REACTION',
      count: 1,
      mediaKind: 'VIDEO',
      navigation: 'PHOTO',
    }),
    '하은님이 내 동영상에 반응했어요'
  );
  assert.equal(
    title({
      kind: 'REACTION',
      count: 3,
      mediaKind: 'VIDEO',
      navigation: 'PHOTO',
    }),
    '하은님 외 2명이 내 동영상에 반응했어요'
  );
  const model = notificationModel(
    bundle({ mediaKind: 'VIDEO', videoCount: 1 })
  );
  assert.deepEqual([model.mediaKind, model.videoCount], ['VIDEO', 1]);
});

test("a target's media kind comes from /target (0.24.0) when present, else the inbox row", () => {
  assert.equal(targetMediaKind({ mediaKind: 'VIDEO' }, 'PHOTO'), 'VIDEO');
  assert.equal(targetMediaKind({ mediaKind: 'PHOTO' }, 'VIDEO'), 'PHOTO');
  assert.equal(targetMediaKind({}, 'VIDEO'), 'VIDEO');
  assert.equal(targetMediaKind({}), 'PHOTO');
});
