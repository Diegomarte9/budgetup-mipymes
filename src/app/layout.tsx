import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    template: '%s | BudgetUp',
    default: 'BudgetUp para MiPymes - Gestión Financiera',
  },
  description:
    'Plataforma de gestión financiera diseñada específicamente para micro y pequeñas empresas dominicanas. Controla ingresos, gastos y genera reportes profesionales.',
  keywords: [
    'finanzas',
    'mipymes',
    'contabilidad',
    'república dominicana',
    'gestión financiera',
    'pequeñas empresas',
    'DOP',
    'ITBIS',
  ],
  authors: [{ name: 'BudgetUp Team' }],
  creator: 'BudgetUp',
  openGraph: {
    type: 'website',
    locale: 'es_DO',
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: 'BudgetUp para MiPymes',
    description:
      'Gestión financiera simple y efectiva para MiPymes dominicanas',
    siteName: 'BudgetUp',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BudgetUp para MiPymes',
    description:
      'Gestión financiera simple y efectiva para MiPymes dominicanas',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='es-DO' suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
