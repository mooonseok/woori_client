export interface AuditLogAdmin {
  id: string;
  displayName: string;
}
export interface AuditLogEntry {
  id: string;
  admin: AuditLogAdmin | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}
export interface AuditLogQuery {
  cursor: string | null;
  action: string | null;
  limit?: number;
}
