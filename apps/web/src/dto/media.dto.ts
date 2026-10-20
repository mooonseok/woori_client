import type { PhotoDateSource } from './memories.dto';
export interface AlbumResponse {
  id: string;
  groupId: string;
  title: string;
  createdAt: string;
  photoCount: number;
  coverPhotoId: string | null;
  canManage: boolean;
  // OpenAPI 0.22.0: videos among photoCount (photoCount counts both).
  videoCount?: number;
  // OpenAPI 0.24.0 (planned): the cover's kind; null without a cover.
  coverMediaKind?: 'PHOTO' | 'VIDEO' | null;
  // OpenAPI 0.21.0 (additive): KST 'YYYY-MM-DD' range of the visible photos'
  // effective dates; null when none is visible. Absent from older servers.
  startDate?: string | null;
  endDate?: string | null;
}
export interface AlbumPageResponse {
  albums: AlbumResponse[];
  // OpenAPI 0.21.0: opaque; absent from older servers (one page only).
  nextCursor?: string | null;
}
export interface PhotoResponse {
  id: string;
  groupId: string;
  albumId: string;
  width: number;
  height: number;
  createdAt: string;
  capturedAt: string | null;
  effectiveDate?: string;
  dateSource?: PhotoDateSource;
  canEditCaptureDate?: boolean;
  status: 'READY';
  canDelete: boolean;
  // OpenAPI 0.15.0 (additive): who uploaded the photo.
  uploader?: PhotoUploader;
  // OpenAPI 0.22.0: VIDEO thumbnail/display variants are posters; play and
  // download go through VideoAccess. durationMs is null for photos.
  mediaKind?: 'PHOTO' | 'VIDEO';
  durationMs?: number | null;
}
// Session-authenticated API media URL; each GET/HEAD/Range rechecks access.
// expiresAt is a metadata refresh hint, not a permission bypass deadline.
export interface VideoAccess {
  url: string;
  expiresAt: string;
  purpose: 'play' | 'download';
  mime: 'video/mp4';
  bytes: number;
  width: number;
  height: number;
  durationMs: number;
}
export interface PhotoUploader {
  id: string;
  displayName: string;
  nickname?: string;
}
export interface UploadTicket {
  photoId: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresAt: string;
}
export interface PendingUpload {
  ticket?: UploadTicket;
  uploaded: boolean;
}

export interface UploadJobResponse {
  photoId: string;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  phase: 'QUEUED' | 'PROCESSING' | 'RETRY_WAIT' | 'READY' | 'FAILED';
  retryAfterSeconds: number | null;
  errorCode: string | null;
  photo?: PhotoResponse;
}
export interface UploadProgress {
  groupId: string;
  albumId: string;
  current: number;
  total: number;
  filename: string;
  // CHECKING: reading a video's length in the browser before reserving.
  phase: 'CHECKING' | 'RESERVING' | 'UPLOADING' | 'QUEUING';
  video?: boolean;
  // Bytes sent of this file while UPLOADING (whole percent).
  percent?: number;
}

export interface UploadJobsView {
  jobs: UploadJobResponse[];
  error: string;
  paused: boolean;
  loading: boolean;
  reload: () => void;
}
