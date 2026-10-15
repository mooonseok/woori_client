import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  helpTopics,
  inquiryCategoryLabels,
  inquiryStatusLabels,
  privacyGuide,
} from '../src/content/service-guide.ts';
import {
  INQUIRY_BODY_MAX,
  INQUIRY_CATEGORIES,
  INQUIRY_TITLE_MAX,
} from '../src/constants/inquiry.ts';
import {
  codePoints,
  hasForbiddenControl,
  privacyOperatorRows,
  validateInquiryDraft,
} from '../src/utils/service-guidance.ts';
import { validateReportDraft } from '../src/utils/reports.ts';
import { REPORT_DETAIL_MAX } from '../src/constants/report.ts';
import { isPublicRoute, safeReturnTo } from '../src/utils/auth-navigation.ts';

const id = '0b7d4a52-8a8e-4c55-9a3c-4f1f3f6c2a10';

test('inquiry drafts require a chosen category and trimmed title/body within the server limits', () => {
  const empty = validateInquiryDraft({ category: '', title: '', body: '' });
  assert.equal(empty.input, null);
  assert.deepEqual(Object.keys(empty.errors).sort(), [
    'body',
    'category',
    'title',
  ]);
  const blank = validateInquiryDraft({
    category: 'ACCOUNT',
    title: '   ',
    body: '\n\t ',
  });
  assert.equal(blank.input, null);
  assert.equal(blank.errors.category, undefined);
  assert.match(blank.errors.title ?? '', /제목/);
  assert.match(blank.errors.body ?? '', /내용/);
  const forged = validateInquiryDraft({
    category: 'ADMIN' as never,
    title: '제목',
    body: '내용',
  });
  assert.equal(forged.input, null);
  assert.ok(forged.errors.category);

  const atLimit = validateInquiryDraft({
    category: 'BUG',
    title: `  ${'가'.repeat(INQUIRY_TITLE_MAX)}  `,
    body: `\n${'나'.repeat(INQUIRY_BODY_MAX)}\n`,
  });
  assert.deepEqual(atLimit.errors, {});
  assert.deepEqual(atLimit.input, {
    category: 'BUG',
    title: '가'.repeat(INQUIRY_TITLE_MAX),
    body: '나'.repeat(INQUIRY_BODY_MAX),
  });
  const over = validateInquiryDraft({
    category: 'BUG',
    title: '가'.repeat(INQUIRY_TITLE_MAX + 1),
    body: '나'.repeat(INQUIRY_BODY_MAX + 1),
  });
  assert.equal(over.input, null);
  assert.match(over.errors.title ?? '', /100자/);
  assert.match(over.errors.body ?? '', /2,000자/);
  // Inner line breaks are content; only the edges are trimmed.
  const multiline = validateInquiryDraft({
    category: 'OTHER',
    title: ' 질문 ',
    body: ' 첫 줄\n\n둘째 줄 ',
  });
  assert.equal(multiline.input?.body, '첫 줄\n\n둘째 줄');
  assert.equal(multiline.input?.title, '질문');
});

test('inquiry text follows the server rule: code-point length and no control characters', () => {
  // Astral characters count once, as the server counts code points.
  const emoji = validateInquiryDraft({
    category: 'OTHER',
    title: '😀'.repeat(INQUIRY_TITLE_MAX),
    body: '📷'.repeat(INQUIRY_BODY_MAX),
  });
  assert.deepEqual(emoji.errors, {});
  const tooMany = validateInquiryDraft({
    category: 'OTHER',
    title: '😀'.repeat(INQUIRY_TITLE_MAX + 1),
    body: '내용',
  });
  assert.match(tooMany.errors.title ?? '', /100자/);
  for (const title of [
    '줄\n바꿈',
    '탭\t제목',
    'bell\u0007',
    'del\u007f',
    'c1\u0085',
  ])
    assert.match(
      validateInquiryDraft({ category: 'BUG', title, body: '내용' }).errors
        .title ?? '',
      /특수 문자/,
      JSON.stringify(title)
    );
  // The body keeps tab/LF/CR but no other control characters or lone surrogates.
  assert.deepEqual(
    validateInquiryDraft({
      category: 'BUG',
      title: '제목',
      body: '1\t2\r\n3',
    }).errors,
    {}
  );
  for (const body of ['널\u0000', '이스케이프\u001b[31m', '반쪽\ud800'])
    assert.match(
      validateInquiryDraft({ category: 'BUG', title: '제목', body }).errors
        .body ?? '',
      /특수 문자/,
      JSON.stringify(body)
    );
});

test('every contract category and status has the agreed Korean label', () => {
  assert.deepEqual(
    [...INQUIRY_CATEGORIES],
    ['ACCOUNT', 'GROUP', 'PHOTO', 'NOTIFICATION', 'BUG', 'OTHER']
  );
  assert.deepEqual(inquiryCategoryLabels, {
    ACCOUNT: '계정·로그인',
    GROUP: '그룹·초대',
    PHOTO: '사진·앨범',
    NOTIFICATION: '알림',
    BUG: '오류 신고',
    OTHER: '기타',
  });
  assert.deepEqual(inquiryStatusLabels, {
    RECEIVED: '접수됨',
    IN_PROGRESS: '확인 중',
    ANSWERED: '답변 완료',
    CLOSED: '종료',
  });
});

