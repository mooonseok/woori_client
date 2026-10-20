'use client';
import { memberNickname } from '@/utils/nickname';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { usePagedList } from '@/hooks/use-paged-list';
import { listBlocks } from '@/services/blocks';
import { DEMO_MODE } from '@/constants/app-mode';
import { ROUTES } from '@/constants/routes';
import { kstDateLabel } from '@/utils/service-guidance';
import { BlockConfirm } from '@/components/organisms/block-confirm/block-confirm';
import type { BlockedUser } from '@/dto/block.dto';
import { BlocksView } from './blocks-view';

// Blocks are keyed by the blocked user's id.
const fetchBlocks = async (cursor: string | null, signal: AbortSignal) => {
  const page = await listBlocks(cursor, signal);
  if (!Array.isArray(page?.items))
    throw new Error('차단 목록을 불러오지 못했어요.');
  return {
    ...page,
    items: page.items.map((item) => ({ ...item, id: item.userId })),
  };
};
const buttonId = (userId: string) => `unblock-${userId}`;
const rowId = (block: BlockedUser) => buttonId(block.userId);
function BlockList() {
  const router = useRouter();
  const list = usePagedList(
    fetchBlocks,
    !DEMO_MODE,
    '차단 목록을 불러오지 못했어요.',
    rowId
  );
  const [unblocking, setUnblocking] = useState<BlockedUser | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  return (
    <>
      <BlocksView
        demo={DEMO_MODE}
        rows={list.items.map((block) => ({
          id: block.userId,
          buttonId: buttonId(block.userId),
          name: memberNickname(block),
          date: kstDateLabel(block.blockedAt),
          dateTime: block.blockedAt,
        }))}
        loading={list.loading}
        loadingMore={list.loadingMore}
        error={list.error}
        moreError={list.moreError}
        notice={list.notice}
        hasMore={!!list.nextCursor}
        onRetry={list.reload}
        onMore={list.more}
        onUnblock={(userId) => {
          const block = list.items.find((item) => item.userId === userId);
          if (!block) return;
          trigger.current = document.activeElement as HTMLElement | null;
          setUnblocking(block);
        }}
        onBack={() => router.push(ROUTES.MY)}
      />
      {unblocking && (
        <BlockConfirm
          key={unblocking.userId}
          person={{ id: unblocking.userId, name: memberNickname(unblocking) }}
          blocking={false}
          returnFocus={trigger}
          onDone={() => {
            // Focus the next row's button, else the previous one, else the title.
            const index = list.items.findIndex(
              (item) => item.userId === unblocking.userId
            );
            const next = list.items[index + 1] ?? list.items[index - 1];
            list.remove(
              unblocking.userId,
              next ? buttonId(next.userId) : 'blocks-title'
            );
          }}
          onClose={() => setUnblocking(null)}
        />
      )}
    </>
  );
}
export function BlocksContainer() {
  const { user } = useAuth();
  // A block list is private to one member; remount on any account change.
  return <BlockList key={user?.id ?? 'anonymous'} />;
}
