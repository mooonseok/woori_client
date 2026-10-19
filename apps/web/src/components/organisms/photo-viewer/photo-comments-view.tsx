import type { PhotoComment } from '@/dto/album.dto';
import {
  Box,
  Button,
  Form,
  Header,
  Heading,
  Text,
  Textarea,
} from '@/components/atoms/ui';
import { PhotoCommentItem } from './photo-comment';
import { Icon } from '@/components/atoms/icon';
interface Props {
  mediaKind?: 'PHOTO' | 'VIDEO';
  comments: PhotoComment[];
  draft: string;
  onChange(value: string): void;
  onSubmit(): void;
  onClose(): void;
  onPin(id: string): void;
  photoDescription: string;
  loading: boolean;
  pending: boolean;
  error: string;
  submitError: string;
  total: number;
  hasMore: boolean;
  onReload?: () => void;
  onMore?: () => void;
  onEdit?: (id: string, body: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  currentUserId?: string;
  onReport?: (comment: PhotoComment) => void;
  onBlock?: (comment: PhotoComment) => void;
}
export function PhotoCommentsView({
  mediaKind,
  comments,
  draft,
  onChange,
  onSubmit,
  onClose,
  onPin,
  photoDescription,
  loading,
  pending,
  error,
  submitError,
  total,
  hasMore,
  onReload,
  onMore,
  onEdit,
  onDelete,
  currentUserId,
  onReport,
  onBlock,
}: Props) {
  const mediaLabel = mediaKind === 'VIDEO' ? '동영상' : '사진';
  return (
    <Box
      className='viewer-comments'
      role='region'
      aria-label={`${mediaLabel} 정보와 댓글`}
      tabIndex={-1}
      data-viewer-interactive='true'
    >
      <Header>
        <Box>
          <Heading>
            {mediaLabel} 속 이야기 {total > 0 ? total : ''}
          </Heading>
          <Text>{photoDescription}</Text>
        </Box>
        <Button aria-label='댓글 닫기' onClick={onClose}>
          <Icon name='close' />
        </Button>
      </Header>
      <Box className='viewer-comment-list' aria-busy={loading}>
        {onReload && (
          <Button
            className='viewer-comment-refresh'
            disabled={loading || pending}
            onClick={onReload}
          >
            새로고침
          </Button>
        )}
        {loading && <Text role='status'>이야기를 불러오는 중…</Text>}
        {error && (
          <Box>
            <Text role='alert' className='viewer-interaction-error'>
              {error}
            </Text>
            <Button
              disabled={loading || pending}
              onClick={hasMore ? onMore : onReload}
            >
              다시 시도
            </Button>
          </Box>
        )}
        {!loading && !error && !comments.length && (
          <Box className='viewer-no-comments'>
            <Icon name='comment' size={32} />
            <Text>아직 이야기가 없어요.</Text>
            <Text>이 {mediaLabel}에 첫 한마디를 남겨 보세요.</Text>
          </Box>
        )}
        {comments.map((comment) => {
          // Only other people's comments can be reported or their author blocked.
          const other =
            !!currentUserId &&
            !!comment.authorId &&
            comment.authorId !== currentUserId;
          return (
            <PhotoCommentItem
              key={comment.id}
              comment={comment}
              disabled={pending || loading}
              onPin={onPin}
              onEdit={onEdit}
              onDelete={onDelete}
              onReport={other && onReport ? () => onReport(comment) : undefined}
              onBlock={other && onBlock ? () => onBlock(comment) : undefined}
            />
          );
        })}
        {hasMore && (
          <Button disabled={loading || pending} onClick={onMore}>
            이전 댓글 더 보기
          </Button>
        )}
      </Box>
      {submitError && (
        <Text role='alert' className='viewer-interaction-error'>
          {submitError}
        </Text>
      )}
      <Form
        className='viewer-comment-form'
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Textarea
          aria-label='일반 댓글'
          placeholder={`${mediaLabel}에 한마디 남겨 주세요`}
          rows={2}
          disabled={pending}
          value={draft}
          maxLength={2000}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button type='submit' disabled={pending || loading || !draft.trim()}>
          {pending ? '저장 중…' : '등록'}
        </Button>
      </Form>
    </Box>
  );
}
