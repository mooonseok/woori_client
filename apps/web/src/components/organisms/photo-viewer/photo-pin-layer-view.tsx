import type { PhotoComment, Point } from '@/dto/album.dto';
import { Button, Span } from '@/components/atoms/ui';
interface Props {
  comments: PhotoComment[];
  selected: string | null;
  draft?: Point;
  onSelect(id: string): void;
  visible: boolean;
}
export function PhotoPinLayerView({
  comments,
  selected,
  draft,
  onSelect,
  visible,
}: Props) {
  return (
    <>
      {visible &&
        comments
          .filter((comment) => comment.point)
          .map((comment, index) => (
            <Button
              key={comment.id}
              className={`viewer-pin ${selected === comment.id ? 'is-selected' : ''}`}
              style={{
                left: `${comment.point!.x * 100}%`,
                top: `${comment.point!.y * 100}%`,
              }}
              aria-label={`${index + 1}번 위치 댓글, ${comment.authorName}: ${comment.body}`}
              onClick={() => onSelect(comment.id)}
            >
              <Span>{index + 1}</Span>
            </Button>
          ))}
      {draft && (
        <Span
          className='viewer-pin viewer-pin--draft'
          style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }}
          aria-label='선택한 댓글 위치'
        >
          <Span />
        </Span>
      )}
    </>
  );
}
