'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGallery } from '@/hooks/use-gallery';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/hooks/use-auth';
import type { GroupAction, GroupMember } from '@/dto/group.dto';
import * as api from '@/services/group-management';
export function useGroupLifecycle() {
  const gallery = useGallery(),
    notifications = useNotifications(),
    { user } = useAuth();
  const group = gallery.data.groups.find((g) => g.id === gallery.groupId);
  const groupId = group?.id;
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const [action, setAction] = useState<GroupAction | null>(null),
    [busy, setBusy] = useState(false);
  const scope = useRef(new AbortController()),
    revision = useRef(0),
    locked = useRef(false);
  const loadMembers = useCallback(
    async (after: string | null = null) => {
      const signal = scope.current.signal,
        current = ++revision.current;
      if (!groupId || signal.aborted) return;
      setLoading(true);
      setError('');
      if (!after) {
        setMembers([]);
        setNextCursor(null);
      }
      try {
        const page = await api.listGroupMembers(groupId, after, signal);
        if (signal.aborted || current !== revision.current) return;
        setMembers((previous) =>
          after
            ? [
                ...previous.filter(
                  (m) => !page.members.some((n) => n.userId === m.userId)
                ),
                ...page.members,
              ]
            : page.members
        );
        setNextCursor(page.nextCursor);
      } catch (e) {
        if (!signal.aborted && current === revision.current)
          setError(
            e instanceof Error ? e.message : '구성원을 불러오지 못했어요.'
          );
      } finally {
        if (!signal.aborted && current === revision.current) setLoading(false);
      }
    },
    [groupId]
  );
  useEffect(() => {
    const controller = new AbortController();
    const counter = revision;
    scope.current = controller;
    queueMicrotask(() => {
      if (!controller.signal.aborted) void loadMembers();
    });
    return () => {
      controller.abort();
      counter.current++;
    };
  }, [loadMembers]);
  async function submit(value = '') {
    if (!group || !action || locked.current) return;
    const signal = scope.current.signal;
    locked.current = true;
    setBusy(true);
    try {
      if (action.kind === 'rename')
        await api.renameGroup(group.id, value, signal);
      if (action.kind === 'leave') await api.leaveGroup(group.id, signal);
      if (action.kind === 'delete')
        await api.deleteGroup(group.id, value, signal);
      if (action.kind === 'remove')
        await api.removeGroupMember(group.id, action.member.userId, signal);
      if (action.kind === 'transfer')
        await api.transferGroupOwnership(
          group.id,
          action.member.userId,
          signal
        );
      signal.throwIfAborted();
      notifications.invalidateGroups?.();
      if (action.kind === 'leave' || action.kind === 'delete') {
        gallery.setToast(
          action.kind === 'leave'
            ? '그룹에서 나왔어요.'
            : '그룹을 삭제했어요. 사진 파일은 순서대로 정리됩니다.'
        );
        gallery.forgetGroup?.(group.id);
      } else {
        gallery.setToast(
          action.kind === 'transfer'
            ? '그룹장을 변경했어요. 기존 초대는 취소됐어요.'
            : action.kind === 'remove'
              ? '구성원을 내보냈어요. 공유한 사진과 댓글은 남아 있어요.'
              : '그룹 이름을 변경했어요.'
        );
        await gallery.reload();
        if (!signal.aborted) await loadMembers();
      }
    } finally {
      locked.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }
  return {
    group,
    currentUserId: user?.id,
    members,
    nextCursor,
    loading,
    error,
    action,
    setAction,
    busy,
    loadMembers,
    submit,
  };
}
