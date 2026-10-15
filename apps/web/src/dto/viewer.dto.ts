import type { Photo, PhotoComment, Point, Reaction } from '@/dto/album.dto';
export interface PhotoViewerProps {
  live?: boolean;
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
  onClose: () => void;
}
