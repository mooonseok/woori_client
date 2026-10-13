import type { Album, GalleryData, Photo, Point } from "../dto/album.dto.ts";
export function listAlbums(
  data: GalleryData,
  groupId: string,
  query: string,
  sort: string,
): Album[] {
  const key = query.trim().normalize("NFC").toLocaleLowerCase("ko");
  return data.albums
    .filter(
      (a) =>
        a.groupId === groupId &&
        a.title.normalize("NFC").toLocaleLowerCase("ko").includes(key),
    )
    .sort((a, b) =>
      sort === "taken"
        ? b.date.localeCompare(a.date)
        : b.createdAt.localeCompare(a.createdAt),
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
  return date.slice(0, 10).replaceAll("-", ".");
}
