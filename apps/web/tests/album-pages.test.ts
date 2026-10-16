import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  albumWindow,
  isCursorInvalid,
  mergeAlbumPage,
  nextAlbumPage,
} from '../src/services/album-pages.ts';
import type { AlbumResponse } from '../src/dto/media.dto.ts';

const album = (n: number): AlbumResponse => ({
  id: `album-${n}`,
  groupId: 'group',
  title: `앨범 ${n}`,
  createdAt: '2026-10-01T00:00:00.000Z',
  photoCount: 1,
  coverPhotoId: null,
  canManage: false,
  startDate: '2026-10-01',
  endDate: '2026-10-01',
});
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => album(from + i));

// Serves `pages[cursor ?? 'first']`; a function entry answers the request itself.
function server(
  t: TestContext,
  pages: Record<string, unknown | ((url: URL) => Response)>
) {
  const requested: string[] = [];
  const original = globalThis.fetch,
    base = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example';
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, '/v1/groups/group/albums');
    assert.equal(init?.credentials, 'include');
    requested.push(url.search);
    const entry = pages[url.searchParams.get('cursor') ?? 'first'];
    if (typeof entry === 'function') return entry(url);
    if (!entry) return Response.json({ message: '없음' }, { status: 500 });
    return Response.json(entry);
  };
  t.after(() => {
    globalThis.fetch = original;
    if (base === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = base;
  });
  return requested;
}
const invalidCursor = () =>
  Response.json(
    { code: 'ALBUM_CURSOR_INVALID', message: '목록이 바뀌었어요.' },
    { status: 400 }
  );
const signal = () => new AbortController().signal;

test('paging ends at a null nextCursor', async (t) => {
  const requested = server(t, {
    first: { albums: range(1, 30), nextCursor: 'c/1' },
    'c/1': { albums: range(31, 40), nextCursor: null },
  });
  const last = await nextAlbumPage('group', 'c/1', signal());
  assert.equal(last.nextCursor, null);
  assert.equal(last.restarted, false);
  assert.deepEqual(requested, ['?cursor=c%2F1']);
});

test('an older server without nextCursor is a single page requested without a query', async (t) => {
  // Exactly the request a server before OpenAPI 0.21.0 already accepts.
  const legacy = server(t, { first: { albums: range(1, 3) } });
  const window = await albumWindow('group', 50, signal());
  assert.equal(window.nextCursor, null);
  assert.equal(window.albums.length, 3);
  assert.deepEqual(legacy, ['']);
});

test('a failed "더 불러오기" keeps list and cursor, and the retry appends without duplicates', async (t) => {
  let fail = true;
  server(t, {
    c1: () => {
      if (!fail)
        return Response.json({ albums: range(30, 45), nextCursor: null });
      fail = false;
      return Response.json(
        { message: '잠시 후 다시 시도해 주세요.' },
        { status: 503 }
      );
    },
  });
  // What the gallery holds after page one.
  const state = { albums: range(1, 30), nextCursor: 'c1' as string | null };
  await assert.rejects(
    nextAlbumPage('group', state.nextCursor!, signal()),
    /잠시 후 다시 시도/
  );
  assert.equal(state.albums.length, 30);
  const page = await nextAlbumPage('group', state.nextCursor!, signal());
  const merged = mergeAlbumPage(state.albums, page.albums, page.restarted);
  assert.equal(merged.items.length, 45, 'album 30 is not shown twice');
  assert.equal(
    merged.added[0].id,
    'album-31',
    'focus goes to the first new card'
  );
  assert.equal(page.nextCursor, null);
});

