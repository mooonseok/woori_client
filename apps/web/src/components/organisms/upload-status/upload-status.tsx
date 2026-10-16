import { Box, Text, Button, Ul, Li } from '@/components/atoms/ui';
import type { UploadProgress, UploadJobsView } from '@/dto/media.dto';
import { processingErrorMessage, spokenPercent } from '@/utils/media';
const phaseLabel = {
  CHECKING: '길이 확인 중',
  RESERVING: '전송 준비',
  UPLOADING: '전송 중',
  QUEUING: '서버 접수 확인 중',
};
const jobLabel = {
  QUEUED: '처리 대기',
  PROCESSING: '처리 중',
  RETRY_WAIT: '다시 처리 대기',
  READY: '저장 완료',
  FAILED: '처리 실패',
};
// videoIds: uploads from this device known to be videos ("변환 중"); jobs
// recovered from elsewhere are named neutrally until their media is known.
export function UploadStatus({
  progress,
  jobs,
  videoIds = [],
}: {
  progress: UploadProgress | null;
  jobs: UploadJobsView;
  videoIds?: string[];
}) {
  const active = jobs.jobs.filter((job) => job.status !== 'READY');
  const done = jobs.jobs.filter((job) => job.status === 'READY').length;
  const isVideo = (photoId: string) => videoIds.includes(photoId);
  return (
    <Box className='upload-status'>
      {progress && (
        // Phase changes are announced; the percent is not (see the bar).
        <Text role='status'>
          {progress.current}/{progress.total} ·{' '}
          {progress.video ? '동영상 ' : ''}
          {phaseLabel[progress.phase]} · {progress.filename}
        </Text>
      )}
      {progress?.phase === 'UPLOADING' && progress.percent !== undefined && (
        <Box className='upload-progress'>
          <Box
            className='upload-progress-bar'
            role='progressbar'
            aria-label={`${progress.filename} 전송`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={spokenPercent(progress.percent)}
            aria-valuetext={`${spokenPercent(progress.percent)}%`}
          >
            <Box
              className='upload-progress-fill'
              style={{ width: `${progress.percent}%` }}
            />
          </Box>
          <Text className='muted upload-progress-label' aria-hidden='true'>
            {progress.percent}%
          </Text>
        </Box>
      )}
      {(progress || active.length > 0) && (
        <Text className='muted'>
          전송 중에는 이 화면을 열어 두세요. 서버에 접수된 사진·동영상은 화면을
          닫아도 계속 처리돼요.
          {active.some((job) => isVideo(job.photoId)) &&
            ' 동영상은 변환에 1~2분 걸릴 수 있어요.'}
        </Text>
      )}
      {jobs.jobs.length > 0 && (
        <Text role='status'>
          최근 접수한 파일 · 저장 완료 {done}개 · 처리 중{' '}
          {active.filter((job) => job.status === 'PROCESSING').length}개
        </Text>
      )}
      {active.length > 0 && (
        <Ul className='upload-job-list'>
          {active.map((job, index) => (
            <Li key={job.photoId}>
              <Text>
                {isVideo(job.photoId) ? '동영상' : '접수 파일'} {index + 1} ·{' '}
                {isVideo(job.photoId) && job.phase === 'PROCESSING'
                  ? '변환 중'
                  : jobLabel[job.phase]}
              </Text>
              {job.status === 'FAILED' && (
                <Text className='muted'>
                  {processingErrorMessage(job.errorCode)}
                </Text>
              )}
            </Li>
          ))}
        </Ul>
      )}
      {jobs.error && <Text role='alert'>{jobs.error}</Text>}
      {jobs.paused && (
        <Text className='muted'>
          자동 상태 확인을 멈췄어요. 서버의 처리는 계속돼요.
        </Text>
      )}
      {(jobs.error || jobs.paused) && (
        <Button
          className='text-button'
          onClick={jobs.reload}
          disabled={jobs.loading}
        >
          처리 상태 다시 확인
        </Button>
      )}
    </Box>
  );
}
