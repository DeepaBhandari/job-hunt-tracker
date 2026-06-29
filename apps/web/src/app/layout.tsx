import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { cn } from '@/lib/utils';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

const geist = { variable: GeistSans.variable };

export const metadata: Metadata = {
  title: 'Job Hunt Tracker',
  description: 'Track your job applications and manage your job search pipeline',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body className="antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
