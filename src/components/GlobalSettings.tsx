'use client';

import { useState, useEffect, Suspense } from 'react';
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/lib/contexts/FirebaseContext';
import type { GlobalSettings } from '@/lib/types';

const defaultSettings: GlobalSettings = {
  lumberPrices: {
    'Recycled': { a: 10, b: 60, c: 350 },
    'Combo': { a: 8, b: 96, c: 500 },
    'Green Pine': { a: 5, b: 60, c: 650 },
    'SYP': { a: 4, b: 48, c: 700 },
  },
  buildIntricacyCosts: {
    'Automated': 0.75,
    'Manual Easy': 1,
    'Manual Intricate': 3
  },
  additionalCosts: {
    painted: 0.75,
    notched: 0.85,
    heatTreated: 1,
    bands: 0.10
  },
  transportationCosts: {
    baseDeliveryFee: {
      'Truck': 100,
      'Dry Van': 200,
      'Flatbed': 250
    },
    perMileCharge: 2
  },
  vehicleDimensions: {
    'Truck': { length: 408, width: 96, height: 96, maxWeight: 10000 },
    'Dry Van': { length: 636, width: 102, height: 110, maxWeight: 45000 },
    'Flatbed': { length: 636, width: 102, height: 0, maxWeight: 48000 }
  },
  fastenerCosts: {
    standard: 0.0046,
    automatic: 0.0065,
    specialty: 0.01
  },
  lumberProcessingCost: 0.05
};

