import { Image, Span, Button } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import type { Photo } from '@/dto/album.dto';
export function MediaPreview({
  src,
  status,
  video,
  alt = '',
  onError,
  priority = false,
}: {
  src?: string;
  status?: Photo['previewStatus'];
  video?: boolean;
  alt?: string;
  onError?: () => void;
  priority?: boolean;
}) {
  if (src && !status)
    return (
      <Image
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        onError={onError}
      />
    );
  const label =
    status === 'loading'
      ? '미리보기 불러오는 중'
      : status === 'error'
        ? '미리보기를 불러오지 못했어요'
        : status === 'unavailable'
          ? '지금 볼 수 없는 미디어'
          : video
            ? '동영상 미리보기 없음'
            : '아직 담긴 사진이 없어요';
  return (
    <Span
      className={`media-fallback ${status === 'loading' ? 'media-fallback--loading' : ''}`}
      role='img'
      aria-label={label}
    >
      <Icon
        name={
          status === 'unavailable'
            ? 'shield'
            : status === 'error'
              ? 'refresh'
              : video
                ? 'play'
                : 'photo'
        }
        size={28}
      />
    </Span>
  );
}
// Sibling of the card action, never nested in a button.
export function MediaRetry({
  photo,
  onRetry,
}: {
  photo?: Photo;
  onRetry?: (photo: Photo) => void;
}) {
  return photo?.previewStatus === 'error' && onRetry ? (
    <Button
      className='media-retry'
      aria-label='미리보기 다시 불러오기'
      title='미리보기 다시 불러오기'
      onClick={(event) => {
        // The retry action disappears while loading; keep keyboard focus on its card.
        event.currentTarget.parentElement
          ?.querySelector<HTMLButtonElement>('button:not(.media-retry)')
          ?.focus();
        onRetry(photo);
      }}
    >
      <Icon name='refresh' size={18} />
    </Button>
  ) : null;
}
