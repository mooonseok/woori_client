import type { ChangeEvent, RefObject } from 'react';
import {
  Box,
  Button,
  Dialog,
  Heading,
  Image,
  Input,
  Label,
  Span,
  Text,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import type { AvatarPhase } from '@/dto/avatar.dto';

export interface AvatarSheetViewProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  titleRef: RefObject<HTMLHeadingElement | null>;
  ids: { title: string; note: string };
  name: string;
  /** What the circle shows: the chosen photo, else the current one. */
  photo: string | null;
  hasPhoto: boolean;
  phase: AvatarPhase;
  progress: number;
  error: string;
  onChoose: (file: File | undefined) => void;
  onSave: () => void;
  onRemove: () => void;
  onClose: () => void;
}
const ACCEPT = 'image/jpeg,image/png,image/webp';
const initial = (name: string) => Array.from(name.trim())[0] ?? '?';

// A hidden file input inside a button-styled label: the input keeps keyboard
// focus (ring drawn on the label) and opens the system picker.
function PickPhoto(p: {
  label: string;
  variant: 'primary' | 'secondary';
  disabled: boolean;
  describedBy: string;
  onChoose: (file: File | undefined) => void;
}) {
  return (
    <Label
      className={`ui-button ui-button--${p.variant} avatar-sheet-pick${p.disabled ? ' is-disabled' : ''}`}
    >
      <Icon name='camera' size={20} />
      {p.label}
      <Input
        type='file'
        accept={ACCEPT}
        className='sr-only'
        disabled={p.disabled}
        aria-describedby={p.describedBy}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          p.onChoose(event.currentTarget.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
    </Label>
  );
}

export function AvatarSheetView({
  dialogRef,
  titleRef,
  ...p
}: AvatarSheetViewProps) {
  const busy = p.phase === 'saving' || p.phase === 'removing';
  const chosen = p.phase === 'ready' || p.phase === 'saving';
  const status =
    p.phase === 'preparing'
      ? '사진을 준비하고 있어요…'
      : p.phase === 'saving'
        ? `올리는 중… ${p.progress}%`
        : p.phase === 'removing'
          ? '사진을 지우고 있어요…'
          : '';
  return (
    <Dialog
      ref={dialogRef}
      className='avatar-sheet'
      aria-labelledby={p.ids.title}
      onCancel={(event) => {
        event.preventDefault();
        p.onClose();
      }}
    >
      <Box className='avatar-sheet-handle' aria-hidden='true' />
      <Box className='avatar-sheet-header'>
        <Heading
          id={p.ids.title}
          ref={titleRef}
          tabIndex={-1}
          className='avatar-sheet-title'
        >
          프로필 사진
        </Heading>
        <Button
          variant='icon'
          className='avatar-sheet-close'
          aria-label='닫기'
          onClick={p.onClose}
        >
          <Icon name='close' size={22} />
        </Button>
      </Box>
      <Box className='avatar-sheet-preview'>
        <Span
          className={`avatar-sheet-frame${p.photo ? ' has-photo' : ''}`}
          role='img'
          aria-label={
            chosen
              ? '고른 사진 미리보기'
              : p.hasPhoto
                ? '현재 프로필 사진'
                : '기본 프로필'
          }
        >
          {p.photo ? <Image src={p.photo} alt='' /> : initial(p.name)}
        </Span>
      </Box>
      <Text id={p.ids.note} className='avatar-sheet-note'>
        {chosen
          ? '가운데를 기준으로 정사각형으로 잘려요. 같은 그룹 사람들에게 보여요.'
          : '같은 그룹 사람들에게만 보여요. JPG, PNG, WebP 사진을 쓸 수 있어요.'}
      </Text>
      <Text role='status' className='avatar-sheet-status'>
        {status}
      </Text>
      {p.error && (
        <Text role='alert' className='form-error avatar-sheet-error'>
          {p.error}
        </Text>
      )}
      <Box className='avatar-sheet-actions'>
        {chosen ? (
          <>
            <Button
              variant='primary'
              className='avatar-sheet-primary'
              disabled={busy}
              onClick={p.onSave}
            >
              {p.phase === 'saving' ? '저장하는 중…' : '저장'}
            </Button>
            <PickPhoto
              label='다른 사진 고르기'
              variant='secondary'
              disabled={busy}
              describedBy={p.ids.note}
              onChoose={p.onChoose}
            />
          </>
        ) : (
          <>
            <PickPhoto
              label={p.hasPhoto ? '새 사진 고르기' : '사진 고르기'}
              variant='primary'
              disabled={busy || p.phase === 'preparing'}
              describedBy={p.ids.note}
              onChoose={p.onChoose}
            />
            {p.hasPhoto && (
              <Button
                variant='secondary'
                disabled={busy || p.phase === 'preparing'}
                onClick={p.onRemove}
              >
                기본 이미지로 변경
              </Button>
            )}
          </>
        )}
      </Box>
    </Dialog>
  );
}
