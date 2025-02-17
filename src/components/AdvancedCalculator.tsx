'use client';

import { useState, useEffect } from 'react';
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

export default function AdvancedCalculator() {
  const { db } = useFirebase();
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pallets, setPallets] = useState<PalletComponents[]>([createNewPallet()]);
  const [locations, setLocations] = useState<ShippingLocation[]>([]);

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
    const [localValue, setLocalValue] = useState(isCount ? value.toString() : value.toFixed(2));
    
    useEffect(() => {
      if (document.activeElement !== document.getElementById(label)) {
        setLocalValue(isCount ? value.toString() : value.toFixed(2));
      }
    }, [value, isCount, label]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      
      if (newValue === '' || newValue === '.') {
        return;
      }

      if (isCount) {
        const intValue = parseInt(newValue);
        if (!isNaN(intValue) && intValue >= 0) {
          onChange(intValue);
        }
      } else {
        const num = parseFloat(newValue);
        if (!isNaN(num)) {
          onChange(num);
        }
      }
    };

    const handleBlur = () => {
      if (localValue === '' || localValue === '.') {
        setLocalValue(isCount ? '0' : '0.00');
        onChange(0);
        return;
      }

      const num = parseFloat(localValue);
      if (!isNaN(num)) {
        setLocalValue(isCount ? Math.floor(num).toString() : num.toFixed(2));
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
    <div className="flex flex-col space-y-2 bg-white p-3">
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
              .filter(([type]) => type !== 'Hardwood')
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
      <div className="space-y-2">
        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="text-sm font-medium text-gray-600">
            Board Feet: {totalBoardFeet.toFixed(2)}
          </span>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 w-80">
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
      <div className="bg-white rounded-lg border border-gray-200 p-4 w-[500px] flex-shrink-0">
        <div className="grid grid-cols-1 gap-3 mb-4">
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">Pallet Name</label>
            <input
              type="text"
              value={pallet.name}
              onChange={(e) => handlePalletChange(pallet.id, 'name', e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
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

        <div className="space-y-4">
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
      
      <div className="flex space-x-6 overflow-x-auto pb-4">
        {pallets.map(pallet => (
          <PalletSection key={pallet.id} pallet={pallet} />
        ))}
      </div>
    </div>
  );
} 