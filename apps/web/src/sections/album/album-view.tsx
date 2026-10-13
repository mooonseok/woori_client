import type { RefObject } from "react";
import type { Album, Photo } from "@/dto/album.dto";
import {
  Box,
  Header,
  Heading,
  Text,
  Button,
  Input,
  Image,
  Ul,
  Li,
} from "@/components/atoms/ui";
import { Icon } from "@/components/atoms/icon";
import { EmptyState } from "@/components/molecules/empty-state";
interface Props {
  album?: Album;
  photos: Photo[];
  busy: boolean;
  failures: string[];
  fileRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | null) => void;
  onUpload: () => void;
  onPhoto: (id: string) => void;
  onBack: () => void;
}
export function AlbumView({
  album,
  photos,
  busy,
  failures,
  fileRef,
  onFiles,
  onUpload,
  onPhoto,
  onBack,
}: Props) {
  if (!album)
    return (
      <EmptyState
        title="앨범을 찾을 수 없어요"
        body="현재 그룹에서 볼 수 있는 앨범을 선택해 주세요."
        action="앨범 보기"
        onAction={onBack}
      />
    );
  return (
    <Box>
      <Header className="album-heading">
        <Button className="icon-button" onClick={onBack} aria-label="뒤로 가기">
          <Icon name="back" />
        </Button>
        <Box>
          <Heading>{album.title}</Heading>
          <Text className="muted">
            {album.date.replaceAll("-", ".")} · 사진 {photos.length}장
          </Text>
        </Box>
        <Button className="primary" onClick={onUpload} disabled={busy}>
          <Icon name="upload" size={20} />
          {busy ? "사진 읽는 중…" : "사진 추가"}
        </Button>
      </Header>
      <Input
        ref={fileRef}
        className="sr-only"
        tabIndex={-1}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => onFiles(e.target.files)}
        aria-label="미리볼 사진 선택"
      />
      <Text className="preview-note">
        선택한 사진은 이 기기에서만 미리 볼 수 있어요. 실제 업로드는 서버 연결
        후 제공됩니다.
      </Text>
      {failures.length > 0 && (
        <Box className="error-notice" role="alert">
          <Text>일부 사진을 읽지 못했어요. 다시 선택해 주세요.</Text>
          <Ul>
            {failures.map((f) => (
              <Li key={f}>{f}</Li>
            ))}
          </Ul>
        </Box>
      )}
      {photos.length ? (
        <Box className="photo-grid">
          {photos.map((p, i) => (
            <Button
              className="photo-tile"
              key={p.id}
              onClick={() => onPhoto(p.id)}
              aria-label={`${i + 1}번째 사진 크게 보기`}
            >
              <Image src={p.src} alt={p.alt} loading="lazy" />
            </Button>
          ))}
        </Box>
      ) : (
        <EmptyState
          title="첫 사진을 기다리고 있어요"
          body="함께 간 여행, 평범한 하루도 좋아요."
          action="사진 추가"
          onAction={onUpload}
        />
      )}
    </Box>
  );
}
