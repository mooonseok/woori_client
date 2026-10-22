import { Box, Image, Span } from '@/components/atoms/ui';

export function AuthBrand() {
  return (
    <Box className='auth-brand'>
      <Image src='/brand/logo.svg' width={56} height={56} alt='우리' />
      <Span className='auth-brand-label'>관리자</Span>
    </Box>
  );
}
