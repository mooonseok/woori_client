import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBlobUrlSlot } from '../src/utils/blob-url.ts';

function fakeApi() {
  let n = 0;
  const live = new Set<string>();
  return {
    live,
    api: {
      create: () => {
        const url = `blob:test/${++n}`;
        live.add(url);
        return url;
      },
      revoke: (url: string) => {
        assert.ok(live.delete(url), `revoked twice or unknown: ${url}`);
      },
    },
  };
}
const image = () => new Blob([new Uint8Array([1])], { type: 'image/webp' });

test('a viewer holds one object URL and revokes it on replace and clear', () => {
  const { api, live } = fakeApi();
  const slot = createBlobUrlSlot(api);
  const first = slot.set(image());
  assert.equal(slot.current(), first);
  const second = slot.set(image());
  assert.notEqual(first, second);
  assert.deepEqual([...live], [second]);
  slot.clear();
  assert.equal(slot.current(), null);
  assert.equal(live.size, 0);
  slot.clear();
});

test('closing (unmount, close or admin change) revokes and blocks late responses', () => {
  const { api, live } = fakeApi();
  const slot = createBlobUrlSlot(api);
  slot.set(image());
  slot.close();
  assert.equal(live.size, 0);
  assert.equal(slot.set(image()), null);
  assert.equal(live.size, 0);
  slot.close();
});

test('the default slot works with real object URLs', () => {
  const slot = createBlobUrlSlot();
  const url = slot.set(image());
  assert.match(url ?? '', /^blob:/);
  slot.close();
  assert.equal(slot.current(), null);
});
