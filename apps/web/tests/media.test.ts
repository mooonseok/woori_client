import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDuration,
  mediaCountLabel,
  mediaPrecheck,
  objectParticle,
  processingErrorMessage,
  subjectParticle,
} from '../src/utils/media.ts';

const MB = 1024 * 1024;

test('durations read m:ss and unknown lengths stay blank', () => {
  assert.equal(formatDuration(42_000), '0:42');
  assert.equal(formatDuration(60_000), '1:00');
  assert.equal(formatDuration(59_600), '1:00');
  assert.equal(formatDuration(61_000), '1:01');
  assert.equal(formatDuration(900), '0:01');
  for (const unknown of [null, undefined, 0, -5, Number.NaN])
    assert.equal(formatDuration(unknown), '');
});

test('counts say 사진 N장, 동영상 N개 or 사진·동영상 N개 with matching particles', () => {
  assert.equal(mediaCountLabel(3), '사진 3장');
  assert.equal(mediaCountLabel(3, 0), '사진 3장');
  assert.equal(mediaCountLabel(2, 2), '동영상 2개');
  assert.equal(mediaCountLabel(5, 2), '사진·동영상 5개');
  assert.equal(
    mediaCountLabel(1, 9),
    '동영상 1개',
    'videos never exceed count'
  );
  assert.equal(mediaCountLabel(0), '사진 0장');
  assert.equal(objectParticle('사진 3장'), '을');
  assert.equal(objectParticle('동영상 2개'), '를');
  assert.equal(subjectParticle('사진 3장'), '이');
  assert.equal(subjectParticle('사진·동영상 5개'), '가');
});

test('the upload pre-check stops long or large videos before sending; unreadable lengths go to the server', () => {
  const video = (size: number) => ({ type: 'video/mp4', size });
  assert.equal(mediaPrecheck(video(150 * MB), 42_000), '');
  assert.equal(
    mediaPrecheck({ type: 'video/quicktime', size: MB }, 60_000),
    ''
  );
  // HEVC etc.: the browser could not read the length; the server decides.
  assert.equal(mediaPrecheck(video(150 * MB), null), '');
  assert.match(mediaPrecheck(video(MB), 61_000), /1분 이하.*1:01/);
  assert.match(mediaPrecheck(video(200 * MB + 1), 10_000), /200MB/);
  assert.equal(mediaPrecheck(video(200 * MB), 60_500), '');
  assert.match(
    mediaPrecheck({ type: 'image/jpeg', size: 30 * MB + 1 }),
    /30MB/
  );
  assert.equal(mediaPrecheck({ type: 'image/webp', size: 30 * MB }), '');
  assert.match(mediaPrecheck({ type: 'image/heic', size: MB }), /HEIC/);
  assert.match(mediaPrecheck({ type: 'video/webm', size: MB }), /MP4, MOV/);
  assert.match(mediaPrecheck({ type: 'video/mp4', size: 0 }), /빈 파일/);
});

test('each processing failure code has its own Korean message', () => {
  const codes = [
    'VIDEO_TOO_LONG',
    'VIDEO_UNSUPPORTED',
    'TRANSCODE_FAILED',
    'UPLOADER_INACTIVE',
    'PHOTO_PROCESSING_FAILED',
    'INVALID_PHOTO_FILE',
  ];
  const messages = codes.map(processingErrorMessage);
  assert.equal(new Set(messages).size, codes.length);
  assert.match(processingErrorMessage('VIDEO_TOO_LONG'), /1분/);
  assert.match(processingErrorMessage('TRANSCODE_FAILED'), /변환/);
  assert.equal(
    processingErrorMessage('SOMETHING_NEW'),
    processingErrorMessage('PHOTO_PROCESSING_FAILED')
  );
});
