'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { Album, GalleryData, Group, Photo } from '@/dto/album.dto';
import type {
  AlbumResponse,
  PendingUpload,
  PhotoResponse,
} from '@/dto/media.dto';
import {
  apiRequest,
  post,
  GROUP_ACCESS_RECHECK,
  GROUP_MEMBERSHIP_CHANGED,
} from '@/services/api-client';
import * as media from '@/services/media-client';
const EMPTY: GalleryData = {
  groups: [],
  albums: [],
  photos: [],
  comments: [],
  reactions: [],
};
const albumModel = (a: AlbumResponse): Album => ({
  ...a,
  date: a.createdAt.slice(0, 10),
  coverId: a.coverPhotoId || '',
});
export function useLiveGalleryState() {
  const { user } = useAuth();
  const [data, setData] = useState<GalleryData>(EMPTY);
  const [groupId, selectGroup] = useState('');
  const selectedGroup = useRef('');
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [toast, setToast] = useState('');
  const [viewer, setViewer] = useState<{ photos: Photo[]; id: string } | null>(
    null
  );
  const [photoLoading, setPhotoLoading] = useState(false),
    [photoError, setPhotoError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  const scope = useRef(new AbortController()),
    urls = useRef(new Set<string>()),
    request = useRef(0);
  const albumRequest = useRef(0);
  const photoRequest = useRef(0),
    loadedAlbum = useRef('');
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  const uploadController = useRef<AbortController | null>(null);
  const pending = useRef(new Map<File, PendingUpload>());
  const dispose = useCallback(() => {
    scope.current.abort();
    uploadController.current?.abort();
    urls.current.forEach(URL.revokeObjectURL);
    urls.current.clear();
    pending.current.clear();
    loadedAlbum.current = '';
    photoRequest.current++;
    albumRequest.current++;
  }, []);
  useEffect(() => () => dispose(), [dispose]);
  const reload = useCallback(async () => {
    const current = ++request.current;
    if (!user) {
      setData(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { groups } = await apiRequest<{ groups: Group[] }>('/v1/groups');
      if (current !== request.current) return;
      const previousId = selectedGroup.current;
      const nextId = groups.some((g) => g.id === previousId)
        ? previousId
        : groups[0]?.id || '';
      const removed = dataRef.current.groups.some(
        (old) => !groups.some((g) => g.id === old.id)
      );
      if (previousId && previousId !== nextId) {
        dispose();
        setViewer(null);
        setNextCursor(null);
        setPhotoError('');
        setPhotoLoading(false);
        setFailedFiles([]);
        dataRef.current = { ...EMPTY, groups };
        setData(dataRef.current);
      } else {
        dataRef.current = { ...dataRef.current, groups };
        setData((d) => ({ ...d, groups }));
      }
      selectedGroup.current = nextId;
      selectGroup(nextId);
      if (removed) window.dispatchEvent(new Event(GROUP_MEMBERSHIP_CHANGED));
      return groups;
    } catch (e) {
      if (current === request.current) {
        setError(e instanceof Error ? e.message : '그룹을 불러오지 못했어요.');
      }
    } finally {
      if (current === request.current) setLoading(false);
    }
  }, [user, dispose]);
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
  const fetchAlbums = useCallback(async (id: string, signal: AbortSignal) => {
    const current = ++albumRequest.current;
    const result = await media.listAlbums(id, signal);
    if (signal.aborted || current !== albumRequest.current) return;
    setData((d) => ({ ...d, albums: result.albums.map(albumModel) }));
    // Load only small cover renditions; full photographs load on album entry.
    for (const album of result.albums) {
      if (
        !album.coverPhotoId ||
        signal.aborted ||
        dataRef.current.photos.some((p) => p.id === album.coverPhotoId)
      )
        continue;
      try {
        const blob = await media.photoBlob(
          id,
          album.id,
          album.coverPhotoId,
          signal,
          'thumbnail'
        );
        if (signal.aborted || current !== albumRequest.current) return;
        const bitmap = await createImageBitmap(blob);
        if (signal.aborted || current !== albumRequest.current) {
          bitmap.close();
          return;
        }
        if (dataRef.current.photos.some((p) => p.id === album.coverPhotoId)) {
          bitmap.close();
          continue;
        }
        const src = URL.createObjectURL(blob);
        urls.current.add(src);
        const photo: Photo = {
          id: album.coverPhotoId,
          albumId: album.id,
          src,
          width: bitmap.width,
          height: bitmap.height,
          alt: album.title,
          capturedAt: album.createdAt.slice(0, 10),
          authorId: '',
        };
        bitmap.close();
        setData((d) =>
          d.photos.some((p) => p.id === photo.id)
            ? d
            : { ...d, photos: [...d.photos, photo] }
        );
      } catch {
        if (signal.aborted)
          return; /* Keep album navigation available if its cover is unavailable. */
      }
    }
  }, []);
  const refresh = useCallback(async () => {
    const signal = scope.current.signal,
      id = selectedGroup.current;
    const groups = await reload();
    if (!groups || !id || selectedGroup.current !== id || signal.aborted)
      return;
    setLoading(true);
    try {
      await fetchAlbums(id, signal);
    } catch (e) {
      if (!signal.aborted)
        setError(e instanceof Error ? e.message : '앨범을 불러오지 못했어요.');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [reload, fetchAlbums]);
  useEffect(() => {
    let active = true,
      busy = false,
      recheckPending = false;
    const check = async (accessOnly: boolean) => {
      if (!active) return;
      if (busy) {
        if (accessOnly) recheckPending = true;
        return;
      }
      busy = true;
      try {
        await (accessOnly ? reload() : refresh());
      } finally {
        busy = false;
        if (active && recheckPending) {
          recheckPending = false;
          void check(true);
        }
      }
    };
    const focus = () => {
      if (document.visibilityState === 'visible') void check(false);
    };
    const denied = () => {
      void check(true);
    };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    window.addEventListener(GROUP_ACCESS_RECHECK, denied);
    return () => {
      active = false;
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
      window.removeEventListener(GROUP_ACCESS_RECHECK, denied);
    };
  }, [reload, refresh]);
  useEffect(() => {
    dispose();
    const controller = new AbortController();
    scope.current = controller;
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setData((d) => ({ ...EMPTY, groups: d.groups }));
      setViewer(null);
      setNextCursor(null);
      setPhotoError('');
      setPhotoLoading(false);
      setFailedFiles([]);
      if (!groupId) return;
      setLoading(true);
      setError('');
      void fetchAlbums(groupId, controller.signal)
        .catch((e) => {
          if (!controller.signal.aborted)
            setError(
              e instanceof Error ? e.message : '앨범을 불러오지 못했어요.'
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    });
    return () => controller.abort();
  }, [groupId, dispose, fetchAlbums]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  function setGroupId(id: string) {
    if (id === groupId) return;
    dispose();
    setData((d) => ({ ...EMPTY, groups: d.groups }));
    setViewer(null);
    selectedGroup.current = id;
    selectGroup(id);
  }
  async function loadPhoto(
    p: PhotoResponse,
    signal: AbortSignal
  ): Promise<Photo> {
    const blob = await media.photoBlob(groupId, p.albumId, p.id, signal);
    signal.throwIfAborted();
    const src = URL.createObjectURL(blob);
    urls.current.add(src);
    return {
      id: p.id,
      albumId: p.albumId,
      src,
      width: p.width,
      height: p.height,
      alt: '함께 나눈 사진',
      capturedAt: (p.capturedAt || p.createdAt).slice(0, 10),
      authorId: '',
      canDelete: p.canDelete,
    };
  }
  async function loadPhotos(albumId: string, cursor: string | null = null) {
    const signal = scope.current.signal,
      current = ++photoRequest.current;
    setPhotoLoading(true);
    setPhotoError('');
    if (loadedAlbum.current !== albumId) {
      loadedAlbum.current = '';
      setFailedFiles([]);
      pending.current.clear();
    }
    if (!cursor) setNextCursor(null);
    const photos: Photo[] = [];
    let committed = false;
    try {
      const page = await media.listPhotos(groupId, albumId, cursor, signal);
      for (let start = 0; start < page.photos.length; start += 3) {
        const batch = await Promise.allSettled(
          page.photos.slice(start, start + 3).map(async (p) => {
            const photo = await loadPhoto(p, signal);
            photos.push(photo);
            return photo;
          })
        );
        const failure = batch.find((result) => result.status === 'rejected');
        if (failure?.status === 'rejected') throw failure.reason;
        if (signal.aborted || current !== photoRequest.current) return [];
      }
      if (signal.aborted || current !== photoRequest.current) return [];
      photos.sort(
        (a, b) =>
          page.photos.findIndex((p) => p.id === a.id) -
          page.photos.findIndex((p) => p.id === b.id)
      );
      const keep = (p: Photo) =>
        !photos.some((n) => n.id === p.id) &&
        (!!cursor || p.albumId !== albumId);
      const replaced = dataRef.current.photos.filter((p) => !keep(p));
      setData((d) => ({ ...d, photos: [...d.photos.filter(keep), ...photos] }));
      replaced.forEach((p) => {
        if (!viewer?.photos.some((v) => v.src === p.src)) {
          URL.revokeObjectURL(p.src);
          urls.current.delete(p.src);
        }
      });
      committed = true;
      loadedAlbum.current = albumId;
      setNextCursor(page.nextCursor);
      return photos;
    } catch (e) {
      if (!signal.aborted && current === photoRequest.current)
        setPhotoError(
          e instanceof Error ? e.message : '사진을 불러오지 못했어요.'
        );
      return [];
    } finally {
      if (!committed)
        photos.forEach((p) => {
          URL.revokeObjectURL(p.src);
          urls.current.delete(p.src);
        });
      if (!signal.aborted && current === photoRequest.current)
        setPhotoLoading(false);
    }
  }
  async function createAlbum(title: string) {
    const signal = scope.current.signal;
    if (!groupId || !title.trim() || title.trim().length > 160)
      throw new Error('앨범 제목을 1~160자로 입력해 주세요.');
    const { album } = await media.createAlbum(groupId, title, signal);
    signal.throwIfAborted();
    setData((d) => ({ ...d, albums: [albumModel(album), ...d.albums] }));
    return album.id;
  }
  function removeLocalPhotos(predicate: (p: Photo) => boolean) {
    photoRequest.current++;
    albumRequest.current++;
    setPhotoLoading(false);
    setPhotoError('');
    setNextCursor(null);
    setViewer(null);
    dataRef.current.photos.filter(predicate).forEach((p) => {
      URL.revokeObjectURL(p.src);
      urls.current.delete(p.src);
    });
    setData((d) => ({ ...d, photos: d.photos.filter((p) => !predicate(p)) }));
  }
  async function renameAlbum(albumId: string, title: string) {
    const signal = scope.current.signal;
    const { album } = await media.renameAlbum(groupId, albumId, title, signal);
    signal.throwIfAborted();
    albumRequest.current++;
    setData((d) => ({
      ...d,
      albums: d.albums.map((a) => (a.id === albumId ? albumModel(album) : a)),
    }));
    setToast('앨범 제목을 변경했어요.');
  }
  async function deleteAlbum(albumId: string) {
    const signal = scope.current.signal;
    await media.deleteAlbum(groupId, albumId, signal);
    signal.throwIfAborted();
    removeLocalPhotos((p) => p.albumId === albumId);
    pending.current.clear();
    setFailedFiles([]);
    loadedAlbum.current = '';
    setData((d) => ({
      ...d,
      albums: d.albums.filter((a) => a.id !== albumId),
    }));
    setToast('앨범을 삭제했어요.');
  }
  async function deletePhoto(photo: Photo) {
    const signal = scope.current.signal;
    await media.deletePhoto(groupId, photo.albumId, photo.id, signal);
    signal.throwIfAborted();
    removeLocalPhotos((p) => p.id === photo.id);
    setData((d) => ({
      ...d,
      albums: d.albums.map((a) =>
        a.id === photo.albumId
          ? {
              ...a,
              photoCount: Math.max(0, (a.photoCount || 0) - 1),
              coverId: a.coverId === photo.id ? '' : a.coverId,
            }
          : a
      ),
    }));
    setToast('사진을 삭제했어요.');
    await loadPhotos(photo.albumId);
    if (!signal.aborted) {
      try {
        await fetchAlbums(groupId, signal);
      } catch {
        if (!signal.aborted)
          setError(
            '사진은 삭제했지만 앨범 정보를 갱신하지 못했어요. 다시 불러와 주세요.'
          );
      }
    }
  }
  async function downloadOriginal(photo: Photo) {
    const signal = scope.current.signal;
    const { blob, filename } = await media.originalPhoto(
      groupId,
      photo.albumId,
      photo.id,
      signal
    );
    signal.throwIfAborted();
    const src = URL.createObjectURL(blob);
    urls.current.add(src);
    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    // Allow the browser to consume the object URL before releasing it.
    setTimeout(() => {
      URL.revokeObjectURL(src);
      urls.current.delete(src);
    }, 1000);
    setToast('원본 사진 다운로드를 시작했어요.');
  }
  async function createGroup(name: string) {
    const { group } = await post<{ group: Group }>('/v1/groups', {
      name: name.trim(),
    });
    await reload();
    setGroupId(group.id);
  }
  async function addPhotos(albumId: string, files: File[]) {
    if (uploadController.current)
      return {
        added: 0,
        failures: ['사진을 저장하고 있어요. 잠시 기다려 주세요.'],
      };
    const parent = scope.current.signal,
      controller = new AbortController();
    uploadController.current = controller;
    for (const file of pending.current.keys()) {
      if (!files.includes(file)) pending.current.delete(file);
    }
    const cancel = () => controller.abort();
    parent.addEventListener('abort', cancel, { once: true });
    const failures: string[] = [],
      failed: File[] = [];
    let added = 0;
    try {
      const selected = files.slice(0, 30);
      for (let index = 0; index < selected.length; index++) {
        const file = selected[index];
        if (controller.signal.aborted) {
          failed.push(...selected.slice(index));
          break;
        }
        const state = pending.current.get(file) || { uploaded: false };
        pending.current.set(file, state);
        try {
          const photo = await media.uploadPhoto(
            groupId,
            albumId,
            file,
            state,
            controller.signal
          );
          controller.signal.throwIfAborted();
          pending.current.delete(file);
          added++;
          setData((d) => ({
            ...d,
            albums: d.albums.map((a) =>
              a.id === albumId
                ? {
                    ...a,
                    photoCount: (a.photoCount || 0) + 1,
                    coverId: a.coverId || photo.id,
                  }
                : a
            ),
          }));
        } catch (e) {
          if (controller.signal.aborted) {
            failed.push(...selected.slice(index));
            break;
          }
          failed.push(file);
          failures.push(
            `${file.name}: ${e instanceof Error ? e.message : '저장하지 못했어요.'}`
          );
        }
      }
      if (files.length > 30)
        failures.push(
          '한 번에 30장까지 올릴 수 있어요. 나머지는 다시 선택해 주세요.'
        );
      if (!parent.aborted && loadedAlbum.current === albumId) {
        setFailedFiles(failed);
        if (added) await loadPhotos(albumId);
      }
      if (controller.signal.aborted && !parent.aborted)
        failures.push(
          '업로드를 중단했어요. 이미 저장된 사진은 앨범에 남아 있어요. 완료를 확인하지 못한 사진은 다시 시도할 수 있어요.'
        );
      return { added, failures };
    } finally {
      parent.removeEventListener('abort', cancel);
      uploadController.current = null;
    }
  }
  async function openPhoto(id: string) {
    const signal = scope.current.signal;
    const photo = dataRef.current.photos.find((p) => p.id === id);
    if (!photo) return;
    if (loadedAlbum.current !== photo.albumId) {
      const photos = await loadPhotos(photo.albumId);
      if (!signal.aborted && signal === scope.current.signal && photos.length)
        setViewer({
          photos,
          id: photos.some((p) => p.id === id) ? id : photos[0].id,
        });
    } else
      setViewer({
        photos: dataRef.current.photos.filter(
          (p) => p.albumId === photo.albumId
        ),
        id,
      });
  }
  return {
    data,
    groupId,
    setGroupId,
    loading,
    error,
    reload: refresh,
    forgetGroup: (id: string) => {
      request.current++;
      if (id === groupId) {
        dispose();
        setViewer(null);
        setData((d) => ({
          ...EMPTY,
          groups: d.groups.filter((g) => g.id !== id),
        }));
        selectedGroup.current = '';
        selectGroup('');
        setFailedFiles([]);
        setNextCursor(null);
      } else
        setData((d) => ({ ...d, groups: d.groups.filter((g) => g.id !== id) }));
      void reload();
    },
    mode: 'live' as const,
    profileName: user?.displayName || '',
    setProfileName: () => setToast('프로필 수정 기능을 준비하고 있어요.'),
    viewer,
    openPhoto,
    closeViewer: () => {
      setViewer(null);
      urls.current.forEach((src) => {
        if (!dataRef.current.photos.some((p) => p.src === src)) {
          URL.revokeObjectURL(src);
          urls.current.delete(src);
        }
      });
    },
    addComment: () => setToast('댓글 저장 기능을 준비하고 있어요.'),
    react: () => setToast('반응 저장 기능을 준비하고 있어요.'),
    createAlbum,
    renameAlbum,
    deleteAlbum,
    deletePhoto,
    downloadOriginal,
    createGroup,
    addPhotos,
    photoLoading,
    photoError,
    nextCursor,
    loadPhotos,
    failedFiles,
    cancelUploads: () => uploadController.current?.abort(),
    toast,
    setToast,
  };
}
