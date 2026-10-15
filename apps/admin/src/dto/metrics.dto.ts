export interface AdminMetrics {
  users: { active: number; suspended: number; deleted: number };
  groups: { active: number; deleting: number };
  photoProcessing: { queued: number; processing: number; failed24h: number };
  mediaCleanup: { pending: number; retrying: number };
  push: { pendingDeliveries: number; failed24h: number };
  outbox: { pending: number };
  storage: { usedBytes: number; quotaBytes: number };
  reports: { open: number };
  inquiries: { open: number };
  // Not available until the W07 mail outbox; null until then.
  mail: Record<string, number> | null;
  generatedAt: string;
}
export interface MetricItem {
  label: string;
  value: string;
  // Extra context such as a percentage or a link target.
  note?: string;
  href?: string;
  attention?: boolean;
}
export interface MetricGroup {
  id: string;
  title: string;
  items: MetricItem[];
  // Shown instead of items when the source is not available yet.
  unavailable?: string;
}
