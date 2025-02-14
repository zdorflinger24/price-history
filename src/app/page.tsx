'use client';

import { useState, type ReactNode } from 'react';
import PalletPricingTool from '@/components/PalletPricingTool';
import GlobalSettings from './components/GlobalSettings';

export default function Home() {
  const [activeTab, setActiveTab] = useState('pricing');

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Pallet Pricing Calculator</h1>
      <PalletPricingTool />
    </main>
  );
}
