import { MediaPreview, MediaRetry } from '@/components/molecules/media-preview';
import type { RefObject } from 'react';
import type { Album, Photo } from '@/dto/album.dto';
import {
  Box,
  Header,
  Heading,
  Text,
  Button,
  Input,
  Ul,
  Li,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { EmptyState } from '@/components/molecules/empty-state';
import type { UploadProgress, UploadJobsView } from '@/dto/media.dto';
import { UploadStatus } from '@/components/organisms/upload-status/upload-status';
import { AlbumManagement } from '@/components/organisms/album-management/album-management';
import { AlbumMeta } from '@/components/molecules/album-meta';
import { MediaBadge } from '@/components/molecules/media-badge';
import { formatDuration } from '@/utils/media';
interface Props {
  onRetryPreview?: (photo: Photo) => void;
  onImageError?: (photo: Photo) => void;
  videoIds?: string[];
  // The album may be on a list page not loaded yet (live paging).
  seeking?: boolean;
  seekError?: string;
  onSeekRetry?: () => void;
  uploads: UploadJobsView;
  uploadProgress: UploadProgress | null;
  onRename: (title: string) => Promise<void>;
  onDelete: () => Promise<void>;
  live: boolean;
  loading: boolean;
  error: string;
  hasMore: boolean;
  canRetry: boolean;
  onRetryUpload: () => void;
  onCancelUpload: () => void;
  onReload: () => void;
  onMore: () => void;
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
  onRetryPreview,
  onImageError,
  videoIds,
  seeking = false,
  seekError = '',
  onSeekRetry,
  uploads,
  uploadProgress,
  live,
  onRename,
  onDelete,
  loading,
  error,
  hasMore,
  canRetry,
  onRetryUpload,
  onCancelUpload,
  onReload,
  onMore,
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
  if (!album && seeking)
    return seekError ? (
      <Box className='error-notice' role='alert'>
        <Text>{seekError}</Text>
        <Button className='text-button' onClick={onSeekRetry}>
          다시 불러오기
        </Button>
      </Box>
    ) : (
      <Text className='state-panel' role='status'>
        앨범을 찾고 있어요…
      </Text>
    );
  if (!album)
    return (
      <EmptyState
        title='앨범을 찾을 수 없어요'
        body='현재 그룹에서 볼 수 있는 앨범을 선택해 주세요.'
        action='앨범 보기'
        onAction={onBack}
      />
    );
  return (
    <Box>
      <Header className='album-heading'>
        <Button className='icon-button' onClick={onBack} aria-label='뒤로 가기'>
          <Icon name='back' />
        </Button>
        <Box className='album-heading-info'>
          <Heading>{album.title}</Heading>
          <AlbumMeta
            className='muted'
            album={album}
            count={album.photoCount ?? photos.length}
          />
        </Box>
        <Box className='album-heading-actions'>
          <Button
            className='primary'
            onClick={onUpload}
            disabled={busy}
            data-photo-viewer-return
          >
            <Icon name='upload' size={20} />
            {busy
              ? live
                ? '전송 중…'
                : '사진 읽는 중…'
              : live
                ? '사진·동영상 추가'
                : '사진 추가'}
          </Button>
          {live && album.canManage && (
            <AlbumManagement
              key={`${album.groupId}:${album.id}`}
              album={album}
              disabled={busy}
              onRename={onRename}
              onDelete={onDelete}
            />
          )}
        </Box>
      </Header>
      <Input
        ref={fileRef}
        className='sr-only'
        tabIndex={-1}
        type='file'
        multiple
        accept={
          live
            ? 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime'
            : 'image/jpeg,image/png,image/webp'
        }
        onChange={(e) => onFiles(e.target.files)}
        aria-label={live ? '업로드할 사진·동영상 선택' : '미리볼 사진 선택'}
      />
      <Text className='preview-note'>
        {live
          ? 'JPG · PNG · WebP 사진은 30MB, MP4 · MOV 동영상은 1분 · 200MB까지예요. 한 번에 30개 · 합계 300MB까지 올릴 수 있고, 같은 선택 안의 중복 파일은 한 번만 전송해요. HEIC 사진은 JPG로 변환해 주세요. 동영상은 서버에서 변환한 뒤 앨범에 보여요.'
          : '선택한 사진은 이 기기에서만 미리 볼 수 있어요. 실제 업로드는 서버 연결 후 제공됩니다.'}
      </Text>
      {live && (
        <UploadStatus
          progress={uploadProgress}
          jobs={uploads}
          videoIds={videoIds}
        />
      )}
      {busy && live && (
        <Button className='text-button' onClick={onCancelUpload}>
          이 기기 전송 중단
        </Button>
      )}
      {loading && <Text role='status'>사진을 불러오고 있어요…</Text>}
      {error && (
        <Box className='error-notice' role='alert'>
          <Text>{error}</Text>
          <Button className='text-button' onClick={onReload} disabled={loading}>
            다시 불러오기
          </Button>
        </Box>
      )}
      {failures.length > 0 && (
        <Box className='error-notice' role='alert'>
          <Text>
            {live
              ? '일부 파일을 전송하거나 접수하지 못했어요.'
              : '일부 사진을 미리 볼 수 없어요.'}
          </Text>
          <Ul>
            {failures.map((f) => (
              <Li key={f}>{f}</Li>
            ))}
          </Ul>
          {canRetry && (
            <Button
              className='text-button'
              onClick={onRetryUpload}
              disabled={busy}
            >
              실패한 파일 다시 시도
            </Button>
          )}
        </Box>
      )}
      {photos.length ? (
        <Box className='photo-grid'>
          {photos.map((p, i) => (
            <Box className='media-card-frame' key={p.id}>
              <Button
                className='photo-tile'
                onClick={() => onPhoto(p.id)}
                aria-label={
                  p.mediaKind === 'VIDEO'
                    ? `${i + 1}번째 동영상${p.durationMs ? `, 길이 ${formatDuration(p.durationMs)}` : ''}, 크게 보기`
                    : `${i + 1}번째 사진 크게 보기`
                }
              >
                <MediaPreview
                  src={p.src}
                  status={p.previewStatus}
                  video={p.mediaKind === 'VIDEO'}
                  alt={p.alt}
                  onError={() => onImageError?.(p)}
                />
                {p.mediaKind === 'VIDEO' && (
                  <MediaBadge durationMs={p.durationMs} />
                )}
              </Button>
              <MediaRetry photo={p} onRetry={onRetryPreview} />
            </Box>
          ))}
        </Box>
      ) : !loading && !error ? (
        <EmptyState
          title='첫 사진을 기다리고 있어요'
          body='함께 간 여행, 평범한 하루도 좋아요.'
          action='사진 추가'
          onAction={onUpload}
        />
      ) : null}
      {hasMore && (
        <Button
          className='secondary-button'
          onClick={onMore}
          disabled={loading}
        >
          사진 더 보기
        </Button>
      )}
    </Box>
  );
}
