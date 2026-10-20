import { Image } from '@/components/atoms/ui';

/** The mark stays navy across seasonal palettes. The enclosing link names its action. */
export function BrandMark({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src='/brand/logo.svg'
      width={size}
      height={size}
      alt='우리'
      className={className}
    />
  );
}
