import assert from "node:assert/strict";
import test from "node:test";
import { PhotoGestures } from "../src/lib/viewer/gesture-controller.ts";
import {
  FIT,
  clampTransform,
  photoPoint,
  zoomAt,
} from "../src/lib/viewer/geometry.ts";
import type { Transform } from "../src/lib/viewer/geometry.ts";
function harness() {
  let now = 0,
    value: Transform = { ...FIT },
    swipes = 0,
    singles = 0,
    doubles = 0,
    offset = 0;
  const controller = new PhotoGestures({
    now: () => now,
    read: () => value,
    paint: (next) => {
      value = next;
    },
    rubber: (next) => next,
    settle: () => {},
    track: (next) => {
      offset = next;
    },
    swipe: () => {
      swipes++;
    },
    tap: () => {
      singles++;
    },
    doubleTap: () => {
      doubles++;
    },
    width: () => 400,
    maxScale: () => 4,
    canSwipe: () => true,
  });
  return {
    controller,
    clock: (time: number) => {
      now = time;
    },
    state: () => ({ value, swipes, singles, doubles, offset }),
  };
}
test("second pointerdown within 280ms commits double tap even after its release crosses the window", () => {
  const h = harness();
  h.controller.down(1, { x: 0, y: 0 });
  h.controller.up(1);
  h.clock(250);
  h.controller.down(1, { x: 0, y: 0 });
  h.clock(310);
  h.controller.up(1);
  assert.equal(h.state().doubles, 1);
  assert.equal(h.state().singles, 0);
  h.controller.dispose();
});
test("pointercancel restores a swipe without committing navigation", () => {
  const h = harness();
  h.controller.down(1, { x: 140, y: 0 });
  h.clock(80);
  h.controller.move(1, { x: -80, y: 0 });
  h.controller.up(1, true);
  assert.equal(h.state().swipes, 0);
  assert.equal(h.state().offset, 0);
  h.controller.dispose();
});
test("pinch centroid anchors zoom and canceled pointer hands off to pan", () => {
  const h = harness();
  h.controller.down(1, { x: -50, y: 0 });
  h.controller.down(2, { x: 50, y: 0 });
  h.controller.move(1, { x: -100, y: 0 });
  h.controller.move(2, { x: 100, y: 0 });
  assert.deepEqual(h.state().value, { scale: 2, x: 0, y: 0 });
  h.controller.up(2, true);
  h.controller.move(1, { x: -75, y: 0 });
  assert.deepEqual(h.state().value, { scale: 2, x: 25, y: 0 });
  h.controller.up(1);
  h.controller.dispose();
});
test("a long pause after a short flick does not reuse stale velocity", () => {
  const h = harness();
  h.controller.down(1, { x: 0, y: 0 });
  h.clock(10);
  h.controller.move(1, { x: -20, y: 0 });
  h.clock(1000);
  h.controller.up(1);
  assert.equal(h.state().swipes, 0);
  h.controller.dispose();
});
test("zoom anchoring and normalized comment coordinates preserve the selected point", () => {
  const before = { scale: 1, x: 0, y: 0 };
  const location = { x: 70, y: 25 };
  const image = { width: 400, height: 300 };
  assert.deepEqual(
    photoPoint(location, zoomAt(before, location, 2), image),
    photoPoint(location, before, image),
  );
  assert.deepEqual(
    clampTransform({ scale: 0.85, x: 50, y: 80 }, image, image),
    FIT,
  );
});
