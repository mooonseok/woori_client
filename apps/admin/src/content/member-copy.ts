import type { MemberAction } from '../dto/member.dto.ts';

export interface MemberActionCopy {
  title: string;
  consequences: readonly string[];
  confirmLabel: string;
  danger: boolean;
  // Strong confirm by checkbox (suspend). Delete uses a typed username.
  acknowledge?: string;
  done: string;
}
// Copy for each operator action on a member account. Names are only shown
// on screen; the audit log keeps the reason, never the names.
export function memberActionCopy(
  action: MemberAction,
  name: string
): MemberActionCopy {
  const who = name ? `${name} 회원` : '이 회원';
  if (action === 'rename')
    return {
      title: `${who}의 이름을 바꿀까요?`,
      consequences: [
        '바꾼 이름이 그룹과 댓글 등 회원이 보이는 모든 곳에 바로 적용돼요.',
        '사유는 감사로그에 남고, 이전 이름과 새 이름은 기록되지 않아요.',
      ],
      confirmLabel: '이름 바꾸기',
      danger: false,
      done: '이름을 바꿨어요.',
    };
  if (action === 'suspend')
    return {
      title: `${who}을 이용 정지할까요?`,
      consequences: [
        '본인의 접근만 막아요. 로그인, 사진 보기와 올리기, 알림을 쓸 수 없어요.',
        '이미 공유한 사진과 댓글은 그룹에 그대로 남아 다른 멤버가 계속 볼 수 있어요.',
        '모든 기기의 로그인 세션과 알림 구독이 해제돼요. 정지를 해제해도 복구되지 않아 회원이 다시 로그인하고 알림을 켜야 해요.',
      ],
      confirmLabel: '이용 정지',
      danger: true,
      acknowledge:
        '공유 콘텐츠는 남고, 로그인 세션과 알림 구독은 해제된다는 것을 확인했어요.',
      done: '이용 정지했어요. 회원은 지금부터 로그인할 수 없어요.',
    };
  if (action === 'unsuspend')
    return {
      title: `${who}의 이용 정지를 해제할까요?`,
      consequences: [
        '회원이 다시 로그인해 서비스를 이용할 수 있어요.',
        '정지할 때 해제된 로그인 세션과 알림 구독은 복구되지 않아요. 회원이 다시 로그인하고 알림을 켜야 해요.',
      ],
      confirmLabel: '정지 해제',
      danger: false,
      done: '이용 정지를 해제했어요. 회원이 다시 로그인하면 이용할 수 있어요.',
    };
  return {
    title: `${who}을 삭제할까요?`,
    consequences: [
      '회원 탈퇴와 같은 방식으로 처리되고 되돌릴 수 없어요.',
      '이름·아이디·이메일 같은 계정 정보가 지워지고, 그룹에 공유한 사진과 댓글은 ‘탈퇴한 회원’으로 남아요.',
      '회원의 문의와 차단 목록은 삭제되고, 회원이 작성한 신고 내용은 지워져요.',
      '회원이 소유한 그룹이 남아 있으면 삭제할 수 없어요.',
    ],
    confirmLabel: '회원 삭제',
    danger: true,
    done: '회원을 삭제했어요. 계정 정보가 지워졌어요.',
  };
}
export const OWNED_GROUPS_MESSAGE =
  '이 회원이 소유한 그룹이 남아 있어 삭제할 수 없어요. 그룹장이 소유권을 다른 멤버에게 넘기거나 그룹을 정리한 뒤 다시 시도해 주세요. 관리자 화면에는 그룹을 삭제하는 기능이 없어요.';
