import type { Metadata } from 'next';
import { NoticesContainer } from '@/sections/notices/notices-container';
export const metadata: Metadata = { title: '공지' };
export default function Page() {
  return <NoticesContainer />;
}
