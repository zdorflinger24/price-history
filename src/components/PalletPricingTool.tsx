'use client';

import { useState, useEffect } from 'react';
import type { GlobalSettings, LumberPrice } from '@/lib/types';
import { supabase } from '@/lib/supabase/supabaseClient';

interface QuoteData {
  palletId: string;
  customerName: string;
  date: Date;
  totalPrice: number;
}

interface FormData {
  // Basic Info
  palletName: string;
  
  // Dimensions
  length: string;
  width: string;
  boardFeet: string;
  
  // Lumber Details
  lumberType: string;
  heatTreated: boolean;
  notched: boolean;
  painted: boolean;
  buildIntricacy: string;
  
  // Transportation
  vehicleType: string;
  distance: string;
}

interface CalculationResults {
  // Pricing Results
  totalCost: number;
  costPerBoardFoot: number;
  walkawayPrice: number;
  pricePerBoardFoot: number;
  profitMargin20: number;
  profitMargin25: number;
  profitMargin30: number;
  
  // Transportation Results
  transportationCost: number;
  loadingConfigurations: {
    loadedLong: number;
    loadedWide: number;
    pinwheeled: number;
  };
  costPerPallet: number;
}

interface PalletData extends FormData {
  id: string;
  results: CalculationResults | null;
}

const initialFormData: FormData = {
  palletName: '',
  length: '',
  width: '',
  boardFeet: '',
  lumberType: '',
  heatTreated: false,
  notched: false,
  painted: false,
  buildIntricacy: '',
  vehicleType: '',
  distance: ''
};

const defaultSettings: GlobalSettings = {
  lumberPrices: {},
  transportationCosts: {
    baseDeliveryFee: {},
    perMileCharge: 0
  },
  additionalCosts: {
    painted: 0,
    notched: 0,
    heatTreated: 0
  },
  buildIntricacyCosts: {},
  vehicleDimensions: {}
};

const generateId = () => `pallet-${Math.random().toString(36).substr(2, 9)}`;

const createNewPallet = (): PalletData => ({
  id: generateId(),
  ...initialFormData,
  results: null
});

