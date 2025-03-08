'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import type { GlobalSettings } from '@/lib/types';
import type { PalletComponents, ShippingLocation, BoardDimensions, StringerDimensions } from '@/lib/types/pallet';
import { supabase } from '@/lib/supabase/supabaseClient';
import { PalletComponent } from './pallet/PalletComponent';
import { LocationModal } from './modals/LocationModal';
import {
  calculateBoardFeet,
  calculatePalletBoardFeet,
  calculateLumberPrice,
  calculateAdditionalOptionsCost,
  calculateFastenerCost
} from '@/lib/utils/calculationUtils';
import { generateStableId } from '@/lib/utils/idUtils';

const generateId = (() => {
  return () => generateStableId('component');
})();

const createBoard = (type: 'board'): BoardDimensions => ({
  id: generateId(),
  count: 0,
  thickness: 0,
  width: 0,
  length: 0,
  type: 'board',
  lumberType: ''
});

const createStringer = (): StringerDimensions => ({
  id: generateId(),
  count: 0,
  width: 0,
  height: 0,
  length: 0,
  type: 'stringer',
  lumberType: ''
});

const createNewPallet = (): PalletComponents => ({
  id: generateId(),
  name: '',
  locationId: null,
  transportationType: '',
  palletsPerTruck: 0,
  deckBoards: [createBoard('board')],
  leadBoards: [createBoard('board')],
  stringers: [createStringer()],
  fastenerType: 'Standard',
  results: null
});

