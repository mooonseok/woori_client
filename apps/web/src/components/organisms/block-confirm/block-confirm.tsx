'use client';
import { useEffect, useState, type RefObject } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useBlockActions } from '@/hooks/use-block-actions';
import { ActionConfirm } from '@/components/organisms/action-confirm/action-confirm';
import { blockConfirmCopy, unblockConfirmCopy } from '@/utils/blocks';
import type { BlockSubject } from '@/dto/block.dto';

export interface BlockConfirmProps {
  person: BlockSubject;
  blocking?: boolean;
  returnFocus?: RefObject<HTMLElement | null>;
  fallbackFocus?: () => HTMLElement | null | undefined;
  onDone?: () => void;
  onClose: () => void;
}
// Confirm before a personal block/unblock; reuses the shared confirm dialog.
export function BlockConfirm(props: BlockConfirmProps) {
  const { user } = useAuth();
  // Opened for this member only; any account change closes it.
  const [owner] = useState(user?.id);
  const stale = !user || user.id !== owner;
  const { onClose } = props;
  useEffect(() => {
    if (stale) onClose();
  }, [stale, onClose]);
  return stale ? null : <BlockConfirmContent {...props} />;
}
function BlockConfirmContent({
  person,
  blocking = true,
  returnFocus,
  fallbackFocus,
  onDone,
  onClose,
}: BlockConfirmProps) {
  const actions = useBlockActions();
  const copy = blocking
    ? blockConfirmCopy(person.name)
    : unblockConfirmCopy(person.name);
  return (
    <ActionConfirm
      title={copy.title}
      description={copy.description}
      confirmLabel={copy.confirmLabel}
      returnFocus={returnFocus}
      fallbackFocus={fallbackFocus}
      onConfirm={async () => {
        await (blocking ? actions.block(person) : actions.unblock(person));
        onDone?.();
      }}
      onClose={onClose}
    />
  );
}
