import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  viewErrorMessage,
  actionErrorMessage,
  apiErrorMessage,
  isCursorInvalid,
  LOGIN_INVALID_MESSAGE,
  MFA_INVALID_MESSAGE,
  loginErrorMessage,
  mfaFailure,
  reauthErrorMessage,
} from '../src/utils/admin-errors.ts';
import { SESSION_END_MESSAGES } from '../src/content/session-messages.ts';

const failure = (status: number, code?: string, message = '서버 메시지') =>
  Object.assign(new Error(message), { status, code });

test('login failures stay generic and never echo why an account was refused', () => {
  for (const error of [
    failure(401, 'ADMIN_INVALID_CREDENTIALS', '계정이 잠겼어요'),
    failure(401, undefined, 'disabled'),
    failure(400, undefined, 'username must match'),
  ])
    assert.equal(loginErrorMessage(error), LOGIN_INVALID_MESSAGE);
  assert.match(loginErrorMessage(failure(429, 'TOO_MANY_REQUESTS')), /잠시 후/);
  assert.match(
    loginErrorMessage(failure(503, 'AUTH_BUSY')),
    /잠시 사용할 수 없어요/
  );
  assert.equal(
    loginErrorMessage(failure(503, 'ADMIN_NOT_CONFIGURED', '설정 안내')),
    '설정 안내'
  );
  assert.equal(
    loginErrorMessage(failure(0, undefined, '서버에 연결할 수 없어요.')),
    '서버에 연결할 수 없어요.'
  );
});

test('MFA failures decide between retry, session re-check and login', () => {
  assert.deepEqual(mfaFailure(failure(401, 'ADMIN_MFA_INVALID')), {
    action: 'recheck',
    message: MFA_INVALID_MESSAGE,
    lostReason: 'mfa-failed',
  });
  assert.equal(
    mfaFailure(failure(401, 'ADMIN_AUTHENTICATION_REQUIRED')).action,
    'login'
  );
  for (const code of [
    'ADMIN_MFA_ALREADY_ENABLED',
    'ADMIN_MFA_ALREADY_VERIFIED',
    'ADMIN_MFA_SETUP_REQUIRED',
  ])
    assert.equal(mfaFailure(failure(409, code)).action, 'recheck', code);
  assert.equal(mfaFailure(failure(429, 'TOO_MANY_REQUESTS')).action, 'retry');
  assert.equal(mfaFailure(failure(400)).action, 'retry');
  assert.equal(
    SESSION_END_MESSAGES['mfa-failed'].includes('다시 로그인'),
    true
  );
});

test('re-auth failures do not reveal which factor was wrong', () => {
  const message = reauthErrorMessage(failure(401, 'ADMIN_INVALID_CREDENTIALS'));
  assert.match(message, /비밀번호 또는 인증 코드/);
  assert.match(reauthErrorMessage(failure(400)), /모두 입력/);
  assert.equal(
    reauthErrorMessage(failure(429, 'TOO_MANY_REQUESTS', '많아요')),
    '많아요'
  );
});

test('slice B codes map to precise Korean messages; English framework text is not shown', () => {
  assert.match(
    apiErrorMessage(409, 'ADMIN_REPORT_ALREADY_CLOSED', undefined),
    /이미 종료된 신고/
  );
  assert.match(
    apiErrorMessage(400, 'ADMIN_ACTION_NOT_APPLICABLE', undefined),
    /적용할 수 없는 조치/
  );
  assert.match(
    apiErrorMessage(409, 'ADMIN_USER_NOT_SUSPENDABLE', undefined),
    /탈퇴한 회원/
  );
  assert.match(
    apiErrorMessage(404, 'ADMIN_INQUIRY_NOT_FOUND', undefined),
    /회원 탈퇴/
  );
  assert.match(
    apiErrorMessage(404, 'ADMIN_PHOTO_NOT_FOUND', 'Not Found'),
    /사진을 볼 수 없어요/
  );
  assert.match(
    apiErrorMessage(400, undefined, 'Bad Request'),
    /입력한 내용을 확인/
  );
  assert.match(apiErrorMessage(404, undefined, 'Not Found'), /찾을 수 없어요/);
  assert.equal(
    apiErrorMessage(400, 'X', '제목이 너무 길어요.'),
    '제목이 너무 길어요.'
  );
  assert.equal(
    isCursorInvalid(failure(400, 'ADMIN_AUDIT_CURSOR_INVALID')),
    true
  );
  assert.equal(
    isCursorInvalid(failure(400, 'ADMIN_REPORT_CURSOR_INVALID')),
    true
  );
  assert.equal(
    isCursorInvalid(failure(404, 'ADMIN_REPORT_CURSOR_INVALID')),
    false
  );
  assert.equal(isCursorInvalid(failure(400)), false);
  const cancelled = Object.assign(new Error('x'), {
    name: 'ReauthCancelledError',
  });
  assert.match(actionErrorMessage(cancelled, 'fallback'), /본인 확인을 취소/);
  assert.equal(
    actionErrorMessage(failure(429, 'TOO_MANY_REQUESTS', '많아요'), 'f'),
    '많아요'
  );
});

test('server-added slice B codes and the view rate limit have Korean wording', () => {
  assert.match(
    apiErrorMessage(400, 'ADMIN_NOTICE_UPDATE_EMPTY', undefined),
    /바뀐 내용이 없어요/
  );
  assert.match(
    apiErrorMessage(400, 'ADMIN_NOTICE_PUBLISH_AT_INVALID', undefined),
    /90일 이내/
  );
  assert.match(
    apiErrorMessage(503, 'MEDIA_NOT_CONFIGURED', undefined),
    /사진 저장소/
  );
  assert.match(
    viewErrorMessage(failure(429, 'TOO_MANY_REQUESTS')),
    /한 시간에 120회/
  );
  assert.match(
    viewErrorMessage(
      failure(404, 'ADMIN_PHOTO_NOT_FOUND', '사진을 볼 수 없어요.')
    ),
    /사진을 볼 수 없어요/
  );
  assert.match(
    apiErrorMessage(409, 'ADMIN_OWNED_GROUPS_REMAIN', undefined),
    /소유한 그룹/
  );
  assert.match(
    apiErrorMessage(409, 'ADMIN_USER_NOT_SUSPENDED', undefined),
    /정지 상태가 아니라/
  );
});

test('deletion conflicts and already-deleted members have their own wording', () => {
  assert.match(
    apiErrorMessage(409, 'ADMIN_USER_ALREADY_DELETED', undefined),
    /이미 탈퇴한 회원/
  );
  assert.match(
    apiErrorMessage(409, 'ACCOUNT_DELETION_CONFLICT', 'conflict'),
    /겹쳐 회원 삭제를 끝내지 못했어요. 잠시 후 다시 시도/
  );
});
