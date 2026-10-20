'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { apiRequest, post } from '@/services/api-client';
import type { Group } from '@/dto/album.dto';
import type { Invitation } from '@/dto/invitation.dto';

// Owner-only invitations of one group: the list (for status and cancelling),
// issuing a new 72-hour / 10-use invitation whose link and code are shown only
// once, and copy/share helpers. Used by the group settings page, the home
// start guide and the invite sheet; each caller owns its own instance. The
// sheet does not need the list (`list: false`). Issuing or cancelling
// announces INVITATIONS_CHANGED so other screens can refresh their status.
export const INVITATIONS_CHANGED = 'woori:invitations-changed';
function announce(groupId: string, source: string) {
  window.dispatchEvent(
    new CustomEvent(INVITATIONS_CHANGED, { detail: { groupId, source } })
  );
}
export function useInvitations(
  group: Pick<Group, 'id' | 'role'> | undefined,
  options: { list?: boolean } = {}
) {
  const [invitations, setInvitations] = useState<Invitation[]>([]),
    [created, setCreated] = useState<Invitation | null>(null),
    [qr, setQr] = useState('');
  const [listError, setListError] = useState(''),
    [listLoading, setListLoading] = useState(false),
    // When the list was read: the reference time for expiry labels.
    [listLoadedAt, setListLoadedAt] = useState(0);
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const revision = useRef(0);
  const mounted = useRef(false),
    locked = useRef(false);
  const groupId = group?.id,
    owner = group?.role === 'OWNER',
    listing = options.list !== false;
  // Identifies this instance so it ignores its own announcements.
  const [source] = useState(() => Math.random().toString(36).slice(2));
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const load = useCallback(async () => {
    const generation = ++revision.current;
    setInvitations([]);
    setListError('');
    if (!groupId || !owner || !listing) return;
    setListLoading(true);
    try {
      const result = await apiRequest<{ invitations: Invitation[] }>(
        `/v1/groups/${groupId}/invitations`
      );
      if (generation === revision.current) {
        setInvitations(result.invitations);
        setListLoadedAt(Date.now());
      }
    } catch (error) {
      if (generation === revision.current)
        setListError(
          error instanceof Error ? error.message : '초대를 불러오지 못했어요.'
        );
    } finally {
      if (generation === revision.current) setListLoading(false);
    }
  }, [groupId, owner, listing]);
  useEffect(() => {
    let active = true;
    const counter = revision;
    queueMicrotask(() => {
      if (active) {
        setCreated(null);
        setQr('');
        void load();
      }
    });
    return () => {
      active = false;
      counter.current++;
    };
  }, [load]);
  // Another screen issued or cancelled one of this group's invitations.
  useEffect(() => {
    if (!listing || !groupId) return;
    const changed = (event: Event) => {
      const detail = (
        event as CustomEvent<{ groupId?: string; source?: string }>
      ).detail;
      if (detail?.groupId === groupId && detail.source !== source) void load();
    };
    window.addEventListener(INVITATIONS_CHANGED, changed);
    return () => window.removeEventListener(INVITATIONS_CHANGED, changed);
  }, [listing, groupId, source, load]);
  async function run(work: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (error) {
      if (!mounted.current) return;
      setError(
        error instanceof Error ? error.message : '요청을 처리하지 못했어요.'
      );
    } finally {
      locked.current = false;
      if (mounted.current) setPending(false);
    }
  }
  async function invite() {
    await run(async () => {
      if (!groupId) return;
      const result = await post<Invitation>(
        `/v1/groups/${groupId}/invitations`,
        { expiresInHours: 72, maxUses: 10 }
      );
      announce(groupId, source);
      if (!mounted.current) return;
      setCreated(result);
      if (result.url)
        setQr(
          await QRCode.toDataURL(result.url, {
            width: 240,
            margin: 2,
            color: { dark: '#1e2023', light: '#ffffff' },
          })
        );
      await load();
    });
  }
  async function revoke(id: string) {
    await run(async () => {
      if (!groupId) return;
      await apiRequest<void>(
        `/v1/groups/${groupId}/invitations/${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );
      announce(groupId, source);
      if (!mounted.current) return;
      if (created?.id === id) {
        setCreated(null);
        setQr('');
      }
      await load();
      setNotice('초대를 취소했어요. 이 링크와 코드로는 참여할 수 없어요.');
    });
  }
  async function copy(value: string, label = '복사했어요.') {
    await run(async () => {
      if (!navigator.clipboard)
        throw new Error(
          '이 브라우저에서는 복사할 수 없어요. 표시된 링크나 코드를 길게 눌러 직접 복사해 주세요.'
        );
      await navigator.clipboard.writeText(value);
      setNotice(label);
    });
  }
  // The system share sheet when the browser has one; otherwise a copy. A
  // dismissed share sheet is not an error.
  async function share(url: string, text: string) {
    if (typeof navigator.share !== 'function')
      return copy(url, '링크를 복사했어요.');
    await run(async () => {
      try {
        await navigator.share({ title: '우리 초대', text, url });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
        throw error;
      }
    });
  }
  /** Forget the one-time link and code (e.g. when the sheet closes). */
  function forget() {
    setCreated(null);
    setQr('');
    setNotice('');
    setError('');
  }
  return {
    invitations,
    created,
    qr,
    listError,
    listLoading,
    listLoadedAt,
    pending,
    error,
    notice,
    load,
    invite,
    revoke,
    copy,
    share,
    forget,
  };
}
