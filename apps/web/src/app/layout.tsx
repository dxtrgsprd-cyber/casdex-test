import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CASDEX',
  description: 'Security Integration Project Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
