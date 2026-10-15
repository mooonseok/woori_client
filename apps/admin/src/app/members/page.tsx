import type { Metadata } from 'next';
import { MembersContainer } from '@/sections/members/members-container';
export const metadata: Metadata = { title: '회원' };
export default function Page() {
  return <MembersContainer />;
}
