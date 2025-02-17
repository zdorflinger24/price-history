'use client';

import { useState, useEffect, useRef } from 'react';
import { useFirebase } from '@/lib/contexts/FirebaseContext';
import { Plus, Trash2 } from 'lucide-react';
import type { GlobalSettings } from '@/lib/types';

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
  deckBoards: BoardDimensions[];
  leadBoards: BoardDimensions[];
  stringers: StringerDimensions[];
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
  lumberType: 'Recycled'
});

const createStringer = (): StringerDimensions => ({
  id: generateId(),
  count: 0,
  width: 0,
  height: 0,
  length: 0,
  type: 'stringer',
  lumberType: 'Recycled'
});

const createNewPallet = (): PalletComponents => ({
  id: generateId(),
  name: `Pallet ${generateId()}`,
  locationId: null,
  deckBoards: [createBoard('board')],
  leadBoards: [createBoard('board')],
  stringers: [createStringer()]
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
  const [pallets, setPallets] = useState<PalletComponents[]>([createNewPallet()]);
  const [locations, setLocations] = useState<ShippingLocation[]>([]);
  const [painted, setPainted] = useState<boolean>(false);
  const [notched, setNotched] = useState<boolean>(false);
  const [heatTreated, setHeatTreated] = useState<boolean>(false);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [activePalletId, setActivePalletId] = useState(pallets[0]?.id);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!db) {
        setError('Database connection not available');
        setLoading(false);
        return;
      }

      try {
        // Load settings and locations from Firebase
        setLoading(false);
      } catch (err) {
        setError('Error loading data');
        setLoading(false);
      }
    };

    loadData();
  }, [db]);

  useEffect(() => {
    const storedLocations = localStorage.getItem('shippingLocations');
    if (storedLocations) {
      setLocations(JSON.parse(storedLocations));
    }
  }, []);

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
    return Number((count * thickness * width * length / 144).toFixed(2));
  };

  const calculatePalletBoardFeet = (pallet: PalletComponents) => {
    const deckBoardFeet = pallet.deckBoards.reduce((acc, board) => acc + calculateBoardFeet(board), 0);
    const leadBoardFeet = pallet.leadBoards.reduce((acc, board) => acc + calculateBoardFeet(board), 0);
    const stringerBoardFeet = pallet.stringers.reduce((acc, stringer) => acc + calculateBoardFeet(stringer), 0);
    return Number((deckBoardFeet + leadBoardFeet + stringerBoardFeet).toFixed(2));
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
            [componentType]: pallet[componentType].map(item =>
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

  const handlePalletChange = (palletId: string, field: keyof Pick<PalletComponents, 'name' | 'locationId'>, value: string) => {
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
              ? pallet[type].filter(item => item.id !== componentId)
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
        setLocalValue(isCount ? '0' : '0.00');
        onChange(0);
        return;
      }

      const num = parseFloat(localValue);
      if (!isNaN(num)) {
        const formatted = isCount ? Math.floor(num).toString() : num.toFixed(2);
        setLocalValue(formatted);
        onChange(isCount ? Math.floor(num) : num);
      } else {
        setLocalValue(isCount ? '0' : '0.00');
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
  }) => (
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
              .map(([type]) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))
          ) : (
            <>
              <option value="Recycled">Recycled</option>
              <option value="Combo">Combo</option>
              <option value="Green Pine">Green Pine</option>
              <option value="SYP">SYP</option>
            </>
          )}
        </select>
      </div>
    </div>
  );

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

    return (
      <div className="space-y-1">
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
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">Shipping Location</label>
            <select
              value={pallet.locationId || ''}
              onChange={(e) => handlePalletChange(pallet.id, 'locationId', e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a location</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.distance} miles)
                </option>
              ))}
            </select>
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
    const components = calculateTotalComponents();
    return (components.deckBoards + components.leadBoards) * components.stringers * 2;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Advanced Pricing Calculator</h2>
        <div className="flex items-center space-x-6">
          <div className="text-lg font-semibold text-blue-600">
            Total Board Feet: {totalBoardFeet.toFixed(2)}
          </div>
          <button
            onClick={addPallet}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Pallet</span>
          </button>
        </div>
      </div>
      
      {pallets.length > 1 && (
        <div className="flex justify-center space-x-4 mb-4">
          {pallets.map((pallet, index) => (
            <div key={pallet.id} className="flex flex-col items-center">
              <button
                onClick={() => {
                  setActivePalletId(pallet.id);
                  const el = document.getElementById(`pallet-${pallet.id}`);
                  if (el) { el.scrollIntoView({ behavior: 'smooth', inline: 'center' }); }
                }}
                className={`w-3 h-3 rounded-full ${activePalletId === pallet.id ? 'bg-blue-600' : 'bg-gray-400'}`}
                title={pallet.name}
              ></button>
              <span className="text-xs mt-1">{pallet.name}</span>
            </div>
          ))}
        </div>
      )}

      <div ref={scrollContainerRef} className="flex space-x-6 overflow-x-auto pb-4">
        {pallets.map(pallet => (
          <PalletSection key={pallet.id} pallet={pallet} />
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-8">
        <h2 className="text-xl font-bold mb-4">Advanced Pricing Summary</h2>
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
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Additional Options</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" checked={painted} onChange={e => setPainted(e.target.checked)} className="mr-2" />
                  <span>Painted (+75%)</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={notched} onChange={e => setNotched(e.target.checked)} className="mr-2" />
                  <span>Notched (+85%)</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={heatTreated} onChange={e => setHeatTreated(e.target.checked)} className="mr-2" />
                  <span>Heat Treated (+100%)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Delivery Information</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm mb-1">Delivery Fee ($)</label>
                  <input
                    type="number"
                    value={deliveryFee}
                    onChange={e => setDeliveryFee(Number(e.target.value))}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
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
                  <span>Additional Options Cost:</span>
                  <span className="font-medium">
                    +{((painted ? 75 : 0) + (notched ? 85 : 0) + (heatTreated ? 100 : 0))}%
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Total Delivered Cost:</span>
                  <span className="font-medium">${(totalBoardFeet * (1 + (painted ? 0.75 : 0) + (notched ? 0.85 : 0) + (heatTreated ? 1 : 0)) + deliveryFee).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-blue-600 font-semibold">
                  <span>30% Net Revenue Price:</span>
                  <span>${(totalBoardFeet * (1 + (painted ? 0.75 : 0) + (notched ? 0.85 : 0) + (heatTreated ? 1 : 0)) * 1.3 + deliveryFee).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 