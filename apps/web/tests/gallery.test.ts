import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listAlbums, validPoint } from '../src/lib/gallery.ts';
const albums = [
  {
    id: 'a',
    groupId: 'one',
    title: '가족 여행',
    startDate: '2026-01-01',
    endDate: '2026-01-01',
    createdAt: '2026-01-02',
    coverId: '',
  },
  {
    id: 'b',
    groupId: 'two',
    title: '가족 여행',
    startDate: '2026-02-01',
    endDate: '2026-02-01',
    createdAt: '2026-02-02',
    coverId: '',
  },
];
test('album search never includes a different selected group', () => {
  assert.deepEqual(
    listAlbums(
      { groups: [], albums, photos: [], comments: [], reactions: [] },
      'one',
      ' 여행 ',
      'recent'
    ).map((a) => a.id),
    ['a']
  );
});
test('normalized pin coordinates reject non-finite and out-of-image values', () => {
  assert.equal(validPoint({ x: NaN, y: 0.5 }), false);
  assert.equal(validPoint({ x: 1.01, y: 0.5 }), false);
  assert.equal(validPoint({ x: 0, y: 1 }), true);
  assert.equal(validPoint(undefined), true);
});
test('album period shows a range, one date for a single day, and "사진 0장" without photos', async () => {
  const { albumMeta, albumPeriod } = await import('../src/lib/gallery.ts');
  const createdAt = '2026-10-01T03:00:00.000Z';
  assert.equal(
    albumPeriod({ startDate: '2026-10-03', endDate: '2026-10-15', createdAt }),
    '2026.10.03 ~ 2026.10.15'
  );
  assert.equal(
    albumPeriod({ startDate: '2026-10-03', endDate: '2026-10-03', createdAt }),
    '2026.10.03'
  );
  assert.equal(
    albumPeriod({ startDate: '2025-12-30', endDate: '2026-01-02', createdAt }),
    '2025.12.30 ~ 2026.01.02',
    'a range across years keeps both full dates'
  );
  assert.equal(
    albumPeriod({ startDate: null, endDate: null, createdAt }),
    null
  );
  assert.equal(
    albumMeta({ startDate: null, endDate: null, createdAt }, 0),
    '사진 0장'
  );
  assert.equal(
    albumMeta(
      { startDate: '2026-10-03', endDate: '2026-10-15', createdAt },
      12
    ),
    '2026.10.03 ~ 2026.10.15 · 사진 12장'
  );
  // Defensive: one-sided or reversed values still read as dates.
  assert.equal(
    albumPeriod({ startDate: '2026-10-03', endDate: null, createdAt }),
    '2026.10.03'
  );
  assert.equal(
    albumPeriod({ startDate: '2026-10-15', endDate: '2026-10-03', createdAt }),
    '2026.10.03 ~ 2026.10.15'
  );
  // A server before OpenAPI 0.21.0 omits the period: keep the creation date.
  assert.equal(albumMeta({ createdAt }, 4), '2026.10.01 · 사진 4장');
});
test('demo previews widen the period and taken-date sort uses the latest photo', async () => {
  const { periodWith } = await import('../src/lib/gallery.ts');
  assert.deepEqual(
    periodWith({ startDate: null, endDate: null }, '2026-10-16'),
    {
      startDate: '2026-10-16',
      endDate: '2026-10-16',
    }
  );
  assert.deepEqual(
    periodWith(
      { startDate: '2026-07-18', endDate: '2026-07-21' },
      '2026-10-16'
    ),
    { startDate: '2026-07-18', endDate: '2026-10-16' }
  );
  assert.deepEqual(
    periodWith(
      { startDate: '2026-07-18', endDate: '2026-07-21' },
      '2026-07-01'
    ),
    { startDate: '2026-07-01', endDate: '2026-07-21' }
  );
  const dated = [
    { ...albums[0], id: 'old', startDate: '2025-01-01', endDate: '2025-01-02' },
    { ...albums[0], id: 'empty', startDate: null, endDate: null },
    { ...albums[0], id: 'new', startDate: '2026-03-01', endDate: '2026-09-01' },
  ];
  assert.deepEqual(
    listAlbums(
      { groups: [], albums: dated, photos: [], comments: [], reactions: [] },
      'one',
      '',
      'taken'
    ).map((a) => a.id),
    ['new', 'old', 'empty']
  );
});
test('a cover says it is a video when the server tells (0.24.0); older servers leave it unknown', async () => {
  const { coverPhoto } = await import('../src/lib/gallery.ts');
  const album = {
    id: 'a',
    title: '여름',
    createdAt: '2026-10-01T00:00:00Z',
    coverPhotoId: 'v1',
  };
  const size = { width: 480, height: 270 };
  const video = coverPhoto(
    { ...album, coverMediaKind: 'VIDEO' },
    'blob:c',
    size
  );
  assert.deepEqual([video.mediaKind, video.durationMs], ['VIDEO', null]);
  assert.equal(coverPhoto(album, 'blob:c', size).mediaKind, undefined);
  assert.equal(
    coverPhoto({ ...album, coverMediaKind: null }, 'blob:c', size).mediaKind,
    undefined
  );
  assert.equal(
    coverPhoto({ ...album, coverMediaKind: 'PHOTO' }, 'blob:c', size).mediaKind,
    'PHOTO'
  );
});
