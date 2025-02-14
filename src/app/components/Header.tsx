'use client';

import Image from 'next/image';

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="relative w-48 h-24">
              <Image
                src="/images/logo.png"
                alt="Pallets of Texas"
                fill
                style={{ objectFit: 'contain' }}
                priority
                className="transform hover:scale-105 transition-transform duration-200"
              />
            </div>
            <div className="text-[#0066cc] font-medium">
              Custom Pallet Manufacturer & Supplier
            </div>
          </div>
          <div className="text-sm font-medium text-[#0066cc]">
            Pallet Pricing System
          </div>
        </div>
      </div>
    </header>
  );
} 