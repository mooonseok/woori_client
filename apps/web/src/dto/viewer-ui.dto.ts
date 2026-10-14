import type {
  Dispatch,
  KeyboardEvent,
  PointerEvent,
  RefObject,
  SetStateAction,
} from 'react';
import type { Photo, Point } from './album.dto';
type Setter<T> = Dispatch<SetStateAction<T>>;
export interface PhotoViewerModel {
  photo: Photo;
  index: number;
  chrome: boolean;
  panel: boolean;
  setPanel: Setter<boolean>;
  more: boolean;
  setMore: Setter<boolean>;
  reacting: boolean;
  setReacting: Setter<boolean>;
  mode: 'browse' | 'place' | 'write';
  point: Point | undefined;
  pinText: string;
  setPinText: Setter<string>;
  drafts: Record<string, string>;
  setDrafts: Setter<Record<string, string>>;
  draftCount: number;
  selectedPin: string | null;
  setSelectedPin: Setter<string | null>;
  pins: boolean;
  setPins: Setter<boolean>;
  confirm: 'close' | 'pin' | null;
  setConfirm: Setter<'close' | 'pin' | null>;
  guide: 'view' | 'pin' | null;
  finishGuide(): void;
  openGuide(kind: 'view' | 'pin'): void;
  startPin(): void;
  cancelPin(): void;
  requestClose(): void;
  discard(): void;
  navigate(direction: -1 | 1): void;
  tap(point: Point | null): void;
  submitComment(): void;
  submitPin(): void;
  failedPhoto: string | null;
  setFailedPhoto: Setter<string | null>;
  imageRetry: number;
  retryImage(): void;
}
export interface PhotoGestureModel {
  stageRef: RefObject<HTMLDivElement | null>;
  imageRef: RefObject<HTMLDivElement | null>;
  trackRef: RefObject<HTMLDivElement | null>;
  size: { width: number; height: number };
  scale: number;
  navigate(direction: -1 | 1): void;
  zoom(factor: number, point?: Point): void;
  reset(): void;
  onKeyDown(event: KeyboardEvent): void;
  stageEvents: {
    onPointerDown(event: PointerEvent<HTMLDivElement>): void;
    onPointerMove(event: PointerEvent): void;
    onPointerUp(event: PointerEvent): void;
    onPointerCancel(event: PointerEvent): void;
    onLostPointerCapture(event: PointerEvent): void;
  };
}
