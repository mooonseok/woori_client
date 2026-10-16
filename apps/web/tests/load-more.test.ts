import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMoreAfterRefresh } from '../src/utils/load-more.ts';

test('a "더 보기" overtaken by a refresh waits for it, then loads after its window', async () => {
  const events: string[] = [];
  let cursor = 'old-end',
    superseded = true;
  const result = await loadMoreAfterRefresh(
    async () => {
      events.push(`load ${cursor}`);
      if (superseded) {
        superseded = false;
        return { superseded: true };
      }
      return { superseded: false, value: [`after ${cursor}`] };
    },
    async () => {
      events.push('refresh landed');
      cursor = 'refreshed-end';
    }
  );
  assert.deepEqual(result, {
    superseded: false,
    value: ['after refreshed-end'],
  });
  assert.deepEqual(events, [
    'load old-end',
    'refresh landed',
    'load refreshed-end',
  ]);
});

test('a "더 보기" overtaken every time is reported (never silently lost); a failed refresh still retries', async () => {
  let attempts = 0;
  const lost = await loadMoreAfterRefresh(
    async () => {
      attempts++;
      return { superseded: true };
    },
    async () => {
      throw new Error('refresh failed');
    }
  );
  assert.deepEqual(lost, { superseded: true });
  assert.equal(attempts, 3);
  // Errors from the page itself reach the caller, which shows them.
  await assert.rejects(
    loadMoreAfterRefresh(
      async () => {
        throw new Error('잠시 후 다시 시도해 주세요.');
      },
      async () => {}
    ),
    /잠시 후/
  );
});
