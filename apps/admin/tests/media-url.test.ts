import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticatedMediaUrl } from '../src/utils/media-url.ts';

test('media URLs resolve only to the configured API and the requested content path', (t) => {
  const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.woori.stream';
  t.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previous;
  });
  const path = '/v1/photos/photo/video/content';
  const url = `https://api.woori.stream${path}?ticket=opaque`;
  assert.equal(authenticatedMediaUrl(`${path}?ticket=opaque`, path), url);
  assert.equal(authenticatedMediaUrl(url, path), url);
  for (const rejected of [
    `https://storage.example${path}`,
    `https://api.woori.stream.evil.example${path}`,
    `https://user:password@api.woori.stream${path}`,
    `http://api.woori.stream${path}`,
    `${path}#unexpected`,
    '/v1/photos/another/video/content',
    'javascript:alert(1)',
    'data:video/mp4,test',
  ])
    assert.throws(() => authenticatedMediaUrl(rejected, path));
});
