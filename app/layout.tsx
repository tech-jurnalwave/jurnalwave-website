import type { Metadata } from 'next';
import { Inter, Literata, Montserrat } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const literata = Literata({
  subsets: ['latin'],
  variable: '--font-literata',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jurnalwave.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'JurnalWave - Portal Berita & Lifestyle Sukabumi',
    template: '%s | JurnalWave',
  },
  description: 'Portal berita, lifestyle, loker, otomotif, tech, dan informasi harian Sukabumi.',
  authors: [{ name: 'Redaksi JurnalWave' }],
  creator: 'JurnalWave',
  publisher: 'JurnalWave Media',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: siteUrl,
    siteName: 'JurnalWave',
    title: 'JurnalWave - Portal Berita & Lifestyle Sukabumi',
    description: 'Portal berita, lifestyle, loker, otomotif, tech, dan informasi harian Sukabumi.',
    images: [
      {
        url: '/logo-jurnal-wave.webp',
        width: 1200,
        height: 630,
        alt: 'JurnalWave Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JurnalWave - Portal Berita & Lifestyle Sukabumi',
    description: 'Portal berita, lifestyle, loker, otomotif, tech, dan informasi harian Sukabumi.',
    images: ['/logo-jurnal-wave.webp'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${literata.variable} ${montserrat.variable} light`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://tile.openstreetmap.org" />
        <link rel="dns-prefetch" href="https://tile.openstreetmap.org" />
      </head>
      <body
        className="bg-surface text-on-surface min-h-screen flex flex-col font-body-md antialiased relative overflow-x-clip"
        suppressHydrationWarning
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
