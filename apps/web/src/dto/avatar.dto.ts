export interface AvatarUploadTicket {
  uploadId: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresAt: string;
}
export type AvatarSize = 128 | 512;
// Profile photo sheet: choose → (preparing) → ready → saving, or removing.
export type AvatarPhase =
  'idle' | 'preparing' | 'ready' | 'saving' | 'removing';
