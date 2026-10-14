import test from 'node:test';
import assert from 'node:assert/strict';
import {
  notificationDefaults,
  notificationQuietAt,
  notificationDecision,
  notificationKstTime,
  insertNotification,
  parseNotificationPreferences,
} from '../../apps/web/src/utils/notification-policy.ts';

test('quiet hours cross midnight, include start and exclude end in KST', () => {
  const preferences = { ...notificationDefaults(), quiet: true };
  for (const time of ['22:00', '23:59', '00:00', '07:59'])
    assert.equal(notificationQuietAt(preferences, time), true);
  for (const time of ['08:00', '21:59'])
    assert.equal(notificationQuietAt(preferences, time), false);
  assert.equal(notificationKstTime(new Date('2026-10-13T15:15:00Z')), '00:15');
});
test('group preference cannot re-enable a disabled category', () => {
  const preferences = {
    ...notificationDefaults(),
    comments: false,
    groups: { g1: 'mine' },
  };
  assert.equal(
    notificationDecision('comment', preferences, 'g1', '12:00').eligible,
    false
  );
  assert.equal(
    notificationDecision('photos', preferences, 'g1', '12:00').eligible,
    false
  );
  assert.equal(
    notificationDecision('reaction', preferences, 'g1', '12:00').eligible,
    true
  );
});
test('reaction grouping uses fixed 5 minute window and marks new activity unread', () => {
  const base = {
    id: 'first',
    type: 'reaction',
    photoId: 'p129',
    groupId: 'g1',
    title: '첫 반응',
    timestamp: 1000,
    createdAt: 1000,
    read: true,
    count: 1,
  };
  const second = {
    ...base,
    id: 'second',
    timestamp: 250000,
    createdAt: 250000,
    title: '두 번째 반응',
  };
  const grouped = insertNotification([base], second);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].count, 2);
  assert.equal(grouped[0].read, false);
  assert.equal(grouped[0].createdAt, 1000);
  assert.equal(
    insertNotification(grouped, { ...second, id: 'third', timestamp: 301000 })
      .length,
    2
  );
});
test('notifications from different photos or groups are never merged', () => {
  const base = {
    id: 'a',
    type: 'reaction',
    photoId: 'p129',
    groupId: 'g1',
    title: '반응',
    timestamp: 1000,
    createdAt: 1000,
    read: false,
    count: 1,
  };
  assert.equal(
    insertNotification([base], { ...base, id: 'b', photoId: 'p289' }).length,
    2
  );
  assert.equal(
    insertNotification([base], { ...base, id: 'b', groupId: 'g2' }).length,
    2
  );
});

test('stored preferences are versioned and malformed fields cannot override defaults', () => {
  const defaults = notificationDefaults();
  assert.deepEqual(
    parseNotificationPreferences({
      version: 0,
      preferences: { master: false },
    }),
    defaults
  );
  const parsed = parseNotificationPreferences({
    version: 1,
    preferences: {
      master: false,
      photos: 'yes',
      quietStart: '29:99',
      groups: { g1: 'off', g2: 'unexpected', 'not a group': 'off' },
    },
  });
  assert.equal(parsed.master, false);
  assert.equal(parsed.photos, true);
  assert.equal(parsed.quietStart, '22:00');
  assert.deepEqual(parsed.groups, { g1: 'off', g2: 'default' });
  assert.deepEqual(parseNotificationPreferences(null), defaults);
});

test('newly created group IDs survive preference reload', () => {
  const id = 'c3f27417-9d77-4d0a-9b0d-951cad776005';
  const preferences = { ...notificationDefaults(), groups: { [id]: 'off' } };
  const restored = parseNotificationPreferences({ version: 1, preferences });
  assert.equal(restored.groups[id], 'off');
  assert.equal(
    notificationDecision('photos', restored, id, '12:00').eligible,
    false
  );
});
test('legacy preview group IDs map to current gallery IDs without overriding newer entries', () => {
  const mapped = parseNotificationPreferences({
    version: 1,
    preferences: { groups: { family: 'off', walk: 'mine' } },
  });
  assert.deepEqual(mapped.groups, { g1: 'off', g2: 'mine' });
  const current = parseNotificationPreferences({
    version: 1,
    preferences: { groups: { family: 'off', g1: 'default' } },
  });
  assert.equal(current.groups.g1, 'default');
  assert.equal(Object.hasOwn(current.groups, 'family'), false);
});
