'use client';
import { useRef } from 'react';
import { DEMO_MODE } from '@/constants/app-mode';
import { useGallery } from '@/hooks/use-gallery';
import { GROUP_ACCESS_RECHECK } from '@/services/api-client';
import { setBlocked } from '@/services/blocks';
import {
  BLOCKED_MESSAGE,
  UNBLOCKED_MESSAGE,
  blockErrorMessage,
} from '@/utils/blocks';
import { statusOf } from '@/utils/service-guidance';
import type { BlockSubject } from '@/dto/block.dto';

// Block/unblock one person. The change is announced (BLOCKS_CHANGED) even if
// the caller unmounted meanwhile, so every live view (albums, photos, viewer,
// comments, memories, notifications, roster) refetches; see setBlocked.
export function useBlockActions() {
  const { setToast } = useGallery();
  const active = useRef(false);
  async function change(person: BlockSubject, blocked: boolean) {
    if (DEMO_MODE) throw new Error('미리보기에서는 차단할 수 없어요.');
    if (active.current)
      throw new Error('처리하고 있어요. 잠시만 기다려 주세요.');
    active.current = true;
    try {
      const sameSession = await setBlocked(person.id, blocked);
      if (sameSession) setToast(blocked ? BLOCKED_MESSAGE : UNBLOCKED_MESSAGE);
    } catch (cause) {
      // The person is no longer visible to me; let group views recheck access.
      if (statusOf(cause) === 404)
        window.dispatchEvent(new Event(GROUP_ACCESS_RECHECK));
      throw new Error(blockErrorMessage(cause, blocked));
    } finally {
      active.current = false;
    }
  }
  return {
    block: (person: BlockSubject) => change(person, true),
    unblock: (person: BlockSubject) => change(person, false),
  };
}
