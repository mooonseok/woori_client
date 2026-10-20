import type { Metadata } from 'next';
import { AppShell } from '@/components/templates/app-shell/app-shell';
import '@/styles/globals.css';
import '@/styles/account.css';
import '@/styles/service.css';
import '@/styles/gallery-v41.css';
import '@/styles/reactions.css';
import '@/styles/entry.css';
import '@/styles/media-fallback.css';
import '@/styles/group-start.css';
import '@/styles/invite-sheet.css';
import '@/styles/avatar-sheet.css';
export const metadata: Metadata = {
  referrer: 'no-referrer',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: '우리', statusBarStyle: 'default' },
  icons: {
    apple: '/icons/apple-touch-v2.png',
    icon: [
      { url: '/icons/favicon-v2.svg', type: 'image/svg+xml' },
      { url: '/icons/favicon-v2.ico', sizes: 'any' },
    ],
  },
  title: '우리 — 함께하는 앨범',
  description: '사진과 동영상으로 함께한 순간을 나누는 공유 앨범',
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='ko'>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