test('an invalid or stale cursor restarts from the first page; other errors do not', async (t) => {
  const requested = server(t, {
    first: { albums: range(1, 30), nextCursor: 'fresh' },
    stale: invalidCursor,
    bad: () =>
      Response.json(
        { code: 'VALIDATION_FAILED', message: '잘못된 요청' },
        { status: 400 }
      ),
  });
  const page = await nextAlbumPage('group', 'stale', signal());
  assert.equal(page.restarted, true);
  assert.equal(page.nextCursor, 'fresh');
  assert.deepEqual(requested, ['?cursor=stale', '']);
  const merged = mergeAlbumPage(range(1, 60), page.albums, page.restarted);
  assert.equal(merged.items.length, 30, 'the restarted page replaces the list');
  await assert.rejects(nextAlbumPage('group', 'bad', signal()), /잘못된 요청/);
  assert.equal(
    isCursorInvalid({ status: 400, code: 'ALBUM_CURSOR_INVALID' }),
    true
  );
  assert.equal(
    isCursorInvalid({ status: 404, code: 'ALBUM_CURSOR_INVALID' }),
    false
  );
  // A request aborted by a group switch never restarts.
  const controller = new AbortController();
  const aborted = nextAlbumPage('group', 'stale', controller.signal);
  controller.abort();
  await assert.rejects(aborted);
});

test('a refresh re-reads the loaded window so "더 불러오기" pages survive, bounded', async (t) => {
  let invalidOnce = true;
  const requested = server(t, {
    first: { albums: range(1, 30), nextCursor: 'p2' },
    p2: () => {
      if (invalidOnce) {
        invalidOnce = false;
        return invalidCursor();
      }
      return Response.json({ albums: range(31, 60), nextCursor: 'p3' });
    },
    p3: { albums: range(61, 90), nextCursor: 'p4' },
  });
  // A cursor invalidated mid-pass (album deleted) restarts the pass once.
  const window = await albumWindow('group', 45, signal());
  assert.equal(window.albums.length, 60);
  assert.equal(window.nextCursor, 'p3');
  assert.deepEqual(requested, ['', '?cursor=p2', '', '?cursor=p2']);
  requested.length = 0;
  const first = await albumWindow('group', 0, signal());
  assert.equal(first.albums.length, 30, 'a fresh group reads one page');
  requested.length = 0;
  const capped = await albumWindow('group', 500, signal(), 2);
  assert.equal(capped.albums.length, 60);
  assert.equal(capped.nextCursor, 'p3', 'the rest stays behind "더 불러오기"');
  assert.equal(requested.length, 2);
});

test('a refresh reads as many pages as are shown (up to 600 albums) and flags a capped window', async (t) => {
  const { MAX_WINDOW_ROWS, windowPages, withTail } =
    await import('../src/services/list-window.ts');
  assert.equal(MAX_WINDOW_ROWS, 600, 'album links page on exactly as far');
  assert.equal(windowPages(0), 1);
  assert.equal(windowPages(350), 13);
  assert.equal(windowPages(5000), 20);
  const all = range(1, 1000);
  const requested = server(t, {
    first: { albums: all.slice(0, 30), nextCursor: 'c30' },
    ...Object.fromEntries(
      Array.from({ length: 33 }, (_, i) => [
        `c${(i + 1) * 30}`,
        {
          albums: all.slice((i + 1) * 30, (i + 2) * 30),
          nextCursor: (i + 2) * 30 < all.length ? `c${(i + 2) * 30}` : null,
        },
      ])
    ),
  });
  // Album 350 opened from a link stays listed after a refresh.
  const shown350 = await albumWindow('group', 350, signal());
  assert.equal(shown350.albums.length, 360);
  assert.equal(shown350.capped, false);
  assert.ok(shown350.albums.some((a) => a.id === 'album-350'));
  assert.equal(requested.length, 12);
  // Beyond the limit the window stops, and the caller keeps the rest shown.
  const shown900 = await albumWindow('group', 900, signal());
  assert.equal(shown900.albums.length, 600);
  assert.equal(shown900.capped, true);
  const kept = withTail(shown900.albums, all.slice(0, 900), shown900.capped);
  assert.equal(kept.length, 900);
  assert.equal(kept[899].id, 'album-900');
  assert.equal(
    withTail(shown350.albums, all.slice(0, 350), false),
    shown350.albums
  );
});
