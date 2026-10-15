import type { AdminMetrics } from '../dto/metrics.dto.ts';
import { apiRequest } from './api-client.ts';

export async function getMetrics(signal?: AbortSignal) {
  const metrics = await apiRequest<AdminMetrics>('/v1/admin/metrics', {
    signal,
  });
  if (!metrics || typeof metrics !== 'object' || !metrics.users)
    throw new Error('운영 지표 응답 형식이 올바르지 않아요.');
  return metrics;
}
