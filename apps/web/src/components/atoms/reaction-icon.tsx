import { REACTION_OPTIONS } from '@/constants/reactions';
import type { CSSProperties } from 'react';
// Lucide SVGs, ISC/MIT. License distributed in public/icons/reactions/LICENSE.
export function ReactionIcon({
  emoji,
  size = 22,
}: {
  emoji: string;
  size?: number;
}) {
  const icon =
    REACTION_OPTIONS.find((item) => item.emoji === emoji)?.icon ?? 'heart';
  return (
    <span
      aria-hidden='true'
      className='reaction-icon'
      style={
        {
          '--reaction-image': `url(/icons/reactions/${icon}.svg)`,
          width: size,
          height: size,
        } as CSSProperties
      }
    />
  );
}
