'use client';
import { useEffect, useRef } from 'react';
import type { SyntheticEvent } from 'react';
import { Box, Button, Text, Video } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import type { Photo } from '@/dto/album.dto';
import type { VideoSourceView } from '@/dto/viewer-ui.dto';
import { formatDuration } from '@/utils/media';
// The video on screen: poster first (display rendition), then the authenticated
// API URL. The viewer's gestures leave its control strip and taps alone
// (use-photo-gestures) and only take a horizontal swipe elsewhere on it.
export function PhotoVideo({
  photo,
  source,
  pauseRequested,
  onPlaybackChange,
}: {
  photo: Photo;
  source: VideoSourceView;
  pauseRequested: boolean;
  onPlaybackChange(playing: boolean): void;
}) {
  const element = useRef<HTMLVideoElement>(null);
  // Where playback stood when the URL failed, so the fresh URL's element
  // picks up there (and keeps playing if it was).
  const resume = useRef<{
    photoId: string;
    time: number;
    playing: boolean;
  } | null>(null);
  // Leaving the item, a fresh URL (a new element) or closing the viewer:
  // stop playback and drop the API URL so nothing streams in background.
  useEffect(() => {
    const video = element.current;
    return () => {
      if (!video) return;
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [photo.id, source.attempt]);
  const failed = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    if (video.currentTime > 0 || !video.paused)
      resume.current = {
        photoId: photo.id,
        time: video.currentTime,
        playing: !video.paused,
      };
    onPlaybackChange(false);
    source.failed();
  };
  const restore = (event: SyntheticEvent<HTMLVideoElement>) => {
    const saved = resume.current;
    resume.current = null;
    if (saved?.photoId !== photo.id) return;
    const video = event.currentTarget;
    if (saved.time > 0) video.currentTime = saved.time;
    // The earlier play was the user's; a refused resume leaves it paused.
    if (saved.playing && !pauseRequested) video.play().catch(() => {});
  };
  // A panel opening is a deliberate pause, including a pending source retry.
  useEffect(() => {
    if (!pauseRequested) return;
    resume.current = null;
    element.current?.pause();
  }, [pauseRequested]);
  const duration = formatDuration(photo.durationMs);
  return (
    <>
      <Video
        key={`${photo.id}:${source.attempt}`}
        ref={element}
        className='viewer-video'
        controls
        crossOrigin='use-credentials'
        playsInline
        preload='metadata'
        poster={photo.src}
        src={source.src || undefined}
        aria-label={`${photo.alt.includes('동영상') ? photo.alt : `${photo.alt} 동영상`}${duration ? `, 길이 ${duration}` : ''}`}
        onError={failed}
        onLoadedMetadata={restore}
        onPlay={(event) => {
          if (pauseRequested) event.currentTarget.pause();
        }}
        onPlaying={() => {
          source.played();
          onPlaybackChange(true);
        }}
        onPause={() => onPlaybackChange(false)}
        onEnded={() => onPlaybackChange(false)}
        onSeeking={() => onPlaybackChange(false)}
        onSeeked={(event) => onPlaybackChange(!event.currentTarget.paused)}
      />
      {source.status === 'loading' && (
        <Text className='viewer-video-status' role='status'>
          동영상을 불러오고 있어요…
        </Text>
      )}
      {source.status === 'error' && (
        <Box className='viewer-image-error' data-viewer-interactive='true'>
          <Icon name='play' />
          <Text>동영상을 재생하지 못했어요.</Text>
          <Button onClick={() => source.retry()}>다시 시도</Button>
        </Box>
      )}
    </>
  );
}
