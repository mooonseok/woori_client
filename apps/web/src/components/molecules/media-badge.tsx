import { Span } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { formatDuration } from '@/utils/media';
// Play mark and length over a video poster; the tile's own label says
// "동영상", so this is hidden from assistive technology.
export function MediaBadge({ durationMs }: { durationMs?: number | null }) {
  const duration = formatDuration(durationMs);
  return (
    <Span className='media-badge' aria-hidden='true'>
      <Icon name='play' size={14} />
      {duration}
    </Span>
  );
}
