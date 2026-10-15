import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createReport, listReports } from '../src/services/reports.ts';
import { ApiError } from '../src/services/api-client.ts';
import {
  REPORT_GONE_MESSAGE,
  REPORT_LIMIT_MESSAGE,
  isOwnTargetError,
  isReportTargetGone,
  reportErrorMessage,
  validateReportDraft,
} from '../src/utils/reports.ts';
import { fetchCursorPage } from '../src/utils/service-guidance.ts';
import {
  currentTab,
  isPublicRoute,
  safeReturnTo,
} from '../src/utils/auth-navigation.ts';
import { REPORT_DETAIL_MAX, REPORT_REASONS } from '../src/constants/report.ts';
import {
  reportPolicyNotice,
  reportReasonLabels,
  reportStatusLabels,
  reportTargetLabels,
} from '../src/content/service-guide.ts';

const photoId = '7c2f3e1a-1b2c-4d5e-8f90-a1b2c3d4e5f6';
const groupId = '1a2b3c4d-5e6f-4a1b-9c2d-3e4f5a6b7c8d';
function withApi(t: TestContext) {
  const saved = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example';
  t.after(() => {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = saved;
  });
}
const reportBody = (duplicate: boolean) => ({
  id: 'b8c9d0e1-f2a3-4b4c-8d5e-6f7a8b9c0d1e',
  targetType: 'PHOTO',
  reason: 'SPAM',
  status: duplicate ? 'REVIEWING' : 'RECEIVED',
  createdAt: '2026-10-15T01:00:00Z',
  resolvedAt: null,
  duplicate,
});
const failure = (promise: Promise<unknown>) =>
  promise.then(
    () => assert.fail('expected rejection'),
    (error: unknown) => error
  );

test('report submissions send only contract fields with the member cookie and CSRF header', async (t) => {
  withApi(t);
  const calls: Request[] = [];
  let duplicate = false;
  t.mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request, init?: RequestInit) => {
      calls.push(new Request(input, init));
      return Response.json(reportBody(duplicate), {
        status: duplicate ? 200 : 201,
      });
    }
  );
  const created = await createReport({
    targetType: 'PHOTO',
    targetId: photoId,
    reason: 'SPAM',
    detail: '',
  });
  assert.equal(created.duplicate, false);
  duplicate = true;
  const again = await createReport({
    targetType: 'USER',
    targetId: photoId,
    groupId,
    reason: 'HARASSMENT',
    detail: '반복해서 불쾌한 댓글을 남겨요.',
  });
  assert.equal(again.duplicate, true);
  assert.equal(again.status, 'REVIEWING');
  for (const call of calls) {
    const url = new URL(call.url);
    assert.equal(url.pathname, '/v1/reports');
    assert.equal(url.search, '');
    assert.equal(call.method, 'POST');
    assert.equal(call.credentials, 'include');
    assert.equal(call.headers.get('X-Woori-Request'), '1');
    assert.equal(call.headers.get('Content-Type'), 'application/json');
  }
  // groupId is omitted for photos (server derives it); empty detail is not sent.
  assert.deepEqual(await calls[0].json(), {
    targetType: 'PHOTO',
    targetId: photoId,
    reason: 'SPAM',
  });
  assert.deepEqual(await calls[1].json(), {
    targetType: 'USER',
    targetId: photoId,
    reason: 'HARASSMENT',
    groupId,
    detail: '반복해서 불쾌한 댓글을 남겨요.',
  });
});

test('report failures map to the real state: gone target, own content, validation, limit, session, network', async (t) => {
  withApi(t);
  let reply: () => Response | Promise<Response> = () =>
    Response.json({}, { status: 500 });
  t.mock.method(globalThis, 'fetch', async () => reply());
  const input = {
    targetType: 'COMMENT',
    targetId: photoId,
    reason: 'OTHER',
  } as const;

  reply = () =>
    Response.json(
      {
        code: 'REPORT_TARGET_NOT_FOUND',
        message: '신고할 대상을 찾을 수 없어요.',
      },
      { status: 404 }
    );
  const gone = await failure(createReport(input));
  assert.equal(isReportTargetGone(gone), true);
  assert.equal(reportErrorMessage(gone, 'COMMENT'), REPORT_GONE_MESSAGE);

  reply = () =>
    Response.json(
      { code: 'REPORT_SELF_NOT_ALLOWED', message: 'own content' },
      { status: 400 }
    );
  const own = await failure(createReport(input));
  assert.equal((own as ApiError).code, 'REPORT_SELF_NOT_ALLOWED');
  assert.equal(isOwnTargetError(own), true);
  assert.equal(
    reportErrorMessage(own, 'PHOTO'),
    '내가 올린 사진은 신고할 수 없어요.'
  );
  assert.equal(
    reportErrorMessage(own, 'COMMENT'),
    '내가 쓴 댓글은 신고할 수 없어요.'
  );
  assert.equal(reportErrorMessage(own, 'USER'), '나 자신은 신고할 수 없어요.');

  reply = () =>
    Response.json(
      { message: ['detail must be shorter'], error: 'Bad Request' },
      { status: 400 }
    );
  const invalid = await failure(createReport(input));
  assert.equal((invalid as ApiError).code, undefined);
  assert.equal(isOwnTargetError(invalid), false);
  assert.match(reportErrorMessage(invalid, 'COMMENT'), /500자/);

  reply = () =>
    Response.json(
      { code: 'TOO_MANY_REQUESTS', message: '요청이 너무 많아요.' },
      { status: 429 }
    );
  const limited = await failure(createReport(input));
  assert.equal(reportErrorMessage(limited, 'PHOTO'), REPORT_LIMIT_MESSAGE);
  assert.match(REPORT_LIMIT_MESSAGE, /하루 20건/);

  reply = () => {
    throw new TypeError('Failed to fetch');
  };
  const offline = await failure(createReport(input));
  assert.equal((offline as ApiError).status, 0);
  assert.match(reportErrorMessage(offline, 'USER'), /서버에 연결할 수 없어요/);
  assert.match(
    reportErrorMessage(new ApiError(401, 'x'), 'USER'),
    /다시 로그인/
  );
});

