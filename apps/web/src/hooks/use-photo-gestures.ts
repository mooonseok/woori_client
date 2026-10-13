"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { PhotoGestureModel } from "@/dto/viewer-ui.dto";
import type { Photo, Point } from "@/dto/album.dto";
import { PhotoGestures } from "@/lib/viewer/gesture-controller";
import {
  FIT,
  clampTransform,
  fitSize,
  photoPoint,
  rubberTransform,
  zoomAt,
} from "@/lib/viewer/geometry";
import type { Size, Transform } from "@/lib/viewer/geometry";
interface Options {
  photo: Photo;
  canPrevious: boolean;
  canNext: boolean;
  disabled: boolean;
  placing: boolean;
  onTap(point: Point | null): void;
  onNavigate(direction: -1 | 1): void;
}
export function usePhotoGestures(options: Options): PhotoGestureModel {
  const stageRef = useRef<HTMLDivElement>(null),
    imageRef = useRef<HTMLDivElement>(null),
    trackRef = useRef<HTMLDivElement>(null);
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });
  const transform = useRef<Transform>({ ...FIT }),
    dimensions = useRef<{ stage: Size; photo: Size }>({
      stage: { width: 1, height: 1 },
      photo: { width: 1, height: 1 },
    });
  const [size, setSize] = useState<Size>({ width: 1, height: 1 }),
    [scale, setScale] = useState(1);
  const reduced = useRef(false),
    busy = useRef(false),
    navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<PhotoGestures | null>(null);
  const maximum = useCallback(
    () =>
      Math.max(
        2,
        Math.min(
          4,
          latest.current.photo.width / dimensions.current.photo.width,
        ),
      ),
    [],
  );
  const paint = useCallback((value: Transform, animate = false) => {
    transform.current = value;
    const el = imageRef.current;
    if (!el) return;
    el.style.transition =
      animate && !reduced.current
        ? "transform 220ms cubic-bezier(.2,.8,.2,1)"
        : "none";
    el.style.transform = `translate(${value.x}px, ${value.y}px) scale(${value.scale})`;
    el.style.setProperty("--inverse-scale", String(1 / value.scale));
  }, []);
  const freeze = useCallback(() => {
    const el = imageRef.current;
    if (el) {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      transform.current = { scale: matrix.a, x: matrix.e, y: matrix.f };
      paint(transform.current);
    }
    return transform.current;
  }, [paint]);
  const clamp = useCallback(
    (value: Transform) =>
      clampTransform(
        value,
        dimensions.current.photo,
        dimensions.current.stage,
        maximum(),
      ),
    [maximum],
  );
  const settle = useCallback(() => {
    const value = clamp(transform.current);
    paint(value, true);
    setScale(value.scale);
  }, [clamp, paint]);
  const track = useCallback((offset: number, animate = false) => {
    if (!trackRef.current) return;
    trackRef.current.style.transition =
      animate && !reduced.current
        ? "transform 260ms cubic-bezier(.2,.8,.2,1)"
        : "none";
    trackRef.current.style.transform = `translateX(${offset}px)`;
  }, []);
  const navigate = useCallback(
    (direction: -1 | 1) => {
      if (
        busy.current ||
        latest.current.disabled ||
        latest.current.placing ||
        !(direction === 1 ? latest.current.canNext : latest.current.canPrevious)
      )
        return;
      busy.current = true;
      controller.current?.dispose();
      track(-direction * (dimensions.current.stage.width + 24), true);
      navTimer.current = setTimeout(
        () => {
          busy.current = false;
          latest.current.onNavigate(direction);
        },
        reduced.current ? 0 : 260,
      );
    },
    [track],
  );
  const zoom = useCallback(
    (factor: number, point: Point = { x: 0, y: 0 }) => {
      const value = freeze();
      const next = clamp(
        zoomAt(
          value,
          point,
          Math.min(maximum(), Math.max(1, value.scale * factor)),
        ),
      );
      paint(next, true);
      setScale(next.scale);
    },
    [clamp, freeze, maximum, paint],
  );
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    transform.current = { ...FIT };
    paint({ ...FIT });
    track(0);
    setScale(1);
    busy.current = false;
    const update = () => {
      const space = {
        width: Math.max(1, stage.clientWidth),
        height: Math.max(1, stage.clientHeight),
      };
      const fitted = fitSize(latest.current.photo, space);
      dimensions.current = { stage: space, photo: fitted };
      setSize(fitted);
      paint(clamp(transform.current));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => {
      observer.disconnect();
      controller.current?.dispose();
      if (navTimer.current) clearTimeout(navTimer.current);
    };
  }, [options.photo.id, clamp, paint, track]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reduced.current = media.matches;
    };
    sync();
    media.addEventListener("change", sync);
    controller.current = new PhotoGestures({
      read: freeze,
      paint,
      settle,
      track,
      swipe: navigate,
      rubber: (value) =>
        rubberTransform(
          value,
          dimensions.current.photo,
          dimensions.current.stage,
        ),
      width: () => dimensions.current.stage.width,
      maxScale: maximum,
      canSwipe: (direction) =>
        !latest.current.placing &&
        (direction === 1 ? latest.current.canNext : latest.current.canPrevious),
      tap: (point) =>
        latest.current.onTap(
          photoPoint(point, transform.current, dimensions.current.photo),
        ),
      doubleTap: (point) => {
        if (latest.current.placing) {
          latest.current.onTap(
            photoPoint(point, transform.current, dimensions.current.photo),
          );
          return;
        }
        const current = freeze();
        const next =
          current.scale > 1.01
            ? { ...FIT }
            : clamp(zoomAt(current, point, Math.min(2.5, maximum())));
        paint(next, true);
        setScale(next.scale);
      },
    });
    const stage = stageRef.current;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey || latest.current.disabled || busy.current) return;
      event.preventDefault();
      const r = stage!.getBoundingClientRect();
      zoom(Math.exp(-event.deltaY * 0.01), {
        x: event.clientX - r.left - r.width / 2,
        y: event.clientY - r.top - r.height / 2,
      });
    };
    stage?.addEventListener("wheel", wheel, { passive: false });
    return () => {
      media.removeEventListener("change", sync);
      stage?.removeEventListener("wheel", wheel);
      controller.current?.dispose();
      if (navTimer.current) clearTimeout(navTimer.current);
    };
  }, [clamp, freeze, maximum, navigate, paint, settle, track, zoom]);
  useEffect(() => {
    if (options.disabled) {
      controller.current?.dispose();
      track(0);
      settle();
    }
  }, [options.disabled, settle, track]);
  const point = (event: PointerEvent) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2,
    };
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      options.disabled ||
      busy.current ||
      (event.pointerType === "mouse" && event.button !== 0) ||
      (event.target as Element).closest(
        "button,input,textarea,[data-viewer-interactive]",
      )
    )
      return;
    event.currentTarget.setPointerCapture(event.pointerId);
    controller.current?.down(event.pointerId, point(event));
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (
      options.disabled ||
      /INPUT|TEXTAREA|SELECT/.test((event.target as Element).tagName) ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    if (["+", "=", "-", "0"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "0") {
        paint({ ...FIT }, true);
        setScale(1);
      } else zoom(event.key === "-" ? 1 / 1.5 : 1.5);
    }
    if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      if (transform.current.scale > 1.01) {
        const t = freeze();
        const direction = {
          ArrowLeft: [60, 0],
          ArrowRight: [-60, 0],
          ArrowUp: [0, 60],
          ArrowDown: [0, -60],
        }[event.key];
        if (direction)
          paint(
            clamp({ ...t, x: t.x + direction[0], y: t.y + direction[1] }),
            true,
          );
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight")
        navigate(event.key === "ArrowRight" ? 1 : -1);
    }
  };
  return {
    stageRef,
    imageRef,
    trackRef,
    size,
    scale,
    navigate,
    zoom,
    reset: () => {
      paint({ ...FIT }, true);
      setScale(1);
    },
    onKeyDown,
    stageEvents: {
      onPointerDown,
      onPointerMove: (e: PointerEvent) =>
        controller.current?.move(e.pointerId, point(e)),
      onPointerUp: (e: PointerEvent) => controller.current?.up(e.pointerId),
      onPointerCancel: (e: PointerEvent) =>
        controller.current?.up(e.pointerId, true),
      onLostPointerCapture: (e: PointerEvent) => {
        if (controller.current?.has(e.pointerId))
          controller.current.up(e.pointerId, true);
      },
    },
  };
}