function GlobalSettingsContent() {
  const { db } = useFirebase();
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (db) {
      initializeSettings();
    }
  }, [db]);

  const initializeSettings = async () => {
    if (!db) {
      setMessage({ type: 'warning', text: 'Working with default settings until database connection is established.' });
      return;
    }
    
    setIsLoading(true);
    try {
      const docRef = doc(db, 'global_pricing', 'current');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSettings(docSnap.data() as GlobalSettings);
      } else {
        // If no settings exist, save the default settings
        await setDoc(docRef, defaultSettings);
        
        // Add to history
        const historyRef = collection(db, 'global_pricing');
        await addDoc(historyRef, {
          ...defaultSettings,
          timestamp: serverTimestamp(),
          type: 'initial'
        });

        setSettings(defaultSettings);
        setMessage({ type: 'success', text: 'Default settings initialized successfully!' });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Error loading settings. Using default values.' });
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!db) {
      setMessage({ type: 'error', text: 'Cannot save settings - database connection not available.' });
      return;
    }

    setIsSaving(true);
    try {
      const settingsToSave = {
        ...settings,
        lumberPrices: Object.fromEntries(Object.entries(settings.lumberPrices).filter(([key]) => key !== 'Hardwood'))
      };
      // First, update the current settings
      const currentRef = doc(db, 'global_pricing', 'current');
      await setDoc(currentRef, settingsToSave);

      // Then, add a new document to track the history with timestamp
      const historyRef = collection(db, 'global_pricing');
      await addDoc(historyRef, {
        ...settingsToSave,
        timestamp: serverTimestamp(),
        type: 'update'
      });

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Error saving settings' });
    }
    setIsSaving(false);
  };

  const handleChange = (
    section: keyof typeof settings,
    key: string,
    subKey: string,
    value: number
  ) => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      if (section === 'transportationCosts' && key === 'baseDeliveryFee') {
        newSettings.transportationCosts.baseDeliveryFee[subKey] = value;
      } else if (section === 'transportationCosts' && key === 'perMileCharge') {
        newSettings.transportationCosts.perMileCharge = value;
      } else if (section === 'lumberPrices') {
        (newSettings.lumberPrices[key] as any)[subKey] = value;
      } else if (section === 'vehicleDimensions') {
        (newSettings.vehicleDimensions[key] as any)[subKey] = value;
      } else if (section === 'buildIntricacyCosts') {
        newSettings.buildIntricacyCosts[key] = value;
      } else if (section === 'additionalCosts') {
        (newSettings.additionalCosts as any)[key] = value;
      } else if (section === 'fastenerCosts') {
        (newSettings.fastenerCosts as any)[key] = value;
      } else if (section === 'lumberProcessingCost') {
        newSettings.lumberProcessingCost = value;
      }
      return newSettings;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Global Pricing Settings</h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`px-6 py-2 rounded-lg font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
            isSaving
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
          }`}
        >
          {isSaving ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </div>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg flex items-center ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {message.text}
        </div>
      )}

      {/* Lumber Prices Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Lumber Prices</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(settings.lumberPrices).map(([type, prices]) => (
                <div key={type} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{type}</h4>
                  <div className="space-y-2">
                    {Object.entries(prices).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <label className="w-32 text-sm text-gray-600">{key === 'c' ? 'Price per MBF:' : key.toUpperCase() + ':'}</label>
                        <div className="relative w-full">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => handleChange('lumberPrices', type, key, Number(e.target.value))}
                            className="w-full pl-8 border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            step="0.0001"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h4 className="font-medium text-gray-900 mb-3">Lumber Processing</h4>
              <div className="flex items-center space-x-2">
                <label className="w-32 text-sm text-gray-600">Cost per piece:</label>
                <div className="relative w-full">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                  <input
                    type="number"
                    value={settings.lumberProcessingCost || 0.05}
                    onChange={(e) => handleChange('lumberProcessingCost', '', '', Number(e.target.value))}
                    className="w-full pl-8 border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    step="0.0001"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Build Intricacy Costs Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Build Intricacy Costs</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(settings.buildIntricacyCosts).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <label className="w-32 text-sm text-gray-600">{key}:</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleChange('buildIntricacyCosts', key, '', Number(e.target.value))}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  step="0.01"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Costs Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Additional Costs</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(settings.additionalCosts).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <label className="w-32 text-sm text-gray-600">{key.charAt(0).toUpperCase() + key.slice(1)}:</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleChange('additionalCosts', key, '', Number(e.target.value))}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  step="0.01"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fastener Costs Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Fastener Costs</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <label className="w-32 text-sm text-gray-600">Standard Nail:</label>
              <div className="relative w-full">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                <input
                  type="number"
                  value={settings.fastenerCosts?.standard || 0.0046}
                  onChange={(e) => handleChange('fastenerCosts', 'standard', '', Number(e.target.value))}
                  className="w-full pl-8 border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  step="0.0001"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label className="w-32 text-sm text-gray-600">Automatic Nail:</label>
              <div className="relative w-full">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                <input
                  type="number"
                  value={settings.fastenerCosts?.automatic || 0.0065}
                  onChange={(e) => handleChange('fastenerCosts', 'automatic', '', Number(e.target.value))}
                  className="w-full pl-8 border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  step="0.0001"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label className="w-32 text-sm text-gray-600">Specialty Nail:</label>
              <div className="relative w-full">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                <input
                  type="number"
                  value={settings.fastenerCosts?.specialty || 0.01}
                  onChange={(e) => handleChange('fastenerCosts', 'specialty', '', Number(e.target.value))}
                  className="w-full pl-8 border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  step="0.0001"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transportation Costs Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Transportation Costs</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Base Delivery Fees</h4>
              <div className="space-y-2">
                {Object.entries(settings.transportationCosts.baseDeliveryFee).map(([type, fee]) => (
                  <div key={type} className="flex items-center space-x-2">
                    <label className="w-32 text-sm text-gray-600">{type}:</label>
                    <input
                      type="number"
                      value={fee}
                      onChange={(e) => handleChange('transportationCosts', 'baseDeliveryFee', type, Number(e.target.value))}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Per Mile Charge</h4>
              <div className="flex items-center space-x-2">
                <label className="w-32 text-sm text-gray-600">Rate:</label>
                <input
                  type="number"
                  value={settings.transportationCosts.perMileCharge}
                  onChange={(e) => handleChange('transportationCosts', 'perMileCharge', '', Number(e.target.value))}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Dimensions Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Vehicle Dimensions</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Object.entries(settings.vehicleDimensions).map(([type, dims]) => (
              <div key={type} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">{type}</h4>
                <div className="space-y-2">
                  {Object.entries(dims).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <label className="w-32 text-sm text-gray-600 capitalize">{key}:</label>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => handleChange('vehicleDimensions', type, key, Number(e.target.value))}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Client-side only wrapper
export default function GlobalSettings() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    }>
      <GlobalSettingsContent />
    </Suspense>
  );
} 