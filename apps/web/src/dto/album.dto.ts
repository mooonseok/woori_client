export interface Group {
  id: string;
  name: string;
  members: number;
  role?: "OWNER" | "MEMBER";
}
export interface Album {
  id: string;
  groupId: string;
  title: string;
  date: string;
  coverId: string;
  photoCount?: number;
  canManage?: boolean;
  createdAt: string;
}
export interface Photo {
  id: string;
  albumId: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  capturedAt: string;
  authorId: string;
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
  body: string;
  createdAt: string;
  point?: Point;
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
