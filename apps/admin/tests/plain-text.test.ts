import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  RULES,
  codePoints,
  hasForbiddenControl,
  noticePatch,
  particle,
  plainTextError,
  validateNoticeDraft,
} from '../src/utils/plain-text.ts';

test('lengths count code points after trimming, like the server', () => {
  assert.equal(codePoints('👨‍👩‍👧'), 5);
  assert.equal(codePoints('가나다'), 3);
  assert.equal(
    plainTextError(`  ${'😀'.repeat(120)}  `, RULES.noticeTitle),
    ''
  );
  assert.match(
    plainTextError('😀'.repeat(121), RULES.noticeTitle),
    /120자까지/
  );
  assert.match(
    plainTextError('a'.repeat(10_001), RULES.noticeBody),
    /10,000자까지/
  );
  assert.equal(plainTextError('a'.repeat(4_000), RULES.answer), '');
  assert.match(plainTextError('a'.repeat(4_001), RULES.answer), /4,000자까지/);
  assert.match(plainTextError('   ', RULES.noticeTitle), /제목을 입력/);
  assert.match(plainTextError('', RULES.actionReason), /사유를 입력/);
});

test('single-line text rejects line breaks; multiline keeps tab/LF/CR only', () => {
  assert.equal(hasForbiddenControl('제목\n둘째 줄', false), true);
  assert.equal(hasForbiddenControl('제목 ', false), true);
  assert.equal(hasForbiddenControl('본문\n\t들여쓰기\r\n', true), false);
  for (const control of ['\u0000', '\u0007', '‮', '⁦', '\uD800'])
    assert.equal(
      hasForbiddenControl(`a${control}b`, true),
      true,
      escape(control)
    );
  assert.match(plainTextError('a‮b', RULES.noticeBody), /특수 문자/);
  assert.match(plainTextError('줄\n바꿈', RULES.actionReason), /줄바꿈/);
});

test('view reasons need at least five characters', () => {
  assert.match(plainTextError('확인', RULES.viewReason), /5자 이상/);
  assert.equal(plainTextError('신고 확인용', RULES.viewReason), '');
  assert.match(plainTextError('a'.repeat(501), RULES.viewReason), /500자까지/);
});

test('notice drafts are trimmed and only changed fields are patched', () => {
  assert.deepEqual(validateNoticeDraft({ title: ' 점검 ', body: '\n본문\n' }), {
    input: { title: '점검', body: '본문' },
    errors: {},
  });
  const invalid = validateNoticeDraft({ title: '', body: 'a\u0000' });
  assert.equal(invalid.input, null);
  assert.ok(invalid.errors.title && invalid.errors.body);
  const saved = { title: '점검', body: '본문' };
  assert.equal(noticePatch(saved, { ...saved }), null);
  assert.deepEqual(noticePatch(saved, { title: '점검', body: '새 본문' }), {
    body: '새 본문',
  });
});

test('Korean particles follow the final consonant', () => {
  assert.equal(particle('제목', '을', '를'), '을');
  assert.equal(particle('사유', '을', '를'), '를');
  assert.equal(particle('ID', '을', '를'), '을');
});
