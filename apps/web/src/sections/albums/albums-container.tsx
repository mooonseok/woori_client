"use client";
import { useRouter } from "next/navigation";
import { GalleryStatus } from "@/components/organisms/gallery-status/gallery-status";
import { useGallery } from "@/hooks/use-gallery";
import { useAlbumSearch } from "@/hooks/use-albums";
import { listAlbums } from "@/lib/gallery";
import { EntryDialog } from "@/components/organisms/entry-dialog/entry-dialog";
import { AlbumsView } from "./albums-view";
export function AlbumsContainer() {
  const gallery = useGallery(),
    search = useAlbumSearch(),
    router = useRouter();
  if (gallery.mode === "live") return <GalleryStatus />;
  const albums = listAlbums(
    gallery.data,
    gallery.groupId,
    search.query,
    search.sort,
  );
  return (
    <>
      <AlbumsView
        albums={albums}
        photos={gallery.data.photos}
        search={search}
        onOpen={(id) => router.push(`/album?id=${encodeURIComponent(id)}`)}
      />
      {search.creating && (
        <EntryDialog
          title="앨범 만들기"
          label="앨범 제목"
          onClose={() => search.setCreating(false)}
          onSubmit={(title) => {
            const id = gallery.createAlbum(title);
            if (id) router.push(`/album?id=${id}`);
          }}
        />
      )}
    </>
  );
}
