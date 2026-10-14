import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '우리 관리자',
  description: '우리 가족의 사진을 모으는 공간',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='ko'>
      <body>{children}</body>
    </html>
  );
}
