'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGallery } from '@/hooks/use-gallery';
import { GalleryStatus } from '@/components/organisms/gallery-status/gallery-status';
import { useUploadJobs } from '@/hooks/use-upload-jobs';
import { MAX_WINDOW_ROWS } from '@/services/list-window';
import { isVideoType } from '@/utils/media';
import { AlbumView } from './album-view';
export function AlbumContainer() {
  const params = useSearchParams(),
    router = useRouter(),
    gallery = useGallery();
  const fileRef = useRef<HTMLInputElement>(null),
    [busy, setBusy] = useState(false),
    [failures, setFailures] = useState<string[]>([]),
    [uploadRevision, setUploadRevision] = useState(0);
  const id = params.get('id'),
    album = gallery.data.albums.find(
      (a) => a.id === id && a.groupId === gallery.groupId
    );
  const uploads = useUploadJobs(
    gallery.groupId,
    album?.id || '',
    gallery.mode === 'live',
    async () => {
      if (album) await gallery.refreshProcessedPhotos?.(album.id);
    },
    uploadRevision
  );
  const photos = gallery.data.photos.filter((p) => p.albumId === album?.id);
  const retained = album ? gallery.uploadResults?.[album.id] : undefined;
  const displayedFailures = [
    ...new Set([...(retained?.failures ?? []), ...failures]),
  ];
  const mediaRef = useRef(gallery),
    revision = useRef(0);
  useEffect(() => {
    mediaRef.current = gallery;
  }, [gallery]);
  // A reload or shared link can name an album past the loaded pages; the list
  // has no detail endpoint, so page on until it appears, as far as a refresh
  // keeps the list (MAX_WINDOW_ROWS), so a found album is not dropped again.
  const list = gallery.albumList,
    loadedAlbums = gallery.data.albums.filter(
      (a) => a.groupId === gallery.groupId
    ).length,
    seeking =
      !!id && !album && !!list?.hasMore && loadedAlbums < MAX_WINDOW_ROWS;
  useEffect(() => {
    if (!seeking || list?.loadingMore || list?.error || gallery.loading) return;
    void mediaRef.current.loadMoreAlbums?.();
  }, [seeking, loadedAlbums, list?.loadingMore, list?.error, gallery.loading]);
  // Uploads belong to the album in the URL: a moment when it is missing from
  // the list (a refresh) neither cancels them nor drops their results.
  useEffect(() => {
    let active = true;
    const counter = revision;
    queueMicrotask(() => {
      if (!active) return;
      setBusy(false);
      setFailures([]);
    });
    return () => {
      active = false;
      counter.current++;
      mediaRef.current.cancelUploads?.();
    };
  }, [id, gallery.groupId]);
  // First visit loads the grid; the same album again refreshes it in the
  // background, keeping pages loaded with "사진 더 보기".
  useEffect(() => {
    const albumId = album?.id;
    if (!albumId) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const media = mediaRef.current;
      void (media.showAlbumPhotos ?? media.loadPhotos)?.(albumId);
    });
    return () => {
      active = false;
    };
  }, [album?.id, gallery.groupId]);
  async function add(files: FileList | File[] | null) {
    if (!files || !album || busy) return;
    const current = revision.current;
    setBusy(true);
    setFailures([]);
    try {
      const result = await gallery.addPhotos(album.id, Array.from(files));
      if (current !== revision.current) return;
      setFailures(result.failures);
      gallery.setToast(
        result.added > 0
          ? gallery.mode === 'demo'
            ? `${result.added}장을 이 기기에서 미리보고 있어요. 서버에는 업로드되지 않았어요.`
            : `${result.added}개를 처리하도록 접수했어요.${Array.from(files).some((file) => isVideoType(file.type)) ? ' 동영상은 변환을 마치면 앨범에 보여요.' : ''}`
          : ''
      );
    } finally {
      if (current === revision.current) {
        setBusy(false);
        setUploadRevision((n) => n + 1);
        if (fileRef.current) fileRef.current.value = '';
      }
    }
  }
  if (
    gallery.mode === 'live' &&
    (gallery.loading || gallery.error || !gallery.groupId)
  )
    return <GalleryStatus />;
  return (
    <AlbumView
      videoIds={gallery.videoUploads}
      album={album}
      seeking={seeking}
      seekError={list?.error || ''}
      onSeekRetry={() => void gallery.loadMoreAlbums?.()}
      onRename={async (title) => {
        if (album) await gallery.renameAlbum?.(album.id, title);
      }}
      onDelete={async () => {
        const current = revision.current;
        if (album) await gallery.deleteAlbum?.(album.id);
        if (current === revision.current) router.replace('/albums');
      }}
      live={gallery.mode === 'live'}
      loading={gallery.photoLoading || false}
      error={gallery.photoError || ''}
      hasMore={!!gallery.nextCursor}
      uploads={uploads}
      uploadProgress={
        gallery.uploadProgress?.albumId === album?.id
          ? gallery.uploadProgress || null
          : null
      }
      canRetry={!!retained?.files.length}
      onRetryUpload={() => void add(retained?.files || [])}
      onCancelUpload={() => gallery.cancelUploads?.()}
      onReload={() => {
        if (album) void gallery.loadPhotos?.(album.id);
      }}
      onMore={() => {
        if (album) void gallery.loadPhotos?.(album.id, gallery.nextCursor);
      }}
      photos={photos}
      busy={busy}
      failures={displayedFailures}
      fileRef={fileRef}
      onFiles={add}
      onUpload={() => fileRef.current?.click()}
      onPhoto={gallery.openPhoto}
      onBack={() => router.push('/albums')}
    />
  );
}
