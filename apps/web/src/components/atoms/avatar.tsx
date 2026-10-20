import { Image, Span } from '@/components/atoms/ui';

const initial = (name: string) => Array.from(name.trim())[0] ?? '?';

/**
 * A member's round profile photo, or the first character of the nickname
 * while there is none (or it is still loading). Decorative by default;
 * `label` exposes the name when the avatar stands alone.
 */
export function Avatar({
  name,
  size = 32,
  label = false,
  src,
}: {
  name: string;
  size?: 24 | 32 | 36 | 72;
  label?: boolean;
  src?: string | null;
}) {
  const className = `initial-avatar initial-avatar--${size}${src ? ' has-photo' : ''}`;
  const content = src ? <Image src={src} alt='' /> : initial(name);
  return label ? (
    <Span className={className} role='img' aria-label={name}>
      {content}
    </Span>
  ) : (
    <Span className={className} aria-hidden='true'>
      {content}
    </Span>
  );
}
