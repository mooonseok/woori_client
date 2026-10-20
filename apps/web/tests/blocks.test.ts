import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  BLOCKS_CHANGED,
  blockUser,
  listBlocks,
  setBlocked,
  unblockUser,
} from '../src/services/blocks.ts';
import {
  ApiError,
  advanceSessionRevision,
} from '../src/services/api-client.ts';
import {
  blockChangeOf,
  blockConfirmCopy,
  blockErrorMessage,
  isOtherPerson,
  purgeOnBlock,
  targetViewerAfterBlock,
  unblockConfirmCopy,
  uploaderOf,
  viewerAfterBlock,
  withoutPerson,
} from '../src/utils/blocks.ts';
import { notificationModel } from '../src/utils/notification-model.ts';
import { fetchCursorPage } from '../src/utils/service-guidance.ts';
import {
  currentTab,
  isPublicRoute,
  safeReturnTo,
} from '../src/utils/auth-navigation.ts';
import { helpTopics, privacyGuide } from '../src/content/service-guide.ts';
import {
  clearsRosterBeforeLoad,
  mergeRosterPage,
} from '../src/utils/group-members.ts';

const me = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
function withApi(t: TestContext) {
  const saved = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example';
  t.after(() => {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = saved;
  });
}
const failure = (promise: Promise<unknown>) =>
  promise.then(
    () => assert.fail('expected rejection'),
    (error: unknown) => error
  );

test('block requests use PUT/DELETE on an encoded user id with the CSRF header and no body', async (t) => {
  withApi(t);
  const calls: Request[] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      calls.push(request);
      if (request.method === 'DELETE')
        return new Response(null, { status: 204 });
      if (request.method === 'PUT')
        return Response.json({
          userId: other,
          displayName: '하은',
          nickname: '하은',
          blockedAt: '2026-10-15T01:00:00Z',
        });
      return Response.json({ items: [], nextCursor: null });
    }
  );
  const blocked = await blockUser(other);
  assert.deepEqual(blocked, {
    userId: other,
    displayName: '하은',
    nickname: '하은',
    blockedAt: '2026-10-15T01:00:00Z',
  });
  assert.equal(await unblockUser('../v1/groups'), undefined);
  const signal = new AbortController().signal;
  await listBlocks(null, signal);
  await listBlocks(other, signal);
  const urls = calls.map((call) => new URL(call.url));
  assert.equal(urls[0].pathname, `/v1/blocks/${other}`);
  assert.equal(urls[1].pathname, '/v1/blocks/..%2Fv1%2Fgroups');
  assert.equal(urls[2].search, '?limit=20');
  assert.equal(urls[3].searchParams.get('cursor'), other);
  for (const call of calls.slice(0, 2)) {
    assert.equal(call.credentials, 'include');
    assert.equal(call.headers.get('X-Woori-Request'), '1');
    assert.equal(call.body, null);
  }
  assert.deepEqual(
    calls.map((call) => call.method),
    ['PUT', 'DELETE', 'GET', 'GET']
  );
});

test('block failures map to the real server state', async (t) => {
  withApi(t);
  let reply: () => Response = () => Response.json({}, { status: 500 });
  t.mock.method(globalThis, 'fetch', async () => reply());
  const cases: [number, string, RegExp][] = [
    [400, 'BLOCK_SELF_NOT_ALLOWED', /나 자신은 차단할 수 없어요/],
    [404, 'USER_NOT_FOUND', /차단할 수 없어요/],
    [409, 'BLOCK_LIMIT_REACHED', /500명까지/],
    [429, 'TOO_MANY_REQUESTS', /너무 자주/],
    [401, 'AUTHENTICATION_REQUIRED', /다시 로그인/],
  ];
  for (const [status, code, message] of cases) {
    reply = () => Response.json({ code, message: 'server' }, { status });
    const error = await failure(blockUser(other));
    assert.equal((error as ApiError).code, code);
    assert.match(blockErrorMessage(error, true), message, code);
  }
  reply = () => Response.json({ message: ['bad'] }, { status: 400 });
  assert.match(
    blockErrorMessage(await failure(unblockUser(other)), false),
    /차단을 해제하지 못했어요/
  );
  reply = () => {
    throw new TypeError('Failed to fetch');
  };
  assert.match(
    blockErrorMessage(await failure(blockUser(other)), true),
    /서버에 연결할 수 없어요/
  );
});

