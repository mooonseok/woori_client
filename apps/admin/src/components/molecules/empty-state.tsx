import type { ReactNode } from 'react';
import { Box, Subheading, Text } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
export function EmptyState({
  title,
  body,
  icon = 'info',
  children,
}: {
  title: string;
  body: string;
  icon?: string;
  children?: ReactNode;
}) {
  return (
    <Box className='console-state console-empty'>
      <Icon name={icon} size={28} />
      <Subheading>{title}</Subheading>
      <Text>{body}</Text>
      {children}
    </Box>
  );
}
