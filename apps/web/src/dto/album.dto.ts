import type { PhotoDateSource } from './memories.dto';
export interface Group {
  id: string;
  name: string;
  members: number;
  role?: 'OWNER' | 'MEMBER';
}
export interface Album {
  id: string;
  groupId: string;
  title: string;
  // Period of the visible photos (see AlbumResponse); undefined from a server
  // before OpenAPI 0.21.0, where the creation date is shown instead.
  startDate?: string | null;
  endDate?: string | null;
  coverId: string;
  photoCount?: number; // photos and videos (OpenAPI 0.22.0)
  videoCount?: number;
  coverMediaKind?: 'PHOTO' | 'VIDEO' | null; // OpenAPI 0.24.0 (planned)
  canManage?: boolean;
  createdAt: string;
}
// Live album list paging ("더 불러오기"); demo shows every album at once.
export interface AlbumListState {
  hasMore: boolean;
  loadingMore: boolean;
  error: string;
  notice: string;
}
export interface Photo {
  id: string;
  albumId: string;
  src: string;
  // Local preview state; never an API field. Missing means a loaded source.
  previewStatus?: 'loading' | 'error' | 'unavailable';
  width: number;
  height: number;
  alt: string;
  // Server rendition held by `src`; the viewer upgrades 'thumbnail' to display.
  variant?: 'thumbnail' | 'display';
  // A video's `src` is its poster image; it plays via the viewer's loadVideo.
  mediaKind?: 'PHOTO' | 'VIDEO';
  durationMs?: number | null;
  capturedAt: string;
  effectiveDate?: string;
  dateSource?: PhotoDateSource;
  canEditCaptureDate?: boolean;
  // Uploader id; '' when the response did not say who uploaded it.
  authorId: string;
  authorName?: string;
  canDelete?: boolean;
}
export interface Point {
  x: number;
  y: number;
}
export interface PhotoComment {
  id: string;
  photoId: string;
  authorId: string;
  authorName: string;
  authorAvatarVersion?: number | null;
  body: string;
  createdAt: string;
  point?: Point;
  canEdit?: boolean;
  canDelete?: boolean;
}
export interface Reaction {
  photoId: string;
  userId: string;
  emoji: string;
}
export interface GalleryData {
  groups: Group[];
  albums: Album[];
  photos: Photo[];
  comments: PhotoComment[];
  reactions: Reaction[];
}
