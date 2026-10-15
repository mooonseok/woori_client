import type { ReactNode } from 'react';
import { Button, Header, Heading } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
// Back is an icon-only control; the heading names the current screen.
export function BackHeader({
  title,
  titleId,
  onBack,
  disabled,
  children,
}: {
  title: string;
  titleId: string;
  onBack: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <Header className='service-header'>
      <Button
        className='icon-button'
        aria-label='뒤로 가기'
        disabled={disabled}
        onClick={onBack}
      >
        <Icon name='back' />
      </Button>
      <Heading id={titleId} tabIndex={-1}>
        {title}
      </Heading>
      {children}
    </Header>
  );
}
