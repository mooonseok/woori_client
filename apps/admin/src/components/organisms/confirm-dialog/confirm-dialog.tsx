'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  Box,
  Button,
  Dialog,
  Form,
  Heading,
  Input,
  Label,
  Li,
  Text,
  Ul,
} from '@/components/atoms/ui';
import { Notice } from '@/components/molecules/notice';
// Confirmation that lists every consequence before an operator action.
// acknowledge (controlled by the caller) turns it into a strong confirm: the
// action stays disabled until the operator ticks the box. onConfirm throws
// an Error whose message is shown; on success the caller closes the dialog.
export function ConfirmDialog({
  title,
  description,
  consequences,
  confirmLabel,
  danger,
  acknowledge,
  acknowledged,
  onAcknowledge,
  canConfirm = true,
  children,
  onConfirm,
  onClose,
}: {
  title: string;
  description?: string;
  consequences: readonly string[];
  confirmLabel: string;
  danger?: boolean;
  acknowledge?: string;
  acknowledged?: boolean;
  onAcknowledge?: (value: boolean) => void;
  // Extra gate from the caller, e.g. a typed username that must match.
  canConfirm?: boolean;
  children?: ReactNode;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    cancel = useRef<HTMLButtonElement>(null),
    locked = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const titleId = useId(),
    listId = useId(),
    ackId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      el = dialog.current;
    el?.showModal();
    // Start in the first field when there is one, otherwise on 취소.
    const field = el?.querySelector<HTMLElement>(
      'input:not([type=checkbox]), textarea, select'
    );
    (field ?? cancel.current)?.focus();
    return () => {
      el?.close();
      queueMicrotask(() => {
        // The trigger may be gone (e.g. the record was closed): use main.
        const target = previous?.isConnected
          ? previous
          : document.getElementById('admin-main');
        target?.focus({ preventScroll: true });
      });
    };
  }, []);
  const blocked = (!!acknowledge && !acknowledged) || !canConfirm;
  async function confirm() {
    if (locked.current || blocked) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await onConfirm();
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : '처리하지 못했어요. 다시 시도해 주세요.'
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      ref={dialog}
      className='console-dialog confirm-dialog'
      aria-labelledby={titleId}
      aria-describedby={listId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!locked.current) onClose();
      }}
    >
      <Form
        className='stack-form'
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void confirm();
        }}
      >
        <Heading id={titleId}>{title}</Heading>
        {description && <Text className='dialog-body'>{description}</Text>}
        <Ul id={listId} className='consequences'>
          {consequences.map((line) => (
            <Li key={line}>{line}</Li>
          ))}
        </Ul>
        {children}
        {acknowledge && (
          <Box className='check-field'>
            <Input
              id={ackId}
              type='checkbox'
              checked={!!acknowledged}
              disabled={busy}
              onChange={(event) => onAcknowledge?.(event.target.checked)}
            />
            <Label htmlFor={ackId}>{acknowledge}</Label>
          </Box>
        )}
        {error && <Notice tone='error'>{error}</Notice>}
        <Box className='dialog-actions'>
          <Button
            ref={cancel}
            className='secondary-button'
            disabled={busy}
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            type='submit'
            className={danger ? 'primary danger' : 'primary'}
            aria-disabled={busy || blocked}
          >
            {busy ? '처리 중…' : confirmLabel}
          </Button>
        </Box>
      </Form>
    </Dialog>
  );
}
