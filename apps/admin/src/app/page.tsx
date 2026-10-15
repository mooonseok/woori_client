import type { Metadata } from 'next';
import { DashboardContainer } from '@/sections/dashboard/dashboard-container';
// The layout's title template only applies to child segments, not this one.
export const metadata: Metadata = { title: '대시보드 · 우리 관리자' };
export default function Page() {
  return <DashboardContainer />;
}
