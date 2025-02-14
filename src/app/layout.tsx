import "./globals.css";
import { Montserrat } from "next/font/google";
import Header from './components/Header';
import Footer from './components/Footer';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import type { ReactNode } from 'react';

const montserrat = Montserrat({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-montserrat',
});

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className={montserrat.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
} 