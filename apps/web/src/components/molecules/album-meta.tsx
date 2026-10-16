import { Span, Text } from '@/components/atoms/ui';
import type { Album } from '@/dto/album.dto';
import { albumPeriod } from '@/lib/gallery';
import { mediaCountLabel } from '@/utils/media';
// "2026.10.03 ~ 2026.10.15 · 사진 12장"; narrow cards wrap between the parts,
// never inside "사진 12장".
export function AlbumMeta({
  album,
  count,
  className,
}: {
  album: Pick<Album, 'startDate' | 'endDate' | 'createdAt' | 'videoCount'>;
  count: number;
  className?: string;
}) {
  const period = albumPeriod(album);
  return (
    <Text className={className}>
      {period ? (
        <>
          {period} ·{' '}
          <Span className='album-meta-count'>
            {mediaCountLabel(count, album.videoCount)}
          </Span>
        </>
      ) : (
        '사진 없음'
      )}
    </Text>
  );
}
