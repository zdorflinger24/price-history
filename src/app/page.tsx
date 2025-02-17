'use client';

import { useState } from 'react';
import BasicQuoteCalculator from "@/app/components/BasicQuoteCalculator";
import SettingsPage from "@/components/GlobalSettings";
import AdvancedCalculator from "@/app/components/AdvancedCalculator";
import { Calculator, Settings as SettingsIcon, BarChart2, Truck } from 'lucide-react';
import dynamic from 'next/dynamic';
import AbacusIcon from "@/app/components/AbacusIcon";

const QuotesPage = dynamic(() => import("@/app/general-quote-information/page"), { ssr: false });

export default function Home() {
  const [activeTab, setActiveTab] = useState('quotes');

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Pallet Quote Manager</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('quotes')}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === 'quotes'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="General Quote Information"
          >
            <Truck className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === 'pricing'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Basic Quote Calculator"
          >
            <AbacusIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === 'advanced'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Advanced Pricing Calculator"
          >
            <Calculator className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {activeTab === 'quotes' ? (
        <QuotesPage />
      ) : activeTab === 'pricing' ? (
        <BasicQuoteCalculator />
      ) : activeTab === 'advanced' ? (
        <AdvancedCalculator />
      ) : activeTab === 'settings' ? (
        <SettingsPage />
      ) : null}
    </main>
  );
}
