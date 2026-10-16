import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PhotoGestures,
  VIDEO_CONTROL_BAND,
  inVideoControls,
} from '../src/lib/viewer/gesture-controller.ts';
import {
  FIT,
  clampTransform,
  photoPoint,
  zoomAt,
} from '../src/lib/viewer/geometry.ts';
import type { Transform } from '../src/lib/viewer/geometry.ts';
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
test('second pointerdown within 280ms commits double tap even after its release crosses the window', () => {
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
test('pointercancel restores a swipe without committing navigation', () => {
  const h = harness();
  h.controller.down(1, { x: 140, y: 0 });
  h.clock(80);
  h.controller.move(1, { x: -80, y: 0 });
  h.controller.up(1, true);
  assert.equal(h.state().swipes, 0);
  assert.equal(h.state().offset, 0);
  h.controller.dispose();
});
test('pinch centroid anchors zoom and canceled pointer hands off to pan', () => {
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
test('a long pause after a short flick does not reuse stale velocity', () => {
  const h = harness();
  h.controller.down(1, { x: 0, y: 0 });
  h.clock(10);
  h.controller.move(1, { x: -20, y: 0 });
  h.clock(1000);
  h.controller.up(1);
  assert.equal(h.state().swipes, 0);
  h.controller.dispose();
});
test('zoom anchoring and normalized comment coordinates preserve the selected point', () => {
  const before = { scale: 1, x: 0, y: 0 };
  const location = { x: 70, y: 25 };
  const image = { width: 400, height: 300 };
  assert.deepEqual(
    photoPoint(location, zoomAt(before, location, 2), image),
    photoPoint(location, before, image)
  );
  assert.deepEqual(
    clampTransform({ scale: 0.85, x: 50, y: 80 }, image, image),
    FIT
  );
});
test('a video pointer swipes to the next item but leaves taps and double taps to the video', () => {
  const h = harness();
  h.controller.down(1, { x: 0, y: 0 }, true);
  h.controller.up(1);
  h.clock(100);
  h.controller.down(1, { x: 0, y: 0 }, true);
  h.controller.up(1);
  h.clock(1000);
  assert.equal(h.state().singles, 0);
  assert.equal(h.state().doubles, 0);
  h.controller.down(1, { x: 100, y: 0 }, true);
  assert.equal(h.controller.swiping(), false);
  h.clock(1040);
  h.controller.move(1, { x: 60, y: 4 });
  assert.equal(h.controller.swiping(), true);
  h.clock(1080);
  h.controller.move(1, { x: -40, y: 6 });
  h.controller.up(1);
  assert.equal(h.state().swipes, 1);
  h.controller.dispose();
});
test('a vertical drag on a video neither swipes nor pinches with a second finger', () => {
  const h = harness();
  h.controller.down(1, { x: 0, y: 0 }, true);
  h.controller.down(2, { x: 80, y: 0 }, true);
  assert.equal(h.controller.has(2), false);
  h.controller.move(1, { x: 4, y: 120 });
  h.controller.up(1);
  assert.equal(h.state().swipes, 0);
  assert.deepEqual(h.state().value, FIT);
  assert.equal(h.state().offset, 0);
  h.controller.dispose();
});
test('the bottom control strip of a video belongs to its native controls', () => {
  const box = { bottom: 700, height: 600 };
  assert.equal(inVideoControls(box, 700 - VIDEO_CONTROL_BAND + 1), true);
  assert.equal(inVideoControls(box, 699), true);
  assert.equal(inVideoControls(box, 700 - VIDEO_CONTROL_BAND - 1), false);
  // A short video keeps its upper half swipeable.
  assert.equal(inVideoControls({ bottom: 300, height: 100 }, 255), true);
  assert.equal(inVideoControls({ bottom: 300, height: 100 }, 245), false);
});
