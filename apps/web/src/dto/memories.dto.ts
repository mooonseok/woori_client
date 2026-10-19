import type { PhotoResponse } from './media.dto';
export type MemoryKind = 'today' | 'month' | 'hidden';
export type PhotoDateSource = 'USER' | 'EXIF' | 'UPLOAD';
export interface MemoryItem {
  photo: PhotoResponse;
  albumTitle: string;
  effectiveDate: string;
  dateSource: PhotoDateSource;
  yearsAgo: number;
}
export interface MemoriesResponse {
  asOf: string;
  timeZone: 'Asia/Seoul';
  kind: MemoryKind;
  items: MemoryItem[];
  nextCursor: string | null;
}
export interface MemoryCard extends MemoryItem {
  thumbnail: string;
  previewStatus?: 'loading' | 'error' | 'unavailable';
}
