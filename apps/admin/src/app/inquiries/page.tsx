import type { Metadata } from 'next';
import { InquiriesContainer } from '@/sections/inquiries/inquiries-container';
export const metadata: Metadata = { title: '문의' };
export default function Page() {
  return <InquiriesContainer />;
}
