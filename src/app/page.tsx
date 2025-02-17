'use client';

import { useState } from 'react';
import PalletPricingTool from '@/components/PalletPricingTool';
import GlobalSettings from '@/components/GlobalSettings';
import AdvancedCalculator from '@/components/AdvancedCalculator';
import { Calculator, Settings, BarChart2 } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('pricing');

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Pallet Pricing Calculator</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('pricing')}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === 'pricing'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Quick Calculator"
          >
            <Calculator className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === 'advanced'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Advanced Calculator"
          >
            <BarChart2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Global Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {activeTab === 'pricing' ? (
        <PalletPricingTool />
      ) : activeTab === 'advanced' ? (
        <AdvancedCalculator />
      ) : (
        <GlobalSettings />
      )}
    </main>
  );
}
