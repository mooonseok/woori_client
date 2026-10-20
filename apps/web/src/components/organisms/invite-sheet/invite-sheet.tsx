'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Group } from '@/dto/album.dto';
import { useInvitations } from '@/hooks/use-invitations';
import { inviteCodeLabel, inviteExpiryLabel } from '@/utils/invite-format';
import { InviteSheetView, type IssuedInvite } from './invite-sheet-view';

// Owner-only invite sheet: a bottom sheet on phones and a centred dialog on
// wider screens (CSS). Nothing is issued until the owner asks; the link, code
// and QR are shown once and forgotten when the sheet closes.
export interface InviteSheetProps {
  group: Pick<Group, 'id' | 'name' | 'role'>;
  open: boolean;
  onClose: () => void;
  /** Called after an invitation was issued or cancelled (refresh status). */
  onChanged?: () => void;
}
// Same breakpoint as the app shell's phone layout (max-width: 600px).
const WIDE_SCREEN = '(min-width: 601px)';

export function InviteSheet(props: InviteSheetProps) {
  if (props.group.role !== 'OWNER' || !props.open) return null;
  // Mounted only while open, so a closed sheet makes no requests and keeps
  // nothing of the one-time result; another group starts fresh.
  return <InviteSheetContent key={props.group.id} {...props} />;
}

function InviteSheetContent({ group, onClose, onChanged }: InviteSheetProps) {
  const { created, qr, pending, error, notice, invite, share, copy, forget } =
    useInvitations(group, { list: false });
  const dialog = useRef<HTMLDialogElement>(null),
    title = useRef<HTMLHeadingElement>(null),
    primary = useRef<HTMLButtonElement>(null);
  const id = useId();
  const ids = {
    title: `${id}-title`,
    lead: `${id}-lead`,
    code: `${id}-code`,
  };
  const [issuing, setIssuing] = useState(false);
  // Wide screens show the QR right away; phones keep it folded. Read once,
  // when the sheet opens.
  const [qrOpen] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(WIDE_SCREEN).matches
  );
  const latest = useRef({ onClose, onChanged, forget });
  useEffect(() => {
    latest.current = { onClose, onChanged, forget };
  });

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

  const requestClose = useCallback(() => {
    latest.current.forget();
    latest.current.onClose();
  }, []);

  async function issue() {
    if (issuing || pending) return;
    setIssuing(true);
    try {
      await invite();
    } finally {
      setIssuing(false);
    }
  }

  // Step 2 appears once the whole issue request (QR and list refresh
  // included) has settled, so its buttons never hit a busy request lock.
  const result: IssuedInvite | null =
    created && !issuing && (created.url || created.code)
      ? {
          expiry: [
            inviteExpiryLabel(created.expiresAt),
            `최대 ${created.maxUses}명`,
          ]
            .filter(Boolean)
            .join(' · '),
          url: created.url,
          code: created.code ? inviteCodeLabel(created.code) : undefined,
          qr,
        }
      : null;
  const issuedId = result ? created?.id : undefined;

  // After issuing: tell the caller, then move focus to the next action. When
  // the request failed, put focus back on the issue button if it was lost.
  const wasIssuing = useRef(false);
  useEffect(() => {
    if (issuing) {
      wasIssuing.current = true;
      return;
    }
    if (!wasIssuing.current) return;
    wasIssuing.current = false;
    if (issuedId) latest.current.onChanged?.();
    const active = document.activeElement;
    if (issuedId || !active || !dialog.current?.contains(active))
      (primary.current ?? title.current)?.focus();
  }, [issuing, issuedId]);

  return (
    <InviteSheetView
      dialogRef={dialog}
      titleRef={title}
      primaryRef={primary}
      ids={ids}
      issued={result}
      issuing={issuing}
      pending={pending}
      qrOpen={qrOpen}
      notice={notice}
      error={error}
      onIssue={() => void issue()}
      onShare={() => {
        if (created?.url)
          void share(created.url, `‘${group.name}’ 그룹에 초대해요.`);
      }}
      onCopyLink={() => {
        if (created?.url) void copy(created.url, '링크를 복사했어요.');
      }}
      onCopyCode={() => {
        if (created?.code) void copy(created.code, '코드를 복사했어요.');
      }}
      onRequestClose={() => {
        if (!issuing) requestClose();
      }}
      onCancel={(event) => {
        // Esc: React decides when the dialog closes; not mid-issue.
        event.preventDefault();
        if (!issuing) requestClose();
      }}
      onDialogClose={(event) => {
        // The browser closed it on its own (e.g. a repeated Esc that skips
        // the cancel event). Our own close() on unmount leaves it closed too,
        // but by then this handler is gone; a StrictMode re-open is ignored.
        if (!event.currentTarget.open) requestClose();
      }}
    />
  );
}
