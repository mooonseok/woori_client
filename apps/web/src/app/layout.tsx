import type { Metadata } from 'next';
import { AppShell } from '@/components/templates/app-shell/app-shell';
import '@/styles/globals.css';
import '@/styles/account.css';
import '@/styles/service.css';
import '@/styles/gallery-v41.css';
import '@/styles/reactions.css';
import '@/styles/entry.css';
import '@/styles/media-fallback.css';
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
