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
  // OpenAPI 0.23.0 mail outbox; null from servers before it.
  mail: AdminMailMetrics | null;
  // OpenAPI 0.23.0; absent from servers before it.
  queues?: AdminQueueMetrics;
  workers?: AdminWorkers;
  generatedAt: string;
}
export interface AdminMailMetrics {
  pending: number; // not sent yet (PENDING·RUNNING)
  failed24h: number;
  sent24h: number;
}
// due: jobs past their scheduled time; oldestDueSeconds: how far past.
export interface QueueLag {
  due: number;
  oldestDueSeconds: number | null;
}
export interface AdminQueueMetrics {
  photoProcessing: QueueLag;
  mediaCleanup: QueueLag;
  pushOutbox: QueueLag;
  pushDeliveries: QueueLag;
  mailOutbox: QueueLag;
  groupCleanup: QueueLag;
}
export type AdminWorkerJob = 'photo-processing' | 'video-transcode';
export interface AdminWorkerInstance {
  instanceId: string;
  startedAt: string;
  beatAgeSeconds: number;
  lastPassOk: boolean;
  videoReady: boolean; // ffmpeg/ffprobe usable
  // OpenAPI 0.25.0 (required there): the job running at the last heartbeat
  // and seconds since it started (DB clock), both null when idle. Absent
  // from servers before 0.25.0.
  busyJob?: AdminWorkerJob | null;
  busySeconds?: number | null;
}
export interface AdminWorkers {
  // A worker beat within staleAfterSeconds and its last pass succeeded.
  healthy: boolean;
  staleAfterSeconds: number;
  instances: AdminWorkerInstance[];
}
export interface QueueRow {
  id: keyof AdminQueueMetrics;
  label: string;
  due: string;
  oldest: string;
  attention: boolean;
}
export interface WorkerRow {
  id: string;
  started: string;
  startedAt: string;
  beat: string;
  lastPass: string;
  video: string;
  // "작업 중: 동영상 변환 (754초)", "없음" when idle, "" from older servers.
  busy: string;
  // Busy past BUSY_LONG_SECONDS: emphasized (text and attention).
  busyLong: boolean;
  attention: boolean;
}
export interface WorkerSummary {
  healthy: boolean;
  status: string;
  warnings: string[];
  // The server reports busy jobs (0.25.0+); otherwise the column is hidden.
  showBusy: boolean;
  rows: WorkerRow[];
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
