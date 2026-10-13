"use client";
import { useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useGallery } from "@/hooks/use-gallery";
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
  async function add(files: FileList | null) {
    if (!files || !album || busy) return;
    setBusy(true);
    setFailures([]);
    try {
      const result = await gallery.addPhotos(album.id, Array.from(files));
      setFailures(result.failures);
      gallery.setToast(
        `${result.added}장을 이 기기에서 미리보고 있어요. 서버에는 업로드되지 않았어요.`,
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  return (
    <AlbumView
      album={album}
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
