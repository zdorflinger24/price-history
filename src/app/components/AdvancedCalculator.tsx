'use client';

import { useState, useEffect, useRef } from 'react';
import { useFirebase } from '@/lib/contexts/FirebaseContext';
import { Plus, Trash2 } from 'lucide-react';
import type { GlobalSettings } from '@/lib/types';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

interface ShippingLocation {
  id: string;
  name: string;
  address: string;
  distance: number;
}

interface BoardDimensions {
  id: string;
  count: number;
  thickness: number;
  width: number;
  length: number;
  type: 'board';
  lumberType: string;
}

interface StringerDimensions {
  id: string;
  count: number;
  width: number;
  height: number;
  length: number;
  type: 'stringer';
  lumberType: string;
}

type ComponentType = {
  deckBoards: BoardDimensions[];
  leadBoards: BoardDimensions[];
  stringers: StringerDimensions[];
}

interface PalletComponents {
  id: string;
  name: string;
  locationId: string | null;
  transportationType: string;
  palletsPerTruck: number;
  deckBoards: BoardDimensions[];
  leadBoards: BoardDimensions[];
  stringers: StringerDimensions[];
  fastenerType: string;
  results: any | null;
}

const generateId = (() => {
  let id = 0;
  return () => {
    id += 1;
    return `id-${id}`;
  };
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

const initialComponents: ComponentType = {
  deckBoards: [createBoard('board')],
  leadBoards: [createBoard('board')],
  stringers: [createStringer()]
};

const TextInputField = ({ 
  label, 
  value, 
  onChange
}: { 
  label: string; 
  value: string; 
  onChange: (text: string) => void;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value, isFocused]);

  return (
    <div className="flex flex-col space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => { 
          setIsFocused(false);
          onChange(localValue);
        }}
        className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        placeholder="Enter pallet name"
      />
    </div>
  );
};

