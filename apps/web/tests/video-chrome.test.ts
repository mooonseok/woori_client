import test from 'node:test';
import assert from 'node:assert/strict';
import { createVideoChrome } from '../src/lib/viewer/video-chrome.ts';

test('video idle hide waits until focus, seek drag, and panels are released', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const visible: boolean[] = [];
  const controls = createVideoChrome((value) => visible.push(value));
  controls.playback(true);
  t.mock.timers.tick(3000);
  assert.equal(visible.at(-1), false);
  for (const blocker of [controls.focus, controls.touch, controls.block]) {
    blocker(true);
    t.mock.timers.tick(30_000);
    assert.equal(visible.at(-1), true);
    blocker(false);
    t.mock.timers.tick(2999);
    assert.equal(visible.at(-1), true);
    t.mock.timers.tick(1);
    assert.equal(visible.at(-1), false);
  }
  controls.dispose();
});

test('pause, navigation and disposal cancel pending hide', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const visible: boolean[] = [];
  const controls = createVideoChrome((value) => visible.push(value));
  for (const stop of [
    () => controls.playback(false),
    controls.reset,
    controls.dispose,
  ]) {
    controls.playback(true);
    stop();
    const count = visible.length;
    t.mock.timers.tick(10_000);
    assert.equal(visible.length, count);
    assert.equal(visible.at(-1), true);
  }
});
