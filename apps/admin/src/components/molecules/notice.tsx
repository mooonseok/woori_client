import type { ReactNode } from 'react';
import { Box } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
// Inline notice. tone='error' is announced immediately; others politely.
export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warning' | 'error';
  children: ReactNode;
}) {
  return (
    <Box
      className='notice'
      data-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon name={tone === 'info' ? 'info' : 'error'} size={18} />
      <Box>{children}</Box>
    </Box>
  );
}