test('privacy summary keeps undecided operator facts null and never invents contacts, periods or citations', () => {
  assert.deepEqual(privacyGuide.operatorInfo, {
    operator: null,
    privacyOfficer: null,
    contact: null,
    retention: null,
    processors: null,
    effectiveDate: null,
  });
  const rows = privacyOperatorRows(
    privacyGuide.operatorInfo,
    privacyGuide.operatorLabels,
    privacyGuide.pendingMessage
  );
  assert.equal(rows.length, 6);
  for (const row of rows) {
    assert.equal(row.pending, true);
    assert.equal(row.value, '운영 정보가 확정되면 안내해요.');
  }
  assert.match(privacyGuide.notice, /정식 개인정보 처리방침/);
  const text = JSON.stringify({ privacyGuide, helpTopics });
  for (const invented of [
    /[\w.+-]+@[\w-]+\.[\w.]+/, // email address
    /\d{2,4}-\d{3,4}-\d{4}/, // phone number
    /https?:\/\//,
    /주식회사|\(주\)/,
    /제\s?\d+\s?조/, // statute article citations
    /\d+\s?(일|개월|년)\s?(동안|간|보관)/, // retention periods
  ])
    assert.equal(invented.test(text), false, String(invented));
});

test('help covers the confirmed upload, original, date, group, notification and deletion rules', () => {
  const text = helpTopics.flatMap((topic) => topic.points).join('\n');
  for (const fact of [
    /JPEG·PNG·WebP/,
    /HEIC/,
    /높은 호환성/,
    /30MB/,
    /30장·합계 300MB/,
    /6천만 화소/,
    /화면을 닫아도 계속/,
    /촬영 위치\(GPS\)/,
    /EXIF/,
    /한국 시간/,
    /그룹장만/,
    /내보내진 경우에는 다시 참여할 수 없어요/,
    /복구할 수 없어요/,
    /기기와 브라우저마다/,
    /탈퇴한 회원/,
    /이전 그룹 권한은 돌아오지 않아요/,
    /마이페이지 > 문의하기/,
  ])
    assert.match(text, fact);
  assert.equal(new Set(helpTopics.map((topic) => topic.id)).size, 9);
});

test('help and privacy are public while notices and inquiries stay behind login', () => {
  for (const path of ['/help', '/help/', '/privacy', '/login', '/signup'])
    assert.equal(isPublicRoute(path), true, path);
  for (const path of [
    '/',
    '/notices',
    '/notice',
    '/inquiries',
    '/inquiries/new',
    '/inquiry',
    '/mypage',
    '/account-settings',
    '/helpdesk',
  ])
    assert.equal(isPublicRoute(path), false, path);
});

test('service pages survive login with only their validated record id', () => {
  assert.equal(safeReturnTo('/notices'), '/notices');
  assert.equal(safeReturnTo('/inquiries/'), '/inquiries');
  assert.equal(safeReturnTo('/inquiries/new?title=x'), '/inquiries/new');
  assert.equal(
    safeReturnTo(`/notice?id=${id}&next=//evil.example`),
    `/notice?id=${id}`
  );
  assert.equal(safeReturnTo(`/inquiry?id=${id}`), `/inquiry?id=${id}`);
  assert.equal(safeReturnTo('/notice?id=%3Cscript%3E'), '/notices');
  assert.equal(safeReturnTo('/inquiry'), '/inquiries');
  assert.equal(safeReturnTo('/noticesx'), '/');
  assert.equal(safeReturnTo('//evil.example/notices'), '/');
});

test('counters and limits use code points, so emoji reach the exact server limit', () => {
  const body = '📷'.repeat(INQUIRY_BODY_MAX);
  assert.equal(body.length, INQUIRY_BODY_MAX * 2);
  assert.equal(codePoints(body), INQUIRY_BODY_MAX);
  assert.deepEqual(
    validateInquiryDraft({
      category: 'BUG',
      title: '😀'.repeat(INQUIRY_TITLE_MAX),
      body,
    }).errors,
    {}
  );
  assert.ok(
    validateInquiryDraft({ category: 'BUG', title: '제목', body: `${body}😀` })
      .errors.body
  );
  const detail = '🙂'.repeat(REPORT_DETAIL_MAX);
  assert.equal(codePoints(detail), REPORT_DETAIL_MAX);
  assert.deepEqual(validateReportDraft({ reason: 'SPAM', detail }).errors, {});
  assert.ok(
    validateReportDraft({ reason: 'SPAM', detail: `${detail}🙂` }).errors.detail
  );
});

test('bidi controls are rejected everywhere and line/paragraph separators in titles', () => {
  for (const mark of [
    '\u202a',
    '\u202b',
    '\u202c',
    '\u202d',
    '\u202e',
    '\u2066',
    '\u2067',
    '\u2068',
    '\u2069',
  ]) {
    assert.equal(hasForbiddenControl(`a${mark}b`, false), true, mark);
    assert.equal(hasForbiddenControl(`a${mark}b`, true), true, mark);
  }
  for (const separator of ['\u2028', '\u2029']) {
    assert.equal(hasForbiddenControl(`a${separator}b`, false), true);
    assert.equal(hasForbiddenControl(`a${separator}b`, true), false);
  }
  assert.match(
    validateInquiryDraft({
      category: 'BUG',
      title: 'invoice\u202Etxt.exe',
      body: '내용',
    }).errors.title ?? '',
    /특수 문자/
  );
  assert.match(
    validateInquiryDraft({ category: 'BUG', title: '제목', body: '앞\u2066뒤' })
      .errors.body ?? '',
    /특수 문자/
  );
  assert.match(
    validateReportDraft({ reason: 'OTHER', detail: '설명\u202A' }).errors
      .detail ?? '',
    /특수 문자/
  );
  // Ordinary Korean, emoji and joiners stay allowed.
  assert.equal(hasForbiddenControl('가족 👨‍👩‍👧 사진', false), false);
});

test('memories wording covers every earlier year, not only last year', () => {
  const text = helpTopics.flatMap((topic) => topic.points).join('\n');
  assert.match(text, /예전 같은 날·같은 달/);
  assert.doesNotMatch(text, /지난 ?해/);
});
