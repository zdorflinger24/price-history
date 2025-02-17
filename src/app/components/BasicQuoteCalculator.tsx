'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, addDoc, collection, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import type { GlobalSettings } from '@/lib/types';

interface FormData {
  // Basic Info
  salesperson: string;
  companyName: string;
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

const initialFormData: FormData = {
  salesperson: '',
  companyName: '',
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

export default function PalletPricingTool() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Clear results when form data changes
    setResults(null);
    setError('');
    setSaveSuccess(false);
  };

  const calculateBoardFootage = () => {
    const lengthInFeet = parseFloat(formData.length) / 12;
    const widthInFeet = parseFloat(formData.width) / 12;
    return lengthInFeet * widthInFeet * 1; // Assuming 1 inch thickness
  };

  const calculatePallets = () => {
    if (!settings) return { loadedLong: 0, loadedWide: 0, pinwheeled: 0 };
    
    const { vehicleType, length, width } = formData;
    const palletLength = parseFloat(length);
    const palletWidth = parseFloat(width);
    const vehicleDims = settings.vehicleDimensions[vehicleType];

    if (!vehicleDims) return { loadedLong: 0, loadedWide: 0, pinwheeled: 0 };

    const loadedLong = Math.floor(vehicleDims.length / palletLength) * Math.floor(vehicleDims.width / palletWidth) * 22;
    const loadedWide = Math.floor(vehicleDims.length / palletWidth) * Math.floor(vehicleDims.width / palletLength) * 22;
    const pinwheeled = Math.floor(vehicleDims.length / (palletWidth + palletLength)) * 2 * Math.floor(vehicleDims.width / (palletWidth + palletLength)) * 2 * 22;

    return { loadedLong, loadedWide, pinwheeled };
  };

  const calculateTotalCost = () => {
    if (!settings) return null;

    const { lumberType, boardFeet, painted, notched, heatTreated, buildIntricacy, vehicleType, distance } = formData;
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
    const totalTransportationCost = deliveryFee + (distanceNum * settings.transportationCosts.perMileCharge);

    // Calculate loading configurations
    const loadingConfigurations = calculatePallets();
    
    // Find the maximum loading configuration
    const maxPallets = Math.max(
      loadingConfigurations.loadedLong,
      loadingConfigurations.loadedWide,
      loadingConfigurations.pinwheeled
    );

    // Calculate transportation cost per pallet
    const transportationCostPerPallet = maxPallets > 0 ? Number((totalTransportationCost / maxPallets).toFixed(2)) : 0;

    // Calculate total cost per pallet (including per-pallet transportation cost)
    const totalCost = Number((lumberCost + additionalCosts + intricacyCost + transportationCostPerPallet).toFixed(2));
    const costPerBoardFoot = Number((totalCost / boardFeetNum).toFixed(2));
    const walkawayPrice = Number((totalCost * 1.15).toFixed(2));
    const pricePerBoardFoot = Number((walkawayPrice / boardFeetNum).toFixed(2));
    const profitMargin20 = Number((totalCost * 1.20).toFixed(2));
    const profitMargin25 = Number((totalCost * 1.25).toFixed(2));
    const profitMargin30 = Number((totalCost * 1.30).toFixed(2));

    return {
      totalCost,
      costPerBoardFoot,
      walkawayPrice,
      pricePerBoardFoot,
      profitMargin20,
      profitMargin25,
      profitMargin30,
      transportationCost: totalTransportationCost,
      loadingConfigurations,
      costPerPallet: transportationCostPerPallet
    };
  };

