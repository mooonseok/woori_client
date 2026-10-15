import type { ReportAction, ReportTargetType } from '../dto/report.dto.ts';

export interface ActionCopy {
  // Option label inside the action dialog.
  option: string;
  title: string;
  // Every consequence the operator must read before confirming.
  consequences: readonly string[];
  confirmLabel: string;
  // Text of the acknowledgement checkbox (strong confirm).
  acknowledge: string;
  irreversible: boolean;
}
const TARGET_NOUN: Readonly<Record<ReportTargetType, string>> = {
  PHOTO: '사진',
  COMMENT: '댓글',
  USER: '회원',
};
const SAME_TARGET =
  '같은 대상에 남아 있는 다른 처리 대기 신고도 함께 같은 조치로 종료돼요.';
const CLOSED_FOREVER = '종료한 신고는 다시 바꿀 수 없어요.';
// Copy for the strong confirm of each operator action on a report. null
// when the action does not apply to the target (e.g. deleting a member).
export function reportActionCopy(
  action: ReportAction,
  targetType: ReportTargetType,
  targetUserName: string
): ActionCopy | null {
  const who = targetUserName ? `${targetUserName} 회원` : '대상 회원';
  if (action === 'DELETE_CONTENT') {
    if (targetType === 'USER') return null;
    const noun = TARGET_NOUN[targetType];
    return {
      option: `${noun} 삭제`,
      title: `신고된 ${noun}을 삭제할까요?`,
      consequences: [
        `${noun}이 그룹에서 바로 사라지고 되돌릴 수 없어요.`,
        targetType === 'PHOTO'
          ? '사진 파일과 관련 알림도 정리되고 그룹 저장 용량이 반환돼요.'
          : '댓글은 회원에게 더 이상 보이지 않아요.',
        SAME_TARGET,
        CLOSED_FOREVER,
      ],
      confirmLabel: `${noun} 삭제`,
      acknowledge: `삭제한 ${noun}은 복구할 수 없다는 것을 확인했어요.`,
      irreversible: true,
    };
  }
  return {
    option: `${who} 이용 정지`,
    title: `${who}을 이용 정지할까요?`,
    consequences: [
      '모든 기기에서 바로 로그아웃되고 다시 로그인할 수 없어요.',
      '알림 구독과 아직 쓰지 않은 이메일 인증 링크가 모두 취소돼요.',
      '이미 올린 사진과 댓글은 그룹에 그대로 남아요.',
      '이 화면에서는 정지를 해제할 수 없어요. 해제는 회원 관리 기능에서 제공될 예정이에요.',
      SAME_TARGET,
      CLOSED_FOREVER,
    ],
    confirmLabel: '이용 정지',
    acknowledge: `${who}의 모든 로그인이 끊긴다는 것을 확인했어요.`,
    irreversible: false,
  };
}
export const DISMISS_COPY = {
  title: '조치 없이 신고를 종료할까요?',
  consequences: [
    '신고한 회원에게는 ‘조치 없음’으로 표시돼요.',
    '신고된 콘텐츠와 회원에게는 아무 변화가 없어요.',
    CLOSED_FOREVER,
  ],
  confirmLabel: '조치 없음으로 종료',
} as const;
// Result line after a resolve/dismiss, including same-target closures.
export function reportResultMessage(
  outcome: ReportAction | 'DISMISS',
  targetType: ReportTargetType,
  alsoResolved: number | undefined
) {
  const base =
    outcome === 'DISMISS'
      ? '조치 없이 신고를 종료했어요.'
      : outcome === 'DELETE_CONTENT'
        ? `신고된 ${TARGET_NOUN[targetType]}을 삭제하고 신고를 종료했어요.`
        : '대상 회원을 이용 정지하고 신고를 종료했어요.';
  const extra =
    typeof alsoResolved === 'number' && alsoResolved > 0
      ? ` 같은 대상의 다른 신고 ${alsoResolved}건도 함께 종료했어요.`
      : '';
  return base + extra;
}
