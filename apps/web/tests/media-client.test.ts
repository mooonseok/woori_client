import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  uploadPhoto,
  validatePhoto,
  photoBlob,
  ticketExpiring,
} from '../src/services/media-client.ts';
import type { PendingUpload } from '../src/dto/media.dto.ts';
const file = new File(['image'], 'family.jpg', { type: 'image/jpeg' });
const ticket = {
  photoId: 'photo-1',
  uploadUrl: 'https://r2.example/photo-1',
  headers: { 'Content-Type': 'image/jpeg' },
  expiresAt: '2099-01-01T00:00:00Z',
};
const photo = {
  id: 'photo-1',
  albumId: 'album',
  groupId: 'group',
  width: 100,
  height: 80,
  status: 'READY',
};
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
test('upload retains completed PUT on uncertain completion and retries the same photo', async (t) => {
  const urls: string[] = [];
  let failed = true;
  setup(t, async (input, init) => {
    const url = String(input);
    urls.push(url);
    if (url.endsWith('/uploads')) return Response.json(ticket);
    if (url === ticket.uploadUrl) {
      assert.equal(init?.credentials, 'omit');
      assert.equal(init?.body, file);
      return new Response(null, { status: 200 });
    }
    assert.equal(init?.credentials, 'include');
    assert.equal(new Headers(init?.headers).get('X-Woori-Request'), '1');
    if (failed) {
      failed = false;
      throw new Error('lost response');
    }
    return Response.json({ photo });
  });
  const pending: PendingUpload = { uploaded: false },
    signal = new AbortController().signal;
  await assert.rejects(uploadPhoto('group', 'album', file, pending, signal));
  assert.equal(pending.uploaded, true);
  assert.equal(
    (await uploadPhoto('group', 'album', file, pending, signal)).id,
    'photo-1'
  );
  assert.equal(urls.filter((u) => u.endsWith('/uploads')).length, 1);
  assert.equal(urls.filter((u) => u === ticket.uploadUrl).length, 1);
  assert.equal(
    urls.filter((u) => u.endsWith('/photos/photo-1/complete')).length,
    2
  );
});
test('private photo retrieval includes cookies and never caches the response', async (t) => {
  setup(t, async (input, init) => {
    assert.match(
      String(input),
      /\/groups\/group\/albums\/album\/photos\/photo\/content\?variant=thumbnail$/
    );
    assert.equal(init?.credentials, 'include');
    assert.equal(init?.cache, 'no-store');
    return new Response('pixels', {
      headers: { 'Content-Type': 'image/jpeg' },
    });
  });
  assert.equal(
    await (
      await photoBlob(
        'group',
        'album',
        'photo',
        new AbortController().signal,
        'thumbnail'
      )
    ).text(),
    'pixels'
  );
});
test('unsupported and oversized files fail before any upload reservation', async (t) => {
  let requested = false;
  setup(t, async () => {
    requested = true;
    throw new Error('unexpected');
  });
  await assert.rejects(
    uploadPhoto(
      'g',
      'a',
      new File(['x'], 'photo.heic', { type: 'image/heic' }),
      { uploaded: false },
      new AbortController().signal
    ),
    /HEIC/
  );
  assert.throws(
    () =>
      validatePhoto({ type: 'image/jpeg', size: 30 * 1024 * 1024 + 1 } as File),
    /30MB/
  );
  assert.equal(requested, false);
});
test('aborting a PUT never completes or reports a stored photo', async (t) => {
  const controller = new AbortController();
  let completed = false;
  setup(t, async (input) => {
    if (String(input).endsWith('/uploads')) return Response.json(ticket);
    if (String(input) === ticket.uploadUrl) {
      controller.abort();
      throw new DOMException('Aborted', 'AbortError');
    }
    completed = true;
    return Response.json({ photo });
  });
  await assert.rejects(
    uploadPhoto('g', 'a', file, { uploaded: false }, controller.signal),
    { name: 'AbortError' }
  );
  assert.equal(completed, false);
});

test('definitive expired completion permits a new reservation while transient failures preserve the ticket', async (t) => {
  let expired = true;
  setup(t, async (input) => {
    if (String(input).endsWith('/uploads')) return Response.json(ticket);
    if (String(input) === ticket.uploadUrl)
      return new Response(null, { status: 200 });
    if (expired) {
      expired = false;
      return Response.json({ message: 'expired' }, { status: 410 });
    }
    return Response.json({ photo });
  });
  const pending: PendingUpload = { uploaded: false },
    signal = new AbortController().signal;
  await assert.rejects(uploadPhoto('g', 'a', file, pending, signal));
  assert.equal(pending.ticket, undefined);
  assert.equal(pending.uploaded, false);
  assert.equal(
    (await uploadPhoto('g', 'a', file, pending, signal)).id,
    photo.id
  );
});

