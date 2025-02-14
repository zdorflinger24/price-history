'use client';

import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-white border-t mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-32 h-16">
            <Image
              src="/images/logo.png"
              alt="Pallets of Texas"
              fill
              style={{ objectFit: 'contain' }}
              className="opacity-90"
            />
          </div>
          <div className="text-center">
            <p className="text-sm text-[#0066cc]">5711 W. Ledbetter Drive</p>
            <p className="text-sm text-[#0066cc]">Dallas, TX 75236</p>
            <p className="text-sm text-[#0066cc]">972-885-7935</p>
          </div>
          <div className="text-sm text-[#0066cc]">
            © {new Date().getFullYear()} Pallets of Texas. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
} 