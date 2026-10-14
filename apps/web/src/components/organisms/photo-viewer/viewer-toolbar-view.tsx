import type { RefObject } from "react";
import {
  Anchor,
  Box,
  Button,
  Footer,
  Header,
  Span,
  Text,
} from "@/components/atoms/ui";
import { Icon } from "@/components/atoms/icon";
import type { Reaction } from "@/dto/album.dto";
import type { PhotoViewerModel, PhotoGestureModel } from "@/dto/viewer-ui.dto";
interface Props {
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  downloading: boolean;
  downloadError: string;
  onDownloadOriginal?: () => Promise<void>;
  onDelete?: () => void;
  interactionsEnabled: boolean;
  model: PhotoViewerModel;
  gestures: PhotoGestureModel;
  count: number;
  comments: number;
  reactions: Reaction[];
  onReact(emoji: string): void;
}
const EMOJI = [
  { emoji: "❤️", label: "좋아요" },
  { emoji: "🥰", label: "사랑해요" },
  { emoji: "😂", label: "웃겨요" },
  { emoji: "👏", label: "멋져요" },
  { emoji: "😮", label: "놀라워요" },
];
export function ViewerToolbarView({
  interactionsEnabled,
  menuButtonRef,
  downloading,
  downloadError,
  onDownloadOriginal,
  onDelete,
  model: m,
  gestures: g,
  count,
  comments,
  reactions,
  onReact,
}: Props) {
  const active = m.chrome || m.mode !== "browse";
  const mine = reactions.find((reaction) => reaction.userId === "me");
  return (
    <>
      <Header
        className={`viewer-toolbar viewer-top ${active ? "is-visible" : ""}`}
        inert={!active}
      >
        {m.mode === "browse" ? (
          <>
            <Button aria-label="사진 보기 닫기" onClick={m.requestClose}>
              <Icon name="close" />
            </Button>
            <Text aria-live="polite">
              {m.index + 1} / {count}
            </Text>
            {interactionsEnabled && (
              <Button
                aria-label="사진 정보와 댓글"
                onClick={() => m.setPanel(!m.panel)}
              >
                <Icon name="info" />
              </Button>
            )}
            <Button
              ref={menuButtonRef}
              aria-label="사진 메뉴"
              aria-expanded={m.more}
              onClick={() => m.setMore(!m.more)}
            >
              <Icon name="more" />
            </Button>
          </>
        ) : (
          <>
            <Button onClick={m.cancelPin}>취소</Button>
            <Text>
              {m.mode === "place"
                ? "이야기를 남길 곳을 눌러 주세요"
                : "선택한 위치에 한마디"}
            </Text>
          </>
        )}
      </Header>
      <Footer
        className={`viewer-toolbar viewer-bottom ${active && m.mode === "browse" ? "is-visible" : ""}`}
        inert={!active || m.mode !== "browse"}
      >
        {interactionsEnabled && (
          <>
            <Button
              onClick={() => {
                m.setReacting(!m.reacting);
                m.setMore(false);
              }}
              aria-label="반응 고르기"
              aria-expanded={m.reacting}
            >
              <Span className={mine ? "viewer-my-reaction" : ""}>
                {mine ? mine.emoji : <Icon name="heart" />}
              </Span>
              <Span>{reactions.length || "반응"}</Span>
            </Button>
            <Button onClick={() => m.setPanel(!m.panel)}>
              <Icon name="comment" />
              <Span>{comments || "댓글"}</Span>
            </Button>
            <Button onClick={m.startPin}>
              <Icon name="pin" />
              <Span>위치 댓글</Span>
            </Button>
          </>
        )}
        {!onDownloadOriginal && (
          <Anchor
            href={m.photo.src}
            download={`woori-${m.photo.id}.jpg`}
            aria-label={
              interactionsEnabled ? "사진 다운로드" : "화면 사진 저장"
            }
          >
            <Icon name="download" />
          </Anchor>
        )}
      </Footer>
      {m.reacting && (
        <Box className="viewer-reactions" role="group" aria-label="반응 선택">
          {EMOJI.map((item) => (
            <Button
              key={item.emoji}
              aria-label={item.label}
              aria-pressed={mine?.emoji === item.emoji}
              onClick={() => {
                onReact(item.emoji);
                m.setReacting(false);
              }}
            >
              <Span>{item.emoji}</Span>
              <Text>{item.label}</Text>
            </Button>
          ))}
        </Box>
      )}
      {m.more && (
        <Box className="viewer-menu" role="group" aria-label="사진 메뉴">
          {onDownloadOriginal && (
            <Button
              disabled={downloading}
              onClick={() => void onDownloadOriginal()}
            >
              <Icon name="download" />
              {downloading ? "원본 받는 중…" : "원본 다운로드"}
            </Button>
          )}
          {downloadError && (
            <Text role="alert" className="viewer-download-error">
              {downloadError}
            </Text>
          )}
          {onDelete && (
            <Button
              className="danger-text"
              disabled={downloading}
              onClick={onDelete}
            >
              사진 삭제
            </Button>
          )}
          <Button onClick={() => g.zoom(1.5)}>
            <Icon name="zoom-in" />
            확대
          </Button>
          <Button onClick={() => g.zoom(1 / 1.5)}>
            <Icon name="zoom-out" />
            축소
          </Button>
          <Button onClick={() => g.reset()}>화면에 맞추기</Button>
          {interactionsEnabled && (
            <Button
              onClick={() => {
                m.setPins(!m.pins);
                m.setMore(false);
              }}
            >
              <Icon name={m.pins ? "eye-off" : "eye"} />
              위치 댓글 핀 {m.pins ? "숨기기" : "보이기"}
            </Button>
          )}
          <Button onClick={() => m.openGuide("view")}>사진 감상 사용법</Button>
          {interactionsEnabled && (
            <Button onClick={() => m.openGuide("pin")}>위치 댓글 사용법</Button>
          )}
        </Box>
      )}
      {active && m.mode === "browse" && (
        <Box className="viewer-desktop-arrows">
          <Button
            disabled={!m.index}
            aria-label="이전 사진"
            onClick={() => g.navigate(-1)}
          >
            <Icon name="chevron-left" />
          </Button>
          <Button
            disabled={m.index >= count - 1}
            aria-label="다음 사진"
            onClick={() => g.navigate(1)}
          >
            <Icon name="chevron-right" />
          </Button>
        </Box>
      )}
    </>
  );
}
