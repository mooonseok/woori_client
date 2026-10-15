import { Box, Text, Button, Ul, Li } from '@/components/atoms/ui';
import type { UploadProgress, UploadJobsView } from '@/dto/media.dto';
const phaseLabel = {
  RESERVING: '전송 준비',
  UPLOADING: '전송 중',
  QUEUING: '서버 접수 확인 중',
};
const jobLabel = {
  QUEUED: '처리 대기',
  PROCESSING: '사진 처리 중',
  RETRY_WAIT: '다시 처리 대기',
  READY: '저장 완료',
  FAILED: '처리 실패',
};
export function UploadStatus({
  progress,
  jobs,
}: {
  progress: UploadProgress | null;
  jobs: UploadJobsView;
}) {
  const active = jobs.jobs.filter((job) => job.status !== 'READY');
  const done = jobs.jobs.filter((job) => job.status === 'READY').length;
  return (
    <Box className='upload-status'>
      {progress && (
        <Text role='status'>
          {progress.current}/{progress.total} · {phaseLabel[progress.phase]} ·{' '}
          {progress.filename}
        </Text>
      )}
      {(progress || active.length > 0) && (
        <Text className='muted'>
          사진 전송 중에는 이 화면을 열어 두세요. 서버에 접수된 사진은 화면을
          닫아도 계속 처리돼요.
        </Text>
      )}
      {jobs.jobs.length > 0 && (
        <Text role='status'>
          최근 접수한 사진 · 저장 완료 {done}장 · 처리 중{' '}
          {active.filter((job) => job.status === 'PROCESSING').length}장
        </Text>
      )}
      {active.length > 0 && (
        <Ul className='upload-job-list'>
          {active.map((job, index) => (
            <Li key={job.photoId}>
              <Text>
                접수 사진 {index + 1} · {jobLabel[job.phase]}
              </Text>
              {job.status === 'FAILED' && (
                <Text className='muted'>
                  {job.errorCode === 'INVALID_PHOTO_FILE'
                    ? '지원하는 사진인지 확인해 주세요. 한 장은 최대 6천만 화소까지 처리할 수 있어요.'
                    : '사진을 처리하지 못했어요.'}{' '}
                  사진을 다시 선택해 전송해 주세요.
                </Text>
              )}
            </Li>
          ))}
        </Ul>
      )}
      {jobs.error && <Text role='alert'>{jobs.error}</Text>}
      {jobs.paused && (
        <Text className='muted'>
          자동 상태 확인을 멈췄어요. 서버의 사진 처리는 계속돼요.
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