test('uploader is mapped from MediaPhoto and unknown uploaders offer no report/block', () => {
  assert.deepEqual(
    uploaderOf({
      uploader: { id: other, displayName: '하은', nickname: '하은' },
    }),
    { authorId: other, authorName: '하은' }
  );
  // Memories carry it on `item.photo`, the same MediaPhoto shape.
  const memory = {
    photo: { id: 'p', uploader: { id: me, displayName: '나', nickname: '나' } },
    uploader: { id: other, displayName: '무시', nickname: '무시' },
  };
  assert.deepEqual(uploaderOf(memory.photo), {
    authorId: me,
    authorName: '나',
  });
  assert.deepEqual(uploaderOf({}), { authorId: '' });
  assert.deepEqual(uploaderOf(null), { authorId: '' });
  assert.deepEqual(
    uploaderOf({ uploader: { id: '', displayName: '?', nickname: '?' } }),
    {
      authorId: '',
    }
  );
  // Own photo, unknown uploader and signed-out viewer never get the actions.
  assert.equal(isOtherPerson(me, me), false);
  assert.equal(isOtherPerson('', me), false);
  assert.equal(isOtherPerson(other, undefined), false);
  assert.equal(isOtherPerson(other, me), true);
});

test('block confirmation says it is personal, silent and not a group removal', () => {
  const copy = blockConfirmCopy('하은');
  assert.equal(copy.title, '하은님을 차단할까요?');
  for (const fact of [
    /사진·댓글·반응과 하은님 활동 알림이 나에게만 보이지 않아요/,
    /하은님에게는 알리지 않고/,
    /같은 그룹에서 나가지도 않아요/,
    /그룹에서 내보내기는 그룹장이 그룹 관리에서 할 수 있어요/,
    /기존 알림도 지워져요/,
  ])
    assert.match(copy.description, fact);
  const undo = unblockConfirmCopy('하은');
  assert.match(undo.description, /다시 보여요/);
  assert.match(undo.description, /알림은 돌아오지 않아요/);
});

test('a block hides the person locally until refetch and closes a viewer showing their photo', () => {
  const photos = [
    { id: 'a', authorId: other },
    { id: 'b', authorId: me },
    { id: 'c', authorId: '' },
  ];
  const onMine = { photos, id: 'b' };
  const trimmed = viewerAfterBlock(onMine, other);
  assert.deepEqual(
    trimmed?.photos.map((p) => p.id),
    ['b', 'c']
  );
  assert.equal(viewerAfterBlock({ photos, id: 'a' }, other), null);
  assert.equal(viewerAfterBlock(onMine, 'nobody'), onMine);
  assert.equal(viewerAfterBlock(null, other), null);
  const inbox = [
    notificationModel({
      id: 'n1',
      kind: 'COMMENT',
      groupId: 'g',
      groupName: '가족',
      actor: { id: other, displayName: '하은', nickname: '하은' },
      albumId: 'al',
      albumTitle: '여름',
      photoId: 'p',
      commentId: 'c',
      count: 1,
      createdAt: '2026-10-14T00:00:00Z',
      latestAt: '2026-10-14T00:00:00Z',
      latestSequence: 2,
      readThroughSequence: 0,
      unread: true,
      navigation: 'COMMENT',
    }),
  ];
  assert.equal(inbox[0].actorId, other);
  assert.deepEqual(
    withoutPerson(inbox, (item) => item.actorId, other),
    []
  );
  assert.equal(
    blockChangeOf(
      new CustomEvent('x', { detail: { userId: other, blocked: true } })
    )?.blocked,
    true
  );
  assert.equal(blockChangeOf(new Event('x')), null);
  assert.equal(
    blockChangeOf(new CustomEvent('x', { detail: { userId: '', blocked: 1 } })),
    null
  );
});

test('block list pages by user id cursor and restarts when that cursor is gone', async (t) => {
  withApi(t);
  const cursors: (string | null)[] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request, init?: RequestInit) => {
      const cursor = new URL(new Request(input, init).url).searchParams.get(
        'cursor'
      );
      cursors.push(cursor);
      return cursor
        ? Response.json({ code: 'USER_NOT_FOUND' }, { status: 404 })
        : Response.json({ items: [], nextCursor: null });
    }
  );
  const result = await fetchCursorPage(
    listBlocks,
    other,
    new AbortController().signal
  );
  assert.equal(result.restarted, true);
  assert.deepEqual(cursors, [other, null]);
});

test('block management is protected, survives login and keeps the 마이페이지 tab', () => {
  assert.equal(isPublicRoute('/blocks'), false);
  assert.equal(safeReturnTo('/blocks?x=1'), '/blocks');
  assert.equal(currentTab('/blocks', true), '/mypage');
  assert.equal(currentTab('/blocks', false), null);
});

