import type { Metadata } from 'next';
import { GroupsContainer } from '@/sections/groups/groups-container';
export const metadata: Metadata = { title: '그룹' };
export default function Page() {
  return <GroupsContainer />;
}
