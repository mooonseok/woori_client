import type {
  NotificationItem,
  NotificationSettingRow,
} from '../dto/notification.dto';

export const notificationRows: NotificationSettingRow[] = [
  {
    key: 'master',
    label: '활동 푸시',
    description: '새 사진과 댓글, 반응을 알려드려요.',
  },
  {
    key: 'photos',
    label: '새 사진',
    description: '가족이 앨범에 올린 사진을 모아서 알려드려요.',
  },
  {
    key: 'comments',
    label: '댓글과 위치 댓글',
    description: '내 사진과 내가 참여한 대화의 새 댓글이에요.',
  },
  {
    key: 'reactions',
    label: '좋아요와 다른 반응',
    description: '내 사진에 달린 반응을 5분 동안 모아요.',
  },
];
export const notificationQuietRow: NotificationSettingRow = {
  key: 'quiet',
  label: '방해금지 시간 사용',
  description: '한국 표준시(KST)를 기준으로 해요.',
};
export const notificationPreviewRow: NotificationSettingRow = {
  key: 'preview',
  label: '잠금 화면에 내용 표시',
  description: '켜면 이름과 소식 내용이 다른 사람에게 보일 수 있어요.',
};
export function createNotificationFixtures(now: number): NotificationItem[] {
  return [
    {
      id: 'sample-photos',
      type: 'photos',
      photoId: 'p289',
      groupId: 'g1',
      title: '하은님이 가을 단풍 나들이에 사진을 올렸어요',
      timestamp: now - 8 * 60000,
      createdAt: now - 8 * 60000,
      read: false,
      count: 1,
    },
    {
      id: 'sample-comment',
      type: 'comment',
      photoId: 'p129',
      groupId: 'g1',
      title: '성호님이 댓글을 남겼어요: 다음에 또 가자!',
      timestamp: now - 40 * 60000,
      createdAt: now - 40 * 60000,
      read: false,
      count: 1,
    },
    {
      id: 'sample-reaction',
      type: 'reaction',
      photoId: 'p129',
      groupId: 'g1',
      title: '정미님이 사진에 마음을 남겼어요',
      timestamp: now - 25 * 3600000,
      createdAt: now - 25 * 3600000,
      read: true,
      count: 1,
    },
  ];
}
