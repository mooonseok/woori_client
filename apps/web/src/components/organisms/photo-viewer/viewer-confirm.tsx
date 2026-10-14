import { useEffect, useRef } from 'react';
import { Box, Button, Dialog, Heading, Text } from '@/components/atoms/ui';
interface Props {
  count: number;
  onCancel(): void;
  onDiscard(): void;
}
export function ViewerConfirm({ count, onCancel, onDiscard }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <Dialog
      ref={ref}
      className='viewer-confirm'
      aria-labelledby='viewer-discard-title'
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }}
    >
      <Heading id='viewer-discard-title'>
        등록하지 않은 댓글이 {count}개 있어요
      </Heading>
      <Text>지금 닫으면 작성 중인 댓글이 사라져요.</Text>
      <Box>
        <Button autoFocus onClick={onCancel}>
          계속 작성
        </Button>
        <Button className='viewer-danger' onClick={onDiscard}>
          버리고 닫기
        </Button>
      </Box>
    </Dialog>
  );
}
