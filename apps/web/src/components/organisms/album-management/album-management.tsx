'use client';
import { useRef, useState } from 'react';
import { mediaCountLabel, subjectParticle } from '@/utils/media';
import type { Album } from '@/dto/album.dto';
import { Box, Button } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { EntryDialog } from '@/components/organisms/entry-dialog/entry-dialog';
import { ActionConfirm } from '@/components/organisms/action-confirm/action-confirm';
export function AlbumManagement({
  album,
  disabled,
  onRename,
  onDelete,
}: {
  album: Album;
  disabled: boolean;
  onRename: (title: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [action, setAction] = useState<'rename' | 'delete' | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const contents = mediaCountLabel(album.photoCount || 0, album.videoCount);
  function choose(next: 'rename' | 'delete') {
    trigger.current?.focus();
    setOpen(false);
    setAction(next);
  }
  return (
    <Box
      className='album-management'
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <Button
        ref={trigger}
        className='icon-button'
        aria-label='앨범 메뉴'
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <Icon name='more' />
      </Button>
      {open && (
        <Box
          className='album-management-menu'
          role='group'
          aria-label='앨범 관리'
        >
          <Button onClick={() => choose('rename')}>제목 수정</Button>
          <Button className='danger-text' onClick={() => choose('delete')}>
            앨범 삭제
          </Button>
        </Box>
      )}
      {action === 'rename' && (
        <EntryDialog
          title='앨범 제목 수정'
          label='앨범 제목'
          initialValue={album.title}
          maxLength={160}
          submitLabel='저장'
          note=''
          onSubmit={onRename}
          onClose={() => setAction(null)}
        />
      )}
      {action === 'delete' && (
        <ActionConfirm
          title='앨범을 삭제할까요?'
          description={`‘${album.title}’ 앨범과 안에 있는 ${contents}${subjectParticle(contents)} 모든 구성원에게서 삭제돼요. 원본과 썸네일, 변환한 동영상도 정리되며 되돌릴 수 없어요.`}
          onConfirm={onDelete}
          onClose={() => setAction(null)}
        />
      )}
    </Box>
  );
}
