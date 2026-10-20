'use client';
import { Avatar } from '@/components/atoms/avatar';
import { useAvatarImage } from '@/hooks/use-avatar-image';

/** A member's avatar: their profile photo when they have one, else the initial. */
export function MemberAvatar({
  userId,
  name,
  version,
  size = 32,
  label = false,
}: {
  userId?: string;
  name: string;
  version?: number | null;
  size?: 24 | 32 | 36 | 72;
  label?: boolean;
}) {
  // Small avatars use the 128px rendition; the large one stays sharp at 3x.
  const src = useAvatarImage(userId, version, size > 40 ? 512 : 128);
  return <Avatar name={name} size={size} label={label} src={src} />;
}
