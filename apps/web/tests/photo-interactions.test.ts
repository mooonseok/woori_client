import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../src/services/photo-interactions.ts';
import {
  commentModel,
  mergeComments,
} from '../src/utils/photo-interactions.ts';
import type { CommentResponse } from '../src/dto/photo-interactions.dto.ts';
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
const comment: CommentResponse = {
  id: 'comment',
  photoId: 'photo',
  author: { id: 'member', displayName: '구성원' },
  body: '여기!',
  kind: 'PIN',
  x: 0.125,
  y: 0.8,
  createdAt: '2026-10-14T00:00:00Z',
  canEdit: false,
  canDelete: true,
};
test('comment contracts preserve normalized coordinates, permissions and zero-valued pins', () => {
  const mapped = commentModel({ ...comment, x: 0, y: 1 });
  assert.deepEqual(mapped.point, { x: 0, y: 1 });
  assert.equal(mapped.authorId, 'member');
  assert.equal(mapped.canEdit, false);
  assert.equal(mapped.canDelete, true);
  assert.equal(
    commentModel({ ...comment, kind: 'GENERAL', x: null, y: null }).point,
    undefined
  );
});
test('authenticated general/pin create and edit use the nested contract without rescaling coordinates', async (t) => {
  const requests: { url: string; method: string | undefined; body: unknown }[] =
    [];
  setup(t, async (input, init) => {
    assert.equal(init?.credentials, 'include');
    assert.equal(init?.cache, 'no-store');
    assert.equal(new Headers(init?.headers).get('X-Woori-Request'), '1');
    requests.push({
      url: String(input),
      method: init?.method,
      body: JSON.parse(String(init?.body)),
    });
    return Response.json({ comment });
  });
  const signal = new AbortController().signal;
  await api.createComment('photo', ' 안녕 ', undefined, signal);
  await api.createComment('photo', ' 여기 ', { x: 0.125, y: 0.8 }, signal);
  await api.editComment('photo', 'comment', ' 수정 ', signal);
  assert.deepEqual(requests, [
    {
      url: 'https://api.example/v1/photos/photo/comments',
      method: 'POST',
      body: { body: '안녕', kind: 'GENERAL' },
    },
    {
      url: 'https://api.example/v1/photos/photo/comments',
      method: 'POST',
      body: { body: '여기', kind: 'PIN', x: 0.125, y: 0.8 },
    },
    {
      url: 'https://api.example/v1/photos/photo/comments/comment',
      method: 'PATCH',
      body: { body: '수정' },
    },
  ]);
});
test('comment pagination encodes opaque cursor and merges duplicate IDs without losing newer local edits', async (t) => {
  const cursor = 'cursor/with+reserved';
  setup(t, async (input, init) => {
    assert.equal(new URL(String(input)).searchParams.get('cursor'), cursor);
    assert.equal(init?.credentials, 'include');
    return Response.json({ comments: [comment], nextCursor: null, total: 1 });
  });
  const page = await api.listComments(
    'photo',
    cursor,
    new AbortController().signal
  );
  const current = { ...commentModel(comment), body: 'recent edit' };
  const other = { ...commentModel(comment), id: 'older' };
  assert.deepEqual(
    mergeComments([current], [commentModel(page.comments[0]), other]),
    [current, other]
  );
});
test('reaction select/change/remove sends PUT and DELETE and retains server-owned totals/myReaction', async (t) => {
  const methods: string[] = [];
  setup(t, async (_input, init) => {
    const emoji = init?.body ? JSON.parse(String(init.body)).emoji : null;
    methods.push(init?.method || 'GET');
    return Response.json({
      reactions: emoji ? [{ emoji, count: 2 }] : [],
      myReaction: emoji,
      total: emoji ? 2 : 0,
    });
  });
  const signal = new AbortController().signal;
  const first = await api.setReaction('photo', '❤️', signal);
  assert.equal(first.myReaction, '❤️');
  assert.equal(first.total, 2);
  assert.equal((await api.setReaction('photo', '👏', signal)).myReaction, '👏');
  assert.equal((await api.setReaction('photo', null, signal)).myReaction, null);
  assert.deepEqual(methods, ['PUT', 'PUT', 'DELETE']);
});
test('permission/network errors reject writes and preserve the caller cancellation signal', async (t) => {
  const controller = new AbortController();
  let offline = false;
  setup(t, async (_input, init) => {
    assert.equal(init?.signal, controller.signal);
    if (offline) throw new Error('offline');
    return Response.json(
      { message: '댓글 작성자만 수정할 수 있어요.' },
      { status: 403 }
    );
  });
  await assert.rejects(
    api.editComment('photo', 'comment', 'draft', controller.signal),
    /작성자만/
  );
  offline = true;
  await assert.rejects(
    api.createComment('photo', 'draft', undefined, controller.signal),
    /연결/
  );
});
test('comment deletion accepts 204 and keeps the photo and comment IDs scoped', async (t) => {
  setup(t, async (input, init) => {
    assert.equal(
      String(input),
      'https://api.example/v1/photos/photo/comments/comment'
    );
    assert.equal(init?.method, 'DELETE');
    assert.equal(new Headers(init?.headers).get('X-Woori-Request'), '1');
    return new Response(null, { status: 204 });
  });
  await api.deleteComment('photo', 'comment', new AbortController().signal);
});
