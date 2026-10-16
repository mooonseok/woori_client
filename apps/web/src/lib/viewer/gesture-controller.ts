import type { Point } from '@/dto/album.dto';
import type { Transform } from './geometry';
const TAP_MS = 280;
// Height of the strip a native <video controls> keeps for its seek bar and
// buttons. Pointers that start there belong to the video, not the viewer.
export const VIDEO_CONTROL_BAND = 72;
export function inVideoControls(
  box: { bottom: number; height: number },
  y: number
) {
  return box.bottom - y < Math.min(VIDEO_CONTROL_BAND, box.height / 2);
}
interface Options {
  read(): Transform;
  paint(value: Transform): void;
  rubber(value: Transform): Transform;
  settle(): void;
  track(offset: number, animate?: boolean): void;
  swipe(direction: -1 | 1): void;
  tap(point: Point): void;
  doubleTap(point: Point): void;
  width(): number;
  maxScale(): number;
  canSwipe(direction: -1 | 1): boolean;
  now?: () => number;
}
interface Gesture {
  type: 'pending' | 'pan' | 'pinch' | 'swipe' | 'idle';
  start: Point;
  base: Transform;
  time: number;
  second: boolean;
  multi: boolean;
  last: Point;
  lastTime: number;
  velocity: number;
  offset: number;
  distance?: number;
  midpoint?: Point;
  // Started on a playing surface (a video): only a horizontal swipe is ours,
  // a tap stays with the element's own controls.
  swipeOnly: boolean;
}
export class PhotoGestures {
  private pointers = new Map<number, Point>();
  private gesture: Gesture | null = null;
  private tapTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTap: (Point & { time: number }) | null = null;
  private options: Options;
  constructor(options: Options) {
    this.options = options;
  }
  private now() {
    return this.options.now?.() ?? performance.now();
  }
  private clearTap() {
    if (this.tapTimer) clearTimeout(this.tapTimer);
    this.tapTimer = null;
  }
  has(id: number) {
    return this.pointers.has(id);
  }
  swiping() {
    return this.gesture?.type === 'swipe';
  }
  down(id: number, p: Point, swipeOnly = false) {
    // A video takes one finger at a time; a second one is the video's.
    if (this.gesture?.swipeOnly && this.pointers.size) return;
    this.pointers.set(id, p);
    const now = this.now();
    if (this.pointers.size === 1) {
      const second =
        !swipeOnly &&
        !!this.tapTimer &&
        !!this.lastTap &&
        now - this.lastTap.time < TAP_MS &&
        Math.hypot(p.x - this.lastTap.x, p.y - this.lastTap.y) < 40;
      if (second) this.clearTap();
      this.gesture = {
        type: 'pending',
        start: p,
        base: this.options.read(),
        time: now,
        second,
        multi: false,
        last: p,
        lastTime: now,
        velocity: 0,
        offset: 0,
        swipeOnly,
      };
    } else if (this.pointers.size === 2 && this.gesture) {
      this.clearTap();
      this.lastTap = null;
      const [a, b] = [...this.pointers.values()];
      this.options.track(0, false);
      this.gesture = {
        ...this.gesture,
        type: 'pinch',
        multi: true,
        base: this.options.read(),
        distance: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)),
        midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    }
  }
  move(id: number, p: Point) {
    if (!this.pointers.has(id)) return;
    this.pointers.set(id, p);
    const g = this.gesture;
    if (!g) return;
    if (
      g.type === 'pinch' &&
      this.pointers.size >= 2 &&
      g.midpoint &&
      g.distance
    ) {
      const [a, b] = [...this.pointers.values()];
      const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const max = this.options.maxScale();
      let scale =
        (g.base.scale * Math.hypot(a.x - b.x, a.y - b.y)) / g.distance;
      scale =
        scale < 1
          ? Math.max(0.85, 1 - (1 - scale) * 0.3)
          : scale > max
            ? Math.min(max * 1.15, max + (scale - max) * 0.2)
            : scale;
      this.options.paint(
        this.options.rubber({
          scale,
          x: middle.x - (scale * (g.midpoint.x - g.base.x)) / g.base.scale,
          y: middle.y - (scale * (g.midpoint.y - g.base.y)) / g.base.scale,
        })
      );
      return;
    }
    if (this.pointers.size !== 1) return;
    const dx = p.x - g.start.x,
      dy = p.y - g.start.y;
    if (g.type === 'pending') {
      if (Math.hypot(dx, dy) < 8) return;
      this.clearTap();
      this.lastTap = null;
      if (g.base.scale > 1.01) g.type = 'pan';
      else
        g.type =
          Math.abs(dx) > Math.abs(dy) * 1.1 && !g.multi ? 'swipe' : 'idle';
    }
    if (g.type === 'pan')
      this.options.paint(
        this.options.rubber({ ...g.base, x: g.base.x + dx, y: g.base.y + dy })
      );
    if (g.type === 'swipe') {
      const direction = dx < 0 ? 1 : -1;
      g.offset = this.options.canSwipe(direction) ? dx : dx * 0.25;
      this.options.track(g.offset);
      const now = this.now();
      g.velocity = (p.x - g.last.x) / Math.max(1, now - g.lastTime);
      g.lastTime = now;
      g.last = p;
    }
  }
  up(id: number, canceled = false) {
    const p = this.pointers.get(id);
    if (!p) return;
    this.pointers.delete(id);
    const g = this.gesture;
    if (!g) return;
    if (canceled) {
      this.clearTap();
      this.lastTap = null;
    }
    if (this.pointers.size === 1) {
      g.start = [...this.pointers.values()][0];
      g.base = this.options.read();
      g.type = g.base.scale > 1.01 ? 'pan' : 'idle';
      g.multi = true;
      return;
    }
    if (this.pointers.size) return;
    this.gesture = null;
    if (canceled) {
      this.options.track(0, true);
      this.options.settle();
      return;
    }
    if (g.multi || g.type === 'pan' || g.type === 'pinch') {
      this.options.settle();
      return;
    }
    if (g.type === 'swipe') {
      const velocity = this.now() - g.lastTime < 100 ? g.velocity : 0;
      const d =
        g.offset < -this.options.width() * 0.2 || velocity < -0.5
          ? 1
          : g.offset > this.options.width() * 0.2 || velocity > 0.5
            ? -1
            : 0;
      if (d && this.options.canSwipe(d)) this.options.swipe(d);
      else this.options.track(0, true);
      return;
    }
    if (g.swipeOnly || g.type !== 'pending' || this.now() - g.time >= 500)
      return;
    if (g.second) {
      this.clearTap();
      this.lastTap = null;
      this.options.doubleTap(p);
      return;
    }
    this.lastTap = { ...p, time: this.now() };
    this.clearTap();
    this.tapTimer = setTimeout(() => {
      this.tapTimer = null;
      this.lastTap = null;
      this.options.tap(p);
    }, TAP_MS);
  }
  dispose() {
    this.clearTap();
    this.lastTap = null;
    this.pointers.clear();
    this.gesture = null;
  }
}
