// Invite display helpers. Codes are shown in two groups of five so they are
// easy to read aloud; the join form already strips spaces and hyphens.
export function inviteCodeLabel(code: string) {
  const plain = code.replace(/[\s-]/g, '').toUpperCase();
  return plain.length === 10 ? `${plain.slice(0, 5)}-${plain.slice(5)}` : plain;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** "10월 23일(목) 오후 3시까지" in Korea time; minutes only when not on the hour. */
export function inviteExpiryLabel(expiresAt: string) {
  const at = new Date(Date.parse(expiresAt) + 9 * 60 * 60 * 1000);
  if (Number.isNaN(at.getTime())) return '';
  const hour = at.getUTCHours(),
    minute = at.getUTCMinutes();
  const half = hour < 12 ? '오전' : '오후';
  const clock = hour % 12 === 0 ? 12 : hour % 12;
  const time = minute ? `${clock}시 ${minute}분` : `${clock}시`;
  return `${at.getUTCMonth() + 1}월 ${at.getUTCDate()}일(${WEEKDAYS[at.getUTCDay()]}) ${half} ${time}까지`;
}

/** Short form for a status line: "10월 23일까지". */
export function inviteExpiryDate(expiresAt: string) {
  const at = new Date(Date.parse(expiresAt) + 9 * 60 * 60 * 1000);
  if (Number.isNaN(at.getTime())) return '';
  return `${at.getUTCMonth() + 1}월 ${at.getUTCDate()}일까지`;
}
