'use client';
import { useEffect, useId, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useAvatarImage } from '@/hooks/use-avatar-image';
import { useAvatarUpload } from '@/hooks/use-avatar-upload';
import { memberNickname } from '@/utils/nickname';
import { AvatarSheetView } from './avatar-sheet-view';

// Profile photo sheet (same shell as the invite sheet): a bottom sheet on
// phones, a centred dialog on wider screens. Mounted only while open, so an
// unsaved choice is forgotten when it closes.
export interface AvatarSheetProps {
  open: boolean;
  onClose: () => void;
  onMessage: (message: string) => void;
}
export function AvatarSheet(props: AvatarSheetProps) {
  if (!props.open) return null;
  return <AvatarSheetContent {...props} />;
}

function AvatarSheetContent({ onClose, onMessage }: AvatarSheetProps) {
  const { user } = useAuth();
  const upload = useAvatarUpload((message) => {
    onMessage(message);
    onClose();
  });
  const current = useAvatarImage(user?.id, user?.avatarVersion, 512);
  const dialog = useRef<HTMLDialogElement>(null),
    title = useRef<HTMLHeadingElement>(null);
  const id = useId();

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (element && !element.open) element.showModal();
    title.current?.focus();
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      queueMicrotask(() => {
        if (previous?.isConnected && previous !== document.body)
          previous.focus({ preventScroll: true });
      });
    };
  }, []);

  return (
    <AvatarSheetView
      dialogRef={dialog}
      titleRef={title}
      ids={{ title: `${id}-title`, note: `${id}-note` }}
      name={user ? memberNickname(user) : ''}
      photo={upload.preview ?? current}
      hasPhoto={!!user?.avatarVersion}
      phase={upload.phase}
      progress={upload.progress}
      error={upload.error}
      onChoose={(file) => void upload.choose(file)}
      onSave={() => void upload.save()}
      onRemove={() => void upload.remove()}
      onClose={onClose}
    />
  );
}
