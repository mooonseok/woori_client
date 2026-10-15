export interface AuditLogRowViewModel {
  id: string;
  domId: string;
  adminName: string;
  knownAdmin: boolean;
  action: string;
  actionLabel: string;
  target: string;
  targetId: string;
  reason: string;
  details: string;
  time: string;
  dateTime: string;
}
