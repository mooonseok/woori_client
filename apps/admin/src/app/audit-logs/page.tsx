import type { Metadata } from 'next';
import { AuditLogsContainer } from '@/sections/audit-logs/audit-logs-container';
export const metadata: Metadata = { title: '감사로그' };
export default function Page() {
  return <AuditLogsContainer />;
}
