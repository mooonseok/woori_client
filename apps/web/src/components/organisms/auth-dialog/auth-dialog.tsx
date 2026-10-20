'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { Dialog, Button, Box } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { BrandMark } from '@/components/molecules/brand-mark';

export function AuthDialog({
  children,
  pending,
  onClose,
}: {
  children: ReactNode;
  pending: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected && previous !== document.body) previous.focus();
      else
        requestAnimationFrame(() =>
          document.getElementById('entry-login')?.focus()
        );
    };
  }, []);
  return (
    <Dialog
      ref={ref}
      className='auth-entry-dialog'
      aria-labelledby='auth-entry-title'
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <Box className='auth-entry-top'>
        <BrandMark />
        <Button
          variant='icon'
          aria-label='닫기'
          disabled={pending}
          onClick={onClose}
        >
          <Icon name='close' />
        </Button>
      </Box>
      {children}
    </Dialog>
  );
}
