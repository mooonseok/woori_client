import type { InquiryCategory, InquiryStatus } from '../dto/inquiry.dto.ts';
import type { GuideTopic, PrivacyGuide } from '../dto/service-guide.dto.ts';
import type {
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from '../dto/report.dto.ts';

export const inquiryCategoryLabels: Record<InquiryCategory, string> = {
  ACCOUNT: '계정·로그인',
  GROUP: '그룹·초대',
  PHOTO: '사진·앨범',
  NOTIFICATION: '알림',
  BUG: '오류 신고',
  OTHER: '기타',
};
export const inquiryStatusLabels: Record<InquiryStatus, string> = {
  RECEIVED: '접수됨',
  IN_PROGRESS: '확인 중',
  ANSWERED: '답변 완료',
  CLOSED: '종료',
};
export const reportReasonLabels: Record<ReportReason, string> = {
  INAPPROPRIATE: '부적절한 사진·내용',
  HARASSMENT: '괴롭힘·불쾌한 행동',
  PRIVACY: '개인정보 노출',
  SPAM: '스팸·광고',
  OTHER: '기타',
};
export const reportStatusLabels: Record<ReportStatus, string> = {
  RECEIVED: '접수됨',
  REVIEWING: '검토 중',
  RESOLVED: '조치 완료',
  DISMISSED: '조치 없음',
};
export const reportTargetLabels: Record<ReportTargetType, string> = {
  PHOTO: '사진',
  COMMENT: '댓글',
  USER: '회원',
};
// Confirmed policy: only the operator reviews; nobody else is told; nothing is auto-hidden.
export const reportPolicyNotice =
  '신고 내용은 운영자만 확인해요. 상대방과 그룹장에게 알리지 않아요.';
export const reportVisibilityNotice =
  '신고해도 내용이 자동으로 숨겨지지는 않아요. 처리 상태는 마이페이지 > 신고 내역에서 볼 수 있어요.';

// Describe only behavior that is implemented and verified in the current service.
export const helpTopics: GuideTopic[] = [
  {
    id: 'upload',
    title: '사진·동영상 올리기',
    points: [
      'JPEG·PNG·WebP 사진과 MP4·MOV 동영상을 올릴 수 있어요.',
      'HEIC(아이폰 기본 고효율 포맷)는 아직 지원하지 않아요. 아이폰에서는 설정 > 카메라 > 포맷에서 ‘높은 호환성’을 골라 찍거나, JPEG로 바꿔서 올려 주세요.',
      '사진 한 장은 30MB, 최대 6천만 화소까지, 한 번에 30개·합계 300MB까지 올릴 수 있어요.',
      '동영상은 하나에 1분·200MB까지예요. 서버에서 어느 기기에서나 재생되는 MP4로 변환해 보관하고, 원본 파일은 지워요.',
      '기기에서 서버로 보내는 동안에는 화면을 열어 두세요. 서버가 사진을 받은 뒤의 처리는 화면을 닫아도 계속돼요.',
      '올리지 못한 사진과 동영상은 다시 선택해서 올려 주세요.',
    ],
  },
  {
    id: 'original',
    title: '원본 다운로드',
    points: [
      '원본 파일에는 촬영 위치(GPS) 같은 사진 정보가 남아 있을 수 있어요. 내려받은 원본을 다른 곳에 공유할 때 확인해 주세요.',
      '앱에서 보는 사진과 썸네일은 위치 정보를 지운 사본이에요.',
      '동영상은 원본 대신 변환한 MP4를 내려받아요. 촬영 위치 정보는 지워져 있어요.',
    ],
  },
  {
    id: 'dates',
    title: '촬영일과 추억',
    points: [
      '사진 날짜는 직접 지정한 날짜, 사진 속 촬영 정보(EXIF), 올린 날짜 순서로 정해요.',
      '날짜는 사진을 올린 사람과 그룹장만 바꿀 수 있어요.',
      '추억에는 한국 시간 기준으로 예전 같은 날·같은 달에 찍은 사진이 보여요.',
      '추억에서 숨긴 사진은 나에게만 숨겨지고, 다시 보이게 되돌릴 수 있어요.',
    ],
  },
  {
    id: 'groups',
    title: '그룹',
    points: [
      '앨범 제목은 그룹장만 바꿀 수 있어요.',
      '그룹을 나가거나 내보내져도 올린 사진과 댓글은 그룹에 남고, 그룹에 들어갈 수만 없게 돼요.',
      '스스로 나간 경우에는 새 초대로 다시 참여할 수 있지만, 내보내진 경우에는 다시 참여할 수 없어요.',
      '그룹을 삭제하면 모든 구성원에게서 바로 사라지고 복구할 수 없어요.',
    ],
  },
  {
    id: 'notifications',
    title: '알림',
    points: [
      '알림은 기기와 브라우저마다 따로 켜야 해요.',
      '비밀번호나 이메일을 바꾸면 모든 기기에서 로그아웃돼요. 다시 로그인한 뒤 기기마다 알림을 다시 켜 주세요.',
    ],
  },
  {
    id: 'account-deletion',
    title: '회원 탈퇴',
    points: [
      '내가 그룹장인 그룹이 있으면 먼저 그룹장을 넘기거나 그룹을 삭제해야 탈퇴할 수 있어요.',
      '탈퇴해도 공유한 사진·댓글·반응은 그룹에 남고, 작성자는 ‘탈퇴한 회원’으로 표시돼요.',
      '계정 정보는 바로 삭제되어 복구할 수 없어요. 같은 아이디나 이메일로 다시 가입하면 새 계정이 되고, 이전 그룹 권한은 돌아오지 않아요.',
    ],
  },
  {
    id: 'report',
    title: '신고',
    points: [
      '다른 사람이 올린 사진과 댓글, 같은 그룹의 구성원을 신고할 수 있어요.',
      '신고 내용은 운영자만 확인해요. 상대방과 그룹장에게 알리지 않아요.',
      '신고해도 내용이 자동으로 숨겨지지는 않아요.',
      '처리 상태는 마이페이지 > 신고 내역에서 확인할 수 있어요.',
    ],
  },
  {
    id: 'block',
    title: '차단',
    points: [
      '차단하면 그 사람이 올린 사진·댓글·반응과 그 사람 활동 알림이 나에게만 보이지 않아요.',
      '상대방에게는 알리지 않고, 그룹 구성원과 권한도 바뀌지 않아요. 그룹에서 내보내기는 그룹장이 그룹 관리에서 할 수 있어요.',
      '차단할 때 그 사람 활동으로 받은 기존 알림은 지워져요. 차단을 해제하면 사진·댓글·반응은 다시 보이지만 지워진 알림은 돌아오지 않아요.',
      '차단한 사람은 마이페이지 > 차단 관리에서 확인하고 해제할 수 있어요.',
    ],
  },
  {
    id: 'inquiry',
    title: '문의',
    points: [
      '마이페이지 > 문의하기에서 문의를 보낼 수 있어요.',
      '보낸 문의의 진행 상태는 문의 내역에서 확인할 수 있어요.',
    ],
  },
];

// A factual summary of current handling, not a finalized legal policy.
// Operator facts stay null until they are decided; never fill them with placeholders.
export const privacyGuide: PrivacyGuide = {
  notice:
    '정식 개인정보 처리방침은 운영 정보가 확정되면 게시할 예정이에요. 아래는 현재 서비스가 정보를 다루는 방식이에요.',
  topics: [
    {
      id: 'collected',
      title: '처리하는 정보',
      points: [
        '계정 정보: 아이디, 이메일, 이름, 닉네임',
        '비밀번호: 원래 값으로 되돌릴 수 없는 형태로만 저장해요.',
        '로그인 세션과 알림 설정',
        '웹 푸시 연결 정보: 암호화해서 저장해요.',
        '올린 사진 원본(촬영 위치 등 사진 정보가 들어 있을 수 있어요)과 위치 정보를 지운 감상용 사본',
        '댓글, 위치 댓글, 반응',
        '문의 내용',
        '신고 내용: 신고한 대상, 사유, 추가로 적은 설명',
        '차단 목록: 나에게만 적용되고 나만 볼 수 있으며, 탈퇴하면 삭제돼요.',
      ],
    },
    {
      id: 'visibility',
      title: '누가 볼 수 있나요',
      points: [
        '사진·댓글·반응은 같은 그룹의 현재 구성원만 볼 수 있어요.',
        '그룹에는 닉네임이 표시돼요. 이름은 계정 복구와 본인의 계정 설정, 권한이 있는 운영자 관리에 사용해요.',
        '그룹을 나가거나 내보내진 사람은 더 이상 볼 수 없어요.',
        '신고 내용은 운영자만 확인해요. 상대방과 그룹장에게 알리지 않아요.',
      ],
    },
    {
      id: 'deletion',
      title: '탈퇴하면',
      points: [
        '아이디·이메일·이름·닉네임·비밀번호, 로그인·알림·인증 자료와 문의 내역은 바로 삭제돼요.',
        '공유한 사진·댓글·반응은 그룹에 남고, 작성자는 ‘탈퇴한 회원’으로 표시돼요.',
        '내가 한 신고는 대상·사유·처리 상태만 남고, 추가로 적은 설명은 지워져요.',
        '이미 다른 사람이 내려받은 파일은 회수할 수 없어요.',
      ],
    },
  ],
  operatorHeading: '운영 정보',
  operatorInfo: {
    operator: null,
    privacyOfficer: null,
    contact: null,
    retention: null,
    processors: null,
    effectiveDate: null,
  },
  operatorLabels: {
    operator: '운영 주체',
    privacyOfficer: '개인정보 보호 책임자',
    contact: '개인정보 문의처',
    retention: '항목별 보관 기간',
    processors: '처리 위탁',
    effectiveDate: '시행일',
  },
  pendingMessage: '운영 정보가 확정되면 안내해요.',
};
