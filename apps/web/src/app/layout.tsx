import type { Metadata } from 'next';
import { AppShell } from '@/components/templates/app-shell/app-shell';
import '@/styles/globals.css';
import '@/styles/account.css';
export const metadata: Metadata = {
  referrer: 'no-referrer',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: '우리', statusBarStyle: 'default' },
  icons: { apple: '/icons/icon-192.png', icon: '/icons/icon-192.png' },
  title: '우리 — 가족 사진 앨범',
  description: '함께한 순간을 함께 간직하는 가족 사진 앨범',
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