test('a retry reserves again when its unsent PUT URL is within a minute of expiry', async (t) => {
  const reserved: string[] = [],
    puts: string[] = [];
  let n = 0;
  setup(t, async (input) => {
    const url = String(input);
    if (url.endsWith('/uploads')) {
      const fresh = {
        ...ticket,
        photoId: `photo-${++n}`,
        uploadUrl: `https://r2.example/photo-${n}`,
        // A video window is the server's call (up to an hour); only its
        // expiresAt matters here.
        expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      };
      reserved.push(fresh.photoId);
      return Response.json(fresh);
    }
    if (url.startsWith('https://r2.example/')) {
      puts.push(url);
      return new Response(null, { status: 200 });
    }
    return Response.json({ photo });
  });
  const signal = new AbortController().signal;
  const stale: PendingUpload = {
    uploaded: false,
    ticket: {
      ...ticket,
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
    },
  };
  await uploadPhoto('g', 'a', file, stale, signal);
  assert.deepEqual(reserved, ['photo-1']);
  assert.deepEqual(puts, ['https://r2.example/photo-1']);
  // A ticket with time left, or one whose bytes are already stored, is kept.
  const fresh: PendingUpload = {
    uploaded: false,
    ticket: {
      ...ticket,
      uploadUrl: 'https://r2.example/kept',
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    },
  };
  await uploadPhoto('g', 'a', file, fresh, signal);
  const stored: PendingUpload = {
    uploaded: true,
    ticket: { ...ticket, expiresAt: new Date(Date.now() - 1).toISOString() },
  };
  await uploadPhoto('g', 'a', file, stored, signal);
  assert.deepEqual(reserved, ['photo-1']);
  assert.deepEqual(puts, [
    'https://r2.example/photo-1',
    'https://r2.example/kept',
  ]);
  assert.equal(ticketExpiring({ expiresAt: 'not a date' }), false);
});