export default function AdvancedCalculator() {
  const { db } = useFirebase();
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pallets, setPallets] = useState<PalletComponents[]>([]);
  const [locations, setLocations] = useState<ShippingLocation[]>([]);
  const [painted, setPainted] = useState<boolean>(false);
  const [notched, setNotched] = useState<boolean>(false);
  const [heatTreated, setHeatTreated] = useState<boolean>(false);
  const [bands, setBands] = useState<boolean>(false);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [laborBuildPrice, setLaborBuildPrice] = useState<number>(0);
  const [activePalletId, setActivePalletId] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: '', address: '', distance: '' });

  // Load saved data from localStorage on initial render
  useEffect(() => {
    // Load pallets
    const savedPallets = localStorage.getItem('advancedCalculator_pallets');
    if (savedPallets) {
      const parsedPallets = JSON.parse(savedPallets);
      setPallets(parsedPallets);
      if (parsedPallets.length > 0) {
        setActivePalletId(parsedPallets[0].id);
      }
    } else {
      // Initialize with a default pallet if none saved
      const defaultPallet = createNewPallet();
      setPallets([defaultPallet]);
      setActivePalletId(defaultPallet.id);
    }

    // Load additional options
    const savedOptions = localStorage.getItem('advancedCalculator_options');
    if (savedOptions) {
      const options = JSON.parse(savedOptions);
      setPainted(options.painted || false);
      setNotched(options.notched || false);
      setHeatTreated(options.heatTreated || false);
      setBands(options.bands || false);
    }

    // Load pricing info
    const savedPricing = localStorage.getItem('advancedCalculator_pricing');
    if (savedPricing) {
      const pricing = JSON.parse(savedPricing);
      setDeliveryFee(pricing.deliveryFee || 0);
      setLaborBuildPrice(pricing.laborBuildPrice || 0);
    }
  }, []);

  // Load locations from localStorage
  useEffect(() => {
    const storedLocations = localStorage.getItem('shippingLocations');
    if (storedLocations) {
      setLocations(JSON.parse(storedLocations));
    }
  }, []);

  // Save pallets to localStorage whenever they change
  useEffect(() => {
    if (pallets.length > 0) {
      localStorage.setItem('advancedCalculator_pallets', JSON.stringify(pallets));
    }
  }, [pallets]);

  // Save additional options to localStorage whenever they change
  useEffect(() => {
    const options = { painted, notched, heatTreated, bands };
    localStorage.setItem('advancedCalculator_options', JSON.stringify(options));
  }, [painted, notched, heatTreated, bands]);

  // Save pricing info to localStorage whenever it changes
  useEffect(() => {
    const pricing = { deliveryFee, laborBuildPrice };
    localStorage.setItem('advancedCalculator_pricing', JSON.stringify(pricing));
  }, [deliveryFee, laborBuildPrice]);

  useEffect(() => {
    const loadData = async () => {
      if (!db) {
        setError('Database connection not available');
        setLoading(false);
        return;
      }

      try {
        // Load settings from Firebase
        const settingsQuery = query(
          collection(db, 'global_pricing'),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        
        const settingsSnapshot = await getDocs(settingsQuery);
        if (!settingsSnapshot.empty) {
          const settingsData = settingsSnapshot.docs[0].data() as GlobalSettings;
          setSettings(settingsData);
        } else {
          // Use default settings if no settings found in Firebase
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
                'Dry Van': 200,
                'Flatbed': 250
              },
              perMileCharge: 2
            },
            vehicleDimensions: {
              'Dry Van': { length: 636, width: 102, height: 110, maxWeight: 45000 },
              'Flatbed': { length: 636, width: 102, height: 0, maxWeight: 48000 }
            },
            lumberProcessingCost: 0.05
          };
          setSettings(defaultSettings);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Error loading data');
        setLoading(false);
      }
    };

    loadData();
  }, [db]);

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

      if (closestPalletId && closestPalletId !== activePalletId) {
        setActivePalletId(closestPalletId);
      }
    };

    container.addEventListener('scroll', handleScroll);
    // Initial check
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [pallets, activePalletId]);

  const calculateBoardFeet = (dimensions: BoardDimensions | StringerDimensions) => {
    const { count, width, length } = dimensions;
    const thickness = dimensions.type === 'board' ? dimensions.thickness : dimensions.height;
    
    // Ensure all values are valid numbers
    if (!count || !width || !length || !thickness) {
      return 0;
    }
    
    return Number((count * thickness * width * length / 144).toFixed(2));
  };

  const calculatePalletBoardFeet = (pallet: PalletComponents) => {
    const deckBoardFeet = pallet.deckBoards.reduce((acc, board) => acc + calculateBoardFeet(board), 0);
    const leadBoardFeet = pallet.leadBoards.reduce((acc, board) => acc + calculateBoardFeet(board), 0);
    const stringerBoardFeet = pallet.stringers.reduce((acc, stringer) => acc + calculateBoardFeet(stringer), 0);
    return Number((deckBoardFeet + leadBoardFeet + stringerBoardFeet).toFixed(2));
  };

  const calculateLumberPrice = () => {
    if (!settings?.lumberPrices) return 0;
    
    return pallets.reduce((totalPrice, pallet) => {
      let palletPrice = 0;
      
      // Calculate price for deck boards
      pallet.deckBoards.forEach(board => {
        const lumberType = board.lumberType || 'Recycled';
        const boardFeet = calculateBoardFeet(board);
        const pricePerMBF = settings.lumberPrices[lumberType]?.c || 350; // Default to 350 if not found
        palletPrice += boardFeet * pricePerMBF / 1000;
      });
      
      // Calculate price for lead boards
      pallet.leadBoards.forEach(board => {
        const lumberType = board.lumberType || 'Recycled';
        const boardFeet = calculateBoardFeet(board);
        const pricePerMBF = settings.lumberPrices[lumberType]?.c || 350;
        palletPrice += boardFeet * pricePerMBF / 1000;
      });
      
      // Calculate price for stringers
      pallet.stringers.forEach(stringer => {
        const lumberType = stringer.lumberType || 'Recycled';
        const boardFeet = calculateBoardFeet(stringer);
        const pricePerMBF = settings.lumberPrices[lumberType]?.c || 350;
        palletPrice += boardFeet * pricePerMBF / 1000;
      });
      
      return totalPrice + palletPrice;
    }, 0);
  };

  const calculateAdditionalOptionsCost = () => {
    if (!settings) return 0;
    
    // Get costs from settings with fallbacks
    const paintedCost = settings.additionalCosts?.painted || 0.75;
    const notchedCost = settings.additionalCosts?.notched || 0.85;
    const heatTreatedCost = settings.additionalCosts?.heatTreated || 1;
    // Bands is not in settings, use default value
    const bandsCost = 0.25;
    
    // Calculate total additional cost - just add the values directly
    let additionalCost = 0;
    if (painted) additionalCost += paintedCost;
    if (notched) additionalCost += notchedCost;
    if (heatTreated) additionalCost += heatTreatedCost;
    if (bands) additionalCost += bandsCost;
    
    return additionalCost;
  };

  const handleComponentChange = (
    palletId: string,
    componentType: keyof Omit<PalletComponents, 'id' | 'name' | 'locationId'>,
    componentId: string,
    field: string,
    value: number | string
  ) => {
    setPallets(prev => prev.map(pallet => 
      pallet.id === palletId 
        ? {
            ...pallet,
            [componentType]: pallet[componentType].map((item: BoardDimensions | StringerDimensions) =>
              item.id === componentId
                ? {
                    ...item,
                    [field]: field === 'count'
                      ? Math.floor(value as number)
                      : field === 'lumberType'
                        ? value
                        : Number((value as number).toFixed(2))
                  }
                : item
            )
          }
        : pallet
    ));
  };

  const handlePalletChange = (palletId: string, field: keyof Pick<PalletComponents, 'name' | 'locationId' | 'transportationType' | 'fastenerType'>, value: string) => {
    setPallets(prev => prev.map(pallet =>
      pallet.id === palletId
        ? { ...pallet, [field]: value }
        : pallet
    ));
  };

  const handlePalletNumberChange = (palletId: string, field: 'palletsPerTruck', value: number) => {
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

  const addComponent = (palletId: string, type: keyof Omit<PalletComponents, 'id' | 'name' | 'locationId'>) => {
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
    type: keyof Omit<PalletComponents, 'id' | 'name' | 'locationId'>,
    componentId: string
  ) => {
    setPallets(prev => prev.map(pallet =>
      pallet.id === palletId
        ? {
            ...pallet,
            [type]: pallet[type].length > 1 
              ? pallet[type].filter((item: BoardDimensions | StringerDimensions) => item.id !== componentId)
              : pallet[type]
          }
        : pallet
    ));
  };

  const InputField = ({ 
    label, 
    value, 
    onChange, 
    isCount = false
  }: { 
    label: string; 
    value: number; 
    onChange: (value: number) => void;
    isCount?: boolean;
  }) => {
    const [localValue, setLocalValue] = useState(isCount ? value.toString() : value.toString());
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      if (!isFocused) {
        setLocalValue(isCount ? value.toString() : value.toString());
      }
    }, [value, isFocused, isCount]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      // Do not call onChange here to allow free typing
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
      if (localValue === '' || localValue === '.') {
        setLocalValue(isCount ? '0' : '0.0000');
        onChange(0);
        return;
      }

      const num = parseFloat(localValue);
      if (!isNaN(num)) {
        const formatted = isCount ? Math.floor(num).toString() : num.toFixed(4);
        setLocalValue(formatted);
        onChange(isCount ? Math.floor(num) : num);
      } else {
        setLocalValue(isCount ? '0' : '0.0000');
        onChange(0);
      }
    };

    return (
      <div className="flex flex-col space-y-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <input
          id={label}
          type="text"
          inputMode={isCount ? "numeric" : "decimal"}
          value={localValue}
          onFocus={handleFocus}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
          placeholder={isCount ? "Enter count" : "Enter measurement"}
          step={isCount ? "1" : "0.0001"}
        />
      </div>
    );
  };

  const ComponentRow = ({ 
    dimensions,
    onUpdate,
    onRemove,
    isStringer
  }: { 
    dimensions: BoardDimensions | StringerDimensions;
    onUpdate: (field: string, value: number | string) => void;
    onRemove: () => void;
    isStringer: boolean;
  }) => {
    const isGreenPine = dimensions.lumberType === 'Green Pine';
    const isBoard = !isStringer;

    return (
    <div className="flex flex-col space-y-1 bg-white p-2">
      <InputField
        label="Count #"
        value={dimensions.count}
        onChange={(value) => onUpdate('count', value)}
        isCount={true}
      />
      {isStringer ? (
        <InputField
          label="Height (in)"
          value={(dimensions as StringerDimensions).height}
          onChange={(value) => onUpdate('height', value)}
        />
      ) : (
        <InputField
          label="Thickness (in)"
          value={(dimensions as BoardDimensions).thickness}
          onChange={(value) => onUpdate('thickness', value)}
        />
      )}
      
      <InputField
        label="Width (in)"
        value={dimensions.width}
        onChange={(value) => onUpdate('width', value)}
      />
      
      <InputField
        label="Length (in)"
        value={dimensions.length}
        onChange={(value) => onUpdate('length', value)}
      />
      <div className="flex flex-col space-y-1">
        <label className="text-sm font-medium text-gray-700">Lumber</label>
        <select
          value={dimensions.lumberType}
          onChange={(e) => onUpdate('lumberType', e.target.value)}
          className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
        >
          {settings?.lumberPrices ? (
            Object.entries(settings.lumberPrices)
              .filter(([type]) => type !== 'Combo')
              .map(([type]) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))
          ) : (
            <>
              <option value="Recycled">Recycled</option>
              <option value="Green Pine">Green Pine</option>
              <option value="SYP">SYP</option>
            </>
          )}
        </select>
      </div>
    </div>
  )}

  const ComponentSection = ({ 
    title, 
    type,
    components,
    palletId
  }: { 
    title: string; 
    type: keyof Omit<PalletComponents, 'id' | 'name' | 'locationId'>;
    components: BoardDimensions[] | StringerDimensions[];
    palletId: string;
  }) => {
    const isStringer = type === 'stringers';
    const totalBoardFeet = components.reduce((acc, comp) => acc + calculateBoardFeet(comp), 0);

    // Create a unique key based on component values to force re-render
    const componentKey = components.map(c => 
      `${c.id}-${c.count}-${c.width}-${c.length}-${c.type === 'board' ? c.thickness : c.height}`
    ).join('|');

    return (
      <div className="space-y-1" key={componentKey}>
        <div className="flex justify-between items-center border-b border-gray-200 pb-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="text-sm font-medium text-gray-600">
            Board Feet: {totalBoardFeet.toFixed(2)}
          </span>
        </div>

        <div className="bg-gray-50 rounded-lg p-2 w-full">
          {components.map((comp) => (
            <ComponentRow
              key={comp.id}
              dimensions={comp}
              onUpdate={(field, value) => handleComponentChange(palletId, type, comp.id, field, value)}
              onRemove={() => {}}
              isStringer={isStringer}
            />
          ))}
        </div>
      </div>
    );
  };

  const handleAddLocation = async (newLocation: ShippingLocation) => {
    setLocations(prev => [...prev, newLocation]);
    
    // Save to localStorage
    const updatedLocations = [...locations, newLocation];
    localStorage.setItem('shippingLocations', JSON.stringify(updatedLocations));
  };

  const calculateFastenerCost = () => {
    // Default costs if settings are not available
    const fastenerCosts = {
      Standard: settings?.fastenerCosts?.standard || 0.0046,
      'Automatic Nail': settings?.fastenerCosts?.automatic || 0.0065,
      'Specialty Nail': settings?.fastenerCosts?.specialty || 0.01
    };
    
    // Calculate cost based on fastener type for each pallet
    return pallets.reduce((total, pallet) => {
      // Use 'Standard' as default if no fastener type is selected
      const fastenerType = pallet.fastenerType || 'Standard';
      
      const deckBoardCount = pallet.deckBoards.reduce((sum, board) => sum + board.count, 0);
      const leadBoardCount = pallet.leadBoards.reduce((sum, board) => sum + board.count, 0);
      const stringerCount = pallet.stringers.reduce((sum, stringer) => sum + stringer.count, 0);
      
      // Calculate fastener count based on the formula:
      // (deckboards * stringers * 2) + (leadboards * stringers * 3)
      const palletFastenerCount = (deckBoardCount * stringerCount * 2) + 
                                 (leadBoardCount * stringerCount * 3);
      
      const costPerFastener = fastenerCosts[fastenerType as keyof typeof fastenerCosts];
      return total + (palletFastenerCount * costPerFastener);
    }, 0);
  };

  const PalletSection = ({ pallet }: { pallet: PalletComponents }) => {
    const totalBoardFeet = calculatePalletBoardFeet(pallet);

    return (
      <div id={`pallet-${pallet.id}`} className="bg-white rounded-lg border border-gray-200 p-4 min-w-[500px] w-full flex-shrink-0">
        <div className="grid grid-cols-1 gap-3 mb-4">
          <TextInputField
            label="Pallet Name"
            value={pallet.name}
            onChange={(text) => handlePalletChange(pallet.id, 'name', text)}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Shipping Location<span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddLocationModalOpen(true)}
                  className="text-blue-600 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50"
                  title="Add New Location"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <select
                value={pallet.locationId || ''}
                onChange={(e) => handlePalletChange(pallet.id, 'locationId', e.target.value)}
                className={`w-full px-3 py-1.5 bg-gray-50 border rounded-lg shadow-sm focus:ring-1 focus:ring-blue-500 ${
                  error && !pallet.locationId ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
              >
                <option value="">Select a location</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.distance} miles)
                  </option>
                ))}
              </select>
              {error && !pallet.locationId && (
                <p className="text-sm text-red-500 mt-1">Shipping location is required</p>
              )}
            </div>
            
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Transportation Type<span className="text-red-500">*</span>
              </label>
              <select
                value={pallet.transportationType}
                onChange={(e) => handlePalletChange(pallet.id, 'transportationType', e.target.value)}
                className={`w-full px-3 py-1.5 bg-gray-50 border rounded-lg shadow-sm focus:ring-1 focus:ring-blue-500 ${
                  error && !pallet.transportationType ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
              >
                <option value="">Select transportation type</option>
                {settings?.transportationCosts?.baseDeliveryFee && 
                  Object.keys(settings.transportationCosts.baseDeliveryFee).map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))
                }
              </select>
              {error && !pallet.transportationType && (
                <p className="text-sm text-red-500 mt-1">Transportation type is required</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Pallets Per Truck"
              value={pallet.palletsPerTruck}
              onChange={(value) => handlePalletNumberChange(pallet.id, 'palletsPerTruck', value)}
              isCount={true}
            />
            
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Fastener Type
              </label>
              <select
                value={pallet.fastenerType || 'Standard'}
                onChange={(e) => handlePalletChange(pallet.id, 'fastenerType', e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="Standard">Standard</option>
                <option value="Automatic Nail">Automatic Nail</option>
                <option value="Specialty Nail">Specialty Nail</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="space-y-4 mb-4">
          <ComponentSection
            title="Deck Boards"
            type="deckBoards"
            components={pallet.deckBoards}
            palletId={pallet.id}
          />
          <ComponentSection
            title="Lead Boards"
            type="leadBoards"
            components={pallet.leadBoards}
            palletId={pallet.id}
          />
          <ComponentSection
            title="Stringers"
            type="stringers"
            components={pallet.stringers}
            palletId={pallet.id}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            Total Board Feet: {totalBoardFeet.toFixed(2)}
          </span>
          {pallets.length > 1 && (
            <button
              onClick={() => removePallet(pallet.id)}
              className="p-2 text-red-600 hover:text-red-800 transition-colors"
              title="Remove Pallet"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center py-8">
        {error}
      </div>
    );
  }

  const totalBoardFeet = pallets.reduce((acc, pallet) => acc + calculatePalletBoardFeet(pallet), 0);

  const calculateTotalComponents = () => {
    return pallets.reduce((acc, pallet) => {
      return {
        deckBoards: acc.deckBoards + pallet.deckBoards.reduce((sum, board) => sum + board.count, 0),
        leadBoards: acc.leadBoards + pallet.leadBoards.reduce((sum, board) => sum + board.count, 0),
        stringers: acc.stringers + pallet.stringers.reduce((sum, stringer) => sum + stringer.count, 0)
      };
    }, { deckBoards: 0, leadBoards: 0, stringers: 0 });
  };

  const calculateFasteners = () => {
    return pallets.reduce((total, pallet) => {
      const deckBoardCount = pallet.deckBoards.reduce((sum, board) => sum + board.count, 0);
      const leadBoardCount = pallet.leadBoards.reduce((sum, board) => sum + board.count, 0);
      const stringerCount = pallet.stringers.reduce((sum, stringer) => sum + stringer.count, 0);
      
      // Calculate fastener count based on the formula:
      // (deckboards * stringers * 2) + (leadboards * stringers * 3)
      const palletFastenerCount = (deckBoardCount * stringerCount * 2) + 
                                 (leadBoardCount * stringerCount * 3);
      
      return total + palletFastenerCount;
    }, 0);
  };

  const handleCalculatePricing = () => {
    // Check if all pallets have shipping locations
    const missingLocations = pallets.some(pallet => !pallet.locationId);
    if (missingLocations) {
      setError('All pallets must have a shipping location selected');
      return;
    }
    
    // For now, just recalculate the totals
    const components = calculateTotalComponents();
    const fasteners = calculateFasteners();
    setError(''); // Clear any previous errors
  };

  const handleGenerateQuote = async () => {
    // Check if all pallets have shipping locations
    const missingLocations = pallets.some(pallet => !pallet.locationId);
    if (missingLocations) {
      setError('All pallets must have a shipping location selected');
      return;
    }

    setLoading(true);
    try {
      // This will be implemented later with database functionality
      // For now, just show success message
      setTimeout(() => {
        setLoading(false);
        setError(''); // Clear any previous errors
      }, 1000);
    } catch (error) {
      setError('Error generating quote');
      setLoading(false);
    }
  };

  const calculateLumberProcessingCost = () => {
    if (!settings?.lumberProcessingCost) return 0;
    
    // Count all components that are not Green Pine
    let nonGreenPineCount = 0;
    
    pallets.forEach(pallet => {
      // Count deck boards
      pallet.deckBoards.forEach(board => {
        // Only count if lumberType is specified and not Green Pine
        if (board.lumberType && board.lumberType !== 'Green Pine' && board.count > 0) {
          nonGreenPineCount += board.count;
        }
      });
      
      // Count lead boards
      pallet.leadBoards.forEach(board => {
        if (board.lumberType && board.lumberType !== 'Green Pine' && board.count > 0) {
          nonGreenPineCount += board.count;
        }
      });
      
      // Count stringers
      pallet.stringers.forEach(stringer => {
        if (stringer.lumberType && stringer.lumberType !== 'Green Pine' && stringer.count > 0) {
          nonGreenPineCount += stringer.count;
        }
      });
    });
    
    // Multiply by the lumber processing cost
    return nonGreenPineCount * (settings.lumberProcessingCost || 0);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Advanced Quote Calculator</h2>
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
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {pallets.map((pallet, index) => (
            <button
              key={pallet.id}
              onClick={() => {
                const element = document.getElementById(`pallet-${pallet.id}`);
                element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                setActivePalletId(pallet.id);
              }}
              className={`inline-flex items-center px-4 py-2 rounded-t-lg font-medium text-sm transition-colors whitespace-nowrap
                ${pallet.id === activePalletId
                  ? 'bg-white text-blue-600 border-2 border-b-0 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 border border-transparent hover:border-gray-300'
                }`}
            >
              <span className="mr-2">{index + 1}</span>
              <span>{pallet.name || `Unnamed Pallet ${index + 1}`}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex overflow-x-auto snap-x snap-mandatory" ref={scrollContainerRef}>
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
            <PalletSection pallet={pallet} />
          </div>
        ))}
      </div>

      {/* Additional Options Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg">
                <input 
                  type="checkbox" 
                  checked={painted} 
                  onChange={e => setPainted(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500" 
                />
                <span>Painted</span>
              </label>
              <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg">
                <input 
                  type="checkbox" 
                  checked={notched} 
                  onChange={e => setNotched(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500" 
                />
                <span>Notched</span>
              </label>
              <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg">
                <input 
                  type="checkbox" 
                  checked={heatTreated} 
                  onChange={e => setHeatTreated(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500" 
                />
                <span>Heat Treated</span>
              </label>
              <label className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg">
                <input 
                  type="checkbox" 
                  checked={bands} 
                  onChange={e => setBands(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500" 
                />
                <span>Bands</span>
              </label>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-medium text-gray-700">Labor - Build Price ($)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                <input
                  type="number"
                  value={laborBuildPrice}
                  onChange={e => setLaborBuildPrice(Number(e.target.value))}
                  className="w-full pl-8 border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Advanced Pricing Summary</h2>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleCalculatePricing}
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Component Totals</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Deck Boards:</span>
                  <span className="font-medium">{calculateTotalComponents().deckBoards}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Lead Boards:</span>
                  <span className="font-medium">{calculateTotalComponents().leadBoards}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Stringers:</span>
                  <span className="font-medium">{calculateTotalComponents().stringers}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Total Fasteners Required:</span>
                  <span className="font-medium">{calculateFasteners()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fastener Cost:</span>
                  <span className="font-medium">${
                    (() => {
                      const cost = calculateFastenerCost();
                      // For small costs (less than $1), show 3 decimal places
                      return cost < 1 ? cost.toFixed(3) : cost.toFixed(2);
                    })()
                  }</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Delivery Information</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm mb-1">Delivery Fee ($)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                    <input
                      type="number"
                      value={deliveryFee}
                      onChange={e => setDeliveryFee(Number(e.target.value))}
                      className="w-full pl-8 border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Pricing Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Board Feet:</span>
                  <span className="font-medium">{totalBoardFeet.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Lumber Price:</span>
                  <span className="font-medium">${calculateLumberPrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lumber Processing Cost:</span>
                  <span className="font-medium">${calculateLumberProcessingCost().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Additional Options Cost:</span>
                  <span className="font-medium">
                    ${calculateAdditionalOptionsCost().toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Labor - Build Price:</span>
                  <span className="font-medium">${laborBuildPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Total Delivered Cost:</span>
                  <span className="font-medium">${(calculateLumberPrice() + calculateLumberProcessingCost() + calculateAdditionalOptionsCost() + deliveryFee + laborBuildPrice).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-blue-600 font-semibold">
                  <span>30% Net Revenue Price:</span>
                  <span>${((calculateLumberPrice() + calculateLumberProcessingCost() + calculateAdditionalOptionsCost()) * 1.3 + deliveryFee + laborBuildPrice).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add Location Modal */}
      {isAddLocationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Add New Shipping Location</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const newLoc = {
                id: `loc-${Math.random().toString(36).substr(2, 9)}`,
                name: newLocation.name,
                address: newLocation.address,
                distance: Number(newLocation.distance)
              };
              handleAddLocation(newLoc);
              setNewLocation({ name: '', address: '', distance: '' });
              setIsAddLocationModalOpen(false);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Name
                </label>
                <input
                  type="text"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distance (miles)
                </label>
                <input
                  type="number"
                  value={newLocation.distance}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, distance: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddLocationModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 