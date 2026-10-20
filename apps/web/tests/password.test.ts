import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PASSWORD_MISMATCH,
  confirmationProblem,
  passwordsDiffer,
} from '../src/utils/password.ts';

test('a new password is sent only when the confirmation matches exactly', () => {
  assert.equal(passwordsDiffer('correct horse 12', 'correct horse 12'), false);
  for (const confirmation of [
    '',
    'correct horse 1',
    'Correct horse 12',
    'correct horse 12 ',
    ' correct horse 12',
  ])
    assert.equal(passwordsDiffer('correct horse 12', confirmation), true);
});

test('the confirmation hint waits while a correct beginning is being typed', () => {
  const password = 'correct horse 12';
  assert.equal(confirmationProblem(password, ''), null);
  assert.equal(confirmationProblem(password, 'correct'), null);
  assert.equal(confirmationProblem(password, password), null);
  // A wrong character or a longer value shows right away.
  assert.equal(confirmationProblem(password, 'corrext'), PASSWORD_MISMATCH);
  assert.equal(
    confirmationProblem(password, `${password}3`),
    PASSWORD_MISMATCH
  );
  // Leaving the field (or submitting) with a short value is a mismatch too.
  assert.equal(
    confirmationProblem(password, 'correct', true),
    PASSWORD_MISMATCH
  );
  assert.equal(confirmationProblem(password, '', true), null);
  // Editing the password after the confirmation re-evaluates both.
  assert.equal(
    confirmationProblem('correct horse 13', password),
    PASSWORD_MISMATCH
  );
});
