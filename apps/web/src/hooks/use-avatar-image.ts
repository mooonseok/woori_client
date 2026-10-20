'use client';
import { useEffect, useState } from 'react';
import type { AvatarSize } from '@/dto/avatar.dto';
import { avatarImageUrl } from '@/services/avatar';

/**
 * Object URL of a member's profile photo, or null while loading, without a
 * photo or when it cannot be shown (the caller falls back to the initial).
 */
export function useAvatarImage(
  userId: string | undefined,
  version: number | null | undefined,
  size: AvatarSize = 128
) {
  const key = userId && version ? `${userId}:${version}:${size}` : '';
  const [loaded, setLoaded] = useState({ key: '', url: null as string | null });
  useEffect(() => {
    if (!key || !userId || !version) return;
    let live = true;
    void avatarImageUrl(userId, version, size).then((url) => {
      if (live) setLoaded({ key, url });
    });
    return () => {
      live = false;
    };
  }, [key, userId, version, size]);
  return loaded.key === key ? loaded.url : null;
}
