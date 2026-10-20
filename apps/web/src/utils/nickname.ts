/** Member labels never expose a legacy private recovery name. */
export function memberNickname(
  person: { nickname?: string | null } | null | undefined
) {
  return person?.nickname?.trim() || '회원';
}
export const NICKNAME_HELP =
  '문자, 숫자, 공백, 밑줄(_)과 하이픈(-)으로 2~20자. 다른 사람과 같아도 괜찮아요.';
export function normalizeNickname(value: string) {
  return value.trim().normalize('NFC');
}
export function nicknameProblem(value: string): string | null {
  const nickname = normalizeNickname(value);
  if ([...nickname].length < 2 || [...nickname].length > 20)
    return '닉네임은 앞뒤 공백을 제외하고 2~20자로 입력해 주세요.';
  if (!/^[\p{L}\p{N} _-]+$/u.test(nickname))
    return '닉네임에는 문자, 숫자, 공백, 밑줄(_)과 하이픈(-)만 사용할 수 있어요.';
  return null;
}
