'use client';

import { useState } from 'react';
import PalletPricingTool from './components/PalletPricingTool';
import GlobalSettings from './components/GlobalSettings';

export default function Home() {
  const [activeTab, setActiveTab] = useState('pricing');

  return (
    <div className="max-w-7xl mx-auto">
      {/* Tab Navigation */}
      <nav className="flex space-x-4 mb-8" aria-label="Tabs">
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
            activeTab === 'pricing'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13zm.75-8.25V5.5a.75.75 0 00-1.5 0v2.75c0 .414.336.75.75.75h2.75a.75.75 0 000-1.5h-2z" clipRule="evenodd" />
            </svg>
            <span>Pallet Pricing Tool</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
            activeTab === 'settings'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            <span>Global Settings</span>
          </div>
        </button>
      </nav>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className={`transition-all duration-200 ${activeTab === 'pricing' ? 'opacity-100' : 'opacity-0 hidden'}`}>
          <PalletPricingTool />
        </div>
        <div className={`transition-all duration-200 ${activeTab === 'settings' ? 'opacity-100' : 'opacity-0 hidden'}`}>
          <GlobalSettings />
        </div>
      </div>
    </div>
  );
}
