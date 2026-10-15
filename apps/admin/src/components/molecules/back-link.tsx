import { Icon } from '@/components/atoms/icon';
import { Link } from './link';
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className='back-link' href={href}>
      <Icon name='back' size={16} />
      {label}
    </Link>
  );
}
