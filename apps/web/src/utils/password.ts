// A new password (sign-up, reset, account settings) is only sent when its
// confirmation matches exactly. Passwords are compared as typed: no trimming.
export const PASSWORD_MISMATCH =
  '두 비밀번호가 같지 않아요. 다시 확인해 주세요.';

export function passwordsDiffer(password: string, confirmation: string) {
  return password !== confirmation;
}

// Live hint under the confirmation field. While the member is still typing a
// correct beginning it stays quiet; a wrong character, or any difference once
// the field is finished (blur or submit), shows the mismatch.
export function confirmationProblem(
  password: string,
  confirmation: string,
  finished = false
): string | null {
  if (!confirmation || !passwordsDiffer(password, confirmation)) return null;
  if (
    !finished &&
    confirmation.length < password.length &&
    password.startsWith(confirmation)
  )
    return null;
  return PASSWORD_MISMATCH;
}
