'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { Photo } from '@/dto/album.dto';
import {
  photoDateLabel,
  todayInSeoul,
  validCaptureDate,
} from '@/utils/photo-date';
import {
  Dialog,
  Form,
  Header,
  Heading,
  Label,
  Input,
  Text,
  Button,
  Box,
} from '@/components/atoms/ui';
export function CaptureDateDialog({
  photo,
  onSave,
  onClose,
}: {
  photo: Photo;
  onSave: (date: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    lock = useRef(false),
    mounted = useRef(true);
  const id = useId(),
    [date, setDate] = useState(photo.effectiveDate || photo.capturedAt);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    mounted.current = true;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => {
      mounted.current = false;
      previous?.focus();
    };
  }, []);
  async function save(value: string | null) {
    if (lock.current) return;
    if (value !== null && !validCaptureDate(value)) {
      setError(
        '1800년 1월 1일부터 오늘(한국 시간)까지의 올바른 날짜를 입력해 주세요.'
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await onSave(value);
      if (mounted.current) onClose();
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error ? cause.message : '촬영일을 저장하지 못했어요.'
        );
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <Dialog
      ref={dialog}
      className='entry-dialog'
      aria-label='촬영일 수정'
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!lock.current) onClose();
      }}
    >
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          void save(date);
        }}
      >
        <Header className='dialog-header'>
          <Heading>촬영일 수정</Heading>
          <Button className='text-button' onClick={onClose} disabled={busy}>
            닫기
          </Button>
        </Header>
        <Text className='muted'>
          {photoDateLabel(
            photo.effectiveDate || photo.capturedAt,
            photo.dateSource
          )}
        </Text>
        <Label className='field-label' htmlFor={id}>
          촬영한 날짜
        </Label>
        <Input
          className='field'
          type='date'
          id={id}
          value={date}
          min='1800-01-01'
          max={todayInSeoul()}
          onChange={(event) => setDate(event.target.value)}
          required
          autoFocus
          disabled={busy}
        />
        <Text className='muted'>
          모든 구성원에게 같은 촬영일이 표시돼요. 사진 원본은 바뀌지 않아요.
        </Text>
        {error && (
          <Text className='error-notice' role='alert'>
            {error}
          </Text>
        )}
        <Box className='inline-actions'>
          <Button
            className='primary-button'
            type='submit'
            disabled={busy || !date}
          >
            {busy ? '저장 중…' : '저장'}
          </Button>
          {photo.dateSource === 'USER' && (
            <Button
              className='text-button'
              disabled={busy}
              onClick={() => void save(null)}
            >
              원래 날짜로 되돌리기
            </Button>
          )}
        </Box>
        {photo.dateSource === 'USER' && (
          <Text className='muted'>
            사진에 기록된 촬영일로 돌아가요. 기록이 없으면 업로드일을 사용해요.
          </Text>
        )}
      </Form>
    </Dialog>
  );
}
