import type { Point } from '@/dto/album.dto';
export interface Transform {
  scale: number;
  x: number;
  y: number;
}
export interface Size {
  width: number;
  height: number;
}
export const FIT: Transform = { scale: 1, x: 0, y: 0 };
export function fitSize(photo: Size, stage: Size): Size {
  const ratio = Math.min(
    stage.width / photo.width,
    stage.height / photo.height
  );
  return { width: photo.width * ratio, height: photo.height * ratio };
}
export function bounds(scale: number, photo: Size, stage: Size): Point {
  return {
    x: Math.max(0, (photo.width * scale - stage.width) / 2),
    y: Math.max(0, (photo.height * scale - stage.height) / 2),
  };
}
export function clampTransform(
  t: Transform,
  photo: Size,
  stage: Size,
  max = 4
): Transform {
  const scale = Math.min(max, Math.max(1, t.scale));
  if (scale <= 1.01) return { ...FIT };
  const b = bounds(scale, photo, stage);
  return {
    scale,
    x: Math.max(-b.x, Math.min(b.x, t.x)),
    y: Math.max(-b.y, Math.min(b.y, t.y)),
  };
}
export function rubberTransform(
  t: Transform,
  photo: Size,
  stage: Size
): Transform {
  const b = bounds(t.scale, photo, stage);
  const rubber = (v: number, limit: number) =>
    v > limit
      ? limit + (v - limit) * 0.25
      : v < -limit
        ? -limit + (v + limit) * 0.25
        : v;
  return { ...t, x: rubber(t.x, b.x), y: rubber(t.y, b.y) };
}
export function zoomAt(t: Transform, point: Point, scale: number): Transform {
  return {
    scale,
    x: point.x - ((point.x - t.x) / t.scale) * scale,
    y: point.y - ((point.y - t.y) / t.scale) * scale,
  };
}
export function photoPoint(
  point: Point,
  t: Transform,
  photo: Size
): Point | null {
  const x = (point.x - t.x) / (photo.width * t.scale) + 0.5;
  const y = (point.y - t.y) / (photo.height * t.scale) + 0.5;
  return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : null;
}
