"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useGallery } from "@/hooks/use-gallery";
import { GalleryStatus } from "@/components/organisms/gallery-status/gallery-status";
import { AlbumView } from "./album-view";
export function AlbumContainer() {
  const params = useSearchParams(),
    router = useRouter(),
    gallery = useGallery();
  const fileRef = useRef<HTMLInputElement>(null),
    [busy, setBusy] = useState(false),
    [failures, setFailures] = useState<string[]>([]);
  const id = params.get("id"),
    album = gallery.data.albums.find(
      (a) => a.id === id && a.groupId === gallery.groupId,
    );
  const photos = gallery.data.photos.filter((p) => p.albumId === album?.id);
  const mediaRef = useRef(gallery),
    revision = useRef(0);
  useEffect(() => {
    mediaRef.current = gallery;
  }, [gallery]);
  useEffect(() => {
    let active = true;
    const counter = revision;
    queueMicrotask(() => {
      if (!active) return;
      setBusy(false);
      setFailures([]);
      if (album?.id) void mediaRef.current.loadPhotos?.(album.id);
    });
    return () => {
      active = false;
      counter.current++;
      mediaRef.current.cancelUploads?.();
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
        gallery.mode === "demo"
          ? `${result.added}장을 이 기기에서 미리보고 있어요. 서버에는 업로드되지 않았어요.`
          : `${result.added}장의 사진을 저장했어요.`,
      );
    } finally {
      if (current === revision.current) {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    }
  }
  if (
    gallery.mode === "live" &&
    (gallery.loading || gallery.error || !gallery.groupId)
  )
    return <GalleryStatus />;
  return (
    <AlbumView
      album={album}
      live={gallery.mode === "live"}
      loading={gallery.photoLoading || false}
      error={gallery.photoError || ""}
      hasMore={!!gallery.nextCursor}
      canRetry={!!gallery.failedFiles?.length}
      onRetryUpload={() => void add(gallery.failedFiles || [])}
      onCancelUpload={() => gallery.cancelUploads?.()}
      onReload={() => {
        if (album) void gallery.loadPhotos?.(album.id);
      }}
      onMore={() => {
        if (album) void gallery.loadPhotos?.(album.id, gallery.nextCursor);
      }}
      photos={photos}
      busy={busy}
      failures={failures}
      fileRef={fileRef}
      onFiles={add}
      onUpload={() => fileRef.current?.click()}
      onPhoto={gallery.openPhoto}
      onBack={() => router.push("/albums")}
    />
  );
}
