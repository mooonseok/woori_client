"use client";
import { useEffect, useRef } from "react";
import type { PhotoViewerProps } from "@/dto/viewer.dto";
import {
  Box,
  Button,
  Dialog,
  Form,
  Heading,
  Text,
  Textarea,
} from "@/components/atoms/ui";
import { Icon } from "@/components/atoms/icon";
import { usePhotoViewer } from "@/hooks/use-photo-viewer";
import { usePhotoGestures } from "@/hooks/use-photo-gestures";
import { Guide } from "@/components/organisms/guide/guide";
import { PhotoStageView } from "./photo-stage-view";
import { PhotoCommentsView } from "./photo-comments-view";
import { ViewerToolbarView } from "./viewer-toolbar-view";
import { ViewerConfirm } from "./viewer-confirm";
export function PhotoViewer(props: PhotoViewerProps) {
  return props.photos.length ? <PhotoViewerContainer {...props} /> : null;
}
function PhotoViewerContainer(props: PhotoViewerProps) {
  const m = usePhotoViewer(props),
    dialog = useRef<HTMLDialogElement>(null);
  const g = usePhotoGestures({
    photo: m.photo,
    canPrevious: m.index > 0,
    canNext: m.index < props.photos.length - 1,
    disabled: !!m.guide || !!m.confirm || m.mode === "write",
    placing: m.mode === "place",
    onTap: m.tap,
    onNavigate: m.navigate,
  });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  const comments = props.comments.filter(
    (comment) => comment.photoId === m.photo.id,
  );
  const reactions = props.reactions.filter(
    (reaction) => reaction.photoId === m.photo.id,
  );
  const pin = comments.find((comment) => comment.id === m.selectedPin);
  return (
    <Dialog
      ref={dialog}
      className={`woori-viewer ${m.panel ? "has-comments" : ""}`}
      aria-label="사진 보기"
      onCancel={(event) => {
        event.preventDefault();
        if (m.more) m.setMore(false);
        else if (m.reacting) m.setReacting(false);
        else if (m.mode !== "browse") m.cancelPin();
        else if (m.panel) m.setPanel(false);
        else m.requestClose();
      }}
      onKeyDown={g.onKeyDown}
    >
      <Box className="viewer-canvas">
        <PhotoStageView
          model={m}
          gestures={g}
          photos={props.photos}
          comments={comments}
        />
        <ViewerToolbarView
          model={m}
          gestures={g}
          interactionsEnabled={props.interactionsEnabled !== false}
          count={props.photos.length}
          comments={comments.length}
          reactions={reactions}
          onReact={(emoji) => props.onReact(m.photo.id, emoji)}
        />
        {pin && (
          <Box className="viewer-pin-bubble" data-viewer-interactive="true">
            <Box>
              <Text>{pin.authorName}</Text>
              <Button
                aria-label="위치 댓글 닫기"
                onClick={() => m.setSelectedPin(null)}
              >
                <Icon name="close" size={18} />
              </Button>
            </Box>
            <Text>{pin.body}</Text>
          </Box>
        )}
        {m.mode === "write" && (
          <Form
            className="viewer-pin-composer"
            onSubmit={(event) => {
              event.preventDefault();
              m.submitPin();
            }}
          >
            <Heading>이 자리에 한마디</Heading>
            <Textarea
              autoFocus
              aria-label="위치 댓글"
              placeholder="어떤 순간이었나요?"
              rows={2}
              value={m.pinText}
              onChange={(event) => m.setPinText(event.target.value)}
              maxLength={1000}
            />
            <Box>
              <Text>사진에서 선택한 위치에 남겨져요.</Text>
              <Button type="submit" disabled={!m.pinText.trim()}>
                등록
              </Button>
            </Box>
          </Form>
        )}
      </Box>
      {m.panel && (
        <PhotoCommentsView
          comments={comments}
          draft={m.drafts[m.photo.id] || ""}
          onChange={(value) =>
            m.setDrafts((current) => ({ ...current, [m.photo.id]: value }))
          }
          onSubmit={m.submitComment}
          onClose={() => m.setPanel(false)}
          onPin={(id) => {
            g.reset();
            m.setSelectedPin(id);
            m.setPins(true);
            m.setPanel(false);
          }}
          photoDescription={`${m.photo.capturedAt} · ${m.photo.alt}`}
        />
      )}
      {m.guide && <Guide kind={m.guide} onClose={m.finishGuide} />}
      {m.confirm && (
        <ViewerConfirm
          count={m.confirm === "pin" ? 1 : m.draftCount}
          onCancel={() => m.setConfirm(null)}
          onDiscard={m.discard}
        />
      )}
    </Dialog>
  );
}