test('an already canceled upload never reserves or sends a file', async (t) => {
  let calls = 0;
  setup(t, async () => {
    calls++;
    return Response.json(ticket);
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    uploadPhoto('g', 'a', file, { uploaded: false }, controller.signal),
    { name: 'AbortError' }
  );
  assert.equal(calls, 0);
});

test('album edits and media deletion send authenticated scoped mutations and accept 204', async (t) => {
  const { renameAlbum, deleteAlbum, deletePhoto } =
    await import('../src/services/media-client.ts');
  const calls: { path: string; method: string }[] = [];
  setup(t, async (input, init) => {
    const url = new URL(String(input));
    calls.push({ path: url.pathname, method: init?.method || 'GET' });
    assert.equal(init?.credentials, 'include');
    assert.equal(new Headers(init?.headers).get('X-Woori-Request'), '1');
    if (init?.method === 'PATCH') {
      assert.deepEqual(JSON.parse(String(init.body)), { title: '새 제목' });
      return Response.json({
        album: { id: 'album', title: '새 제목', canManage: true },
      });
    }
    return new Response(null, { status: 204 });
  });
  const signal = new AbortController().signal;
  assert.equal(
    (await renameAlbum('g/1', 'a/1', ' 새 제목 ', signal)).album.title,
    '새 제목'
  );
  assert.equal(await deletePhoto('g/1', 'a/1', 'p/1', signal), undefined);
  assert.equal(await deleteAlbum('g/1', 'a/1', signal), undefined);
  assert.deepEqual(calls, [
    { path: '/v1/groups/g%2F1/albums/a%2F1', method: 'PATCH' },
    { path: '/v1/groups/g%2F1/albums/a%2F1/photos/p%2F1', method: 'DELETE' },
    { path: '/v1/groups/g%2F1/albums/a%2F1', method: 'DELETE' },
  ]);
});

test('original download preserves bytes and derives safe filename from actual MIME', async (t) => {
  const { originalPhoto } = await import('../src/services/media-client.ts');
  const bytes = new Uint8Array([0, 1, 127, 255]);
  setup(t, async (input, init) => {
    assert.equal(
      new URL(String(input)).searchParams.get('variant'),
      'original'
    );
    assert.equal(init?.credentials, 'include');
    assert.equal(init?.cache, 'no-store');
    return new Response(bytes, { headers: { 'Content-Type': 'image/png' } });
  });
  const result = await originalPhoto(
    'g',
    'a',
    '../unsafe/사진',
    new AbortController().signal
  );
  assert.equal(result.filename, 'woori-unsafe.png');
  assert.deepEqual(new Uint8Array(await result.blob.arrayBuffer()), bytes);
});

test('failed mutation or expired access is surfaced instead of reporting success', async (t) => {
  const { deletePhoto, originalPhoto } =
    await import('../src/services/media-client.ts');
  setup(t, async () =>
    Response.json({ message: '볼 수 없는 사진이에요.' }, { status: 404 })
  );
  const signal = new AbortController().signal;
  await assert.rejects(deletePhoto('g', 'a', 'p', signal), /볼 수 없는/);
  await assert.rejects(originalPhoto('g', 'a', 'p', signal), /볼 수 없는/);
});

test('an original arriving after scope cancellation cannot start a download', async (t) => {
  const { originalPhoto } = await import('../src/services/media-client.ts');
  const controller = new AbortController();
  setup(t, async () => {
    controller.abort();
    return new Response('old private image', {
      headers: { 'Content-Type': 'image/webp' },
    });
  });
  await assert.rejects(originalPhoto('g', 'a', 'p', controller.signal), {
    name: 'AbortError',
  });
});

test('original downloads use supported MIME extensions and reject unknown media', async (t) => {
  const { originalPhoto } = await import('../src/services/media-client.ts');
  let mime = 'image/jpeg';
  setup(
    t,
    async () => new Response('pixels', { headers: { 'Content-Type': mime } })
  );
  const signal = new AbortController().signal;
  assert.equal(
    (await originalPhoto('g', 'a', 'p', signal)).filename,
    'woori-p.jpg'
  );
  mime = 'image/webp';
  assert.equal(
    (await originalPhoto('g', 'a', 'p', signal)).filename,
    'woori-p.webp'
  );
  mime = 'text/html';
  await assert.rejects(originalPhoto('g', 'a', 'p', signal), /원본 사진 형식/);
});

test('selection checks the entire deduplicated batch before any upload reservation', async () => {
  const { photoSelection } = await import('../src/services/media-client.ts');
  const duplicate = new File(['image'], file.name, {
    type: file.type,
    lastModified: file.lastModified,
  });
  assert.equal(photoSelection([file, duplicate]).files.length, 1);
  assert.equal(photoSelection([file, duplicate]).duplicates, 1);
  // File identity is not used and equal names with changed size/date/type are distinct.
  const variants = [
    duplicate,
    new File(['different'], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    }),
    new File(['image'], file.name, {
      type: file.type,
      lastModified: file.lastModified + 1,
    }),
    new File(['image'], file.name, {
      type: 'image/png',
      lastModified: file.lastModified,
    }),
  ];
  assert.equal(photoSelection(variants).files.length, 4);
  const files = Array.from(
    { length: 31 },
    (_, index) => new File(['x'], `${index}.jpg`, { type: 'image/jpeg' })
  );
  assert.equal(photoSelection(files.slice(0, 30)).files.length, 30);
  assert.throws(() => photoSelection(files), /30개/);
  const large = Array.from(
    { length: 11 },
    (_, index) =>
      ({
        name: `${index}.jpg`,
        type: 'image/jpeg',
        size: 30 * 1024 * 1024,
        lastModified: 0,
      }) as File
  );
  assert.equal(photoSelection(large.slice(0, 10)).files.length, 10);
  assert.throws(() => photoSelection(large), /300MB/);
  assert.deepEqual(photoSelection([]), { files: [], duplicates: 0 });
});

