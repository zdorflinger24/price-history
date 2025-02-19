'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, addDoc, collection, serverTimestamp, setDoc, Firestore } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import type { GlobalSettings } from '@/lib/types';

interface FormData {
  // Basic Info
  palletName: string;
  locationId: string;
  
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
}

interface CalculationResults {
  // Pricing Results
  totalCost: number;
  costPerMBF: number;
  walkawayPrice: number;
  pricePerBoardFoot: number;
  profitMargin25: number;
  profitMargin30: number;
  profitMargin35: number;
}

// Add PalletData interface to extend FormData
interface PalletData extends FormData {
  id: string;
  results: CalculationResults | null;
}

interface ShippingLocation {
  id: string;
  name: string;
  address: string;
  distance: number;
}

const initialFormData: FormData = {
  palletName: '',
  locationId: '',
  length: '',
  width: '',
  boardFeet: '',
  lumberType: '',
  heatTreated: false,
  notched: false,
  painted: false,
  buildIntricacy: '',
};

const generateId = () => `pallet-${Math.random().toString(36).substr(2, 9)}`;

const createNewPallet = (): PalletData => ({
  id: generateId(),
  ...initialFormData,
  results: null
});

// Add this CSS at the top of the file after the imports
const noScrollbarStyles = `
  @layer utilities {
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  }
`;

