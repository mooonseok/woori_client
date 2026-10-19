import { Box, Button, Image, Text } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import type { Photo, PhotoComment } from '@/dto/album.dto';
import type {
  PhotoViewerModel,
  PhotoGestureModel,
  VideoSourceView,
} from '@/dto/viewer-ui.dto';
import { PhotoPinLayerView } from './photo-pin-layer-view';
import { PhotoVideo } from './photo-video';
interface Props {
  photos: Photo[];
  comments: PhotoComment[];
  model: PhotoViewerModel;
  gestures: PhotoGestureModel;
  video: VideoSourceView;
  videoPausedByPanel: boolean;
  onVideoPlaybackChange(playing: boolean): void;
}
export function PhotoStageView({
  photos,
  comments,
  model: m,
  gestures: { stageRef, imageRef, trackRef, size, stageEvents },
  video,
  videoPausedByPanel,
  onVideoPlaybackChange,
}: Props) {
  const current = photos[m.index];
  return (
    <Box
      ref={stageRef}
      className={`viewer-stage ${m.mode === 'place' ? 'is-placing' : ''} ${current?.mediaKind === 'VIDEO' ? 'is-video' : ''}`}
      tabIndex={0}
      aria-label={
        current?.mediaKind === 'VIDEO'
          ? '동영상. 재생 버튼으로 재생, 좌우로 넘기기.'
          : '사진. 두 번 눌러 확대, 두 손가락으로 확대·축소, 좌우로 넘기기. 키보드 + − 로 확대·축소, 0 원래대로.'
      }
      {...stageEvents}
    >
      <Box ref={trackRef} className='viewer-track'>
        {[-1, 0, 1].map((offset) => {
          const photo = photos[m.index + offset];
          if (!photo) return null;
          return (
            <Box
              className={`viewer-slide ${offset === 0 && photo.mediaKind === 'VIDEO' ? 'is-video' : ''}`}
              key={`${offset}:${photo.id}`}
              style={{
                transform: `translateX(calc(${offset * 100}% + ${offset * 24}px))`,
              }}
            >
              {offset === 0 && photo.mediaKind === 'VIDEO' ? (
                <Box
                  ref={imageRef}
                  className='viewer-photo is-video'
                  style={{ width: size.width, height: size.height }}
                >
                  <PhotoVideo
                    photo={photo}
                    source={video}
                    pauseRequested={videoPausedByPanel}
                    onPlaybackChange={onVideoPlaybackChange}
                  />
                </Box>
              ) : offset === 0 ? (
                <Box
                  ref={imageRef}
                  className='viewer-photo'
                  style={{ width: size.width, height: size.height }}
                >
                  <Image
                    key={`${photo.id}:${m.imageRetry}`}
                    src={photo.src}
                    alt={photo.alt}
                    draggable={false}
                    onError={() => m.setFailedPhoto(photo.id)}
                  />
                  <PhotoPinLayerView
                    comments={m.guide === 'pin' ? [] : comments}
                    visible={m.pins}
                    selected={m.selectedPin}
                    draft={m.point}
                    onSelect={(id) =>
                      m.setSelectedPin(id === m.selectedPin ? null : id)
                    }
                  />
                </Box>
              ) : (
                <Image
                  src={photo.src}
                  alt=''
                  draggable={false}
                  className='viewer-adjacent-photo'
                />
              )}
            </Box>
          );
        })}
      </Box>
      {m.failedPhoto === m.photo.id && m.photo.mediaKind !== 'VIDEO' && (
        <Box className='viewer-image-error' data-viewer-interactive='true'>
          <Icon name='photo' />
          <Text>사진을 불러오지 못했어요.</Text>
          <Button onClick={m.retryImage}>다시 시도</Button>
        </Box>
      )}
    </Box>
  );
}
