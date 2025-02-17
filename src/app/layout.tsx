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
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={montserrat.variable} style={({ "--ro-scrollbar-height": "0px" } as unknown) as React.CSSProperties}>
      <head>
        {/* ... existing code ... */}
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