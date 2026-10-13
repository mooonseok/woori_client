"use client";
import { useRef, useState, useEffect } from "react";
import { initialGallery } from "@/content/gallery";
import type { GalleryData, Photo, Point } from "@/dto/album.dto";
import { validPoint } from "@/lib/gallery";
import { readPhotoPreview } from "@/services/photo-preview";
export function useDemoGalleryState() {
  const [data, setData] = useState<GalleryData>(initialGallery);
  const [profileName, setProfileName] = useState("이서연");
  const [groupId, setGroupId] = useState("g1");
  const [viewer, setViewer] = useState<{ photos: Photo[]; id: string } | null>(
    null,
  );
  const [toast, setToast] = useState("");
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  function openPhoto(id: string) {
    const photo = data.photos.find((p) => p.id === id);
    if (!photo) {
      setToast("이 사진을 더 이상 볼 수 없어요.");
      return;
    }
    setViewer({
      photos: data.photos.filter((p) => p.albumId === photo.albumId),
      id,
    });
  }
  function addComment(photoId: string, body: string, point?: Point) {
    if (!body.trim() || body.trim().length > 2000 || !validPoint(point)) return;
    setData((d) => ({
      ...d,
      comments: [
        ...d.comments,
        {
          id: crypto.randomUUID(),
          photoId,
          body: body.trim(),
          point,
          authorId: "me",
          authorName: "나",
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }
  function react(photoId: string, emoji: string) {
    setData((d) => {
      const current = d.reactions.find(
        (r) => r.photoId === photoId && r.userId === "me",
      );
      return {
        ...d,
        reactions: [
          ...d.reactions.filter(
            (r) => !(r.photoId === photoId && r.userId === "me"),
          ),
          ...(current?.emoji === emoji
            ? []
            : [{ photoId, userId: "me", emoji }]),
        ],
      };
    });
  }
  function createAlbum(title: string) {
    if (!title.trim()) return null;
    const id = crypto.randomUUID(),
      date = new Date().toISOString();
    setData((d) => ({
      ...d,
      albums: [
        {
          id,
          groupId,
          title: title.trim().slice(0, 80),
          date: date.slice(0, 10),
          createdAt: date,
          coverId: "",
        },
        ...d.albums,
      ],
    }));
    return id;
  }
  function createGroup(name: string) {
    if (!name.trim()) return;
    const id = crypto.randomUUID();
    setData((d) => ({
      ...d,
      groups: [...d.groups, { id, name: name.trim().slice(0, 40), members: 1 }],
    }));
    setGroupId(id);
  }
  async function addPhotos(albumId: string, files: File[]) {
    let added = 0;
    const failures: string[] = [];
    for (const file of files.slice(0, 30)) {
      try {
        const photo = await readPhotoPreview(file, albumId);
        urls.current.push(photo.src);
        setData((d) => ({
          ...d,
          photos: [...d.photos, photo],
          albums: d.albums.map((a) =>
            a.id === albumId ? { ...a, coverId: a.coverId || photo.id } : a,
          ),
        }));
        added++;
      } catch (error) {
        failures.push(
          `${file.name}: ${error instanceof Error ? error.message : "사진을 읽지 못했어요."}`,
        );
      }
    }
    if (files.length > 30) failures.push("한 번에 30장까지 미리볼 수 있어요.");
    return { added, failures };
  }
  return {
    data,
    loading: false,
    error: "",
    reload: async () => {},
    mode: "demo" as const,
    profileName,
    setProfileName,
    groupId,
    setGroupId,
    viewer,
    openPhoto,
    closeViewer: () => setViewer(null),
    addComment,
    react,
    createAlbum,
    createGroup,
    addPhotos,
    toast,
    setToast,
  };
}
