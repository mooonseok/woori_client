import {
  Box,
  Section,
  Heading,
  Text,
  Footer,
  Span,
  Anchor,
  Button,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { Link } from '@/components/molecules/link';
import { MediaPreview } from '@/components/molecules/media-preview';
import { authDestination } from '@/utils/auth-navigation';

export function GuestHomeView({
  next = '/',
  failures,
  attempts,
  onImageError,
  onImageRetry,
}: {
  next?: string;
  failures: boolean[];
  attempts: number[];
  onImageError: (index: number) => void;
  onImageRetry: (index: number) => void;
}) {
  const photos = [
    {
      src: '/brand/guest-moment.jpg',
      alt: '물가를 바라보며 벤치에 함께 앉은 두 사람',
    },
    { src: '/brand/guest-garden.jpg', alt: '나무 사이로 이어지는 산책길' },
    { src: '/brand/guest-walk.jpg', alt: '가을빛으로 물든 낙엽' },
  ];
  const photo = (index: number) => (
    <Box className={`guest-photo ${index === 0 ? 'guest-photo-main' : ''}`}>
      <MediaPreview
        key={attempts[index]}
        src={`${photos[index].src}${attempts[index] ? `?retry=${attempts[index]}` : ''}`}
        alt={photos[index].alt}
        priority={index === 0}
        status={failures[index] ? 'error' : undefined}
        onError={() => onImageError(index)}
      />
      {failures[index] && (
        <Button
          className='guest-photo-retry'
          variant='icon'
          aria-label={`${photos[index].alt} 예시 사진 다시 불러오기`}
          onClick={() => onImageRetry(index)}
        >
          <Icon name='refresh' size={20} />
        </Button>
      )}
    </Box>
  );
  return (
    <Box className='guest-home'>
      <Section className='guest-hero' aria-label='우리 소개'>
        <Box className='guest-copy'>
          <Heading>
            <Span>함께한 순간을,</Span>
            <Span>한곳에.</Span>
          </Heading>
          <Text className='guest-description'>
            <Span>사진과 동영상으로 이어지는 우리.</Span>
            <Span>초대받은 가족과 친구끼리, 편하게 나눠요.</Span>
          </Text>
          <Box className='guest-actions'>
            <Link
              className='ui-button ui-button--primary'
              href={authDestination('/signup', next)}
            >
              우리 시작하기
              <Icon name='arrow-right' size={18} />
            </Link>
            <Link className='ui-button ui-button--secondary' href='/invite'>
              초대 코드 입력
            </Link>
          </Box>
          <Text className='guest-private'>
            <Icon name='shield' size={16} />
            초대한 사람들만 볼 수 있어요.
          </Text>
        </Box>
        <Box className='guest-gallery' aria-label='서비스 소개용 예시 사진'>
          {photo(0)}
          <Box className='guest-gallery-pair'>
            {photo(1)}
            {photo(2)}
          </Box>
          <Text className='guest-example'>소개용 예시 사진</Text>
        </Box>
      </Section>
      <Section className='guest-features' aria-label='우리에서 함께하는 일'>
        <Box>
          <Heading>사진도, 동영상도</Heading>
          <Text>함께한 날을 앨범으로 모아 두세요.</Text>
        </Box>
        <Box>
          <Heading>그 순간에 남기는 이야기</Heading>
          <Text>댓글과 반응으로 추억을 이어 가세요.</Text>
        </Box>
        <Box>
          <Heading>우리끼리 편안하게</Heading>
          <Text>초대로 연결된 사람들과 나눠요.</Text>
        </Box>
      </Section>
      <Footer className='guest-footer'>
        <Text>가까운 사람들과, 우리.</Text>
        <Box>
          <Link href='/privacy'>개인정보 안내</Link>
          <Link href='/help'>도움말</Link>
          <Anchor href='/brand/credits.json' target='_blank' rel='noreferrer'>
            사진 출처
          </Anchor>
        </Box>
      </Footer>
    </Box>
  );
}
