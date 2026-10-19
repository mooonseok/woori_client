import test from 'node:test';
import assert from 'node:assert/strict';
import { UploadRetention } from '../src/utils/upload-retention.ts';

const file = (name: string) => new File(['test'], name, { type: 'image/jpeg' });

test('failed files and PUT reservations survive other selections and album visits', () => {
  const retained = new UploadRetention();
  const failed = file('failed.jpg'),
    fresh = file('fresh.jpg');
  const reservation = retained.pending('a1', failed);
  reservation.uploaded = true;
  reservation.ticket = {
    photoId: 'p1',
    uploadUrl: 'https://storage.example/put',
    headers: {},
    expiresAt: '2099-01-01',
  };
  retained.fail('a1', failed, '연결을 확인해 주세요.');
  retained.begin('a1', [fresh]);
  retained.accept('a1', fresh);
  assert.deepEqual(retained.result('a2'), { failures: [], files: [] });
  assert.deepEqual(retained.result('a1').files, [failed]);
  assert.strictEqual(retained.pending('a1', failed), reservation);
  assert.equal(retained.pending('a1', failed).uploaded, true);
});

test('retry removes only the selected failure and never resubmits accepted File objects', () => {
  const retained = new UploadRetention();
  const a = file('a.jpg'),
    b = file('b.jpg');
  retained.fail('album', a, 'a failed');
  retained.fail('album', b, 'b failed');
  retained.begin('album', [a]);
  retained.accept('album', a);
  retained.fail('album', a, 'late failure');
  assert.equal(retained.accepted('album', a), true);
  assert.deepEqual(retained.result('album'), {
    failures: ['b failed'],
    files: [b],
  });
  assert.equal(retained.accepted('other-album', a), false);
});

test('invalid files remain explained but are not offered as a network retry', () => {
  const retained = new UploadRetention();
  const invalid = file('too-large.jpg');
  retained.fail('album', invalid, '파일 크기를 줄여 주세요.', false);
  assert.deepEqual(retained.result('album'), {
    failures: ['파일 크기를 줄여 주세요.'],
    files: [],
  });
});

test('album removal and session/group disposal release retry state and accepted history', () => {
  const retained = new UploadRetention();
  const a = file('a.jpg'),
    b = file('b.jpg');
  retained.fail('a1', a, 'failed');
  retained.fail('a2', b, 'failed');
  retained.accept('a2', a);
  retained.remove('a1');
  assert.deepEqual(retained.result('a1').files, []);
  assert.deepEqual(retained.result('a2').files, [b]);
  retained.clear();
  assert.deepEqual(retained.result('a2').files, []);
  assert.equal(retained.accepted('a2', a), false);
  assert.equal(retained.pending('a2', b).uploaded, false);
});
