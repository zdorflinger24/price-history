'use client';

import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase/supabaseClient';
import type { Settings } from '@/lib/types/supabase';

const defaultSettings: Omit<Settings, 'id' | 'created_at' | 'updated_at'> = {
  lumber_prices: {
    'Recycled': { a: 10, b: 60, c: 350 },
    'Combo': { a: 8, b: 96, c: 500 },
    'Green Pine': { a: 5, b: 60, c: 650 },
    'SYP': { a: 4, b: 48, c: 700 },
    'Hardwood': { a: 2, b: 0, c: 850 }
  },
  build_intricacy_costs: {
    'Automated': 0.75,
    'Manual Easy': 1,
    'Manual Intricate': 3
  },
  additional_costs: {
    painted: 0.75,
    notched: 0.85,
    heat_treated: 1
  },
  transportation_costs: {
    base_delivery_fee: {
      'Dry Van': 200,
      'Flatbed': 250
    },
    per_mile_charge: 2
  },
  vehicle_dimensions: {
    'Dry Van': { length: 636, width: 102, height: 110, max_weight: 45000 },
    'Flatbed': { length: 636, width: 102, height: 0, max_weight: 48000 }
  },
  lumber_processing_cost: 0.05
};

export default function GlobalSettings() {
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: settings, error } = await supabase
          .from('settings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;

        if (settings) {
          const typedSettings = settings as Settings;
          
          // Update lumber prices
          Object.entries(typedSettings.lumber_prices || defaultSettings.lumber_prices).forEach(([type, prices]) => {
            Object.entries(prices).forEach(([key, value]) => {
              const input = document.querySelector(`input[data-type="${type}"][data-key="${key}"]`) as HTMLInputElement;
              if (input) input.value = String(value);
            });
          });

          // Update build intricacy costs
          Object.entries(typedSettings.build_intricacy_costs || defaultSettings.build_intricacy_costs).forEach(([key, value]) => {
            const input = document.querySelector(`input[data-section="buildIntricacyCosts"][data-key="${key}"]`) as HTMLInputElement;
            if (input) input.value = String(value);
          });

          // Update additional costs
          Object.entries(typedSettings.additional_costs || defaultSettings.additional_costs).forEach(([key, value]) => {
            const input = document.querySelector(`input[data-section="additionalCosts"][data-key="${key}"]`) as HTMLInputElement;
            if (input) input.value = String(value);
          });

          // Update lumber processing cost
          const lumberProcessingCostInput = document.querySelector('input[data-section="lumberProcessingCost"]') as HTMLInputElement;
          if (lumberProcessingCostInput) {
            lumberProcessingCostInput.value = String(typedSettings.lumber_processing_cost || defaultSettings.lumber_processing_cost);
          }

          // Update transportation costs
          Object.entries(typedSettings.transportation_costs.base_delivery_fee || defaultSettings.transportation_costs.base_delivery_fee).forEach(([key, value]) => {
            const input = document.querySelector(`input[data-section="baseDeliveryFee"][data-key="${key}"]`) as HTMLInputElement;
            if (input) input.value = String(value);
          });

          const perMileInput = document.querySelector('input[data-section="perMileCharge"]') as HTMLInputElement;
          if (perMileInput) perMileInput.value = String(typedSettings.transportation_costs.per_mile_charge || defaultSettings.transportation_costs.per_mile_charge);

          // Update vehicle dimensions
          Object.entries(typedSettings.vehicle_dimensions || defaultSettings.vehicle_dimensions).forEach(([type, dims]) => {
            Object.entries(dims).forEach(([key, value]) => {
              const input = document.querySelector(`input[data-type="${type}"][data-dimension="${key}"]`) as HTMLInputElement;
              if (input) input.value = String(value);
            });
          });

          // Update timestamp display
          if (typedSettings.updated_at) {
            const timestampElement = document.getElementById('lastUpdated');
            if (timestampElement) {
              const date = new Date(typedSettings.updated_at);
              timestampElement.textContent = `Last updated: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
            }
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setMessage({ type: 'error', text: 'Error loading settings. Using default values.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = useCallback(async () => {
    const saveButton = document.querySelector('#saveButton') as HTMLButtonElement;
    if (saveButton) saveButton.disabled = true;
    
    try {
      const newSettings: Omit<Settings, 'id' | 'created_at' | 'updated_at'> = {
        lumber_prices: {},
        build_intricacy_costs: {},
        additional_costs: {
          painted: 0,
          notched: 0,
          heat_treated: 0
        },
        transportation_costs: {
          base_delivery_fee: {},
          per_mile_charge: 0
        },
        vehicle_dimensions: {},
        lumber_processing_cost: 0
      };

      // Collect lumber prices
      Object.keys(defaultSettings.lumber_prices).forEach(type => {
        newSettings.lumber_prices[type] = { a: 0, b: 0, c: 0 };
        ['a', 'b', 'c'].forEach(key => {
          const input = document.querySelector(`input[data-type="${type}"][data-key="${key}"]`) as HTMLInputElement;
          if (input) {
            newSettings.lumber_prices[type][key as keyof typeof newSettings.lumber_prices[typeof type]] = Number(input.value);
          }
        });
      });

      // Collect build intricacy costs
      Object.keys(defaultSettings.build_intricacy_costs).forEach(key => {
        const input = document.querySelector(`input[data-section="buildIntricacyCosts"][data-key="${key}"]`) as HTMLInputElement;
        if (input) {
          newSettings.build_intricacy_costs[key] = Number(input.value);
        }
      });

      // Collect additional costs
      Object.keys(defaultSettings.additional_costs).forEach(key => {
        const input = document.querySelector(`input[data-section="additionalCosts"][data-key="${key}"]`) as HTMLInputElement;
        if (input) {
          newSettings.additional_costs[key as keyof typeof newSettings.additional_costs] = Number(input.value);
        }
      });

      // Collect lumber processing cost
      const lumberProcessingCostInput = document.querySelector('input[data-section="lumberProcessingCost"]') as HTMLInputElement;
      if (lumberProcessingCostInput) {
        newSettings.lumber_processing_cost = Number(lumberProcessingCostInput.value);
      }

      // Collect transportation costs
      Object.keys(defaultSettings.transportation_costs.base_delivery_fee).forEach(key => {
        const input = document.querySelector(`input[data-section="baseDeliveryFee"][data-key="${key}"]`) as HTMLInputElement;
        if (input) {
          newSettings.transportation_costs.base_delivery_fee[key] = Number(input.value);
        }
      });

      const perMileInput = document.querySelector('input[data-section="perMileCharge"]') as HTMLInputElement;
      if (perMileInput) {
        newSettings.transportation_costs.per_mile_charge = Number(perMileInput.value);
      }

      // Collect vehicle dimensions
      Object.keys(defaultSettings.vehicle_dimensions).forEach(type => {
        newSettings.vehicle_dimensions[type] = { length: 0, width: 0, height: 0, max_weight: 0 };
        ['length', 'width', 'height', 'max_weight'].forEach(key => {
          const input = document.querySelector(`input[data-type="${type}"][data-dimension="${key}"]`) as HTMLInputElement;
          if (input) {
            newSettings.vehicle_dimensions[type][key as keyof typeof newSettings.vehicle_dimensions[typeof type]] = Number(input.value);
          }
        });
      });

      // Save to Supabase
      const { error } = await supabase
        .from('settings')
        .insert(newSettings)
        .select();

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Error saving settings' });
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

      <div id="messageDiv" className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
        {message.text}
      </div>

      {/* Lumber Prices Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Lumber Prices</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(defaultSettings.lumber_prices).map(([type, prices]) => (
              <div key={type} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">{type}</h4>
                <div className="space-y-2">
                  {/* Sort the entries to ensure 'c' (Price per MBF) is always first */}
                  {Object.entries(prices)
                    .sort(([keyA], [keyB]) => {
                      // Custom sort order: c, b, a
                      const order = { c: 0, b: 1, a: 2 };
                      return order[keyA as keyof typeof order] - order[keyB as keyof typeof order];
                    })
                    .map(([key, value]) => (
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
            {Object.entries(defaultSettings.build_intricacy_costs).map(([key, value]) => (
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
            {Object.entries(defaultSettings.additional_costs).map(([key, value]) => (
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

      {/* Lumber Processing Cost Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Lumber Processing Cost</h3>
        </div>
        <div className="p-4">
          <div className="flex items-center space-x-2">
            <label className="w-64 text-sm text-gray-600">Cost per non-Green Pine component:</label>
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                defaultValue={defaultSettings.lumber_processing_cost || 0.05}
                data-section="lumberProcessingCost"
                className={inputClassName + " pl-6"}
                step="0.01"
              />
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
                {Object.entries(defaultSettings.transportation_costs.base_delivery_fee).map(([type, fee]) => (
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
                    defaultValue={defaultSettings.transportation_costs.per_mile_charge}
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
            {Object.entries(defaultSettings.vehicle_dimensions).map(([type, dims]) => (
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