export default function PalletPricingTool() {
  const [pallets, setPallets] = useState<PalletData[]>([createNewPallet()]);
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching settings:', error);
        setError('Error loading settings');
        return;
      }

      if (data) {
        const globalSettings: GlobalSettings = {
          lumberPrices: data.lumber_prices,
          buildIntricacyCosts: data.build_intricacy_costs,
          additionalCosts: data.additional_costs,
          transportationCosts: data.transportation_costs,
          vehicleDimensions: data.vehicle_dimensions,
          fastenerCosts: data.fastener_costs,
          lumberProcessingCost: data.lumber_processing_cost
        };
        setSettings(globalSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Error loading settings');
    }
  };

  const handleInputChange = (palletId: string, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setPallets(prev => prev.map(pallet => 
      pallet.id === palletId 
        ? { ...pallet, [name]: newValue, results: null }
        : pallet
    ));

    setError('');
    setSaveSuccess(false);
  };

  const addPallet = () => {
    setPallets(prev => [...prev, createNewPallet()]);
  };

  const removePallet = (palletId: string) => {
    setPallets(prev => prev.filter(pallet => pallet.id !== palletId));
  };

  const calculateBoardFootage = (pallet: PalletData) => {
    const lengthInFeet = parseFloat(pallet.length) / 12;
    const widthInFeet = parseFloat(pallet.width) / 12;
    return lengthInFeet * widthInFeet * 1; // Assuming 1 inch thickness
  };

  const calculatePallets = (pallet: PalletData) => {
    if (!settings) return { loadedLong: 0, loadedWide: 0, pinwheeled: 0 };
    
    const { vehicleType, length, width } = pallet;
    const palletLength = parseFloat(length);
    const palletWidth = parseFloat(width);
    const vehicleDims = settings.vehicleDimensions[vehicleType];

    if (!vehicleDims) return { loadedLong: 0, loadedWide: 0, pinwheeled: 0 };

    const loadedLong = Math.floor(vehicleDims.length / palletLength) * Math.floor(vehicleDims.width / palletWidth) * 22;
    const loadedWide = Math.floor(vehicleDims.length / palletWidth) * Math.floor(vehicleDims.width / palletLength) * 22;
    const pinwheeled = Math.floor(vehicleDims.length / (palletWidth + palletLength)) * 2 * Math.floor(vehicleDims.width / (palletWidth + palletLength)) * 2 * 22;

    return { loadedLong, loadedWide, pinwheeled };
  };

  const calculateTotalCost = (pallet: PalletData) => {
    if (!settings) return null;

    const { lumberType, boardFeet, painted, notched, heatTreated, buildIntricacy, vehicleType, distance } = pallet;
    const boardFeetNum = parseFloat(boardFeet);

    // Calculate lumber cost
    const lumberPrices = settings.lumberPrices[lumberType];
    if (!lumberPrices) return null;

    const { a, b, c } = lumberPrices;
    const pricePerThousandBoardFeet = Math.abs(a * boardFeetNum - b) + c;
    const lumberCost = (pricePerThousandBoardFeet / 1000) * boardFeetNum;

    // Calculate additional costs
    const additionalCosts = 
      (painted ? settings.additionalCosts.painted : 0) +
      (notched ? settings.additionalCosts.notched : 0) +
      (heatTreated ? settings.additionalCosts.heatTreated : 0);

    // Calculate build intricacy cost
    const intricacyCost = settings.buildIntricacyCosts[buildIntricacy] || 0;

    // Calculate transportation cost
    const deliveryFee = settings.transportationCosts.baseDeliveryFee[vehicleType] || 0;
    const distanceNum = parseFloat(distance);
    const transportationCost = deliveryFee + (distanceNum * settings.transportationCosts.perMileCharge);

    // Calculate loading configurations
    const loadingConfigurations = calculatePallets(pallet);

    // Calculate total cost and derived values
    const totalCost = lumberCost + additionalCosts + intricacyCost + transportationCost;
    const costPerBoardFoot = totalCost / boardFeetNum;
    const walkawayPrice = totalCost * 1.15;
    const pricePerBoardFoot = walkawayPrice / boardFeetNum;
    const profitMargin20 = totalCost * 1.20;
    const profitMargin25 = totalCost * 1.25;
    const profitMargin30 = totalCost * 1.30;

    // Calculate cost per pallet
    const costPerPallet = transportationCost / loadingConfigurations.loadedLong;

    return {
      totalCost,
      costPerBoardFoot,
      walkawayPrice,
      pricePerBoardFoot,
      profitMargin20,
      profitMargin25,
      profitMargin30,
      transportationCost,
      loadingConfigurations,
      costPerPallet
    };
  };

  const handleSavePallet = async (pallet: PalletData) => {
    try {
      const { error } = await supabase
        .from('pallets')
        .insert([{
          name: pallet.palletName,
          dimensions: {
            length: parseFloat(pallet.length),
            width: parseFloat(pallet.width),
            boardFeet: parseFloat(pallet.boardFeet)
          },
          lumber_type: pallet.lumberType,
          heat_treated: pallet.heatTreated,
          notched: pallet.notched,
          painted: pallet.painted,
          build_intricacy: pallet.buildIntricacy,
          vehicle_type: pallet.vehicleType,
          distance: parseFloat(pallet.distance),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error saving pallet:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error saving pallet:', error);
      throw error;
    }
  };

  const handleSaveQuote = async (quote: QuoteData) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .insert([{
          pallet_id: quote.palletId,
          customer_name: quote.customerName,
          date: quote.date.toISOString(),
          total_price: quote.totalPrice,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error saving quote:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      throw error;
    }
  };

  const handleSaveAll = async (pallets: PalletData[]) => {
    try {
      const updatedPallets = pallets.filter(pallet => pallet.results);
      
      await Promise.all(updatedPallets.map(pallet => handleSavePallet(pallet)));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving pallets:', error);
      setError('Error saving pallets');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const updatedPallets = pallets.map(pallet => ({
        ...pallet,
        results: calculateTotalCost(pallet)
      }));

      setPallets(updatedPallets);
      
      // Save all pallets to the database
      await handleSaveAll(updatedPallets);
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while processing the pallets');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPallets([createNewPallet()]);
    setError('');
    setSaveSuccess(false);
  };

  if (!settings) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error || 'Loading settings...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {saveSuccess && (
        <div className="p-4 bg-green-100 text-green-700 rounded-lg flex items-center">
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Quotes saved successfully!
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Pallet Quotes</h2>
        <button
          type="button"
          onClick={addPallet}
          className="inline-flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Pallet
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {pallets.map((pallet, index) => (
          <div key={pallet.id} className="relative bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Pallet {index + 1}</h3>
              {pallets.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePallet(pallet.id)}
                  className="text-red-600 hover:text-red-700 focus:outline-none"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            {/* Basic Info Section */}
            <div className="p-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pallet Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="palletName"
                    placeholder="Enter a name to identify this pallet (e.g. Standard 48x40)"
                    value={pallet.palletName}
                    onChange={(e) => handleInputChange(pallet.id, e)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Dimensions Section */}
            <div className="border-t border-gray-200">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Dimensions</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Length (inches)
                    </label>
                    <input
                      type="number"
                      name="length"
                      placeholder="Enter length"
                      value={pallet.length}
                      onChange={(e) => handleInputChange(pallet.id, e)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Width (inches)
                    </label>
                    <input
                      type="number"
                      name="width"
                      placeholder="Enter width"
                      value={pallet.width}
                      onChange={(e) => handleInputChange(pallet.id, e)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Board Feet
                    </label>
                    <input
                      type="number"
                      name="boardFeet"
                      placeholder="Enter board feet"
                      value={pallet.boardFeet}
                      onChange={(e) => handleInputChange(pallet.id, e)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Lumber Details Section */}
            <div className="border-t border-gray-200">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Lumber Details</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lumber Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="lumberType"
                      value={pallet.lumberType}
                      onChange={(e) => handleInputChange(pallet.id, e)}
                      className={`w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                        !pallet.lumberType ? 'text-gray-500' : 'text-gray-900'
                      }`}
                      required
                    >
                      <option value="" disabled>Select lumber type</option>
                      {Object.keys(settings.lumberPrices).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Build Intricacy <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="buildIntricacy"
                      value={pallet.buildIntricacy}
                      onChange={(e) => handleInputChange(pallet.id, e)}
                      className={`w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                        !pallet.buildIntricacy ? 'text-gray-500' : 'text-gray-900'
                      }`}
                      required
                    >
                      <option value="" disabled>Select build complexity</option>
                      {Object.keys(settings.buildIntricacyCosts).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Options
                  </label>
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="heatTreated"
                        checked={pallet.heatTreated}
                        onChange={(e) => handleInputChange(pallet.id, e)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Heat Treated</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="notched"
                        checked={pallet.notched}
                        onChange={(e) => handleInputChange(pallet.id, e)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Notched</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="painted"
                        checked={pallet.painted}
                        onChange={(e) => handleInputChange(pallet.id, e)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Painted</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Transportation Section */}
            <div className="border-t border-gray-200">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Transportation</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="vehicleType"
                      value={pallet.vehicleType}
                      onChange={(e) => handleInputChange(pallet.id, e)}
                      className={`w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                        !pallet.vehicleType ? 'text-gray-500' : 'text-gray-900'
                      }`}
                      required
                    >
                      <option value="" disabled>Select vehicle type</option>
                      {Object.keys(settings.transportationCosts.baseDeliveryFee).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Distance (miles)
                    </label>
                    <input
                      type="number"
                      name="distance"
                      placeholder="Enter distance"
                      value={pallet.distance}
                      onChange={(e) => handleInputChange(pallet.id, e)}
                      className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Results Section */}
            {pallet.results && (
              <div className="border-t border-gray-200">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Results</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Pricing Results */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Pricing</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Cost:</span>
                        <span className="font-medium">${pallet.results.totalCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Walkaway Price:</span>
                        <span className="font-medium text-blue-600">${pallet.results.walkawayPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Transportation Results */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Transportation</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Cost:</span>
                        <span className="font-medium">${pallet.results.transportationCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Per Pallet:</span>
                        <span className="font-medium">${pallet.results.costPerPallet.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Loading Configurations */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Loading</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Long:</span>
                        <span className="font-medium">{pallet.results.loadingConfigurations.loadedLong}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Wide:</span>
                        <span className="font-medium">{pallet.results.loadingConfigurations.loadedWide}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Pinwheel:</span>
                        <span className="font-medium">{pallet.results.loadingConfigurations.pinwheeled}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 rounded-lg font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {loading ? 'Calculating...' : 'Calculate All'}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
} 