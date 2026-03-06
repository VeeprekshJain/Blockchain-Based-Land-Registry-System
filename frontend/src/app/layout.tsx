import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Land Registry | Blockchain-Powered Ownership Records',
    template: '%s | Land Registry',
  },
  description:
    'A secure, transparent, and tamper-proof land ownership registry system powered by blockchain technology.',
  keywords: ['land registry', 'blockchain', 'property ownership', 'smart contracts'],
  authors: [{ name: 'Land Registry Team' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <Navbar />
        <main>{children}</main>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'var(--font-inter)' },
          }}
        />
      </body>
    </html>
  );
}
