'use client';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import {
  Box,
  Button,
  Dialog,
  Heading,
  Text,
  Label,
  Input,
} from '@/components/atoms/ui';
export function ActionConfirm({
  title,
  description,
  onConfirm,
  onClose,
  returnFocus,
  fallbackFocus,
  confirmLabel = '삭제',
  exactText,
}: {
  confirmLabel?: string;
  exactText?: string;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  returnFocus?: RefObject<HTMLElement | null>;
  // Used when the element to return to was removed while the dialog was open.
  fallbackFocus?: () => HTMLElement | null | undefined;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    cancel = useRef<HTMLButtonElement>(null),
    locked = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirmation, setConfirmation] = useState('');
  const titleId = useId(),
    bodyId = useId();
  const fallback = useRef(fallbackFocus);
  useEffect(() => {
    fallback.current = fallbackFocus;
  });
  useEffect(() => {
    const previous =
        returnFocus?.current || (document.activeElement as HTMLElement | null),
      el = dialog.current,
      latest = fallback;
    el?.showModal();
    cancel.current?.focus();
    return () => {
      el?.close();
      queueMicrotask(() => {
        const target = previous?.isConnected ? previous : latest.current?.();
        target?.focus({ preventScroll: true });
      });
    };
  }, [returnFocus]);
  async function confirm() {
    if (
      locked.current ||
      (exactText !== undefined && confirmation !== exactText)
    )
      return;
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
      {exactText !== undefined && (
        <Label className='stack-form'>
          확인을 위해 그룹 이름을 그대로 입력해 주세요.
          <Input
            aria-label='삭제할 그룹 이름'
            autoComplete='off'
            value={confirmation}
            disabled={busy}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </Label>
      )}
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
          disabled={
            busy || (exactText !== undefined && confirmation !== exactText)
          }
          onClick={() => void confirm()}
        >
          {busy
            ? '처리 중…'
            : error
              ? `${confirmLabel} 다시 시도`
              : confirmLabel}
        </Button>
      </Box>
    </Dialog>
  );
}