export default function AdvancedCalculator() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pallets, setPallets] = useState<PalletComponents[]>([createNewPallet()]);
  const [locations, setLocations] = useState<ShippingLocation[]>([]);
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load saved data from localStorage on initial render
  useEffect(() => {
    if (isMounted) {
      const savedPallets = localStorage.getItem('advancedCalculator_pallets');
      if (savedPallets) {
        setPallets(JSON.parse(savedPallets));
      }
    }
  }, [isMounted]);

  // Save pallets to localStorage whenever they change
  useEffect(() => {
    if (isMounted && pallets.length > 0) {
      localStorage.setItem('advancedCalculator_pallets', JSON.stringify(pallets));
    }
  }, [pallets, isMounted]);

  // Load locations from Supabase
  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('shipping_locations')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching locations:', error);
        setError('Failed to load shipping locations');
        return;
      }

      if (data) {
        setLocations(data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setError('Failed to load shipping locations');
    }
  };

  // Load settings from Supabase
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
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Error loading settings');
    }
  };

  const handleComponentChange = (
    palletId: string,
    componentType: keyof Pick<PalletComponents, 'deckBoards' | 'leadBoards' | 'stringers'>,
    componentId: string,
    field: string,
    value: number | string
  ) => {
    setPallets(prev => prev.map(pallet => 
      pallet.id === palletId 
        ? {
            ...pallet,
            [componentType]: pallet[componentType].map(item =>
              item.id === componentId
                ? { ...item, [field]: value }
                : item
            )
          }
        : pallet
    ));
  };

  const handlePalletChange = (palletId: string, field: string, value: string | number) => {
    setPallets(prev => prev.map(pallet =>
      pallet.id === palletId
        ? { ...pallet, [field]: value }
        : pallet
    ));
  };

  const addPallet = () => {
    setPallets(prev => [...prev, createNewPallet()]);
  };

  const removePallet = (palletId: string) => {
    if (pallets.length <= 1) return;
    setPallets(prev => prev.filter(p => p.id !== palletId));
  };

  const addComponent = (palletId: string, type: keyof Pick<PalletComponents, 'deckBoards' | 'leadBoards' | 'stringers'>) => {
    setPallets(prev => prev.map(pallet =>
      pallet.id === palletId
        ? {
            ...pallet,
            [type]: [...pallet[type], type === 'stringers' ? createStringer() : createBoard('board')]
          }
        : pallet
    ));
  };

  const removeComponent = (
    palletId: string,
    type: keyof Pick<PalletComponents, 'deckBoards' | 'leadBoards' | 'stringers'>,
    componentId: string
  ) => {
    setPallets(prev => prev.map(pallet =>
      pallet.id === palletId
        ? {
            ...pallet,
            [type]: pallet[type].length > 1 
              ? pallet[type].filter(item => item.id !== componentId)
              : pallet[type]
          }
        : pallet
    ));
  };

  const handleAddLocation = async (location: Omit<ShippingLocation, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('shipping_locations')
        .insert([location])
        .select()
        .single();

      if (error) {
        console.error('Error adding location:', error);
        setError('Failed to add shipping location');
        return;
      }

      if (data) {
        setLocations(prev => [...prev, data]);
      }
    } catch (error) {
      console.error('Error adding location:', error);
      setError('Failed to add shipping location');
    }
  };

  const handleGenerateQuote = async () => {
    // Validate required fields
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
      // Prepare quotes data for Supabase
      const quotesData = pallets.map(pallet => {
        // Calculate total board feet
        const totalBoardFeet = calculatePalletBoardFeet(pallet);
        
        // Calculate lumber price
        const lumberPrice = calculateLumberPrice([pallet], settings);
        
        // Calculate fastener cost
        const fastenerCost = calculateFastenerCost(settings, pallet.fastenerType);
        
        // Calculate total cost
        const totalCost = lumberPrice + fastenerCost;
        
        // Calculate cost per MBF
        const costPerMBF = totalBoardFeet > 0 ? (totalCost / totalBoardFeet) * 1000 : 0;
        
        // Calculate walkaway price (20% margin)
        const walkawayPrice = totalCost * 1.2;
        
        // Calculate price per board foot
        const pricePerBoardFoot = totalBoardFeet > 0 ? walkawayPrice / totalBoardFeet : 0;
        
        // Calculate profit margins
        const profitMargin25 = totalCost * 1.25;
        const profitMargin30 = totalCost * 1.30;
        const profitMargin35 = totalCost * 1.35;

        return {
          quote_type: 'advanced',
          customer_name: '', // These can be added in the future through a form
          company_name: '',
          contact_email: '',
          contact_phone: '',
          sales_person: '',
          quote_date: new Date().toISOString(),
          
          // Location and Transportation
          location_id: pallet.locationId,
          transportation_type: pallet.transportationType,
          pallets_per_truck: pallet.palletsPerTruck,
          
          // Advanced Quote Fields
          pallet_components: {
            deckBoards: pallet.deckBoards,
            leadBoards: pallet.leadBoards,
            stringers: pallet.stringers,
            fastenerType: pallet.fastenerType
          },
          
          // Calculation Results
          total_cost: totalCost,
          cost_per_mbf: costPerMBF,
          walkaway_price: walkawayPrice,
          price_per_board_foot: pricePerBoardFoot,
          profit_margin_25: profitMargin25,
          profit_margin_30: profitMargin30,
          profit_margin_35: profitMargin35,
          transportation_cost: 0, // To be calculated based on location
          total_cost_with_transport: totalCost, // To be updated with transportation cost
          
          // Status
          status: 'draft'
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

      // Update UI state
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Advanced Pallet Calculator</h2>
        <div className="space-x-4">
          <button
            onClick={() => setIsAddLocationModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Location
          </button>
          <button
            onClick={addPallet}
            className="inline-flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Pallet
          </button>
        </div>
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

      <div className="space-y-6" ref={scrollContainerRef}>
        {pallets.map(pallet => (
          <PalletComponent
            key={pallet.id}
            pallet={pallet}
            locations={locations}
            settings={settings}
            onUpdate={(field, value) => handlePalletChange(pallet.id, field, value)}
            onComponentChange={(type, componentId, field, value) => 
              handleComponentChange(pallet.id, type, componentId, field, value)
            }
            onAddComponent={(type) => addComponent(pallet.id, type)}
            onRemoveComponent={(type, componentId) => removeComponent(pallet.id, type, componentId)}
            onRemove={() => removePallet(pallet.id)}
          />
        ))}
      </div>

      <div className="flex justify-end space-x-4">
        <button
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

      <LocationModal
        isOpen={isAddLocationModalOpen}
        onClose={() => setIsAddLocationModalOpen(false)}
        onAdd={handleAddLocation}
      />
    </div>
  );
} 