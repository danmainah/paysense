import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/SessionProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PaySense | TechNairobi AI Assistant',
  description:
    'Ask questions about our products and pay via M-Pesa or card — all in the chat.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-white`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
