import "./globals.css";
import { Montserrat } from "next/font/google";
import Header from './components/Header';
import Footer from './components/Footer';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { FirebaseProvider } from '@/lib/contexts/FirebaseContext';

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
    <html lang="en" className={montserrat.variable} style={({ "--ro-scrollbar-height": "0px" } as unknown) as React.CSSProperties}>
      <head>
        <link rel="icon" href="/S5.png" sizes="any" />
        <link rel="apple-touch-icon" href="/S5.png" />
      </head>
      <body className={montserrat.className}>
        <FirebaseProvider>
          <AuthProvider>
            <div className="min-h-screen bg-gray-50">
              <Header />
              <main className="container mx-auto px-4 py-8">
                {children}
              </main>
              <Footer />
            </div>
          </AuthProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
} 