test('help and privacy state only the confirmed block facts', () => {
  const block = helpTopics.find((topic) => topic.id === 'block');
  assert.ok(block);
  const text = block.points.join('\n');
  for (const fact of [
    /나에게만 보이지 않아요/,
    /상대방에게는 알리지 않고/,
    /그룹에서 내보내기는 그룹장이/,
    /기존 알림은 지워져요/,
    /지워진 알림은 돌아오지 않아요/,
    /마이페이지 > 차단 관리/,
  ])
    assert.match(text, fact);
  assert.doesNotMatch(text, /신고/);
  const collected = privacyGuide.topics.find(
    (topic) => topic.id === 'collected'
  );
  assert.ok(
    collected?.points.some((point) =>
      /차단 목록: 나에게만 적용되고 나만 볼 수 있으며, 탈퇴하면 삭제돼요/.test(
        point
      )
    )
  );
});

test('a committed block is announced even after the caller unmounted, but not across a session change', async (t) => {
  withApi(t);
  const events: CustomEvent[] = [];
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      dispatchEvent: (event: CustomEvent) => {
        events.push(event);
        return true;
      },
    },
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  });
  let switchAccount = false;
  t.mock.method(globalThis, 'fetch', async (_: unknown, init?: RequestInit) => {
    // No AbortSignal is passed: unmounting the dialog cannot cancel it.
    assert.equal(init?.signal ?? null, null);
    if (switchAccount) advanceSessionRevision();
    return init?.method === 'DELETE'
      ? new Response(null, { status: 204 })
      : Response.json({
          userId: other,
          displayName: '하은',
          nickname: '하은',
          blockedAt: 'x',
        });
  });
  assert.equal(await setBlocked(other, true), true);
  assert.equal(await setBlocked(other, false), true);
  assert.deepEqual(
    events.map((event) => [event.type, event.detail]),
    [
      [BLOCKS_CHANGED, { userId: other, blocked: true }],
      [BLOCKS_CHANGED, { userId: other, blocked: false }],
    ]
  );
  switchAccount = true;
  assert.equal(await setBlocked(other, true), false);
  assert.equal(events.length, 2);
});

test('a roster refresh after a block keeps the rows until the new page replaces them', () => {
  assert.equal(clearsRosterBeforeLoad(null, true), false);
  assert.equal(clearsRosterBeforeLoad(null, false), true);
  assert.equal(clearsRosterBeforeLoad('cursor', false), false);
  const a = {
    userId: 'a',
    displayName: 'A',
    nickname: 'A',
    role: 'OWNER',
    joinedAt: null,
  } as const;
  const b = {
    userId: 'b',
    displayName: 'B',
    nickname: 'B',
    role: 'MEMBER',
    joinedAt: null,
  } as const;
  const bBlocked = { ...b, blockedByMe: true };
  assert.deepEqual(mergeRosterPage([a, b], [a, bBlocked], false), [
    a,
    bBlocked,
  ]);
  assert.deepEqual(mergeRosterPage([a, b], [bBlocked], true), [a, bBlocked]);
});

test('notification-opened viewer maps its uploader and closes when that uploader is blocked', () => {
  const target = {
    latestSequence: 1,
    groupId: 'g',
    albumId: 'al',
    photoId: 'p',
    commentId: null,
    uploader: { id: other, displayName: '하은', nickname: '하은' },
  };
  assert.deepEqual(uploaderOf(target), { authorId: other, authorName: '하은' });
  assert.equal(
    targetViewerAfterBlock(other, { userId: other, blocked: true }),
    'close'
  );
  assert.equal(
    targetViewerAfterBlock(other, { userId: me, blocked: true }),
    'recheck'
  );
  assert.equal(
    targetViewerAfterBlock('', { userId: other, blocked: true }),
    'recheck'
  );
  assert.equal(
    targetViewerAfterBlock(other, { userId: other, blocked: false }),
    'keep'
  );
});

test('a block purges their photos and covers of unknown uploader until albums reload', () => {
  const photos = [
    { id: 'theirs', authorId: other },
    { id: 'cover', authorId: '' },
    { id: 'mine', authorId: me },
  ];
  const { kept, removed } = purgeOnBlock(photos, other);
  assert.deepEqual(
    kept.map((p) => p.id),
    ['mine']
  );
  assert.deepEqual(
    removed.map((p) => p.id),
    ['theirs', 'cover']
  );
});
