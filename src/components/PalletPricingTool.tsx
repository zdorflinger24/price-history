'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import type { GlobalSettings, LumberPrice } from '@/lib/types';

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
    const transportationCost = deliveryFee + (distanceNum * settings.transportationCosts.perMileCharge);

    // Calculate loading configurations
    const loadingConfigurations = calculatePallets();

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

  const saveQuote = async () => {
    if (!results || !settings) return;

    try {
      const quoteData = {
        ...formData,
        ...results,
        timestamp: serverTimestamp(),
        globalPricingSnapshot: settings,
        status: 'created'
      };

      await addDoc(collection(db, 'quote_repository'), quoteData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
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
          Quote saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salesperson <span className="text-red-500">*</span>
                </label>
                <select
                  name="salesperson"
                  value={formData.salesperson}
                  onChange={handleInputChange}
                  className={`w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                    !formData.salesperson ? 'text-gray-500' : 'text-gray-900'
                  }`}
                  required
                >
                  <option value="" disabled>Please select a salesperson</option>
                  <option value="Billy">Billy</option>
                  <option value="Brendan">Brendan</option>
                  <option value="Zach">Zach</option>
                </select>
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
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                  value={formData.width}
                  onChange={handleInputChange}
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
                  value={formData.boardFeet}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                  className={`w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                    !formData.lumberType ? 'text-gray-500' : 'text-gray-900'
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
                  value={formData.buildIntricacy}
                  onChange={handleInputChange}
                  className={`w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                    !formData.buildIntricacy ? 'text-gray-500' : 'text-gray-900'
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
                    checked={formData.heatTreated}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Heat Treated</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="notched"
                    checked={formData.notched}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Notched</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="painted"
                    checked={formData.painted}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Painted</span>
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
                  className={`w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                    !formData.vehicleType ? 'text-gray-500' : 'text-gray-900'
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
                  value={formData.distance}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>
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
            {loading ? 'Calculating...' : 'Calculate'}
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

      {results && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Pricing Results */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Pricing Results</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-medium">${results.totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600">Cost per MBF:</span>
                  <span className="font-medium">${(results.costPerBoardFoot * 1000).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-t border-gray-200">
                  <span className="text-gray-600">Walkaway Price:</span>
                  <span className="font-medium text-blue-600">${results.walkawayPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600">Price per MBF:</span>
                  <span className="font-medium">${(results.pricePerBoardFoot * 1000).toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">20% Margin:</span>
                    <span className="font-medium">${results.profitMargin20.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">25% Margin:</span>
                    <span className="font-medium">${results.profitMargin25.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">30% Margin:</span>
                    <span className="font-medium">${results.profitMargin30.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transportation Results */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Transportation Results</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600">Transportation Cost:</span>
                  <span className="font-medium">${results.transportationCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600">Cost per Pallet:</span>
                  <span className="font-medium">${results.costPerPallet.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Loading Configurations */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Loading Configurations</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600">Loaded Long:</span>
                  <span className="font-medium">{results.loadingConfigurations.loadedLong}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600">Loaded Wide:</span>
                  <span className="font-medium">{results.loadingConfigurations.loadedWide}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600">Pinwheeled:</span>
                  <span className="font-medium">{results.loadingConfigurations.pinwheeled}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 