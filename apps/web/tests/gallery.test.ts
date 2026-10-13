import { test } from "node:test";
import assert from "node:assert/strict";
import { listAlbums, validPoint } from "../src/lib/gallery.ts";
const albums = [
  {
    id: "a",
    groupId: "one",
    title: "가족 여행",
    date: "2026-01-01",
    createdAt: "2026-01-02",
    coverId: "",
  },
  {
    id: "b",
    groupId: "two",
    title: "가족 여행",
    date: "2026-02-01",
    createdAt: "2026-02-02",
    coverId: "",
  },
];
test("album search never includes a different selected group", () => {
  assert.deepEqual(
    listAlbums(
      { groups: [], albums, photos: [], comments: [], reactions: [] },
      "one",
      " 여행 ",
      "recent",
    ).map((a) => a.id),
    ["a"],
  );
});
test("normalized pin coordinates reject non-finite and out-of-image values", () => {
  assert.equal(validPoint({ x: NaN, y: 0.5 }), false);
  assert.equal(validPoint({ x: 1.01, y: 0.5 }), false);
  assert.equal(validPoint({ x: 0, y: 1 }), true);
  assert.equal(validPoint(undefined), true);
});
