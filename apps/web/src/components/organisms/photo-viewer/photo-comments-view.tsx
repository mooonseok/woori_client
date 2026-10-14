import type { PhotoComment } from '@/dto/album.dto';
import {
  Box,
  Button,
  Form,
  Header,
  Heading,
  Span,
  Text,
  Textarea,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
interface Props {
  comments: PhotoComment[];
  draft: string;
  onChange(value: string): void;
  onSubmit(): void;
  onClose(): void;
  onPin(id: string): void;
  photoDescription: string;
}
export function PhotoCommentsView({
  comments,
  draft,
  onChange,
  onSubmit,
  onClose,
  onPin,
  photoDescription,
}: Props) {
  return (
    <Box
      className='viewer-comments'
      role='region'
      aria-label='사진 정보와 댓글'
      data-viewer-interactive='true'
    >
      <Header>
        <Box>
          <Heading>사진 속 이야기</Heading>
          <Text>{photoDescription}</Text>
        </Box>
        <Button aria-label='댓글 닫기' onClick={onClose}>
          <Icon name='close' />
        </Button>
      </Header>
      <Box className='viewer-comment-list'>
        {!comments.length && (
          <Box className='viewer-no-comments'>
            <Icon name='comment' size={32} />
            <Text>아직 이야기가 없어요.</Text>
            <Text>이 사진에 첫 한마디를 남겨 보세요.</Text>
          </Box>
        )}
        {comments.map((comment) => (
          <Box key={comment.id} className='viewer-comment'>
            <Box className='viewer-comment-meta'>
              <Span className='viewer-avatar'>
                {comment.authorName.slice(0, 1)}
              </Span>
              <Span>{comment.authorName}</Span>
              <Span className='viewer-comment-date'>
                {comment.createdAt.slice(0, 10)}
              </Span>
            </Box>
            <Text>{comment.body}</Text>
            {comment.point && (
              <Button
                className='viewer-comment-pin-link'
                onClick={() => onPin(comment.id)}
              >
                <Icon name='pin' size={16} />
                사진 속 위치 보기
              </Button>
            )}
          </Box>
        ))}
      </Box>
      <Form
        className='viewer-comment-form'
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Textarea
          aria-label='일반 댓글'
          placeholder='사진에 한마디 남겨 주세요'
          rows={2}
          value={draft}
          maxLength={1000}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button type='submit' disabled={!draft.trim()}>
          등록
        </Button>
      </Form>
    </Box>
  );
}
