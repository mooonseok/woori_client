import { OTP_LENGTH } from '../constants/admin-auth.ts';

// Accepts pasted codes such as "123 456", "123-456" or full-width digits and
// keeps only the first six ASCII digits.
export function normalizeOtp(raw: string) {
  return raw
    .replace(/[０-９]/g, (digit) =>
      String.fromCharCode(digit.charCodeAt(0) - 0xfee0)
    )
    .replace(/\D/g, '')
    .slice(0, OTP_LENGTH);
}
const OTP_PATTERN = new RegExp(`^\\d{${OTP_LENGTH}}$`);
export function isOtpComplete(code: string) {
  return OTP_PATTERN.test(code);
}
export function otpError(code: string) {
  if (!code) return '인증 앱에 표시된 6자리 코드를 입력해 주세요.';
  return isOtpComplete(code) ? '' : '6자리 숫자를 모두 입력해 주세요.';
}
// Groups a base32 secret in fours for manual entry; copy keeps the raw value.
export function groupSecret(secret: string) {
  return (
    secret
      .replace(/\s+/g, '')
      .match(/.{1,4}/g)
      ?.join(' ') ?? ''
  );
}
