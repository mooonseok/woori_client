// Korean labels for audit actions the server writes (OpenAPI 0.16.0).
// Unknown actions are shown as their raw code, never hidden.
export const AUDIT_ACTION_LABELS: Readonly<Record<string, string>> = {
  ADMIN_LOGIN_SUCCEEDED: '로그인 성공',
  ADMIN_LOGIN_FAILED: '로그인 실패',
  ADMIN_LOCKED: '계정 잠금',
  ADMIN_MFA_ENABLED: '2단계 인증 등록',
  ADMIN_MFA_FAILED: '2단계 인증 실패',
  ADMIN_REAUTHENTICATED: '재인증',
  ADMIN_REAUTH_FAILED: '재인증 실패',
  ADMIN_LOGGED_OUT: '로그아웃',
  ADMIN_CREATED_BY_CLI: '관리자 생성 (CLI)',
  ADMIN_MFA_RESET_BY_CLI: '2단계 인증 초기화 (CLI)',
  ADMIN_DISABLED_BY_CLI: '관리자 비활성화 (CLI)',
  ADMIN_ENABLED_BY_CLI: '관리자 활성화 (CLI)',
  ADMIN_NOTICE_CREATED: '공지 작성',
  ADMIN_NOTICE_UPDATED: '공지 수정',
  ADMIN_NOTICE_PUBLISHED: '공지 게시',
  ADMIN_NOTICE_ARCHIVED: '공지 보관',
  ADMIN_INQUIRY_VIEWED: '문의 열람',
  ADMIN_INQUIRY_ANSWERED: '문의 답변',
  ADMIN_INQUIRY_STATUS_CHANGED: '문의 상태 변경',
  ADMIN_REPORT_VIEWED: '신고 열람',
  ADMIN_REPORT_REVIEWED: '신고 검토 시작',
  ADMIN_REPORT_DISMISSED: '신고 종료 (조치 없음)',
  ADMIN_REPORT_RESOLVED: '신고 조치',
  ADMIN_CONTENT_DELETED: '콘텐츠 삭제',
  ADMIN_USER_SUSPENDED: '회원 이용 정지',
  ADMIN_PHOTO_VIEWED: '사진 열람',
  ADMIN_COMMENT_VIEWED: '댓글 열람',
  ADMIN_USER_VIEWED: '회원 열람',
  ADMIN_USER_RENAMED: '회원 이름 변경',
  ADMIN_USER_UNSUSPENDED: '회원 정지 해제',
  ADMIN_USER_DELETED: '회원 삭제',
  ADMIN_GROUP_VIEWED: '그룹 열람',
};
export const AUDIT_TARGET_LABELS: Readonly<Record<string, string>> = {
  ADMIN: '관리자',
  USER: '회원',
  GROUP: '그룹',
  PHOTO: '사진',
  COMMENT: '댓글',
  NOTICE: '공지',
  INQUIRY: '문의',
  REPORT: '신고',
  ALBUM: '앨범',
};
function labelFrom(
  labels: Readonly<Record<string, string>>,
  value: string | null | undefined
) {
  if (!value) return '';
  // Own keys only: "constructor" or "toString" must not resolve to Object's.
  return Object.hasOwn(labels, value) ? labels[value] : value;
}
export function auditActionLabel(action: string | null | undefined) {
  return labelFrom(AUDIT_ACTION_LABELS, action) || '알 수 없는 작업';
}
export function auditTargetLabel(targetType: string | null | undefined) {
  return labelFrom(AUDIT_TARGET_LABELS, targetType);
}
export const AUDIT_ACTION_OPTIONS = Object.entries(AUDIT_ACTION_LABELS).map(
  ([value, label]) => ({ value, label })
);
export function isKnownAuditAction(value: string | null | undefined) {
  return !!value && Object.hasOwn(AUDIT_ACTION_LABELS, value);
}
// Metadata holds only enum/number/boolean values; show them as plain text.
export function auditMetadataLabel(
  metadata: Record<string, unknown> | null | undefined
) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
    return '';
  return Object.entries(metadata)
    .filter(([, value]) =>
      ['string', 'number', 'boolean'].includes(typeof value)
    )
    .slice(0, 6)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ');
}