export default function PalletPricingTool() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [pallets, setPallets] = useState<PalletData[]>([createNewPallet()]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [locations, setLocations] = useState<ShippingLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentPalletId, setCurrentPalletId] = useState('');

  // Add the styles to the document
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = noScrollbarStyles;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (pallets.length > 0) {
      setCurrentPalletId(pallets[0].id);
    }
  }, [pallets]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      let closestPalletId = '';
      let minDistance = Infinity;

      pallets.forEach(pallet => {
        const el = document.getElementById(`pallet-${pallet.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const elCenter = rect.left + rect.width / 2;
          const distance = Math.abs(containerCenter - elCenter);
          if (distance < minDistance) {
            minDistance = distance;
            closestPalletId = pallet.id;
          }
        }
      });

      if (closestPalletId && closestPalletId !== currentPalletId) {
        setCurrentPalletId(closestPalletId);
      }
    };

    container.addEventListener('scroll', handleScroll);
    // Initial check
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [pallets, currentPalletId]);

  useEffect(() => {
    const storedLocations = localStorage.getItem('shippingLocations');
    if (storedLocations) {
      setLocations(JSON.parse(storedLocations));
    }
  }, []);

  const loadSettings = async () => {
    if (!db) {
      setError('Database connection not available');
      return;
    }

    try {
      const docRef = doc(db, 'global_pricing', 'current');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSettings(docSnap.data() as GlobalSettings);
      } else {
        setError('Global settings not found. Please configure settings first.');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
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

  const removePallet = (palletId: string) => {
    setPallets(prev => prev.filter(pallet => pallet.id !== palletId));
  };

  const addPallet = () => {
    setPallets(prev => [...prev, createNewPallet()]);
  };

  const calculateBoardFootage = (pallet: PalletData) => {
    const lengthInFeet = parseFloat(pallet.length) / 12;
    const widthInFeet = parseFloat(pallet.width) / 12;
    return lengthInFeet * widthInFeet * 1;
  };

  const calculateTotalCost = (pallet: PalletData) => {
    if (!settings) return null;

    const { lumberType, boardFeet, painted, notched, heatTreated, buildIntricacy } = pallet;
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

    // Calculate total cost and derived values
    const totalCost = Number((lumberCost + additionalCosts + intricacyCost).toFixed(2));
    const costPerMBF = Number((totalCost / boardFeetNum * 1000).toFixed(2));
    const walkawayPrice = Number((totalCost * 1.20).toFixed(2));
    const pricePerBoardFoot = Number((walkawayPrice / boardFeetNum).toFixed(2));
    const profitMargin25 = Number((totalCost * 1.25).toFixed(2));
    const profitMargin30 = Number((totalCost * 1.30).toFixed(2));
    const profitMargin35 = Number((totalCost * 1.35).toFixed(2));

    return {
      totalCost,
      costPerMBF,
      walkawayPrice,
      pricePerBoardFoot,
      profitMargin25,
      profitMargin30,
      profitMargin35
    };
  };

  const saveQuotes = async (pallets: PalletData[]) => {
    if (!db) {
      setError('Database connection not available');
      return;
    }

    try {
      await Promise.all(pallets.map(async (pallet) => {
        if (!pallet.results) return;

        const timestamp = new Date();
        const documentId = `pallet_${pallet.palletName}_${timestamp.getTime()}`;
        const quotesCollection = collection(db as Firestore, 'quotes');
        const quoteDoc = doc(quotesCollection, documentId);

        const quoteData = {
          inputs: {
            ...pallet,
            timestamp: serverTimestamp(),
          },
          results: pallet.results,
          metadata: {
            createdAt: serverTimestamp(),
            globalPricingSnapshot: settings,
            status: 'created'
          }
        };

        await setDoc(quoteDoc, quoteData);
      }));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving quotes:', error);
      setError('Error saving quotes');
    }
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate shipping locations
    const missingLocations = pallets.some(pallet => !pallet.locationId);
    if (missingLocations) {
      setError('All pallets must have a shipping location selected');
      return;
    }

    setLoading(true);
    setError('');
    setSaveSuccess(false);

    try {
      const updatedPallets = pallets.map(pallet => ({
        ...pallet,
        results: calculateTotalCost(pallet)
      }));

      setPallets(updatedPallets);
    } catch (error) {
      setError('Error calculating results');
    }

    setLoading(false);
  };

  const handleGenerateQuote = async () => {
    // Validate shipping locations
    const missingLocations = pallets.some(pallet => !pallet.locationId);
    if (missingLocations) {
      setError('All pallets must have a shipping location selected');
      return;
    }

    setLoading(true);
    setError('');
    setSaveSuccess(false);

    try {
      await saveQuotes(pallets);
    } catch (error) {
      setError('Error generating quote');
    }

    setLoading(false);
  };

  const handleReset = () => {
    setPallets([createNewPallet()]);
    setError('');
    setSaveSuccess(false);
  };

  // Add a constant for input styling
  const inputClassName = "w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900";
  const selectClassName = "w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900";

  if (!settings) {
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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Basic Quote Calculator</h2>
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

      {/* Pallet Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
          {pallets.map((pallet, index) => (
            <button
              key={pallet.id}
              onClick={() => {
                const element = document.getElementById(`pallet-${pallet.id}`);
                element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                setCurrentPalletId(pallet.id);
              }}
              className={`inline-flex items-center px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap relative
                ${pallet.id === currentPalletId
                  ? 'bg-white text-blue-600 border-2 border-b-2 border-blue-600 border-b-white -mb-0.5'
                  : 'text-gray-500 hover:text-gray-700 border border-transparent hover:border-gray-300'
                }`}
            >
              <span className="mr-2">{index + 1}</span>
              <span>{pallet.palletName || `Unnamed Pallet ${index + 1}`}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleCalculate} className="space-y-8">
        <div 
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth" 
          ref={scrollContainerRef}
        >
          {pallets.map((pallet, index) => (
            <div 
              key={pallet.id} 
              id={`pallet-${pallet.id}`}
              className="relative bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex-none w-full snap-center px-4"
            >
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
              <div className="p-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pallet Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="palletName"
                      placeholder="Enter a name to identify this pallet"
                      value={pallet.palletName}
                      onChange={(e) => handleInputChange(pallet.id, e)}
                      className={inputClassName}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shipping Location<span className="text-red-500">*</span>
                    </label>
                    <select
                      name="locationId"
                      value={pallet.locationId}
                      onChange={(e) => handleInputChange(pallet.id, e)}
                      className={`w-full px-3 py-1.5 bg-gray-50 border rounded-lg shadow-sm focus:ring-1 focus:ring-blue-500 ${
                        !pallet.locationId ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
                    >
                      <option value="">Select a location</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name} ({location.distance} miles)
                        </option>
                      ))}
                    </select>
                    {!pallet.locationId && (
                      <p className="text-sm text-red-500 mt-1">Shipping location is required</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Dimensions Section */}
              <div className="border-t border-gray-200">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Dimensions</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        className={inputClassName}
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
                        className={inputClassName}
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
                        className={inputClassName}
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
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lumber Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="lumberType"
                        value={pallet.lumberType}
                        onChange={(e) => handleInputChange(pallet.id, e)}
                        className={selectClassName}
                        required
                      >
                        <option value="" disabled className="text-gray-500">Select lumber type</option>
                        {Object.keys(settings.lumberPrices).map(type => (
                          <option key={type} value={type} className="text-gray-900">{type}</option>
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
                        className={selectClassName}
                        required
                      >
                        <option value="" disabled className="text-gray-500">Select build complexity</option>
                        {Object.keys(settings.buildIntricacyCosts).map(type => (
                          <option key={type} value={type} className="text-gray-900">{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="heatTreated"
                        name="heatTreated"
                        checked={pallet.heatTreated}
                        onChange={(e) => handleInputChange(pallet.id, e)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="heatTreated" className="text-sm text-gray-700">
                        Heat Treated
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="notched"
                        name="notched"
                        checked={pallet.notched}
                        onChange={(e) => handleInputChange(pallet.id, e)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="notched" className="text-sm text-gray-700">
                        Notched
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="painted"
                        name="painted"
                        checked={pallet.painted}
                        onChange={(e) => handleInputChange(pallet.id, e)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="painted" className="text-sm text-gray-700">
                        Painted
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Section */}
              {pallet.results && (
                <div className="mt-6 border-t-2 border-blue-100 pt-4">
                  <div className="bg-gradient-to-b from-blue-50/50 to-white rounded-lg border border-blue-100 shadow-sm">
                    <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                      <h3 className="text-lg font-medium text-blue-900">Calculated Results</h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 gap-6">
                        {/* Pricing Results */}
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-blue-100">
                              <span className="text-gray-600">Total Cost:</span>
                              <span className="text-lg font-semibold text-blue-900">${pallet.results.totalCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                              <span className="text-gray-600">Cost per MBF:</span>
                              <span className="font-medium text-blue-800">${pallet.results.costPerMBF.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-blue-100">
                              <span className="text-gray-600">Walkaway Price (20% Margin):</span>
                              <span className="text-lg font-semibold text-blue-900">${pallet.results.walkawayPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                              <span className="text-gray-600">Price per Board Foot:</span>
                              <span className="font-medium text-blue-800">${pallet.results.pricePerBoardFoot.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="pt-4 space-y-3 border-t border-blue-100">
                            <h4 className="font-medium text-blue-900 mb-2">Profit Margins</h4>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">25% Margin:</span>
                              <span className="font-medium text-green-600">${pallet.results.profitMargin25.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">30% Margin:</span>
                              <span className="font-medium text-green-600">${pallet.results.profitMargin30.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">35% Margin:</span>
                              <span className="font-medium text-green-600">${pallet.results.profitMargin35.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

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
            {loading ? 'Calculating...' : 'Calculate Pricing'}
          </button>
          {pallets.some(p => p.results) && (
            <button
              type="button"
              onClick={handleGenerateQuote}
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
              }`}
            >
              {loading ? 'Generating...' : 'Generate Quote'}
            </button>
          )}
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

      {saveSuccess && (
        <div className="p-4 bg-green-100 text-green-700 rounded-lg flex items-center">
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Quotes saved successfully!
        </div>
      )}
    </div>
  );
} 