'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Point } from '@/dto/album.dto';
import type {
  CommentListState,
  ReactionSummary,
} from '@/dto/photo-interactions.dto';
import * as api from '@/services/photo-interactions';
import { commentModel, mergeComments } from '@/utils/photo-interactions';
const EMPTY: CommentListState = { comments: [], total: 0, nextCursor: null };
const NO_REACTIONS: ReactionSummary = {
  reactions: [],
  myReaction: null,
  total: 0,
};
export function usePhotoInteractions(photoId: string, live: boolean) {
  const [state, setState] = useState({
    photoId,
    ...EMPTY,
    ...NO_REACTIONS,
    commentTotal: 0,
  });
  const [loading, setLoading] = useState(live),
    [error, setError] = useState(''),
    [pending, setPending] = useState(false),
    [reactionError, setReactionError] = useState('');
  const scope = useRef<{
    photoId: string;
    controller: AbortController;
    busy: boolean;
  } | null>(null);
  const load = useCallback(
    async (cursor: string | null = null) => {
      const current = scope.current;
      if (
        !live ||
        !current ||
        current.photoId !== photoId ||
        current.busy ||
        current.controller.signal.aborted
      )
        return;
      current.busy = true;
      setLoading(true);
      setError('');
      try {
        const [page, reactions] = await Promise.all([
          api.listComments(photoId, cursor, current.controller.signal),
          api.getReactions(photoId, current.controller.signal),
        ]);
        current.controller.signal.throwIfAborted();
        const comments = page.comments.map(commentModel);
        setState((previous) => ({
          photoId,
          comments:
            cursor && previous.photoId === photoId
              ? mergeComments(previous.comments, comments)
              : comments,
          nextCursor: page.nextCursor,
          commentTotal: page.total,
          ...reactions,
        }));
      } catch (e) {
        if (!current.controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : '이야기를 불러오지 못했어요. 다시 시도해 주세요.'
          );
      } finally {
        current.busy = false;
        if (!current.controller.signal.aborted) setLoading(false);
      }
    },
    [photoId, live]
  );
  useEffect(() => {
    const current = { photoId, controller: new AbortController(), busy: false };
    scope.current = current;
    queueMicrotask(() => {
      if (current.controller.signal.aborted) return;
      setState({ photoId, ...EMPTY, ...NO_REACTIONS, commentTotal: 0 });
      setPending(false);
      setReactionError('');
      setError('');
      void load();
    });
    return () => current.controller.abort();
  }, [photoId, load]);
  async function mutate<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    commit: (result: T) => void
  ) {
    const current = scope.current;
    if (
      !current ||
      current.photoId !== photoId ||
      current.controller.signal.aborted
    )
      throw new Error('사진을 다시 열어 주세요.');
    if (current.busy)
      throw new Error('처리 중이에요. 잠시 후 다시 시도해 주세요.');
    current.busy = true;
    setPending(true);
    try {
      const result = await operation(current.controller.signal);
      current.controller.signal.throwIfAborted();
      commit(result);
    } finally {
      current.busy = false;
      if (!current.controller.signal.aborted) setPending(false);
    }
  }
  const visible =
    state.photoId === photoId
      ? state
      : { photoId, ...EMPTY, ...NO_REACTIONS, commentTotal: 0 };
  return {
    ...visible,
    loading: live && (loading || state.photoId !== photoId),
    error: state.photoId === photoId ? error : '',
    pending,
    reactionError,
    reload: () => load(),
    more: () => load(visible.nextCursor),
    add: (body: string, point?: Point) =>
      mutate(
        (signal) => api.createComment(photoId, body, point, signal),
        ({ comment }) =>
          setState((previous) => ({
            ...previous,
            comments: [commentModel(comment), ...previous.comments],
            commentTotal: previous.commentTotal + 1,
          }))
      ),
    edit: (id: string, body: string) =>
      mutate(
        (signal) => api.editComment(photoId, id, body, signal),
        ({ comment }) =>
          setState((previous) => ({
            ...previous,
            comments: previous.comments.map((item) =>
              item.id === id ? commentModel(comment) : item
            ),
          }))
      ),
    remove: (id: string) =>
      mutate(
        (signal) => api.deleteComment(photoId, id, signal),
        () =>
          setState((previous) => ({
            ...previous,
            comments: previous.comments.filter((item) => item.id !== id),
            commentTotal: Math.max(0, previous.commentTotal - 1),
          }))
      ),
    react: async (emoji: string) => {
      const current = scope.current;
      setReactionError('');
      try {
        await mutate(
          (signal) =>
            api.setReaction(
              photoId,
              visible.myReaction === emoji ? null : emoji,
              signal
            ),
          (result) => setState((previous) => ({ ...previous, ...result }))
        );
        return true;
      } catch (e) {
        if (current === scope.current && !current?.controller.signal.aborted)
          setReactionError(
            e instanceof Error
              ? e.message
              : '반응을 저장하지 못했어요. 다시 선택해 주세요.'
          );
        return false;
      }
    },
  };
}
