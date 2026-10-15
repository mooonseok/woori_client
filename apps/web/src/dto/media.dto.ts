import type { PhotoDateSource } from './memories.dto';
export interface AlbumResponse {
  id: string;
  groupId: string;
  title: string;
  createdAt: string;
  photoCount: number;
  coverPhotoId: string | null;
  canManage: boolean;
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
  phase: 'RESERVING' | 'UPLOADING' | 'QUEUING';
}

export interface UploadJobsView {
  jobs: UploadJobResponse[];
  error: string;
  paused: boolean;
  loading: boolean;
  reload: () => void;
}
