'use client';

import { useState } from 'react';
import PalletPricingTool from '@/components/PalletPricingTool';
import GlobalSettings from '@/components/GlobalSettings';

export default function Home() {
  const [activeTab, setActiveTab] = useState('pricing');

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Pallet Pricing Calculator</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'pricing'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pricing Tool
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Global Settings
          </button>
        </div>
      </div>

      {activeTab === 'pricing' ? <PalletPricingTool /> : <GlobalSettings />}
    </main>
  );
}
