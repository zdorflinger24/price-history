'use client';

import { useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase/firebase';
import { doc, setDoc, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, onSnapshot, Timestamp } from 'firebase/firestore';
import type { GlobalSettings } from '@/lib/types';

const defaultSettings: GlobalSettings = {
  lumberPrices: {
    'Recycled': { a: 10, b: 60, c: 350 },
    'Combo': { a: 8, b: 96, c: 500 },
    'Green Pine': { a: 5, b: 60, c: 650 },
    'SYP': { a: 4, b: 48, c: 700 },
    'Hardwood': { a: 2, b: 0, c: 850 }
  },
  buildIntricacyCosts: {
    'Automated': 0.75,
    'Manual Easy': 1,
    'Manual Intricate': 3
  },
  additionalCosts: {
    painted: 0.75,
    notched: 0.85,
    heatTreated: 1
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
  }
};

interface FirestoreData extends GlobalSettings {
  timestamp: Timestamp;
  type: string;
}

export default function GlobalSettings() {
  useEffect(() => {
    // Query for the most recent settings
    const q = query(
      collection(db, 'global_pricing'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data() as FirestoreData;
        
        // Update lumber prices
        Object.entries(data.lumberPrices || defaultSettings.lumberPrices).forEach(([type, prices]) => {
          Object.entries(prices).forEach(([key, value]) => {
            const input = document.querySelector(`input[data-type="${type}"][data-key="${key}"]`) as HTMLInputElement;
            if (input) input.value = String(value);
          });
        });

        // Update build intricacy costs
        Object.entries(data.buildIntricacyCosts || defaultSettings.buildIntricacyCosts).forEach(([key, value]) => {
          const input = document.querySelector(`input[data-section="buildIntricacyCosts"][data-key="${key}"]`) as HTMLInputElement;
          if (input) input.value = String(value);
        });

        // Update additional costs
        Object.entries(data.additionalCosts || defaultSettings.additionalCosts).forEach(([key, value]) => {
          const input = document.querySelector(`input[data-section="additionalCosts"][data-key="${key}"]`) as HTMLInputElement;
          if (input) input.value = String(value);
        });

        // Update transportation costs
        Object.entries(data.transportationCosts.baseDeliveryFee || defaultSettings.transportationCosts.baseDeliveryFee).forEach(([key, value]) => {
          const input = document.querySelector(`input[data-section="baseDeliveryFee"][data-key="${key}"]`) as HTMLInputElement;
          if (input) input.value = String(value);
        });

        const perMileInput = document.querySelector('input[data-section="perMileCharge"]') as HTMLInputElement;
        if (perMileInput) perMileInput.value = String(data.transportationCosts.perMileCharge || defaultSettings.transportationCosts.perMileCharge);

        // Update vehicle dimensions
        Object.entries(data.vehicleDimensions || defaultSettings.vehicleDimensions).forEach(([type, dims]) => {
          Object.entries(dims).forEach(([key, value]) => {
            const input = document.querySelector(`input[data-type="${type}"][data-dimension="${key}"]`) as HTMLInputElement;
            if (input) input.value = String(value);
          });
        });

        // Update timestamp display
        if (data.timestamp) {
          const timestampElement = document.getElementById('lastUpdated');
          if (timestampElement) {
            const date = data.timestamp.toDate();
            timestampElement.textContent = `Last updated: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSave = useCallback(async () => {
    const saveButton = document.querySelector('#saveButton') as HTMLButtonElement;
    const messageDiv = document.querySelector('#messageDiv') as HTMLDivElement;
    
    if (saveButton) saveButton.disabled = true;
    if (messageDiv) messageDiv.className = 'p-4 rounded-lg';
    
    try {
      const newSettings: GlobalSettings = {
        lumberPrices: {},
        buildIntricacyCosts: {},
        additionalCosts: {},
        transportationCosts: {
          baseDeliveryFee: {},
          perMileCharge: 0
        },
        vehicleDimensions: {}
      };

      // Collect lumber prices
      Object.keys(defaultSettings.lumberPrices).forEach(type => {
        newSettings.lumberPrices[type] = { a: 0, b: 0, c: 0 };
        ['a', 'b', 'c'].forEach(key => {
          const input = document.querySelector(`input[data-type="${type}"][data-key="${key}"]`) as HTMLInputElement;
          if (input) {
            newSettings.lumberPrices[type][key as keyof typeof newSettings.lumberPrices[typeof type]] = Number(input.value);
          }
        });
      });

      // Collect build intricacy costs
      Object.keys(defaultSettings.buildIntricacyCosts).forEach(key => {
        const input = document.querySelector(`input[data-section="buildIntricacyCosts"][data-key="${key}"]`) as HTMLInputElement;
        if (input) {
          (newSettings.buildIntricacyCosts as Record<string, number>)[key] = Number(input.value);
        }
      });

      // Collect additional costs
      Object.keys(defaultSettings.additionalCosts).forEach(key => {
        const input = document.querySelector(`input[data-section="additionalCosts"][data-key="${key}"]`) as HTMLInputElement;
        if (input) {
          (newSettings.additionalCosts as Record<string, number>)[key] = Number(input.value);
        }
      });

      // Collect transportation costs
      Object.keys(defaultSettings.transportationCosts.baseDeliveryFee).forEach(key => {
        const input = document.querySelector(`input[data-section="baseDeliveryFee"][data-key="${key}"]`) as HTMLInputElement;
        if (input) {
          newSettings.transportationCosts.baseDeliveryFee[key] = Number(input.value);
        }
      });

      const perMileInput = document.querySelector('input[data-section="perMileCharge"]') as HTMLInputElement;
      if (perMileInput) {
        newSettings.transportationCosts.perMileCharge = Number(perMileInput.value);
      }

      // Collect vehicle dimensions
      Object.keys(defaultSettings.vehicleDimensions).forEach(type => {
        newSettings.vehicleDimensions[type] = { length: 0, width: 0, height: 0, maxWeight: 0 };
        ['length', 'width', 'height', 'maxWeight'].forEach(key => {
          const input = document.querySelector(`input[data-type="${type}"][data-dimension="${key}"]`) as HTMLInputElement;
          if (input) {
            newSettings.vehicleDimensions[type][key as keyof typeof newSettings.vehicleDimensions[typeof type]] = Number(input.value);
          }
        });
      });

      // Create a formatted timestamp string for the document ID
      const now = new Date();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const year = now.getFullYear();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const timestampStr = `${month}-${day}-${year}-${hours}-${minutes}-${seconds}`;

      // Save to Firebase with formatted timestamp as document ID
      await setDoc(doc(db, 'global_pricing', timestampStr), {
        ...newSettings,
        timestamp: serverTimestamp(),
        type: 'current'
      });
      
      // Add to history with the same timestamp ID
      await setDoc(doc(db, 'global_pricing_history', timestampStr), {
        ...newSettings,
        timestamp: serverTimestamp(),
        type: 'update'
      });

      if (messageDiv) {
        messageDiv.textContent = 'Settings saved successfully!';
        messageDiv.className = 'p-4 rounded-lg bg-green-50 text-green-800';
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      if (messageDiv) {
        messageDiv.textContent = 'Error saving settings';
        messageDiv.className = 'p-4 rounded-lg bg-red-50 text-red-800';
      }
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  }, []);

  // Update all input classNames throughout the component
  const inputClassName = "w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Global Pricing Settings</h2>
          <p id="lastUpdated" className="text-sm text-gray-500 mt-1"></p>
        </div>
        <button
          id="saveButton"
          onClick={handleSave}
          className="px-6 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Save Settings
        </button>
      </div>

      <div id="messageDiv" className="hidden"></div>

      {/* Lumber Prices Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Lumber Prices</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(defaultSettings.lumberPrices).map(([type, prices]) => (
              <div key={type} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">{type}</h4>
                <div className="space-y-2">
                  {Object.entries(prices).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <label className="w-32 text-sm text-gray-600">
                        {key === 'c' ? 'Price per MBF:' : key.toUpperCase() + ':'}
                      </label>
                      <input
                        type="number"
                        defaultValue={value}
                        data-type={type}
                        data-key={key}
                        className={inputClassName}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
            {Object.entries(defaultSettings.buildIntricacyCosts).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <label className="w-32 text-sm text-gray-600">{key}:</label>
                <div className="relative w-full">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    defaultValue={value}
                    data-section="buildIntricacyCosts"
                    data-key={key}
                    className={inputClassName + " pl-6"}
                    step="0.01"
                  />
                </div>
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
            {Object.entries(defaultSettings.additionalCosts).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <label className="w-32 text-sm text-gray-600 capitalize">{key}:</label>
                <div className="relative w-full">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    defaultValue={value}
                    data-section="additionalCosts"
                    data-key={key}
                    className={inputClassName + " pl-6"}
                    step="0.01"
                  />
                </div>
              </div>
            ))}
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
                {Object.entries(defaultSettings.transportationCosts.baseDeliveryFee).map(([type, fee]) => (
                  <div key={type} className="flex items-center space-x-2">
                    <label className="w-32 text-sm text-gray-600">{type}:</label>
                    <div className="relative w-full">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        defaultValue={fee}
                        data-section="baseDeliveryFee"
                        data-key={type}
                        className={inputClassName + " pl-6"}
                        step="0.01"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Per Mile Charge</h4>
              <div className="flex items-center space-x-2">
                <label className="w-32 text-sm text-gray-600">Rate:</label>
                <div className="relative w-full">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    defaultValue={defaultSettings.transportationCosts.perMileCharge}
                    data-section="perMileCharge"
                    className={inputClassName + " pl-6"}
                    step="0.01"
                  />
                </div>
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
            {Object.entries(defaultSettings.vehicleDimensions).map(([type, dims]) => (
              <div key={type} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">{type}</h4>
                <div className="space-y-2">
                  {Object.entries(dims).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <label className="w-24 text-sm text-gray-600 capitalize">{key}:</label>
                      <input
                        type="number"
                        defaultValue={value}
                        data-type={type}
                        data-dimension={key}
                        className={inputClassName}
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