'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { Album, GalleryData, Group, Photo } from '@/dto/album.dto';
import type {
  AlbumResponse,
  PendingUpload,
  PhotoResponse,
  UploadProgress,
} from '@/dto/media.dto';
import {
  apiRequest,
  post,
  GROUP_ACCESS_RECHECK,
  GROUP_MEMBERSHIP_CHANGED,
} from '@/services/api-client';
import * as media from '@/services/media-client';
import { displayLoader } from '@/services/display-renditions';
import { loadMoreAfterRefresh } from '@/utils/load-more';
import { isVideoType, mediaPrecheck, uploadPercent } from '@/utils/media';
import { probeVideoDuration } from '@/services/video-probe';
import { photoWindow, withTail } from '@/services/list-window';
import { coverPhoto } from '@/lib/gallery';
import {
  finishLoad,
  freshLoad,
  startLoad,
  type LoadState,
} from '@/utils/load-state';
import {
  albumWindow,
  mergeAlbumPage,
  nextAlbumPage,
} from '@/services/album-pages';
import { MEMORIES_CHANGED, updateCaptureDate } from '@/services/memories';
import { BLOCKS_CHANGED } from '@/services/blocks';
import {
  blockChangeOf,
  purgeOnBlock,
  uploaderOf,
  viewerAfterBlock,
} from '@/utils/blocks';
import type { BlockChange } from '@/dto/block.dto';
const EMPTY: GalleryData = {
  groups: [],
  albums: [],
  photos: [],
  comments: [],
  reactions: [],
};
const albumModel = (a: AlbumResponse): Album => ({
  ...a,
  coverId: a.coverPhotoId || '',
});
const photoModel = (
  p: PhotoResponse,
  src: string,
  variant: 'thumbnail' | 'display'
): Photo => ({
  id: p.id,
  albumId: p.albumId,
  src,
  variant,
  width: p.width,
  height: p.height,
  alt: p.mediaKind === 'VIDEO' ? '함께 나눈 동영상' : '함께 나눈 사진',
  capturedAt: p.effectiveDate || (p.capturedAt || p.createdAt).slice(0, 10),
  effectiveDate: p.effectiveDate,
  dateSource: p.dateSource,
  canEditCaptureDate: p.canEditCaptureDate,
  ...uploaderOf(p),
  canDelete: p.canDelete,
  mediaKind: p.mediaKind ?? 'PHOTO',
  durationMs: p.durationMs ?? null,
});
const GROUPS = 'groups';
// A page load overtaken by a newer one (see loadPhotos).
const SUPERSEDED = Symbol('superseded');
// No group selected (or none left): nothing to load for albums.
const NO_GROUP: LoadState = {
  scope: '',
  loaded: true,
  loading: false,
  error: '',
};
const FIRST_LOAD = { groups: freshLoad(GROUPS), albums: freshLoad('') };
const NO_PAGING = {
  groupId: '',
  nextCursor: null as string | null,
  loadingMore: false,
  error: '',
  notice: '',
};
export function useLiveGalleryState() {
  const { user } = useAuth();
  const [data, setData] = useState<GalleryData>(EMPTY);
  const [groupId, selectGroup] = useState('');
  const selectedGroup = useRef('');
  // Groups and the selected group's albums: only a first load (or a retry
  // from the error screen) swaps the page for GalleryStatus.
  const statusRef = useRef(FIRST_LOAD);
  const [status, setStatus] = useState(FIRST_LOAD);
  const [toast, setToast] = useState('');
  const [viewer, setViewer] = useState<{ photos: Photo[]; id: string } | null>(
    null
  );
  const [photoLoading, setPhotoLoading] = useState(false),
    [photoError, setPhotoError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  // Latest photo cursor for a "사진 더 보기" retried after a refresh.
  const photoCursor = useRef<string | null>(null);
  const showCursor = useCallback((cursor: string | null) => {
    photoCursor.current = cursor;
    setNextCursor(cursor);
  }, []);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  // Uploads from this device that are videos: their jobs read "변환 중".
  const [videoUploads, setVideoUploads] = useState<string[]>([]);
  // Album list paging of one group; a refresh re-reads the loaded window.
  const [albumPaging, setAlbumPaging] = useState(NO_PAGING);
  const pagingRef = useRef(NO_PAGING);
  const updatePaging = useCallback(
    (next: (p: typeof NO_PAGING) => typeof NO_PAGING) => {
      pagingRef.current = next(pagingRef.current);
      setAlbumPaging(pagingRef.current);
    },
    []
  );
  const albumMore = useRef<AbortSignal | null>(null);
  // Settle when the latest refresh has landed (or failed): a "더 보기" it
  // superseded then continues after the refreshed window.
  const albumFetch = useRef<Promise<void>>(Promise.resolve()),
    photoRefresh = useRef<Promise<unknown>>(Promise.resolve());
  const scope = useRef(new AbortController()),
    urls = useRef(new Set<string>()),
    request = useRef(0);
  const albumRequest = useRef(0),
    viewerRequest = useRef(0);
  const photoRequest = useRef(0),
    loadedAlbum = useRef(''),
    requestedAlbum = useRef('');
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  const viewerRef = useRef(viewer);
  useEffect(() => {
    viewerRef.current = viewer;
  }, [viewer]);
  const applyStatus = useCallback(
    (key: 'groups' | 'albums', next: LoadState) => {
      statusRef.current = { ...statusRef.current, [key]: next };
      setStatus(statusRef.current);
    },
    []
  );
  const begin = useCallback(
    (key: 'groups' | 'albums', scopeId: string) => {
      const next = startLoad(statusRef.current[key], scopeId);
      applyStatus(key, next.state);
      return next.background;
    },
    [applyStatus]
  );
  const end = useCallback(
    (
      key: 'groups' | 'albums',
      scopeId: string,
      background: boolean,
      failure?: unknown
    ) =>
      applyStatus(
        key,
        finishLoad(
          statusRef.current[key],
          scopeId,
          background,
          failure === undefined
            ? ''
            : failure instanceof Error && failure.message
              ? failure.message
              : key === 'groups'
                ? '그룹을 불러오지 못했어요.'
                : '앨범을 불러오지 못했어요.'
        )
      ),
    [applyStatus]
  );
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
    viewerRequest.current++;
    albumRequest.current++;
  }, []);
  useEffect(() => () => dispose(), [dispose]);
  const reload = useCallback(async () => {
    const current = ++request.current;
    if (!user) {
      setData(EMPTY);
      applyStatus('groups', finishLoad(freshLoad(GROUPS), GROUPS, false));
      applyStatus('albums', NO_GROUP);
      return;
    }
    const background = begin('groups', GROUPS);
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
        showCursor(null);
        setPhotoError('');
        setPhotoLoading(false);
        setFailedFiles([]);
        dataRef.current = { ...EMPTY, groups };
        setData(dataRef.current);
      } else {
        dataRef.current = { ...dataRef.current, groups };
        setData((d) => ({ ...d, groups }));
      }
      // Another group (first load, or the selected one is gone) shows loading
      // from this render on, never the previous group's albums.
      if (nextId !== statusRef.current.albums.scope)
        applyStatus('albums', nextId ? freshLoad(nextId) : NO_GROUP);
      selectedGroup.current = nextId;
      selectGroup(nextId);
      if (removed) window.dispatchEvent(new Event(GROUP_MEMBERSHIP_CHANGED));
      end('groups', GROUPS, background);
      return groups;
    } catch (e) {
      // A background failure keeps the groups on screen.
      if (current === request.current) end('groups', GROUPS, background, e);
    }
  }, [user, dispose, applyStatus, begin, end, showCursor]);
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
  // Load only small cover renditions; album pages load on entry.
  const loadCovers = useCallback(
    async (
      id: string,
      albums: AlbumResponse[],
      signal: AbortSignal,
      current: () => boolean
    ) => {
      for (const album of albums) {
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
          if (signal.aborted || !current()) return;
          const bitmap = await createImageBitmap(blob);
          if (signal.aborted || !current()) {
            bitmap.close();
            return;
          }
          if (dataRef.current.photos.some((p) => p.id === album.coverPhotoId)) {
            bitmap.close();
            continue;
          }
          const src = URL.createObjectURL(blob);
          urls.current.add(src);
          const photo = coverPhoto(album, src, bitmap);
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
    },
    []
  );
  const fetchAlbums = useCallback(
    async (id: string, signal: AbortSignal) => {
      const current = ++albumRequest.current;
      let landed = () => {};
      albumFetch.current = new Promise<void>((resolve) => (landed = resolve));
      // Keep albums added with "더 불러오기": re-read as far as they reached.
      const shown = dataRef.current.albums.filter((a) => a.groupId === id);
      let result: Awaited<ReturnType<typeof albumWindow>>;
      try {
        result = await albumWindow(id, shown.length, signal);
        if (signal.aborted || current !== albumRequest.current) return;
        // Past the page limit, albums loaded beyond the window stay listed.
        const albums = withTail(
          result.albums.map(albumModel),
          shown,
          result.capped
        );
        setData((d) => ({ ...d, albums }));
        updatePaging((p) => ({
          ...NO_PAGING,
          groupId: id,
          nextCursor:
            result.capped && p.groupId === id
              ? p.nextCursor
              : result.nextCursor,
          // An in-flight "더 불러오기" continues after this window.
          loadingMore: p.groupId === id && p.loadingMore,
        }));
      } finally {
        landed();
      }
      await loadCovers(
        id,
        result.albums,
        signal,
        () => current === albumRequest.current
      );
    },
    [loadCovers, updatePaging]
  );
  const refresh = useCallback(async () => {
    const signal = scope.current.signal,
      id = selectedGroup.current;
    const groups = await reload();
    if (!groups || !id || selectedGroup.current !== id || signal.aborted)
      return;
    const background = begin('albums', id);
    try {
      await fetchAlbums(id, signal);
      if (!signal.aborted) end('albums', id, background);
    } catch (e) {
      if (!signal.aborted) end('albums', id, background, e);
    }
  }, [reload, fetchAlbums, begin, end]);
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
      showCursor(null);
      setPhotoError('');
      setPhotoLoading(false);
      setFailedFiles([]);
      if (!groupId) {
        applyStatus('albums', NO_GROUP);
        return;
      }
      // The data was just emptied: always a first load with loading shown.
      applyStatus('albums', freshLoad(groupId));
      void fetchAlbums(groupId, controller.signal).then(
        () => {
          if (!controller.signal.aborted) end('albums', groupId, false);
        },
        (e) => {
          if (!controller.signal.aborted) end('albums', groupId, false, e);
        }
      );
    });
    return () => controller.abort();
  }, [groupId, dispose, fetchAlbums, applyStatus, end, showCursor]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  function setGroupId(id: string) {
    if (id === groupId) return;
    dispose();
    setData((d) => ({ ...EMPTY, groups: d.groups }));
    // Loading from this render on: the new group never shows the old one.
    applyStatus('albums', id ? freshLoad(id) : NO_GROUP);
    setViewer(null);
    selectedGroup.current = id;
    selectGroup(id);
  }
  // Grid pages hold 480px thumbnails; the viewer fetches display renditions
  // itself (loadDisplay). A memory opens straight into the viewer: display.
  async function loadPhoto(
    p: PhotoResponse,
    signal: AbortSignal,
    variant: 'thumbnail' | 'display'
  ): Promise<Photo> {
    const blob = await media.photoBlob(
      groupId,
      p.albumId,
      p.id,
      signal,
      variant
    );
    signal.throwIfAborted();
    const src = URL.createObjectURL(blob);
    urls.current.add(src);
    return photoModel(p, src, variant);
  }
  // A first page (cursor null) or "사진 더 보기". A refresh that replaces the
  // grid while a page is in flight makes that page wait for it and continue
  // after the refreshed window; if it still cannot, the user is told.
  async function loadPhotos(
    albumId: string,
    cursor: string | null = null
  ): Promise<Photo[]> {
    if (!cursor) {
      const first = await loadPhotoPage(albumId, null);
      return first === SUPERSEDED ? [] : first;
    }
    let retry = false;
    const result = await loadMoreAfterRefresh<Photo[]>(
      async () => {
        // A retry continues after the window the refresh just loaded.
        const next = retry ? photoCursor.current : cursor;
        retry = true;
        const page =
          next && requestedAlbum.current === albumId
            ? await loadPhotoPage(albumId, next)
            : [];
        return page === SUPERSEDED
          ? { superseded: true }
          : { superseded: false, value: page };
      },
      () => photoRefresh.current
    );
    if (!result.superseded) return result.value;
    setPhotoLoading(false);
    setPhotoError(
      '사진 목록이 바뀌어 더 불러오지 못했어요. 다시 시도해 주세요.'
    );
    return [];
  }
  async function loadPhotoPage(
    albumId: string,
    cursor: string | null
  ): Promise<Photo[] | typeof SUPERSEDED> {
    const signal = scope.current.signal,
      current = ++photoRequest.current;
    requestedAlbum.current = albumId;
    setPhotoLoading(true);
    setPhotoError('');
    if (loadedAlbum.current !== albumId) {
      loadedAlbum.current = '';
      setFailedFiles([]);
      pending.current.clear();
    }
    if (!cursor) showCursor(null);
    const photos: Photo[] = [];
    let committed = false;
    try {
      const page = await media.listPhotos(groupId, albumId, cursor, signal);
      for (let start = 0; start < page.photos.length; start += 3) {
        const batch = await Promise.allSettled(
          page.photos.slice(start, start + 3).map(async (p) => {
            const photo = await loadPhoto(p, signal, 'thumbnail');
            photos.push(photo);
            return photo;
          })
        );
        const failure = batch.find((result) => result.status === 'rejected');
        if (failure?.status === 'rejected') throw failure.reason;
        if (signal.aborted) return [];
        if (current !== photoRequest.current) return SUPERSEDED;
      }
      if (signal.aborted) return [];
      if (current !== photoRequest.current) return SUPERSEDED;
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
      showCursor(page.nextCursor);
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
  // Background refresh of an open album: re-reads the pages on screen, keeps
  // the grid (and its "더 보기" pages, scroll, focus) until the new list lands,
  // reuses loaded thumbnails and fetches only new photos. On failure nothing
  // changes and it returns false. A first load goes through loadPhotos.
  function refreshPhotos(albumId: string): Promise<boolean> {
    const run = refreshPhotosNow(albumId);
    photoRefresh.current = run.catch(() => false);
    return run;
  }
  async function refreshPhotosNow(albumId: string): Promise<boolean> {
    if (loadedAlbum.current !== albumId) {
      await loadPhotos(albumId);
      return true;
    }
    const signal = scope.current.signal,
      current = ++photoRequest.current;
    // Any "더 보기" in flight is superseded by this refresh.
    setPhotoLoading(false);
    const shownPhotos = dataRef.current.photos.filter(
      (p) => p.albumId === albumId
    );
    const shown = new Map(shownPhotos.map((p) => [p.id, p.src]));
    const created: Photo[] = [];
    let committed = false;
    try {
      const page = await photoWindow(groupId, albumId, shown.size, signal);
      const missing = page.items.filter((p) => !shown.has(p.id));
      for (let start = 0; start < missing.length; start += 3) {
        const batch = await Promise.allSettled(
          missing.slice(start, start + 3).map(async (p) => {
            const photo = await loadPhoto(p, signal, 'thumbnail');
            created.push(photo);
          })
        );
        const failure = batch.find((result) => result.status === 'rejected');
        if (failure?.status === 'rejected') throw failure.reason;
        if (signal.aborted || current !== photoRequest.current) return false;
      }
      if (signal.aborted || current !== photoRequest.current) return false;
      const fresh = new Map(created.map((p) => [p.id, p.src]));
      // Past the page limit, photos loaded beyond the window stay in the grid.
      const photos = withTail(
        page.items.map((p) =>
          photoModel(p, shown.get(p.id) ?? fresh.get(p.id)!, 'thumbnail')
        ),
        shownPhotos,
        page.capped
      );
      const kept = new Set(photos.map((p) => p.src));
      const replaced = dataRef.current.photos.filter(
        (p) => p.albumId === albumId && !kept.has(p.src)
      );
      setData((d) => ({
        ...d,
        photos: [...d.photos.filter((p) => p.albumId !== albumId), ...photos],
      }));
      replaced.forEach((p) => {
        // An open viewer may still show it; closeViewer revokes it later.
        if (viewerRef.current?.photos.some((v) => v.src === p.src)) return;
        URL.revokeObjectURL(p.src);
        urls.current.delete(p.src);
      });
      committed = true;
      if (!page.capped) showCursor(page.nextCursor);
      return true;
    } catch {
      return signal.aborted || current !== photoRequest.current;
    } finally {
      if (!committed)
        created.forEach((p) => {
          URL.revokeObjectURL(p.src);
          urls.current.delete(p.src);
        });
    }
  }
  // Returns the ids that were added (for focus), or null when nothing landed.
  async function loadMoreAlbums() {
    const id = groupId,
      signal = scope.current.signal;
    const cursorNow = () =>
      pagingRef.current.groupId === id ? pagingRef.current.nextCursor : null;
    if (
      !id ||
      !cursorNow() ||
      (albumMore.current && !albumMore.current.aborted)
    )
      return null;
    albumMore.current = signal;
    updatePaging((p) => ({ ...p, loadingMore: true, error: '', notice: '' }));
    try {
      const result = await loadMoreAfterRefresh<string[] | null>(
        async () => {
          const cursor = cursorNow();
          // A refresh may already have reached the end of the list.
          if (!cursor || signal.aborted)
            return { superseded: false, value: signal.aborted ? null : [] };
          const current = albumRequest.current;
          const page = await nextAlbumPage(id, cursor, signal);
          if (signal.aborted) return { superseded: false, value: null };
          if (current !== albumRequest.current) return { superseded: true };
          const incoming = page.albums.map(albumModel);
          const known = new Set(
            page.restarted ? [] : dataRef.current.albums.map((a) => a.id)
          );
          const merged = mergeAlbumPage(
            dataRef.current.albums,
            incoming,
            page.restarted
          ).items;
          dataRef.current = { ...dataRef.current, albums: merged };
          setData((d) => ({
            ...d,
            albums: mergeAlbumPage(d.albums, incoming, page.restarted).items,
          }));
          updatePaging(() => ({
            ...NO_PAGING,
            groupId: id,
            nextCursor: page.nextCursor,
            loadingMore: true,
            notice: page.restarted
              ? '앨범 목록이 바뀌어 처음부터 다시 불러왔어요.'
              : '',
          }));
          void loadCovers(
            id,
            page.albums,
            signal,
            () => current === albumRequest.current
          );
          return {
            superseded: false,
            value: incoming.filter((a) => !known.has(a.id)).map((a) => a.id),
          };
        },
        () => albumFetch.current
      );
      if (result.superseded) {
        updatePaging((p) => ({
          ...p,
          error: '앨범 목록이 바뀌어 더 불러오지 못했어요. 다시 시도해 주세요.',
        }));
        return null;
      }
      return result.value;
    } catch (e) {
      if (!signal.aborted)
        updatePaging((p) => ({
          ...p,
          error:
            e instanceof Error ? e.message : '앨범을 더 불러오지 못했어요.',
        }));
      return null;
    } finally {
      if (albumMore.current === signal) albumMore.current = null;
      if (!signal.aborted)
        updatePaging((p) => (p.loadingMore ? { ...p, loadingMore: false } : p));
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
    viewerRequest.current++;
    albumRequest.current++;
    setPhotoLoading(false);
    setPhotoError('');
    showCursor(null);
    setViewer(null);
    viewer?.photos
      .filter(
        (p) => !dataRef.current.photos.some((cached) => cached.src === p.src)
      )
      .forEach((p) => {
        URL.revokeObjectURL(p.src);
        urls.current.delete(p.src);
      });
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
    window.dispatchEvent(new Event(MEMORIES_CHANGED));
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
              // The refresh below recomputes the period; none is left at 0.
              ...((a.photoCount || 0) <= 1 && a.startDate !== undefined
                ? { startDate: null, endDate: null }
                : {}),
            }
          : a
      ),
    }));
    window.dispatchEvent(new Event(MEMORIES_CHANGED));
    setToast('사진을 삭제했어요.');
    // Background refreshes: the grid, its loaded pages and scroll stay put.
    const refreshed = await refreshPhotos(photo.albumId);
    if (!signal.aborted) {
      try {
        await fetchAlbums(groupId, signal);
        if (!refreshed) throw new Error('photos');
      } catch {
        if (!signal.aborted)
          setToast(
            '사진은 삭제했지만 목록을 새로 불러오지 못했어요. 잠시 후 다시 확인해 주세요.'
          );
      }
    }
  }
  async function downloadOriginal(photo: Photo) {
    const signal = scope.current.signal;
    if (photo.mediaKind === 'VIDEO') {
      // No original is kept: the transcoded MP4, as an attachment download
      // (a navigation to the signed URL; nothing is buffered here).
      const access = await media.videoAccess(
        groupId,
        photo.albumId,
        photo.id,
        'download',
        signal
      );
      signal.throwIfAborted();
      const link = document.createElement('a');
      link.href = access.url;
      link.rel = 'noopener';
      document.body.append(link);
      link.click();
      link.remove();
      setToast('동영상 다운로드를 시작했어요.');
      return;
    }
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
        failures: ['전송하고 있어요. 잠시 기다려 주세요.'],
      };
    let selection: ReturnType<typeof media.photoSelection>;
    try {
      selection = media.photoSelection(files);
    } catch (error) {
      return {
        added: 0,
        failures: [
          error instanceof Error ? error.message : '사진을 선택하지 못했어요.',
        ],
      };
    }
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
      const selected = selection.files;
      for (let index = 0; index < selected.length; index++) {
        const file = selected[index];
        if (controller.signal.aborted) {
          failed.push(...selected.slice(index));
          break;
        }
        // Invalid files need replacement/conversion, not a network retry.
        // A video's length is read here when the browser can (HEVC may not).
        const video = isVideoType(file.type);
        let duration: number | null = null;
        if (video && !mediaPrecheck(file)) {
          // Reading a large file's length can take seconds: say so, and let
          // "이 기기 전송 중단" end it at once.
          setUploadProgress({
            groupId,
            albumId,
            current: index + 1,
            total: selected.length,
            filename: file.name,
            phase: 'CHECKING',
            video,
          });
          duration = await probeVideoDuration(file, controller.signal);
          if (controller.signal.aborted) {
            failed.push(...selected.slice(index));
            break;
          }
        }
        const problem = mediaPrecheck(file, duration);
        if (problem) {
          pending.current.delete(file);
          failures.push(`${file.name}: ${problem}`);
          continue;
        }
        const state = pending.current.get(file) || { uploaded: false };
        pending.current.set(file, state);
        try {
          // Re-render only when the phase or the whole percent changes.
          let shown = '';
          await media.queuePhoto(
            groupId,
            albumId,
            file,
            state,
            controller.signal,
            (phase, bytes) => {
              const percent = bytes
                ? uploadPercent(bytes.sent, bytes.size)
                : undefined;
              if (controller.signal.aborted || shown === `${phase}:${percent}`)
                return;
              shown = `${phase}:${percent}`;
              setUploadProgress({
                groupId,
                albumId,
                current: index + 1,
                total: selected.length,
                filename: file.name,
                phase,
                video,
                percent,
              });
            }
          );
          controller.signal.throwIfAborted();
          const photoId = state.ticket?.photoId;
          if (video && photoId)
            setVideoUploads((ids) => [...ids.slice(-49), photoId]);
          pending.current.delete(file);
          added++;
        } catch (e) {
          if (controller.signal.aborted) {
            failed.push(...selected.slice(index));
            break;
          }
          failed.push(file);
          failures.push(
            `${file.name}: ${e instanceof Error ? e.message : '접수하지 못했어요.'}`
          );
        }
      }
      if (!parent.aborted && loadedAlbum.current === albumId) {
        setFailedFiles(failed);
      }
      if (controller.signal.aborted && !parent.aborted)
        failures.push(
          '이 기기의 전송을 중단했어요. 서버에 접수된 사진·동영상은 계속 처리돼요. 접수를 확인하지 못한 파일은 다시 시도할 수 있어요.'
        );
      if (added && !parent.aborted)
        window.dispatchEvent(new Event(MEMORIES_CHANGED));
      return { added, failures };
    } finally {
      parent.removeEventListener('abort', cancel);
      uploadController.current = null;
      if (!parent.aborted) setUploadProgress(null);
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
  async function openMemoryPhoto(
    photo: PhotoResponse,
    callerSignal?: AbortSignal
  ) {
    const groupSignal = scope.current.signal;
    const signal = callerSignal
      ? AbortSignal.any([groupSignal, callerSignal])
      : groupSignal;
    if (photo.groupId !== selectedGroup.current)
      throw new Error('현재 그룹의 사진만 열 수 있어요.');
    const current = ++viewerRequest.current;
    const loaded = await loadPhoto(photo, signal, 'display');
    if (
      signal.aborted ||
      groupSignal !== scope.current.signal ||
      current !== viewerRequest.current
    ) {
      URL.revokeObjectURL(loaded.src);
      urls.current.delete(loaded.src);
      return;
    }
    setViewer({ photos: [loaded], id: photo.id });
  }
  async function setCaptureDate(photo: Photo, date: string | null) {
    const signal = scope.current.signal;
    const { photo: updated } = await updateCaptureDate(
      groupId,
      photo.albumId,
      photo.id,
      date,
      signal
    );
    signal.throwIfAborted();
    const merge = (p: Photo): Photo =>
      p.id === photo.id
        ? {
            ...p,
            capturedAt:
              updated.effectiveDate ||
              (updated.capturedAt || updated.createdAt).slice(0, 10),
            effectiveDate: updated.effectiveDate,
            dateSource: updated.dateSource,
            canEditCaptureDate: updated.canEditCaptureDate,
            canDelete: updated.canDelete,
          }
        : p;
    setData((d) => ({ ...d, photos: d.photos.map(merge) }));
    setViewer((v) => (v ? { ...v, photos: v.photos.map(merge) } : v));
    window.dispatchEvent(new Event(MEMORIES_CHANGED));
    // The album period follows effective dates; the next refresh retries.
    void fetchAlbums(groupId, signal).catch(() => {});
    setToast(
      date
        ? '촬영일을 변경했어요.'
        : '사진에 기록된 원래 날짜로 되돌렸어요. 기록이 없으면 업로드일을 사용해요.'
    );
  }
  // A block/unblock changes what this member may see: drop in-flight
  // responses from before it, hide known photos at once, then refetch.
  function applyBlockChange({ userId, blocked }: BlockChange) {
    const signal = scope.current.signal;
    photoRequest.current++;
    albumRequest.current++;
    viewerRequest.current++;
    if (blocked) {
      // Their photos and every cover of unknown uploader go now; fetchAlbums
      // below reloads the covers that are still visible to me.
      const { kept, removed } = purgeOnBlock(dataRef.current.photos, userId);
      removed.forEach((p) => {
        // An open viewer may still show it; closeViewer revokes those later.
        if (viewer?.photos.some((shown) => shown.src === p.src)) return;
        URL.revokeObjectURL(p.src);
        urls.current.delete(p.src);
      });
      if (removed.length) {
        // Update the ref now so fetchAlbums does not skip the purged covers.
        dataRef.current = { ...dataRef.current, photos: kept };
        setData((d) => ({ ...d, photos: purgeOnBlock(d.photos, userId).kept }));
      }
      const next = viewerAfterBlock(viewer, userId);
      // The photo on screen was theirs: close; focus returns via the viewer.
      if (viewer && !next) closeViewer();
      else if (next !== viewer) setViewer(next);
    }
    if (!groupId || signal.aborted) {
      setPhotoLoading(false);
      return;
    }
    // Their photos are already gone locally; a failed refresh keeps the rest.
    void fetchAlbums(groupId, signal).catch(() => {});
    const albumId = loadedAlbum.current || requestedAlbum.current;
    if (albumId) void refreshPhotos(albumId);
    else setPhotoLoading(false);
  }
  const blockHandler = useRef(applyBlockChange);
  useEffect(() => {
    blockHandler.current = applyBlockChange;
  });
  useEffect(() => {
    const changed = (event: Event) => {
      const change = blockChangeOf(event);
      if (change) blockHandler.current(change);
    };
    window.addEventListener(BLOCKS_CHANGED, changed);
    return () => window.removeEventListener(BLOCKS_CHANGED, changed);
  }, []);
  function closeViewer() {
    viewerRequest.current++;
    setViewer(null);
    urls.current.forEach((src) => {
      if (!dataRef.current.photos.some((p) => p.src === src)) {
        URL.revokeObjectURL(src);
        urls.current.delete(src);
      }
    });
  }
  return {
    data,
    groupId,
    setGroupId,
    loading: status.groups.loading || status.albums.loading,
    error: status.groups.error || status.albums.error,
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
        showCursor(null);
        // Loading until the next group is chosen, not a "no group" flash.
        applyStatus('groups', freshLoad(GROUPS));
        applyStatus('albums', NO_GROUP);
      } else
        setData((d) => ({ ...d, groups: d.groups.filter((g) => g.id !== id) }));
      void reload();
    },
    mode: 'live' as const,
    profileName: user?.displayName || '',
    setProfileName: () => setToast('프로필 수정 기능을 준비하고 있어요.'),
    viewer,
    loadDisplay: displayLoader(groupId),
    loadVideo: (photo: Photo, signal: AbortSignal) =>
      media.videoAccess(groupId, photo.albumId, photo.id, 'play', signal),
    videoUploads,
    openPhoto,
    openMemoryPhoto,
    setCaptureDate,
    closeViewer,
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
    showAlbumPhotos: refreshPhotos,
    albumList: {
      hasMore: albumPaging.groupId === groupId && !!albumPaging.nextCursor,
      loadingMore: albumPaging.groupId === groupId && albumPaging.loadingMore,
      error: albumPaging.groupId === groupId ? albumPaging.error : '',
      notice: albumPaging.groupId === groupId ? albumPaging.notice : '',
    },
    loadMoreAlbums,
    failedFiles,
    uploadProgress: uploadProgress?.groupId === groupId ? uploadProgress : null,
    refreshProcessedPhotos: async (albumId: string) => {
      const signal = scope.current.signal;
      const refreshed = await refreshPhotos(albumId);
      // Counts, covers and periods change; a newer album fetch supersedes.
      if (!signal.aborted) await fetchAlbums(groupId, signal);
      // The upload status shows its own retryable error.
      if (!signal.aborted && !refreshed)
        throw new Error('새 사진을 불러오지 못했어요.');
    },
    cancelUploads: () => uploadController.current?.abort(),
    toast,
    setToast,
  };
}
