'use client';

import { useState, useEffect, useRef } from 'react';
import type { GlobalSettings } from '@/lib/types';
import type { PalletData, ShippingLocation } from '@/lib/types/quote';
import { supabase } from '@/lib/supabase/supabaseClient';
import { Plus } from 'lucide-react';
import { generateStableId } from '@/lib/utils/idUtils';
import { PalletForm } from './quote/PalletForm';
import { PalletResults } from './quote/PalletResults';

const generateId = () => generateStableId('pallet');

const createNewPallet = (): PalletData => ({
  id: generateId(),
  palletName: '',
  locationId: '',
  palletsPerTruck: '',
  transportationType: '',
  length: '',
  width: '',
  boardFeet: '',
  lumberType: '',
  heatTreated: false,
  notched: false,
  painted: false,
  bands: false,
  buildIntricacy: '',
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

export default function BasicQuoteCalculator() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pallets, setPallets] = useState<PalletData[]>([createNewPallet()]);
  const [locations, setLocations] = useState<ShippingLocation[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    loadSettingsAndLocations();
  }, []);

  // Add the styles to the document
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = noScrollbarStyles;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  const loadSettingsAndLocations = async () => {
    try {
      // Load settings from Supabase
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (settingsError) {
        console.error('Error fetching settings:', settingsError);
        setError('Error loading settings');
        return;
      }

      if (settingsData) {
        const globalSettings: GlobalSettings = {
          lumberPrices: settingsData.lumber_prices,
          buildIntricacyCosts: settingsData.build_intricacy_costs,
          additionalCosts: settingsData.additional_costs,
          transportationCosts: settingsData.transportation_costs,
          vehicleDimensions: settingsData.vehicle_dimensions,
          fastenerCosts: settingsData.fastener_costs,
          lumberProcessingCost: settingsData.lumber_processing_cost
        };
        setSettings(globalSettings);
      }

      // Load locations from Supabase
      const { data: locationsData, error: locationsError } = await supabase
        .from('shipping_locations')
        .select('*')
        .order('name');

      if (locationsError) {
        console.error('Error fetching locations:', locationsError);
        setError('Error loading shipping locations');
        return;
      }

      setLocations(locationsData || []);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while loading data');
      setLoading(false);
    }
  };

  const handleInputChange = (palletId: string, field: string, value: string | boolean) => {
    setPallets(prev => prev.map(pallet => 
      pallet.id === palletId 
        ? { ...pallet, [field]: value, results: null }
        : pallet
    ));

    setError('');
    setSaveSuccess(false);
  };

  const removePallet = (palletId: string) => {
    if (pallets.length <= 1) return;
    setPallets(prev => prev.filter(pallet => pallet.id !== palletId));
  };

  const addPallet = () => {
    setPallets(prev => [...prev, createNewPallet()]);
  };

  const calculateTotalCost = (pallet: PalletData) => {
    if (!settings) return null;

    const { lumberType, boardFeet, painted, notched, heatTreated, bands, buildIntricacy, locationId, palletsPerTruck, transportationType } = pallet;
    const boardFeetNum = parseFloat(boardFeet);
    const palletsPerTruckNum = parseInt(palletsPerTruck) || 1;

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
      (heatTreated ? settings.additionalCosts.heatTreated : 0) +
      (bands ? settings.additionalCosts.bands : 0);

    // Calculate build intricacy cost
    const intricacyCost = settings.buildIntricacyCosts[buildIntricacy] || 0;

    // Calculate transportation cost
    const location = locations.find(loc => loc.id === locationId);
    let transportationCost = 0;
    
    if (location && transportationType) {
      const baseDeliveryFee = settings.transportationCosts.baseDeliveryFee[transportationType] || 0;
      const mileageCost = location.distance * settings.transportationCosts.perMileCharge;
      transportationCost = (baseDeliveryFee + mileageCost) / palletsPerTruckNum;
    }

    // Calculate total cost and derived values
    const baseCost = Number((lumberCost + additionalCosts + intricacyCost).toFixed(2));
    const totalCostWithTransport = Number((baseCost + transportationCost).toFixed(2));
    const costPerMBF = Number((baseCost / boardFeetNum * 1000).toFixed(2));
    const walkawayPrice = Number((totalCostWithTransport * 1.20).toFixed(2));
    const pricePerBoardFoot = Number((walkawayPrice / boardFeetNum).toFixed(2));
    const profitMargin25 = Number((totalCostWithTransport * 1.25).toFixed(2));
    const profitMargin30 = Number((totalCostWithTransport * 1.30).toFixed(2));
    const profitMargin35 = Number((totalCostWithTransport * 1.35).toFixed(2));

    return {
      totalCost: baseCost,
      costPerMBF,
      walkawayPrice,
      pricePerBoardFoot,
      profitMargin25,
      profitMargin30,
      profitMargin35,
      transportationCost,
      totalCostWithTransport
    };
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate shipping locations and transportation types
    const missingLocations = pallets.some(pallet => !pallet.locationId);
    const missingTransportation = pallets.some(pallet => !pallet.transportationType);
    
    if (missingLocations) {
      setError('All pallets must have a shipping location selected');
      return;
    }
    
    if (missingTransportation) {
      setError('All pallets must have a transportation type selected');
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
    // Validate shipping locations and transportation types
    const missingLocations = pallets.some(pallet => !pallet.locationId);
    const missingTransportation = pallets.some(pallet => !pallet.transportationType);
    
    if (missingLocations) {
      setError('All pallets must have a shipping location selected');
      return;
    }
    
    if (missingTransportation) {
      setError('All pallets must have a transportation type selected');
      return;
    }

    if (!settings) {
      setError('Settings not loaded');
      return;
    }

    setLoading(true);
    setError('');
    setSaveSuccess(false);

    try {
      // First ensure all pallets have results calculated
      const updatedPallets = pallets.map(pallet => ({
        ...pallet,
        results: pallet.results || calculateTotalCost(pallet)
      }));

      // Additional validation before preparing quote data
      const invalidDataPallets = updatedPallets.filter(pallet => {
        const length = parseFloat(pallet.length);
        const width = parseFloat(pallet.width);
        const boardFeet = parseFloat(pallet.boardFeet);
        const palletsPerTruck = parseInt(pallet.palletsPerTruck);

        return (
          isNaN(length) || length <= 0 ||
          isNaN(width) || width <= 0 ||
          isNaN(boardFeet) || boardFeet <= 0 ||
          isNaN(palletsPerTruck) || palletsPerTruck <= 0 ||
          !pallet.lumberType ||
          !pallet.buildIntricacy
        );
      });

      if (invalidDataPallets.length > 0) {
        setError(`Invalid data in pallet(s): ${invalidDataPallets.map(p => p.palletName || 'Unnamed').join(', ')}. Please ensure all required fields are filled with valid values.`);
        setLoading(false);
        return;
      }

      // Prepare quotes data for Supabase
      const quotesData = updatedPallets.map(pallet => {
        if (!pallet.results) {
          throw new Error(`Missing calculation results for pallet ${pallet.id}`);
        }

        return {
          quote_type: 'basic',
          customer_name: '',
          company_name: '',
          contact_email: '',
          contact_phone: '',
          sales_person: '',
          quote_date: new Date().toISOString(),
          
          location_id: pallet.locationId,
          transportation_type: pallet.transportationType,
          pallets_per_truck: parseInt(pallet.palletsPerTruck),
          
          length: parseFloat(pallet.length),
          width: parseFloat(pallet.width),
          board_feet: parseFloat(pallet.boardFeet),
          lumber_type: pallet.lumberType,
          heat_treated: pallet.heatTreated,
          notched: pallet.notched,
          painted: pallet.painted,
          bands: pallet.bands,
          build_intricacy: pallet.buildIntricacy,
          
          total_cost: pallet.results.totalCost,
          cost_per_mbf: pallet.results.costPerMBF,
          walkaway_price: pallet.results.walkawayPrice,
          price_per_board_foot: pallet.results.pricePerBoardFoot,
          profit_margin_25: pallet.results.profitMargin25,
          profit_margin_30: pallet.results.profitMargin30,
          profit_margin_35: pallet.results.profitMargin35,
          transportation_cost: pallet.results.transportationCost,
          total_cost_with_transport: pallet.results.totalCostWithTransport
        };
      });

      const { error } = await supabase
        .from('quotes')
        .insert(quotesData);

      if (error) {
        console.error('Error saving quotes:', error);
        setError('Failed to save quotes');
        return;
      }

      // Clear form after successful save
      setPallets([createNewPallet()]);
      setError('');
      setSaveSuccess(true);
    } catch (error) {
      console.error('Error generating quote:', error);
      setError('Failed to save quotes');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPallets([createNewPallet()]);
    setError('');
    setSaveSuccess(false);
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Basic Quote Calculator</h2>
        <button
          onClick={addPallet}
          className="inline-flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Pallet
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">Quotes saved successfully!</p>
        </div>
      )}

      <form onSubmit={handleCalculate} className="space-y-6" ref={formRef}>
        {pallets.map((pallet) => (
          <div key={pallet.id}>
            <PalletForm
              pallet={pallet}
              locations={locations}
              settings={settings}
              onUpdate={handleInputChange}
              onRemove={() => removePallet(pallet.id)}
            />
            {pallet.results && <PalletResults results={pallet.results} />}
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
        </div>
      </form>
    </div>
  );
}