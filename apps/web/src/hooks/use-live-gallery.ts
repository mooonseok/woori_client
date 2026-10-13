"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { GalleryData, Group, Photo } from "@/dto/album.dto";
import { apiRequest, post } from "@/services/api-client";
const EMPTY: GalleryData = {
  groups: [],
  albums: [],
  photos: [],
  comments: [],
  reactions: [],
};
export function useLiveGalleryState() {
  const { user } = useAuth();
  const [data, setData] = useState<GalleryData>(EMPTY);
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const request = useRef(0);
  const reload = useCallback(async () => {
    const current = ++request.current;
    if (!user) {
      setData(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { groups } = await apiRequest<{ groups: Group[] }>("/v1/groups");
      if (current !== request.current) return;
      setData({ ...EMPTY, groups });
      setGroupId((id) =>
        groups.some((group) => group.id === id) ? id : groups[0]?.id || "",
      );
    } catch (error) {
      if (current !== request.current) return;
      setData(EMPTY);
      setError(
        error instanceof Error ? error.message : "그룹을 불러오지 못했어요.",
      );
    } finally {
      if (current === request.current) setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    let active = true;
    const counter = request;
    queueMicrotask(() => {
      if (active) void reload();
    });
    return () => {
      active = false;
      counter.current++;
    };
  }, [reload]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  async function createGroup(name: string) {
    const { group } = await post<{ group: Group }>("/v1/groups", {
      name: name.trim(),
    });
    await reload();
    setGroupId(group.id);
  }
  const unavailable = () =>
    setToast("앨범·사진 저장은 다음 연결 단계에서 제공돼요.");
  return {
    data,
    groupId,
    setGroupId,
    loading,
    error,
    reload,
    mode: "live" as const,
    profileName: user?.displayName || "",
    setProfileName: () => setToast("프로필 수정 기능을 준비하고 있어요."),
    viewer: null as { photos: Photo[]; id: string } | null,
    openPhoto: unavailable,
    closeViewer: () => {},
    addComment: unavailable,
    react: unavailable,
    createAlbum: () => {
      unavailable();
      return null;
    },
    createGroup,
    addPhotos: async () => ({
      added: 0,
      failures: ["사진 저장 기능을 준비하고 있어요."],
    }),
    toast,
    setToast,
  };
}
