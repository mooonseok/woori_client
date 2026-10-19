'use client';
import { useEffect, useRef, useState } from 'react';
import type { PhotoComment } from '@/dto/album.dto';
import { Box, Button, Form, Span, Text, Textarea } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
interface Props {
  comment: PhotoComment;
  disabled: boolean;
  onPin(id: string): void;
  onEdit?: (id: string, body: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onReport?: () => void;
  onBlock?: () => void;
}
export function PhotoCommentItem({
  comment,
  disabled,
  onPin,
  onEdit,
  onDelete,
  onReport,
  onBlock,
}: Props) {
  const [editing, setEditing] = useState(false),
    [deleting, setDeleting] = useState(false),
    [draft, setDraft] = useState(comment.body),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function save(remove = false) {
    if (lock.current || disabled || (!remove && !draft.trim())) return;
    lock.current = true;
    setPending(true);
    setError('');
    try {
      if (remove) await onDelete?.(comment.id);
      else await onEdit?.(comment.id, draft);
      if (mounted.current) {
        setEditing(false);
        setDeleting(false);
      }
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : '저장하지 못했어요. 다시 시도해 주세요.'
        );
    } finally {
      lock.current = false;
      if (mounted.current) setPending(false);
    }
  }
  return (
    <Box className='viewer-comment'>
      <Box className='viewer-comment-meta'>
        <Span className='viewer-avatar' aria-hidden='true'>
          <Icon name='user' size={18} />
        </Span>
        <Span>{comment.authorName}</Span>
        <Span className='viewer-comment-date'>
          {new Date(comment.createdAt).toLocaleString('ko-KR', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Span>
      </Box>
      {editing ? (
        <Form
          className='viewer-comment-edit'
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Textarea
            aria-label='댓글 수정'
            autoFocus
            value={draft}
            rows={3}
            maxLength={2000}
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Box className='viewer-comment-actions'>
            <Button
              type='submit'
              disabled={disabled || pending || !draft.trim()}
            >
              {pending ? '저장 중…' : '수정 저장'}
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setError('');
              }}
            >
              취소
            </Button>
          </Box>
        </Form>
      ) : (
        <Text>{comment.body}</Text>
      )}
      {comment.point && (
        <Button
          className='viewer-comment-pin-link'
          onClick={() => onPin(comment.id)}
        >
          <Icon name='pin' size={16} />
          사진 속 위치 보기
        </Button>
      )}
      {!editing && !deleting && (
        <Box className='viewer-comment-actions'>
          {comment.canEdit && onEdit && (
            <Button
              disabled={disabled}
              onClick={() => {
                setDraft(comment.body);
                setEditing(true);
                setError('');
              }}
            >
              수정
            </Button>
          )}
          {comment.canDelete && onDelete && (
            <Button
              disabled={disabled}
              onClick={() => {
                setDeleting(true);
                setError('');
              }}
            >
              삭제
            </Button>
          )}
          {onReport && (
            <Button
              disabled={disabled}
              aria-label={`${comment.authorName}님의 댓글 신고`}
              onClick={onReport}
            >
              신고
            </Button>
          )}
          {onBlock && (
            <Button
              disabled={disabled}
              aria-label={`${comment.authorName}님 차단`}
              onClick={onBlock}
            >
              차단
            </Button>
          )}
        </Box>
      )}
      {deleting && (
        <Box
          className='viewer-comment-delete'
          role='group'
          aria-label='댓글 삭제 확인'
        >
          <Text>이 댓글을 삭제할까요?</Text>
          <Box className='viewer-comment-actions'>
            <Button
              disabled={disabled || pending}
              className='danger-text'
              onClick={() => void save(true)}
            >
              {pending ? '삭제 중…' : '댓글 삭제'}
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                setDeleting(false);
                setError('');
              }}
            >
              취소
            </Button>
          </Box>
        </Box>
      )}
      {error && (
        <Text role='alert' className='viewer-interaction-error'>
          {error}
        </Text>
      )}
    </Box>
  );
}
