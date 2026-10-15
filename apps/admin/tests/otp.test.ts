import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  groupSecret,
  isOtpComplete,
  normalizeOtp,
  otpError,
} from '../src/utils/otp.ts';

test('pasted authenticator codes are reduced to six ASCII digits', () => {
  assert.equal(normalizeOtp('123 456'), '123456');
  assert.equal(normalizeOtp('123-456'), '123456');
  assert.equal(normalizeOtp('１２３４５６'), '123456');
  assert.equal(normalizeOtp('12a3'), '123');
  assert.equal(normalizeOtp('1234567890'), '123456');
  assert.equal(normalizeOtp('٣٤'), '');
});

test('only exactly six digits can be submitted', () => {
  assert.equal(isOtpComplete('123456'), true);
  for (const value of [
    '',
    '12345',
    '1234567',
    '12345a',
    ' 123456',
    '１２３４５６',
  ])
    assert.equal(isOtpComplete(value), false, value);
  assert.equal(otpError('123456'), '');
  assert.match(otpError(''), /6자리/);
  assert.match(otpError('123'), /모두/);
});

test('the manual setup key is grouped for reading without changing it', () => {
  assert.equal(groupSecret('JBSWY3DPEHPK3PXP'), 'JBSW Y3DP EHPK 3PXP');
  assert.equal(groupSecret('ABCDE'), 'ABCD E');
  assert.equal(groupSecret(''), '');
  assert.equal(groupSecret('ABCD EFGH').replaceAll(' ', ''), 'ABCDEFGH');
});
