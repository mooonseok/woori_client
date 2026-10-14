import type { Photo, PhotoComment, Point, Reaction } from "@/dto/album.dto";
export interface PhotoViewerProps {
  interactionsEnabled?: boolean;
  photos: Photo[];
  initialPhotoId: string;
  comments: PhotoComment[];
  reactions: Reaction[];
  onAddComment: (photoId: string, body: string, point?: Point) => void;
  onReact: (photoId: string, emoji: string) => void;
  onClose: () => void;
}
export interface GuideProps {
  kind: "view" | "pin";
  onClose: () => void;
}
