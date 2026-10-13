export interface Invitation {
  id: string;
  code?: string;
  url?: string;
  expiresAt: string;
  maxUses: number;
  uses?: number;
  useCount?: number;
  revokedAt?: string | null;
}
export interface InviteInput {
  token?: string;
  code?: string;
}