test('report detail is optional, trimmed, limited by code points and free of control characters', () => {
  const none = validateReportDraft({ reason: '', detail: '' });
  assert.equal(none.input, null);
  assert.match(none.errors.reason ?? '', /사유/);
  assert.deepEqual(validateReportDraft({ reason: 'SPAM', detail: '   ' }), {
    input: { reason: 'SPAM' },
    errors: {},
  });
  assert.deepEqual(
    validateReportDraft({ reason: 'PRIVACY', detail: ' 전화번호가 보여요\n ' })
      .input,
    { reason: 'PRIVACY', detail: '전화번호가 보여요' }
  );
  assert.deepEqual(
    validateReportDraft({
      reason: 'OTHER',
      detail: '😀'.repeat(REPORT_DETAIL_MAX),
    }).errors,
    {}
  );
  const tooLong = validateReportDraft({
    reason: 'OTHER',
    detail: '가'.repeat(REPORT_DETAIL_MAX + 1),
  });
  assert.equal(tooLong.input, null);
  assert.match(tooLong.errors.detail ?? '', /500자/);
  assert.deepEqual(
    validateReportDraft({ reason: 'OTHER', detail: 'a\tb\r\nc' }).errors,
    {}
  );
  for (const detail of ['널\u0000', '\u001b[31m', '반쪽\ud800'])
    assert.match(
      validateReportDraft({ reason: 'OTHER', detail }).errors.detail ?? '',
      /특수 문자/,
      JSON.stringify(detail)
    );
  assert.equal(
    validateReportDraft({ reason: 'ABUSE' as never, detail: '' }).input,
    null
  );
});

test('report labels match the agreed wording and the policy notice is explicit', () => {
  assert.deepEqual(
    [...REPORT_REASONS],
    ['INAPPROPRIATE', 'HARASSMENT', 'PRIVACY', 'SPAM', 'OTHER']
  );
  assert.deepEqual(reportReasonLabels, {
    INAPPROPRIATE: '부적절한 사진·내용',
    HARASSMENT: '괴롭힘·불쾌한 행동',
    PRIVACY: '개인정보 노출',
    SPAM: '스팸·광고',
    OTHER: '기타',
  });
  assert.deepEqual(reportStatusLabels, {
    RECEIVED: '접수됨',
    REVIEWING: '검토 중',
    RESOLVED: '조치 완료',
    DISMISSED: '조치 없음',
  });
  assert.deepEqual(reportTargetLabels, {
    PHOTO: '사진',
    COMMENT: '댓글',
    USER: '회원',
  });
  assert.match(reportPolicyNotice, /운영자만 확인/);
  assert.match(reportPolicyNotice, /상대방과 그룹장에게 알리지 않아요/);
  assert.doesNotMatch(reportPolicyNotice, /\d+\s?(시간|일) (안|이내)/);
});

test('own report list pages by cursor and restarts when the cursor report is gone', async (t) => {
  withApi(t);
  const urls: URL[] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(new Request(input, init).url);
      urls.push(url);
      return url.searchParams.get('cursor')
        ? Response.json({ code: 'REPORT_NOT_FOUND' }, { status: 404 })
        : Response.json({ items: [], nextCursor: null });
    }
  );
  const signal = new AbortController().signal;
  await listReports(null, signal);
  const restarted = await fetchCursorPage(listReports, photoId, signal);
  assert.equal(restarted.restarted, true);
  assert.deepEqual(
    urls.map((url) => [url.pathname, url.search]),
    [
      ['/v1/reports', '?limit=20'],
      ['/v1/reports', `?limit=20&cursor=${photoId}`],
      ['/v1/reports', '?limit=20'],
    ]
  );
});

test('report list is protected, survives login, and service screens keep the 마이페이지 tab for members', () => {
  assert.equal(isPublicRoute('/reports'), false);
  assert.equal(safeReturnTo('/reports?cursor=x'), '/reports');
  assert.equal(safeReturnTo('/reports/'), '/reports');
  for (const path of [
    '/notices',
    '/notice',
    '/inquiries',
    '/inquiries/new',
    '/inquiry',
    '/help',
    '/privacy',
    '/reports',
    '/reports/',
    '/mypage',
  ])
    assert.equal(currentTab(path, true), '/mypage', path);
  // Signed out, public guides are not presented as part of 마이페이지.
  assert.equal(currentTab('/help', false), null);
  assert.equal(currentTab('/privacy', false), null);
  assert.equal(currentTab('/album', true), '/albums');
  assert.equal(currentTab('/albums', false), '/albums');
  assert.equal(currentTab('/', true), '/');
  assert.equal(currentTab('/groups', true), null);
  assert.equal(currentTab('/notifications', true), null);
});
