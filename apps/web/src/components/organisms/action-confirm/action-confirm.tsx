'use client';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Box, Button, Dialog, Heading, Text } from '@/components/atoms/ui';
export function ActionConfirm({
  title,
  description,
  onConfirm,
  onClose,
  returnFocus,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  returnFocus?: RefObject<HTMLButtonElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    cancel = useRef<HTMLButtonElement>(null),
    locked = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const titleId = useId(),
    bodyId = useId();
  useEffect(() => {
    const previous =
        returnFocus?.current || (document.activeElement as HTMLElement | null),
      el = dialog.current;
    el?.showModal();
    cancel.current?.focus();
    return () => {
      el?.close();
      queueMicrotask(() => {
        if (previous?.isConnected) previous.focus({ preventScroll: true });
      });
    };
  }, [returnFocus]);
  async function confirm() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : '삭제하지 못했어요. 다시 시도해 주세요.'
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      ref={dialog}
      className='entry-dialog management-confirm'
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      aria-busy={busy}
      onKeyDown={(e) => e.stopPropagation()}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!locked.current) onClose();
      }}
    >
      <Heading id={titleId}>{title}</Heading>
      <Text id={bodyId}>{description}</Text>
      {error && (
        <Text className='error-notice' role='alert'>
          {error}
        </Text>
      )}
      <Box className='management-confirm-actions'>
        <Button
          ref={cancel}
          className='secondary-button'
          disabled={busy}
          onClick={onClose}
        >
          취소
        </Button>
        <Button
          className='primary danger-button'
          disabled={busy}
          onClick={() => void confirm()}
        >
          {busy ? '삭제 중…' : error ? '삭제 다시 시도' : '삭제'}
        </Button>
      </Box>
    </Dialog>
  );
}
