import type { NoticeStatus, NoticeVisibility } from '../dto/notice.dto.ts';
import type {
  InquiryCategory,
  InquiryStatus,
  MemberStatus,
} from '../dto/inquiry.dto.ts';
import type {
  ReportReason,
  ReportResolution,
  ReportStatus,
  ReportStatusFilter,
  ReportTargetType,
} from '../dto/report.dto.ts';

// Own keys only, raw code as fallback: a new server value stays visible.
export function labelOf(
  labels: Readonly<Record<string, string>>,
  value: string | null | undefined,
  empty = ''
) {
  if (!value) return empty;
  return Object.hasOwn(labels, value) ? labels[value] : value;
}

export const NOTICE_STATUS_LABELS: Readonly<Record<NoticeStatus, string>> = {
  DRAFT: '초안',
  PUBLISHED: '게시',
  ARCHIVED: '보관',
};
export const NOTICE_VISIBILITY_LABELS: Readonly<
  Record<NoticeVisibility, string>
> = {
  visible: '회원에게 보임',
  scheduled: '예약됨',
  hidden: '숨김',
};
// Same wording members see in the web app (apps/web content/service-guide).
export const INQUIRY_CATEGORY_LABELS: Readonly<
  Record<InquiryCategory, string>
> = {
  ACCOUNT: '계정·로그인',
  GROUP: '그룹·초대',
  PHOTO: '사진·앨범',
  NOTIFICATION: '알림',
  BUG: '오류 신고',
  OTHER: '기타',
};
export const INQUIRY_STATUS_LABELS: Readonly<Record<InquiryStatus, string>> = {
  RECEIVED: '접수됨',
  IN_PROGRESS: '확인 중',
  ANSWERED: '답변 완료',
  CLOSED: '종료',
};
export const MEMBER_STATUS_LABELS: Readonly<Record<MemberStatus, string>> = {
  ACTIVE: '이용 중',
  SUSPENDED: '이용 정지',
  DELETED: '탈퇴',
};
export const REPORT_REASON_LABELS: Readonly<Record<ReportReason, string>> = {
  INAPPROPRIATE: '부적절한 사진·내용',
  HARASSMENT: '괴롭힘·불쾌한 행동',
  PRIVACY: '개인정보 노출',
  SPAM: '스팸·광고',
  OTHER: '기타',
};
export const REPORT_STATUS_LABELS: Readonly<Record<ReportStatus, string>> = {
  RECEIVED: '접수됨',
  REVIEWING: '검토 중',
  RESOLVED: '조치 완료',
  DISMISSED: '조치 없음',
};
export const REPORT_FILTER_LABELS: Readonly<
  Record<ReportStatusFilter, string>
> = {
  OPEN: '처리 대기 (접수됨·검토 중)',
  ...REPORT_STATUS_LABELS,
};
export const REPORT_TARGET_LABELS: Readonly<Record<ReportTargetType, string>> =
  {
    PHOTO: '사진',
    COMMENT: '댓글',
    USER: '회원',
  };
// Operator-only; members see only the report status.
export const REPORT_RESOLUTION_LABELS: Readonly<
  Record<ReportResolution, string>
> = {
  CONTENT_DELETED: '콘텐츠 삭제',
  USER_SUSPENDED: '회원 이용 정지',
  NO_ACTION: '조치 없음',
};
export const GROUP_STATUS_LABELS: Readonly<Record<string, string>> = {
  ACTIVE: '운영 중',
  DELETING: '삭제 중',
  DELETED: '삭제됨',
};
export const PHOTO_STATUS_LABELS: Readonly<Record<string, string>> = {
  PENDING: '업로드 대기',
  PROCESSING: '처리 중',
  READY: '공개 중',
  FAILED: '처리 실패',
  DELETING: '삭제 중',
  DELETED: '삭제됨',
};
export const MEMBERSHIP_STATUS_LABELS: Readonly<Record<string, string>> = {
  ACTIVE: '그룹 참여 중',
  PENDING: '참여 대기',
  LEFT: '그룹 탈퇴',
  REMOVED: '그룹에서 내보냄',
};
export const COMMENT_KIND_LABELS: Readonly<Record<string, string>> = {
  GENERAL: '일반 댓글',
  PIN: '위치 댓글',
};
export type NoticeConfirmKind = 'publish' | 'schedule' | 'archive';
export function noticeConfirmCopy(
  kind: NoticeConfirmKind,
  scheduledLabel: string
) {
  if (kind === 'archive')
    return {
      title: '공지를 보관할까요?',
      consequences: [
        '회원에게 더 이상 보이지 않아요.',
        '보관한 공지는 언제든 다시 게시할 수 있어요.',
      ],
      confirmLabel: '보관',
      danger: true,
    };
  if (kind === 'schedule')
    return {
      title: '공지를 예약할까요?',
      consequences: [
        `${scheduledLabel}(KST)부터 모든 회원에게 보여요.`,
        '그 전까지는 회원에게 보이지 않아요.',
        '예약 시각 전에 보관하거나 다시 예약할 수 있어요.',
      ],
      confirmLabel: '예약하기',
      danger: false,
    };
  return {
    title: '공지를 지금 게시할까요?',
    consequences: [
      '저장된 제목과 본문이 바로 모든 회원에게 보여요.',
      '게시한 뒤에도 고칠 수 있고, 고치면 회원에게 수정일이 표시돼요.',
    ],
    confirmLabel: '지금 게시',
    danger: false,
  };
}
export const MEMBER_ROLE_LABELS: Readonly<Record<string, string>> = {
  OWNER: '그룹장',
  MEMBER: '멤버',
};
