import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  finishLoad,
  freshLoad,
  startLoad,
  type LoadState,
} from '../src/utils/load-state.ts';
import { photoWindow } from '../src/services/list-window.ts';

// How the gallery combines its groups and albums loads for GalleryStatus.
const screen = (groups: LoadState, albums: LoadState) => ({
  loading: groups.loading || albums.loading,
  error: groups.error || albums.error,
});

test('a first load shows loading and its failure shows the error screen', () => {
  const start = startLoad(freshLoad('g1'), 'g1');
  assert.equal(start.background, false);
  assert.equal(start.state.loading, true);
  const failed = finishLoad(start.state, 'g1', start.background, '연결 실패');
  assert.deepEqual(
    { loading: failed.loading, error: failed.error, loaded: failed.loaded },
    { loading: false, error: '연결 실패', loaded: false }
  );
  // "다시 시도" from the error screen is a first load again, with loading.
  const retry = startLoad(failed, 'g1');
  assert.equal(retry.background, false);
  assert.deepEqual(
    { loading: retry.state.loading, error: retry.state.error },
    { loading: true, error: '' }
  );
  const done = finishLoad(retry.state, 'g1', retry.background);
  assert.deepEqual(done, {
    scope: 'g1',
    loaded: true,
    loading: false,
    error: '',
  });
});

test('a refresh of shown data never swaps the screen, and its failure keeps the data', () => {
  const shown = finishLoad(freshLoad('g1'), 'g1', false);
  const start = startLoad(shown, 'g1');
  assert.equal(start.background, true);
  assert.equal(start.state, shown, 'the screen state is untouched');
  const failed = finishLoad(start.state, 'g1', true, '연결 실패');
  assert.equal(failed, shown, 'no error screen, nothing hidden');
  const again = startLoad(failed, 'g1');
  assert.equal(again.background, true, 'the next refresh is background too');
  assert.equal(finishLoad(again.state, 'g1', true).loading, false);
});

test('switching group or tab starts over and drops the previous scope’s late response', () => {
  const g1 = finishLoad(freshLoad('g1'), 'g1', false);
  const toG2 = startLoad(g1, 'g2');
  assert.equal(toG2.background, false);
  assert.deepEqual(toG2.state, freshLoad('g2'));
  // A late g1 refresh (success or failure) cannot land on g2.
  assert.equal(finishLoad(toG2.state, 'g1', true), toG2.state);
  assert.equal(finishLoad(toG2.state, 'g1', false, '오류'), toG2.state);
  const g2 = finishLoad(toG2.state, 'g2', false);
  assert.equal(g2.loaded, true);
});

test('gallery screen: first load, background focus refresh, failure, then group switch', () => {
  let groups = freshLoad('groups'),
    albums = freshLoad('');
  assert.equal(screen(groups, albums).loading, true, 'first paint is loading');
  groups = finishLoad(startLoad(groups, 'groups').state, 'groups', false);
  albums = freshLoad('g1'); // a group was chosen: still loading, never empty
  assert.equal(screen(groups, albums).loading, true);
  albums = finishLoad(startLoad(albums, 'g1').state, 'g1', false);
  assert.deepEqual(screen(groups, albums), { loading: false, error: '' });
  // Window focus: both refresh in the background and the server is down.
  const g = startLoad(groups, 'groups'),
    a = startLoad(albums, 'g1');
  assert.deepEqual(screen(g.state, a.state), { loading: false, error: '' });
  groups = finishLoad(
    g.state,
    'groups',
    g.background,
    '서버에 연결할 수 없어요.'
  );
  albums = finishLoad(a.state, 'g1', a.background, '서버에 연결할 수 없어요.');
  assert.deepEqual(screen(groups, albums), { loading: false, error: '' });
  // Switching group shows loading at once instead of the old group's albums.
  albums = startLoad(albums, 'g2').state;
  assert.deepEqual(screen(groups, albums), { loading: true, error: '' });
});

function photoServer(
  t: TestContext,
  answer: (cursor: string | null) => Response
) {
  const requested: (string | null)[] = [];
  const original = globalThis.fetch,
    base = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example';
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, '/v1/groups/g/albums/a/photos');
    const cursor = url.searchParams.get('cursor');
    requested.push(cursor);
    return answer(cursor);
  };
  t.after(() => {
    globalThis.fetch = original;
    if (base === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = base;
  });
  return requested;
}
const photos = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({
    id: `p${from + i}`,
    groupId: 'g',
    albumId: 'a',
    width: 1,
    height: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
    capturedAt: null,
    status: 'READY',
    canDelete: false,
  }));

test('a photo grid refresh re-reads the pages on screen and restarts once on a stale cursor', async (t) => {
  let stale = true;
  const requested = photoServer(t, (cursor) => {
    if (!cursor)
      return Response.json({ photos: photos(1, 30), nextCursor: 'p30' });
    if (cursor === 'p30' && stale) {
      stale = false; // p30 was deleted between the two requests
      return Response.json(
        { code: 'PHOTO_NOT_FOUND', message: '없음' },
        { status: 404 }
      );
    }
    return Response.json({ photos: photos(31, 60), nextCursor: 'p60' });
  });
  const window = await photoWindow('g', 'a', 45, new AbortController().signal);
  assert.equal(window.items.length, 60, '"더 보기" pages stay loaded');
  assert.equal(window.nextCursor, 'p60');
  assert.deepEqual(requested, [null, 'p30', null, 'p30']);
});

test('a failing photo grid refresh throws so the hook keeps the grid as it was', async (t) => {
  photoServer(t, () =>
    Response.json({ message: '잠시 후 다시 시도해 주세요.' }, { status: 503 })
  );
  await assert.rejects(
    photoWindow('g', 'a', 30, new AbortController().signal),
    /잠시 후 다시 시도/
  );
});
