import { Box, Button, Text } from '@/components/atoms/ui';
// Follow-up shown after a report: block the person behind the content too.
export function BlockOffer({
  name,
  onBlock,
}: {
  name: string;
  onBlock: () => void;
}) {
  return (
    <Box className='block-offer'>
      <Text>{name}님도 차단할까요?</Text>
      <Text className='field-help'>
        {name}님이 올린 사진·댓글·반응이 나에게만 보이지 않아요. 그룹에서
        나가거나 내보내지지는 않아요.
      </Text>
      <Button className='secondary-button' onClick={onBlock}>
        {name}님 차단하기
      </Button>
    </Box>
  );
}