test('queue acceptance does not claim a READY photo and uncertain responses retry the same job', async (t) => {
  const { queuePhoto } = await import('../src/services/media-client.ts');
  const calls: string[] = [];
  const phases: string[] = [];
  let fail = true;
  setup(t, async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/uploads')) return Response.json(ticket);
    if (url === ticket.uploadUrl) return new Response(null, { status: 200 });
    assert.ok(url.endsWith('/photos/photo-1/process'));
    if (fail) {
      fail = false;
      throw new Error('response lost');
    }
    return Response.json(
      {
        photoId: 'photo-1',
        status: 'PROCESSING',
        phase: 'QUEUED',
        retryAfterSeconds: 4,
        errorCode: null,
      },
      { status: 202 }
    );
  });
  const pending: PendingUpload = { uploaded: false },
    signal = new AbortController().signal;
  await assert.rejects(
    queuePhoto('g', 'a', file, pending, signal, (phase) => phases.push(phase))
  );
  const job = await queuePhoto('g', 'a', file, pending, signal);
  assert.equal(job.status, 'PROCESSING');
  assert.equal(job.photo, undefined);
  assert.deepEqual(phases, ['RESERVING', 'UPLOADING', 'QUEUING']);
  assert.equal(calls.filter((url) => url.endsWith('/uploads')).length, 1);
  assert.equal(calls.filter((url) => url === ticket.uploadUrl).length, 1);
});

test('queue cancellation after PUT never calls process and status queries stay authenticated and scoped', async (t) => {
  const { queuePhoto, listUploads, processingPhoto } =
    await import('../src/services/media-client.ts');
  const controller = new AbortController();
  let processCalled = false;
  setup(t, async (input, init) => {
    const url = String(input);
    if (url.endsWith('/uploads')) return Response.json(ticket);
    if (url === ticket.uploadUrl) {
      controller.abort();
      return new Response(null, { status: 200 });
    }
    if (url.endsWith('/process')) processCalled = true;
    assert.equal(init?.credentials, 'include');
    assert.equal(init?.cache, 'no-store');
    assert.match(url, /groups\/g%2F1\/albums\/a%2F1/);
    if (url.includes('/uploads?')) {
      assert.match(url, /activeOnly=true/);
      assert.match(url, /limit=100/);
      return Response.json({ uploads: [], nextCursor: null });
    }
    return Response.json({
      photoId: 'p/1',
      status: 'READY',
      phase: 'READY',
      retryAfterSeconds: null,
      errorCode: null,
      photo,
    });
  });
  await assert.rejects(
    queuePhoto('g', 'a', file, { uploaded: false }, controller.signal),
    { name: 'AbortError' }
  );
  assert.equal(processCalled, false);
  const signal = new AbortController().signal;
  assert.deepEqual(await listUploads('g/1', 'a/1', null, signal, true), {
    uploads: [],
    nextCursor: null,
  });
  assert.equal(
    (await processingPhoto('g/1', 'a/1', 'p/1', signal)).status,
    'READY'
  );
});

test('job recovery includes active jobs outside the recent page and resolves disappeared processing jobs', async (t) => {
  const { recoverUploads } = await import('../src/services/media-client.ts');
  const working = {
    photoId: 'older',
    status: 'PROCESSING' as const,
    phase: 'PROCESSING' as const,
    retryAfterSeconds: 4,
    errorCode: null,
  };
  setup(t, async (input) => {
    const url = String(input);
    if (url.includes('activeOnly=true'))
      return Response.json({
        uploads: [{ ...working, photoId: 'active-old' }],
        nextCursor: null,
      });
    if (url.endsWith('/older/processing'))
      return Response.json({
        ...working,
        status: 'READY',
        phase: 'READY',
        photo,
      });
    return Response.json({
      uploads: [
        {
          ...working,
          photoId: 'newest',
          status: 'FAILED',
          phase: 'FAILED',
          errorCode: 'INVALID_PHOTO_FILE',
        },
      ],
      nextCursor: 'other-page',
    });
  });
  const jobs = await recoverUploads(
    'g',
    'a',
    [working],
    new AbortController().signal
  );
  assert.equal(jobs.length, 3);
  assert.equal(
    jobs.find((job) => job.photoId === 'active-old')?.status,
    'PROCESSING'
  );
  assert.equal(jobs.find((job) => job.photoId === 'older')?.status, 'READY');
  assert.equal(
    jobs.find((job) => job.photoId === 'newest')?.errorCode,
    'INVALID_PHOTO_FILE'
  );
});

test('a cancelled recovery cannot publish stale account jobs even if a fetch ignores abort', async (t) => {
  const { recoverUploads } = await import('../src/services/media-client.ts');
  const controller = new AbortController();
  setup(t, async () => {
    controller.abort();
    return Response.json({ uploads: [], nextCursor: null });
  });
  await assert.rejects(recoverUploads('g', 'a', [], controller.signal), {
    name: 'AbortError',
  });
});