  const saveQuote = async () => {
    if (!results || !settings) return;

    try {
      const timestamp = new Date();
      const documentId = `${formData.salesperson}_${formData.companyName}_${timestamp.getTime()}`.replace(/\s+/g, '_');

      const quoteData = {
        // Input Data
        inputs: {
          ...formData,
          timestamp: serverTimestamp(),
        },
        // Calculation Results
        results: {
          ...results,
        },
        // Metadata
        metadata: {
          createdAt: serverTimestamp(),
          globalPricingSnapshot: settings,
          status: 'created'
        }
      };

      await setDoc(doc(db, 'quotes', documentId), quoteData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving quote:', error);
      setError('Error saving quote');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaveSuccess(false);

    try {
      const results = calculateTotalCost();
      if (results) {
        setResults(results);
        await saveQuote();
      }
    } catch (error) {
      setError('Error calculating results');
    }

    setLoading(false);
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setResults(null);
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
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">Pallet Pricing Calculator</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salesperson
                </label>
                <input
                  type="text"
                  name="salesperson"
                  placeholder="Enter salesperson name"
                  value={formData.salesperson}
                  onChange={handleInputChange}
                  className={inputClassName}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  name="companyName"
                  placeholder="Enter company name"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className={inputClassName}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pallet Name
                </label>
                <input
                  type="text"
                  name="palletName"
                  placeholder="Enter pallet name"
                  value={formData.palletName}
                  onChange={handleInputChange}
                  className={inputClassName}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dimensions Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                  value={formData.length}
                  onChange={handleInputChange}
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
                  value={formData.width}
                  onChange={handleInputChange}
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
                  value={formData.boardFeet}
                  onChange={handleInputChange}
                  className={inputClassName}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lumber Details Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                  value={formData.lumberType}
                  onChange={handleInputChange}
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
                  value={formData.buildIntricacy}
                  onChange={handleInputChange}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="heatTreated"
                  name="heatTreated"
                  checked={formData.heatTreated}
                  onChange={handleInputChange}
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
                  checked={formData.notched}
                  onChange={handleInputChange}
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
                  checked={formData.painted}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="painted" className="text-sm text-gray-700">
                  Painted
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Transportation Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                  value={formData.vehicleType}
                  onChange={handleInputChange}
                  className={selectClassName}
                  required
                >
                  <option value="" disabled className="text-gray-500">Select vehicle type</option>
                  {Object.keys(settings.transportationCosts.baseDeliveryFee).map(type => (
                    <option key={type} value={type} className="text-gray-900">{type}</option>
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
                  value={formData.distance}
                  onChange={handleInputChange}
                  className={inputClassName}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Calculating...' : 'Calculate'}
          </button>
        </div>
      </form>

      {/* Results Section */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">Quote saved successfully!</p>
        </div>
      )}

      {results && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Calculation Results</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pricing Results */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Pricing</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Cost:</span>
                    <span className="text-gray-900 font-medium">${results.totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost per Board Foot:</span>
                    <span className="text-gray-900 font-medium">${results.costPerBoardFoot.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Walkaway Price:</span>
                    <span className="text-gray-900 font-medium">${results.walkawayPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price per Board Foot:</span>
                    <span className="text-gray-900 font-medium">${results.pricePerBoardFoot.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">20% Margin:</span>
                    <span className="text-gray-900 font-medium">${results.profitMargin20.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">25% Margin:</span>
                    <span className="text-gray-900 font-medium">${results.profitMargin25.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">30% Margin:</span>
                    <span className="text-gray-900 font-medium">${results.profitMargin30.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Transportation Results */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Transportation</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transportation Cost:</span>
                    <span className="text-gray-900 font-medium">${results.transportationCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost per Pallet:</span>
                    <span className="text-gray-900 font-medium">${results.costPerPallet.toFixed(2)}</span>
                  </div>
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-2">Loading Configurations</h5>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Loaded Long:</span>
                        <span className="text-gray-900">{results.loadingConfigurations.loadedLong} pallets</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Loaded Wide:</span>
                        <span className="text-gray-900">{results.loadingConfigurations.loadedWide} pallets</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pinwheeled:</span>
                        <span className="text-gray-900">{results.loadingConfigurations.pinwheeled} pallets</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 