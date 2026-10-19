import type { Photo, PhotoComment, Point, Reaction } from '@/dto/album.dto';
import type { VideoAccess } from '@/dto/media.dto';
/** Fetches a video's signed play URL (live viewers). */
export type VideoLoader = (
  photo: Photo,
  signal: AbortSignal
) => Promise<VideoAccess>;
/** Fetches the display rendition of a photo that arrived as a grid thumbnail. */
export type DisplayLoader = (
  photo: Photo,
  signal: AbortSignal
) => Promise<Blob>;
export interface PhotoViewerProps {
  live?: boolean;
  loadDisplay?: DisplayLoader;
  loadVideo?: VideoLoader;
  onSetCaptureDate?: (photo: Photo, date: string | null) => Promise<void>;
  onDownloadOriginal?: (photo: Photo) => Promise<void>;
  onDeletePhoto?: (photo: Photo) => Promise<void>;
  photos: Photo[];
  initialPhotoId: string;
  initialCommentId?: string;
  comments: PhotoComment[];
  reactions: Reaction[];
  onAddComment: (
    photoId: string,
    body: string,
    point?: Point
  ) => void | Promise<void>;
  onReact: (photoId: string, emoji: string) => void;
  onClose: () => void;
}
export interface GuideProps {
  kind: 'view' | 'pin';
  onClose: (result?: 'completed' | 'skipped') => void;
}
