import type { Metadata } from 'next';
import { ReportsContainer } from '@/sections/reports/reports-container';
export const metadata: Metadata = { title: '신고' };
export default function Page() {
  return <ReportsContainer />;
}
