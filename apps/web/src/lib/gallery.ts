import type { Album, GalleryData, Photo, Point } from '../dto/album.dto.ts';
import type { AlbumResponse } from '../dto/media.dto.ts';
import { mediaCountLabel } from '../utils/media.ts';
export function listAlbums(
  data: GalleryData,
  groupId: string,
  query: string,
  sort: string
): Album[] {
  const key = query.trim().normalize('NFC').toLocaleLowerCase('ko');
  return data.albums
    .filter(
      (a) =>
        a.groupId === groupId &&
        a.title.normalize('NFC').toLocaleLowerCase('ko').includes(key)
    )
    .sort((a, b) =>
      sort === 'taken'
        ? (b.endDate ?? '').localeCompare(a.endDate ?? '') ||
          b.createdAt.localeCompare(a.createdAt)
        : b.createdAt.localeCompare(a.createdAt)
    );
}
export function photosFor(data: GalleryData, albumId: string): Photo[] {
  return data.photos.filter((p) => p.albumId === albumId);
}
export function validPoint(point?: Point) {
  return (
    !point ||
    (Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      point.x >= 0 &&
      point.x <= 1 &&
      point.y >= 0 &&
      point.y <= 1)
  );
}
export function displayDate(date: string) {
  return date.slice(0, 10).replaceAll('-', '.');
}

type AlbumDates = Pick<Album, 'startDate' | 'endDate' | 'createdAt'>;
/**
 * "2026.10.03 ~ 2026.10.15", one date for a single day, null without visible
 * photos. A server before OpenAPI 0.21.0 sends no period: the creation date.
 */
export function albumPeriod({ startDate, endDate, createdAt }: AlbumDates) {
  if (startDate === undefined && endDate === undefined)
    return displayDate(createdAt);
  const first = startDate || endDate,
    last = endDate || startDate;
  if (!first || !last) return null;
  const [start, end] = first <= last ? [first, last] : [last, first];
  return start === end
    ? displayDate(start)
    : `${displayDate(start)} ~ ${displayDate(end)}`;
}
/** Album card/header line: period and media count, or "사진 없음". */
export function albumMeta(
  album: AlbumDates & Pick<Album, 'videoCount'>,
  count: number
) {
  const period = albumPeriod(album);
  return period
    ? `${period} · ${mediaCountLabel(count, album.videoCount)}`
    : '사진 없음';
}
/**
 * An album cover loaded on its own (thumbnail, natural size). OpenAPI 0.24.0
 * says whether it is a video; its length stays unknown until the album opens.
 */
export function coverPhoto(
  album: Pick<
    AlbumResponse,
    'id' | 'title' | 'createdAt' | 'coverPhotoId' | 'coverMediaKind'
  >,
  src: string,
  size: { width: number; height: number }
): Photo {
  return {
    id: album.coverPhotoId!,
    albumId: album.id,
    src,
    variant: 'thumbnail',
    width: size.width,
    height: size.height,
    alt: album.title,
    capturedAt: album.createdAt.slice(0, 10),
    authorId: '',
    ...(album.coverMediaKind
      ? { mediaKind: album.coverMediaKind, durationMs: null }
      : {}),
  };
}
/** Demo previews widen the album period by the added photo's date. */
export function periodWith(
  { startDate, endDate }: Pick<Album, 'startDate' | 'endDate'>,
  date: string
) {
  return {
    startDate: startDate && startDate < date ? startDate : date,
    endDate: endDate && endDate > date ? endDate : date,
  };
}
