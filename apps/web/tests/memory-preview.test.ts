import test from 'node:test';
import assert from 'node:assert/strict';
import type { MemoryCard } from '../src/dto/memories.dto.ts';
import {
  MemoryPreviewRequests,
  reconcileMemoryPreviews,
} from '../src/services/memory-preview.ts';

function card(
  thumbnail: string,
  previewStatus?: MemoryCard['previewStatus']
): MemoryCard {
  return {
    photo: {
      id: 'photo',
      groupId: 'group',
      albumId: 'album',
      width: 800,
      height: 600,
      createdAt: '2026-01-01',
      capturedAt: null,
      status: 'READY',
      canDelete: false,
    },
    albumTitle: 'Album',
    effectiveDate: '2026-01-01',
    dateSource: 'UPLOAD',
    yearsAgo: 1,
    thumbnail,
    previewStatus,
  };
}

test('delayed memory refresh keeps a successful retry and discards its stale preview', async () => {
  const captured = [card('blob:old')];
  let current = [card('blob:old', 'error')];
  let resolve!: (value: MemoryCard[]) => void;
  const incoming = new Promise<MemoryCard[]>((done) => {
    resolve = done;
  });
  const refresh = incoming.then((cards) => {
    current = reconcileMemoryPreviews(cards, current, captured);
  });
  current = [card('blob:retry')];
  resolve([{ ...card('blob:old'), albumTitle: 'Updated album' }]);
  await refresh;
  assert.equal(current[0].thumbnail, 'blob:retry');
  assert.equal(current[0].previewStatus, undefined);
  assert.equal(current[0].albumTitle, 'Updated album');
  const kept = new Set(current.map((item) => item.thumbnail));
  assert.equal(kept.has('blob:old'), false);
  assert.equal(kept.has('blob:retry'), true);
});

test('refresh settling before a retry keeps its identity so completion can replace loading', () => {
  const captured = [card('', 'error')];
  let current = [card('', 'loading')];
  current = reconcileMemoryPreviews([card('blob:refresh')], current, captured);
  assert.equal(current[0].thumbnail, '');
  assert.equal(current[0].previewStatus, 'loading');
  current = current.map((item) =>
    item.thumbnail === ''
      ? { ...item, thumbnail: 'blob:retry', previewStatus: undefined }
      : item
  );
  assert.equal(current[0].thumbnail, 'blob:retry');
  assert.equal(current[0].previewStatus, undefined);
});

test('refresh may repair an unchanged failed card but never restores a server-removed card', () => {
  const failed = [card('', 'error')];
  assert.equal(
    reconcileMemoryPreviews([card('blob:refreshed')], failed, failed)[0]
      .thumbnail,
    'blob:refreshed'
  );
  assert.deepEqual(
    reconcileMemoryPreviews([], [card('blob:retry')], failed),
    []
  );
});

test('a late image decoding or permission error survives an older metadata refresh', () => {
  const captured = [card('blob:old')];
  for (const status of ['error', 'unavailable'] as const) {
    const result = reconcileMemoryPreviews(
      [card('blob:old')],
      [card('blob:old', status)],
      captured
    );
    assert.equal(result[0].previewStatus, status);
  }
});

test('list cancellation does not strand a retry, while replacing the card request cancels the old one', () => {
  const requests = new MemoryPreviewRequests();
  const list = new AbortController();
  const first = requests.start('photo');
  list.abort();
  assert.equal(requests.isCurrent('photo', first), true);
  const second = requests.start('photo');
  assert.equal(first.signal.aborted, true);
  requests.finish('photo', first);
  assert.equal(requests.isCurrent('photo', second), true);
  requests.finish('photo', second);
  assert.equal(requests.isCurrent('photo', second), false);
});

test('hiding/removing a card and changing group/account/tab invalidate pending responses', () => {
  const requests = new MemoryPreviewRequests();
  const hidden = requests.start('hidden');
  const visible = requests.start('visible');
  requests.cancel('hidden');
  assert.equal(hidden.signal.aborted, true);
  assert.equal(requests.isCurrent('visible', visible), true);
  requests.cancelAll();
  assert.equal(visible.signal.aborted, true);
  assert.equal(requests.isCurrent('visible', visible), false);
});
