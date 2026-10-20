import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  avatarFileProblem,
  avatarImageUrl,
  removeAvatar,
  uploadAvatar,
} from '../src/services/avatar.ts';
import { advanceSessionRevision } from '../src/services/api-client.ts';
import { commentModel } from '../src/utils/photo-interactions.ts';

async function withApi(
  handler: (request: Request) => Response | Promise<Response>,
  run: (calls: Request[]) => Promise<void>
) {
  const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
  const original = globalThis.fetch;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
  const calls: Request[] = [];
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    calls.push(request);
    return handler(request);
  };
  try {
    await run(calls);
  } finally {
    globalThis.fetch = original;
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previous;
  }
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const user = { id: 'me', avatarVersion: 1 };

test('only JPG, PNG and WebP up to 10MB are sent', () => {
  assert.equal(avatarFileProblem({ type: 'image/jpeg', size: 1 }), '');
  assert.equal(
    avatarFileProblem({ type: 'image/webp', size: 10 * 1024 * 1024 }),
    ''
  );
  assert.match(avatarFileProblem({ type: 'image/heic', size: 1 }), /HEIC/);
  assert.match(avatarFileProblem({ type: 'image/png', size: 0 }), /빈 파일/);
  assert.match(
    avatarFileProblem({ type: 'image/png', size: 10 * 1024 * 1024 + 1 }),
    /10MB/
  );
});

test('upload reserves, PUTs to storage without cookies, then completes', async () => {
  await withApi(
    async (request) => {
      if (request.url.endsWith('/v1/auth/profile/avatar/uploads'))
        return json(
          {
            uploadId: 'upload-1',
            uploadUrl: 'https://storage.example.test/put',
            headers: { 'Content-Type': 'image/jpeg' },
            expiresAt: new Date(Date.now() + 600_000).toISOString(),
          },
          201
        );
      if (request.url === 'https://storage.example.test/put')
        return new Response(null, { status: 200 });
      return json({ user });
    },
    async (calls) => {
      const file = new Blob(['jpeg'], { type: 'image/jpeg' });
      const result = await uploadAvatar(file, new AbortController().signal);
      assert.deepEqual(result, { user });
      assert.deepEqual(await calls[0].json(), {
        contentType: 'image/jpeg',
        bytes: 4,
      });
      assert.equal(calls[0].headers.get('X-Woori-Request'), '1');
      assert.equal(calls[1].method, 'PUT');
      assert.equal(calls[1].credentials, 'omit');
      assert.equal(calls[1].headers.get('Content-Type'), 'image/jpeg');
      assert.equal(calls[1].headers.get('X-Woori-Request'), null);
      assert.ok(calls[2].url.endsWith('/v1/auth/profile/avatar/complete'));
      assert.deepEqual(await calls[2].json(), { uploadId: 'upload-1' });
    }
  );
});

test('a rejected storage PUT never completes the upload', async () => {
  await withApi(
    (request) =>
      request.url.endsWith('/uploads')
        ? json(
            {
              uploadId: 'upload-2',
              uploadUrl: 'https://storage.example.test/put',
              headers: { 'Content-Type': 'image/png' },
              expiresAt: new Date(Date.now() + 600_000).toISOString(),
            },
            201
          )
        : new Response(null, { status: 403 }),
    async (calls) => {
      await assert.rejects(
        uploadAvatar(
          new Blob(['png'], { type: 'image/png' }),
          new AbortController().signal
        ),
        /사진을 올리지 못했어요/
      );
      assert.equal(calls.length, 2);
    }
  );
});

test('removal is a DELETE with the mutation header', async () => {
  await withApi(
    () => json({ user: { ...user, avatarVersion: null } }),
    async (calls) => {
      assert.equal((await removeAvatar()).user.avatarVersion, null);
      assert.equal(calls[0].method, 'DELETE');
      assert.equal(calls[0].headers.get('X-Woori-Request'), '1');
    }
  );
});

test('avatar images are fetched once per person, version and size, and dropped on a new session', async () => {
  await withApi(
    (request) =>
      request.url.includes('/v1/users/hidden/')
        ? json({ code: 'AVATAR_NOT_FOUND' }, 404)
        : new Response(new Blob(['webp'], { type: 'image/webp' })),
    async (calls) => {
      const first = await avatarImageUrl('u1', 2, 128);
      assert.match(first ?? '', /^blob:/);
      assert.equal(await avatarImageUrl('u1', 2, 128), first);
      assert.equal(calls.length, 1);
      assert.ok(calls[0].url.endsWith('/v1/users/u1/avatar?size=128&v=2'));
      assert.equal(calls[0].credentials, 'include');
      // A new version or size is another image.
      await avatarImageUrl('u1', 3, 128);
      await avatarImageUrl('u1', 3, 512);
      assert.equal(calls.length, 3);
      // Hidden stays hidden without asking again.
      assert.equal(await avatarImageUrl('hidden', 1, 128), null);
      assert.equal(await avatarImageUrl('hidden', 1, 128), null);
      assert.equal(calls.length, 4);
      advanceSessionRevision();
      await avatarImageUrl('u1', 2, 128);
      assert.equal(calls.length, 5);
    }
  );
});

test('comment authors carry their photo version', () => {
  const comment = {
    id: 'c',
    photoId: 'p',
    author: {
      id: 'a',
      displayName: '하늘',
      nickname: '하늘',
      avatarVersion: 4,
    },
    body: 'hi',
    kind: 'GENERAL' as const,
    x: null,
    y: null,
    createdAt: new Date().toISOString(),
    canEdit: false,
    canDelete: false,
  };
  assert.equal(commentModel(comment).authorAvatarVersion, 4);
  assert.equal(
    commentModel({ ...comment, author: { id: 'a', displayName: '하늘' } })
      .authorAvatarVersion,
    null
  );
});
