import "./globals.css";
import { Montserrat } from "next/font/google";
import Header from './components/Header';
import Footer from './components/Footer';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/contexts/SupabaseAuthContext';

const montserrat = Montserrat({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-montserrat',
});

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pallet Pricing Calculator',
  description: 'Calculate pallet prices with ease',
  icons: [
    {
      rel: 'icon',
      url: '/S5.png',
    },
    {
      rel: 'apple-touch-icon',
      url: '/S5.png',
    }
  ]
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={`${montserrat.variable} ${inter.className}`}>
      <body className="flex flex-col min-h-screen">
        <AuthProvider>
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
} 