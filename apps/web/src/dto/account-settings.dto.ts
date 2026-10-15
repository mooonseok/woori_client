export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}
export interface EmailChangeInput {
  currentPassword: string;
  newEmail: string;
}

export interface AccountDeletionPreview {
  ownedGroups: { id: string; name: string }[];
  ownedGroupCount: number;
  canDelete: boolean;
}
export interface AccountDeletionInput {
  currentPassword: string;
  confirmation: '탈퇴';
}
