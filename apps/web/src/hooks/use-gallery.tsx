'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { DEMO_MODE } from '@/constants/app-mode';
import { useAuth } from '@/hooks/use-auth';
import { useDemoGalleryState } from '@/hooks/use-demo-gallery';
import { useLiveGalleryState } from '@/hooks/use-live-gallery';
type GalleryStore = Omit<
  ReturnType<typeof useDemoGalleryState>,
  'mode' | 'createAlbum' | 'setGroupId'
> & {
  mode: 'demo' | 'live';
  forgetGroup?: (id: string) => void;
  openMemoryPhoto?: (
    photo: import('@/dto/media.dto').PhotoResponse,
    signal?: AbortSignal
  ) => Promise<void>;
  setCaptureDate?: (
    photo: import('@/dto/album.dto').Photo,
    date: string | null
  ) => Promise<void>;
  setGroupId: (id: string) => void;
  loadDisplay?: import('@/dto/viewer.dto').DisplayLoader;
  loadVideo?: import('@/dto/viewer.dto').VideoLoader;
  videoUploads?: string[];
  createAlbum: (title: string) => string | null | Promise<string>;
  loadPhotos?: (
    albumId: string,
    cursor?: string | null
  ) => Promise<import('@/dto/album.dto').Photo[]>;
  albumList?: import('@/dto/album.dto').AlbumListState;
  loadMoreAlbums?: () => Promise<string[] | null>;
  showAlbumPhotos?: (albumId: string) => Promise<boolean>;
  photoLoading?: boolean;
  photoError?: string;
  nextCursor?: string | null;
  failedFiles?: File[];
  uploadProgress?: import('@/dto/media.dto').UploadProgress | null;
  refreshProcessedPhotos?: (albumId: string) => Promise<void>;
  cancelUploads?: () => void;
  renameAlbum?: (albumId: string, title: string) => Promise<void>;
  deleteAlbum?: (albumId: string) => Promise<void>;
  deletePhoto?: (photo: import('@/dto/album.dto').Photo) => Promise<void>;
  downloadOriginal?: (photo: import('@/dto/album.dto').Photo) => Promise<void>;
};
const GalleryContext = createContext<GalleryStore | null>(null);
function DemoProvider({ children }: { children: ReactNode }) {
  const store = useDemoGalleryState();
  return (
    <GalleryContext.Provider value={store}>{children}</GalleryContext.Provider>
  );
}
function LiveProvider({ children }: { children: ReactNode }) {
  const store = useLiveGalleryState();
  return (
    <GalleryContext.Provider value={store}>{children}</GalleryContext.Provider>
  );
}
export function GalleryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return DEMO_MODE ? (
    <DemoProvider>{children}</DemoProvider>
  ) : (
    <LiveProvider key={user?.id || 'anonymous'}>{children}</LiveProvider>
  );
}
export function useGallery() {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error('GalleryProvider required');
  return ctx;
}
