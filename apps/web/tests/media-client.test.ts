import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import {
  uploadPhoto,
  validatePhoto,
  photoBlob,
} from "../src/services/media-client.ts";
import type { PendingUpload } from "../src/dto/media.dto.ts";
const file = new File(["image"], "family.jpg", { type: "image/jpeg" });
const ticket = {
  photoId: "photo-1",
  uploadUrl: "https://r2.example/photo-1",
  headers: { "Content-Type": "image/jpeg" },
  expiresAt: "2099-01-01T00:00:00Z",
};
const photo = {
  id: "photo-1",
  albumId: "album",
  groupId: "group",
  width: 100,
  height: 80,
  status: "READY",
};
function setup(t: TestContext, fetcher: typeof fetch) {
  const original = globalThis.fetch,
    base = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example";
  globalThis.fetch = fetcher;
  t.after(() => {
    globalThis.fetch = original;
    if (base === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = base;
  });
}
test("upload retains completed PUT on uncertain completion and retries the same photo", async (t) => {
  const urls: string[] = [];
  let failed = true;
  setup(t, async (input, init) => {
    const url = String(input);
    urls.push(url);
    if (url.endsWith("/uploads")) return Response.json(ticket);
    if (url === ticket.uploadUrl) {
      assert.equal(init?.credentials, "omit");
      assert.equal(init?.body, file);
      return new Response(null, { status: 200 });
    }
    assert.equal(init?.credentials, "include");
    assert.equal(new Headers(init?.headers).get("X-Woori-Request"), "1");
    if (failed) {
      failed = false;
      throw new Error("lost response");
    }
    return Response.json({ photo });
  });
  const pending: PendingUpload = { uploaded: false },
    signal = new AbortController().signal;
  await assert.rejects(uploadPhoto("group", "album", file, pending, signal));
  assert.equal(pending.uploaded, true);
  assert.equal(
    (await uploadPhoto("group", "album", file, pending, signal)).id,
    "photo-1",
  );
  assert.equal(urls.filter((u) => u.endsWith("/uploads")).length, 1);
  assert.equal(urls.filter((u) => u === ticket.uploadUrl).length, 1);
  assert.equal(
    urls.filter((u) => u.endsWith("/photos/photo-1/complete")).length,
    2,
  );
});
test("private photo retrieval includes cookies and never caches the response", async (t) => {
  setup(t, async (input, init) => {
    assert.match(
      String(input),
      /\/groups\/group\/albums\/album\/photos\/photo\/content\?variant=thumbnail$/,
    );
    assert.equal(init?.credentials, "include");
    assert.equal(init?.cache, "no-store");
    return new Response("pixels", {
      headers: { "Content-Type": "image/jpeg" },
    });
  });
  assert.equal(
    await (
      await photoBlob(
        "group",
        "album",
        "photo",
        new AbortController().signal,
        "thumbnail",
      )
    ).text(),
    "pixels",
  );
});
test("unsupported and oversized files fail before any upload reservation", async (t) => {
  let requested = false;
  setup(t, async () => {
    requested = true;
    throw new Error("unexpected");
  });
  await assert.rejects(
    uploadPhoto(
      "g",
      "a",
      new File(["x"], "photo.heic", { type: "image/heic" }),
      { uploaded: false },
      new AbortController().signal,
    ),
    /HEIC/,
  );
  assert.throws(
    () =>
      validatePhoto({ type: "image/jpeg", size: 30 * 1024 * 1024 + 1 } as File),
    /30MB/,
  );
  assert.equal(requested, false);
});
test("aborting a PUT never completes or reports a stored photo", async (t) => {
  const controller = new AbortController();
  let completed = false;
  setup(t, async (input) => {
    if (String(input).endsWith("/uploads")) return Response.json(ticket);
    if (String(input) === ticket.uploadUrl) {
      controller.abort();
      throw new DOMException("Aborted", "AbortError");
    }
    completed = true;
    return Response.json({ photo });
  });
  await assert.rejects(
    uploadPhoto("g", "a", file, { uploaded: false }, controller.signal),
    { name: "AbortError" },
  );
  assert.equal(completed, false);
});

test("definitive expired completion permits a new reservation while transient failures preserve the ticket", async (t) => {
  let expired = true;
  setup(t, async (input) => {
    if (String(input).endsWith("/uploads")) return Response.json(ticket);
    if (String(input) === ticket.uploadUrl)
      return new Response(null, { status: 200 });
    if (expired) {
      expired = false;
      return Response.json({ message: "expired" }, { status: 410 });
    }
    return Response.json({ photo });
  });
  const pending: PendingUpload = { uploaded: false },
    signal = new AbortController().signal;
  await assert.rejects(uploadPhoto("g", "a", file, pending, signal));
  assert.equal(pending.ticket, undefined);
  assert.equal(pending.uploaded, false);
  assert.equal(
    (await uploadPhoto("g", "a", file, pending, signal)).id,
    photo.id,
  );
});

test("an already canceled upload never reserves or sends a file", async (t) => {
  let calls = 0;
  setup(t, async () => {
    calls++;
    return Response.json(ticket);
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    uploadPhoto("g", "a", file, { uploaded: false }, controller.signal),
    { name: "AbortError" },
  );
  assert.equal(calls, 0);
});
