import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Text } from '@/components/atoms/ui';
import { NoticeEditorContainer } from '@/sections/notices/notice-editor-container';
export const metadata: Metadata = { title: '공지 편집' };
export default function Page() {
  return (
    <Suspense
      fallback={
        <Text className='console-state' role='status'>
          화면을 준비하고 있어요…
        </Text>
      }
    >
      <NoticeEditorContainer />
    </Suspense>
  );
}
