"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface LumberType {
  id: string;
  name: string;
  pricePerMBF: number;
}

interface ServicePrices {
  heatTreated: number;
  stamped: number;
  painted: number;
  binded: number;
  notched: number;
}

export default function Settings() {
  const [lumberTypes, setLumberTypes] = useState<LumberType[]>([
    { id: "1", name: "SYP", pricePerMBF: 400 },
    { id: "2", name: "Green Pine", pricePerMBF: 550 },
    { id: "3", name: "Recycled", pricePerMBF: 150 }
  ]);
  const [servicePrices, setServicePrices] = useState<ServicePrices>({
    heatTreated: 1.50,
    stamped: 0.25,
    painted: 2.00,
    binded: 0.75,
    notched: 0.50
  });

  const [nailPrice, setNailPrice] = useState(0.0078);
  const [overhead, setOverhead] = useState(1.50);

  const handleLumberPriceChange = (id: string, value: string) => {
    setLumberTypes(prev => prev.map(type => 
      type.id === id ? { ...type, pricePerMBF: parseFloat(value) || 0 } : type
    ));
  };

  const handleServicePriceChange = (service: keyof ServicePrices, value: string) => {
    setServicePrices(prev => ({
      ...prev,
      [service]: value === '' ? 0 : Number(value)
    }));
  };

  // Format currency with 2 decimal places
  const formatCurrency = (value: number, decimals: number = 2) => {
    return value.toFixed(decimals);
  };

  // Save settings to localStorage
  const handleSave = () => {
    localStorage.setItem('overhead', overhead.toString());
    localStorage.setItem('servicePrices', JSON.stringify(servicePrices));
    localStorage.setItem('lumberTypes', JSON.stringify(lumberTypes));
    localStorage.setItem('nailPrice', nailPrice.toString());
    
    // Dispatch custom event to notify settings change
    const event = new CustomEvent('settingsUpdated');
    window.dispatchEvent(event);
  };

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedOverhead = localStorage.getItem('overhead');
    const savedNailPrice = localStorage.getItem('nailPrice');
    const savedServicePrices = localStorage.getItem('servicePrices');
    const savedLumberTypes = localStorage.getItem('lumberTypes');
    
    if (savedOverhead) {
      setOverhead(Number(savedOverhead));
    }
    if (savedNailPrice) {
      setNailPrice(Number(savedNailPrice));
    }
    if (savedServicePrices) {
      setServicePrices(JSON.parse(savedServicePrices));
    }
    if (savedLumberTypes) {
      setLumberTypes(JSON.parse(savedLumberTypes));
    }
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm"
            >
              Save Settings
            </button>
            <Link 
              href="/" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Back to Calculator
            </Link>
          </div>
        </header>

        <div className="space-y-5">
          {/* Service Prices Section */}
          <section className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
            <h2 className="text-lg font-semibold bg-slate-800 text-white px-5 py-3">
              Service Prices (per pallet)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-slate-200">
              {Object.entries(servicePrices).map(([service, price], index) => (
                <div 
                  key={service} 
                  className={`flex items-center justify-between px-5 py-3 hover:bg-slate-50 ${
                    index % 2 === 0 && index < Object.entries(servicePrices).length - 1 ? 'sm:border-r sm:border-slate-200' : ''
                  }`}
                >
                  <label className="capitalize font-medium text-slate-700">
                    {service.replace(/([A-Z])/g, ' $1').trim()}:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => handleServicePriceChange(service as keyof ServicePrices, e.target.value)}
                      step="0.01"
                      min="0"
                      className="w-24 p-2 pl-7 border-2 border-slate-300 rounded-md text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 sm:border-t sm:border-slate-200">
                <label className="font-medium text-slate-700">Overhead:</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    value={overhead}
                    onChange={(e) => setOverhead(e.target.value === '' ? 0 : Number(e.target.value))}
                    step="0.01"
                    min="0"
                    className="w-24 p-2 pl-7 border-2 border-slate-300 rounded-md text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Lumber Types Section */}
          <section className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
            <h2 className="text-lg font-semibold bg-slate-800 text-white px-5 py-3">
              Lumber Types
            </h2>
            <div className="divide-y divide-slate-200">
              {lumberTypes.map((type) => (
                <div key={type.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <label className="font-medium text-slate-700">{type.name}:</label>
                  <div className="flex items-center">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        value={type.pricePerMBF}
                        onChange={(e) => handleLumberPriceChange(type.id, e.target.value)}
                        step="1"
                        className="w-28 p-2 pl-7 border-2 border-slate-300 rounded-md text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                      />
                    </div>
                    <span className="ml-2 text-sm text-slate-600 font-medium">per MBF</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Nail Price Section */}
          <section className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
            <h2 className="text-lg font-semibold bg-slate-800 text-white px-5 py-3">
              Nail Price
            </h2>
            <div className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
              <label className="font-medium text-slate-700">Price per nail:</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  value={formatCurrency(nailPrice, 4)}
                  onChange={(e) => setNailPrice(Number(e.target.value))}
                  step="0.0001"
                  className="w-28 p-2 pl-7 border-2 border-slate-300 rounded-md text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
} 