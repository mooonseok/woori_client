import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../src/services/notifications.ts';
import {
  notificationModel,
  preferenceModel,
  preferencePatch,
  mergeNotificationItems,
} from '../src/utils/notification-model.ts';
import type {
  InboxNotification,
  NotificationPreferencesResponse,
} from '../src/dto/notification-api.dto.ts';
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
const row: InboxNotification = {
  id: 'notification',
  kind: 'PIN',
  groupId: 'group',
  groupName: '가족',
  actor: { id: 'member', displayName: '가족' },
  albumId: 'album',
  albumTitle: '여름',
  photoId: 'photo',
  commentId: 'comment',
  count: 1,
  createdAt: '2026-10-14T00:00:00Z',
  latestAt: '2026-10-14T00:00:00Z',
  latestSequence: 3,
  readThroughSequence: 1,
  unread: true,
  navigation: 'COMMENT',
};
const settings: NotificationPreferencesResponse = {
  preferences: {
    enabled: false,
    photos: true,
    comments: false,
    reactions: true,
    join: true,
    memories: false,
    preview: false,
    quietEnabled: true,
    quietStartMinute: 1320,
    quietEndMinute: 480,
    timeZone: 'Asia/Seoul',
    version: 7,
  },
  groups: [{ groupId: 'group', groupName: '가족', mode: 'MINE' }],
};
test('inbox mapping preserves server unread/sequence, actual group and pin target without fabricating image URLs', () => {
  const item = notificationModel(row);
  assert.equal(item.read, false);
  assert.equal(item.latestSequence, 3);
  assert.equal(item.commentId, 'comment');
  assert.equal(item.groupName, '가족');
  assert.equal(item.title, '가족님이 위치 댓글을 남겼어요');
  assert.equal(notificationModel({ ...row, unread: false }).read, true);
  // OpenAPI 0.20.0: the server copy of an id replaces the shown one.
  assert.deepEqual(
    mergeNotificationItems(
      [{ ...item, read: true }],
      [item, { ...item, id: 'older', timestamp: item.timestamp - 1 }]
    ),
    [item, { ...item, id: 'older', timestamp: item.timestamp - 1 }]
  );
});
test('preferences map DB minutes and group modes; patch carries optimistic version and omits unsupported switches', () => {
  const mapped = preferenceModel(settings);
  assert.equal(mapped.master, false);
  assert.equal(mapped.quietStart, '22:00');
  assert.equal(mapped.quietEnd, '08:00');
  assert.deepEqual(mapped.groups, { group: 'mine' });
  assert.deepEqual(
    preferencePatch({ ...mapped, quietStart: '00:05', quietEnd: '23:59' }, 7),
    {
      version: 7,
      enabled: false,
      photos: true,
      comments: false,
      reactions: true,
      quietEnabled: true,
      quietStartMinute: 5,
      quietEndMinute: 1439,
      preview: false,
    }
  );
});
test('notification requests use authenticated no-store, encoded cursors and observed read sequences', async (t) => {
  const requests: { url: string; method: string; body: unknown }[] = [];
  const signal = new AbortController().signal;
  setup(t, async (input, init) => {
    assert.equal(init?.credentials, 'include');
    assert.equal(init?.cache, 'no-store');
    assert.equal(init?.signal, signal);
    if (init?.method)
      assert.equal(new Headers(init.headers).get('X-Woori-Request'), '1');
    requests.push({
      url: String(input),
      method: init?.method || 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    return Response.json({});
  });
  await api.listNotifications('id+cursor/with?chars', signal);
  await api.readNotification('note/id', 3, signal);
  await api.readNotifications([{ id: 'note', throughSequence: 3 }], signal);
  await api.notificationTarget('note/id', signal);
  assert.equal(
    new URL(requests[0].url).searchParams.get('cursor'),
    'id+cursor/with?chars'
  );
  assert.deepEqual(requests[1], {
    url: 'https://api.example/v1/notifications/note%2Fid/read',
    method: 'PATCH',
    body: { throughSequence: 3 },
  });
  assert.deepEqual(requests[2].body, {
    notifications: [{ id: 'note', throughSequence: 3 }],
  });
  assert.equal(
    requests[3].url,
    'https://api.example/v1/notifications/note%2Fid/target'
  );
});
test('group overrides and account writes use shared optimistic version and preserve conflicts', async (t) => {
  const signal = new AbortController().signal;
  let conflict = false;
  setup(t, async (input, init) => {
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    if (String(input).endsWith('/groups/group'))
      assert.deepEqual(body, { mode: 'OFF', version: 7 });
    if (conflict)
      return Response.json(
        { message: 'PREFERENCES_CONFLICT' },
        { status: 409 }
      );
    return Response.json(settings);
  });
  const result = await api.setGroupNotificationPreference(
    'group',
    'OFF',
    7,
    signal
  );
  assert.equal(result.preferences.version, 7);
  conflict = true;
  await assert.rejects(
    api.patchNotificationPreferences({ version: 7, enabled: false }, signal),
    (error: unknown) =>
      error instanceof Error && 'status' in error && error.status === 409
  );
});
test('target permission failures and cancelled list requests never become successful empty inboxes', async (t) => {
  const controller = new AbortController();
  setup(t, async (_input, init) => {
    if (init?.signal?.aborted) throw new DOMException('aborted', 'AbortError');
    return Response.json(
      { message: '이 사진을 볼 수 없어요.' },
      { status: 404 }
    );
  });
  await assert.rejects(
    api.notificationTarget('note', controller.signal),
    /볼 수 없어요/
  );
  controller.abort();
  await assert.rejects(
    api.listNotifications(null, controller.signal),
    /aborted/
  );
});
