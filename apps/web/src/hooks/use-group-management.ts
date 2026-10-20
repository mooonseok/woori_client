'use client';
import { useEffect, useRef, useState } from 'react';
import { useGallery } from '@/hooks/use-gallery';
import { useAuth } from '@/hooks/use-auth';
import { useCreateGroup } from '@/hooks/use-create-group';
import { useInvitations } from '@/hooks/use-invitations';
export function useGroupManagement() {
  const gallery = useGallery(),
    { user } = useAuth(),
    createGroup = useCreateGroup();
  const group = gallery.data.groups.find((g) => g.id === gallery.groupId);
  const invitations = useInvitations(group);
  const [name, setName] = useState(''),
    [creating, setCreating] = useState(false),
    [createError, setCreateError] = useState('');
  const mounted = useRef(false),
    locked = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // A new group is selected and the member lands on the home (start guide).
  async function create() {
    if (locked.current || !name.trim()) return;
    locked.current = true;
    setCreating(true);
    setCreateError('');
    try {
      await createGroup(name);
      if (mounted.current) setName('');
    } catch (error) {
      if (mounted.current)
        setCreateError(
          error instanceof Error ? error.message : '요청을 처리하지 못했어요.'
        );
    } finally {
      locked.current = false;
      if (mounted.current) setCreating(false);
    }
  }
  return {
    gallery,
    verified: !!user?.emailVerified,
    group,
    name,
    setName,
    pending: creating || invitations.pending,
    error: createError || invitations.error,
    notice: invitations.notice,
    invitations: invitations.invitations,
    listError: invitations.listError,
    listLoading: invitations.listLoading,
    listLoadedAt: invitations.listLoadedAt,
    load: invitations.load,
    create,
    revoke: invitations.revoke,
  };
}
