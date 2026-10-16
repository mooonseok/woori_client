// Photo/video rules shared by upload, grid, viewer and notifications
// (OpenAPI 0.22.0: mediaKind, durationMs, videoCount, video errors).
export type MediaKind = 'PHOTO' | 'VIDEO';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
export const IMAGE_MAX_BYTES = 30 * 1024 * 1024; // 31457280
export const VIDEO_MAX_BYTES = 200 * 1024 * 1024; // 209715200
// Server rejects above 60.5 s (ffprobe is authoritative); the UI says 1분.
export const VIDEO_MAX_MS = 60_500;

export const isVideoType = (type: string) => VIDEO_TYPES.includes(type);

// Whole percent of a file sent; 100 only once every byte is sent.
export function uploadPercent(sent: number, size: number) {
  if (!(size > 0) || !(sent > 0)) return 0;
  if (sent >= size) return 100;
  return Math.min(99, Math.floor((sent / size) * 100));
}
// Screen readers hear the bar in 10% steps; the bar itself moves by 1%.
export const spokenPercent = (percent: number) =>
  Math.min(100, Math.floor(percent / 10) * 10);

// "0:42", "1:00"; '' when unknown.
export function formatDuration(ms: number | null | undefined) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return '';
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// Counts that include videos: "사진 3장", "동영상 2개", "사진·동영상 5개".
export function mediaCountLabel(count: number, videoCount = 0) {
  const n = Math.max(0, Math.floor(count) || 0);
  const videos = Math.min(n, Math.max(0, Math.floor(videoCount) || 0));
  if (!videos) return `사진 ${n}장`;
  return videos === n ? `동영상 ${n}개` : `사진·동영상 ${n}개`;
}
// Particles after mediaCountLabel(): 장 ends in a consonant, 개 does not.
export const objectParticle = (label: string) =>
  label.endsWith('장') ? '을' : '를';
export const subjectParticle = (label: string) =>
  label.endsWith('장') ? '이' : '가';

export const mediaNoun = (kind?: MediaKind | null) =>
  kind === 'VIDEO' ? '동영상' : '사진';

/**
 * Before any upload: type and size always; a video's length when the browser
 * could read its metadata (`durationMs` null → HEVC etc., the server decides).
 */
export function mediaPrecheck(
  file: { type: string; size: number },
  durationMs?: number | null
) {
  const video = isVideoType(file.type);
  if (!video && !IMAGE_TYPES.includes(file.type))
    return 'JPG, PNG, WebP 사진과 MP4, MOV 동영상만 올릴 수 있어요. HEIC 사진은 JPG로 변환해 주세요.';
  if (!file.size) return '빈 파일은 올릴 수 없어요.';
  if (!video && file.size > IMAGE_MAX_BYTES)
    return '사진 한 장은 30MB 이하여야 해요.';
  if (video && file.size > VIDEO_MAX_BYTES)
    return '동영상 하나는 200MB 이하여야 해요.';
  if (video && typeof durationMs === 'number' && durationMs > VIDEO_MAX_MS)
    return `동영상은 1분 이하만 올릴 수 있어요. 이 동영상은 ${formatDuration(durationMs)}이에요.`;
  return '';
}

// Processing failures from the upload queue (PhotoProcessingJob.errorCode).
export function processingErrorMessage(code: string | null | undefined) {
  switch (code) {
    case 'VIDEO_TOO_LONG':
      return '동영상이 1분보다 길어요. 1분 이하로 잘라서 다시 올려 주세요.';
    case 'VIDEO_UNSUPPORTED':
      return '지원하지 않는 동영상이에요. 휴대폰으로 찍은 MP4·MOV 동영상을 올려 주세요.';
    case 'TRANSCODE_FAILED':
      return '동영상을 변환하지 못했어요. 다른 동영상으로 다시 시도해 주세요.';
    case 'UPLOADER_INACTIVE':
      return '이용이 제한된 계정이라 처리하지 않았어요.';
    case 'INVALID_PHOTO_FILE':
      return '지원하는 사진인지 확인해 주세요. 한 장은 최대 6천만 화소까지 처리할 수 있어요.';
    case 'UPLOAD_EXPIRED':
      return '전송 시간이 지났어요. 다시 선택해 전송해 주세요.';
    case 'UPLOAD_ACCESS_REVOKED':
      return '그룹이나 앨범에 접근할 수 없게 되어 처리하지 않았어요.';
    case 'PHOTO_PROCESSING_FAILED':
    default:
      return '처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}
