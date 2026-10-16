import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/notifications/styles.css';
import '../../style.css';
import './globals.css';

import { Shell } from '@/components/shell';

// Self-hosted via next/font — no third-party font request at runtime.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'PiagamIPP',
  description: 'Medication Filling Order Waiting Time Tracker',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
