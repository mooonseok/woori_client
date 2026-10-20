import { Span } from '@/components/atoms/ui';

const initial = (name: string) => Array.from(name.trim())[0] ?? '?';

/**
 * A member's round initial (first character of the nickname). Decorative by
 * default; `label` exposes the name when the avatar stands alone.
 */
export function Avatar({
  name,
  size = 32,
  label = false,
}: {
  name: string;
  size?: 24 | 32 | 36;
  label?: boolean;
}) {
  const className = `initial-avatar initial-avatar--${size}`;
  return label ? (
    <Span className={className} role='img' aria-label={name}>
      {initial(name)}
    </Span>
  ) : (
    <Span className={className} aria-hidden='true'>
      {initial(name)}
    </Span>
  );
}
