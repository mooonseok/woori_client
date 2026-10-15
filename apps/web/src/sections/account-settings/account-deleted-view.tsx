import { Box, Heading, Text } from '@/components/atoms/ui';
import { Link } from '@/components/molecules/link';
export function AccountDeletedView() {
  return (
    <Box className='auth-panel'>
      <Text className='eyebrow'>WOORI</Text>
      <Heading>회원 탈퇴가 완료됐어요</Heading>
      <Text role='status'>
        계정 정보와 모든 기기의 로그인·알림 연결을 정리했어요. 탈퇴는 취소하거나
        복구할 수 없어요.
      </Text>
      <Text className='muted'>
        공유한 사진과 댓글·반응은 그룹에 남고, 작성자는 ‘탈퇴한 회원’으로
        표시돼요. 다시 가입하면 새로운 계정으로 시작해요.
      </Text>
      <Link className='primary-button' href='/'>
        홈으로
      </Link>
      <Link className='text-button' href='/signup'>
        새 계정으로 가입하기
      </Link>
    </Box>
  );
}
