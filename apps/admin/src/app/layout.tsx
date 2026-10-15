import type { Metadata } from 'next';
import { AdminShell } from '@/components/templates/admin-shell/admin-shell';
import '@/styles/globals.css';
import '@/styles/admin.css';

export const metadata: Metadata = {
  title: { default: '우리 관리자', template: '%s · 우리 관리자' },
  description: '우리 서비스 운영자 전용 관리 화면',
  // No admin URL (including the MFA setup screen) is sent as a Referer.
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='ko'>
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
