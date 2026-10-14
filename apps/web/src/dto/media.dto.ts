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
