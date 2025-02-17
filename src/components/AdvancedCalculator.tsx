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

interface ShippingDetails {
  locationId: string | null;
  vehicleType: 'Truck' | 'Dry Van' | 'Flatbed';
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
  deckBoards: {
    components: BoardDimensions[];
    shipping: ShippingDetails;
  };
  leadBoards: {
    components: BoardDimensions[];
    shipping: ShippingDetails;
  };
  stringers: {
    components: StringerDimensions[];
    shipping: ShippingDetails;
  };
}

const defaultShipping: ShippingDetails = {
  locationId: null,
  vehicleType: 'Truck'
};

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

const initialComponents: ComponentType = {
  deckBoards: {
    components: [createBoard('board')],
    shipping: { ...defaultShipping }
  },
  leadBoards: {
    components: [createBoard('board')],
    shipping: { ...defaultShipping }
  },
  stringers: {
    components: [createStringer()],
    shipping: { ...defaultShipping }
  }
};

export default function AdvancedCalculator() {
  const { db } = useFirebase();
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shippingLocations, setShippingLocations] = useState<ShippingLocation[]>([]);
  const [newLocation, setNewLocation] = useState({ name: '', address: '' });
  const [totalBoardFeet, setTotalBoardFeet] = useState<number>(0);
  const [components, setComponents] = useState<ComponentType>(initialComponents);

  useEffect(() => {
    const loadSettings = async () => {
      if (!db) {
        setError('Database connection not available');
        setLoading(false);
        return;
      }

      try {
        // Load settings logic here (will implement in next iteration)
        setLoading(false);
      } catch (err) {
        setError('Error loading settings');
        setLoading(false);
      }
    };

    loadSettings();
  }, [db]);

  const calculateBoardFeet = (dimensions: BoardDimensions | StringerDimensions) => {
    const { count, width, length } = dimensions;
    const thickness = dimensions.type === 'board' ? dimensions.thickness : dimensions.height;
    return Number((count * thickness * width * length / 144).toFixed(2));
  };

  useEffect(() => {
    const deckBoardFeet = components.deckBoards.components.reduce((acc, board) => acc + calculateBoardFeet(board), 0);
    const leadBoardFeet = components.leadBoards.components.reduce((acc, board) => acc + calculateBoardFeet(board), 0);
    const stringerBoardFeet = components.stringers.components.reduce((acc, stringer) => acc + calculateBoardFeet(stringer), 0);
    
    setTotalBoardFeet(Number((deckBoardFeet + leadBoardFeet + stringerBoardFeet).toFixed(2)));
  }, [components]);

  const handleComponentChange = (
    componentType: keyof ComponentType,
    id: string,
    field: string,
    value: number | string
  ) => {
    setComponents(prev => ({
      ...prev,
      [componentType]: {
        ...prev[componentType],
        components: prev[componentType].components.map(item => 
          item.id === id 
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
    }));
  };

  const addComponent = (type: keyof ComponentType) => {
    setComponents(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        components: [...prev[type].components, type === 'stringers' ? createStringer() : createBoard('board')]
      }
    }));
  };

  const removeComponent = (type: keyof ComponentType, id: string) => {
    if (components[type].components.length <= 1) return; // Keep at least one component
    setComponents(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        components: prev[type].components.filter(item => item.id !== id)
      }
    }));
  };

  const handleShippingChange = async (
    componentType: keyof ComponentType,
    field: keyof ShippingDetails,
    value: string
  ) => {
    setComponents(prev => ({
      ...prev,
      [componentType]: {
        ...prev[componentType],
        shipping: {
          ...prev[componentType].shipping,
          [field]: value
        }
      }
    }));
  };

  const handleAddLocation = async () => {
    if (!newLocation.name.trim() || !newLocation.address.trim()) return;

    try {
      // Use a more stable way to calculate distance during development
      const distance = 100; // Fixed distance for development

      const location: ShippingLocation = {
        id: generateId(),
        name: newLocation.name.trim(),
        address: newLocation.address.trim(),
        distance
      };

      setShippingLocations(prev => [...prev, location]);
      setNewLocation({ name: '', address: '' });
    } catch (error) {
      console.error('Error adding location:', error);
    }
  };

  const handleRemoveLocation = (locationId: string) => {
    setShippingLocations(prev => prev.filter(loc => loc.id !== locationId));
    
    // Clear this location from any components using it
    setComponents(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        const componentType = key as keyof ComponentType;
        if (updated[componentType].shipping.locationId === locationId) {
          updated[componentType].shipping.locationId = null;
        }
      });
      return updated;
    });
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
    <div className="grid grid-cols-6 gap-4 items-start bg-white p-4 rounded-lg border border-gray-200">
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
          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
        >
          {settings?.lumberPrices ? (
            Object.keys(settings.lumberPrices).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))
          ) : (
            <option value="Recycled">Recycled</option>
          )}
        </select>
      </div>
      <div className="flex items-end h-full">
        <button
          onClick={onRemove}
          className="p-2 text-red-600 hover:text-red-800 transition-colors"
          title="Remove"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const ShippingSelector = ({
    type,
    shipping,
    settings
  }: {
    type: keyof ComponentType;
    shipping: ShippingDetails;
    settings: GlobalSettings | null;
  }) => (
    <div className="bg-gray-50 p-4 rounded-lg mb-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-700">Ship To Location</label>
          <select
            value={shipping.locationId || ''}
            onChange={(e) => handleShippingChange(type, 'locationId', e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a location</option>
            {shippingLocations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name} ({location.distance} miles)
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-700">Vehicle Type</label>
          <select
            value={shipping.vehicleType}
            onChange={(e) => handleShippingChange(type, 'vehicleType', e.target.value as ShippingDetails['vehicleType'])}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {settings?.transportationCosts.baseDeliveryFee ? (
              Object.keys(settings.transportationCosts.baseDeliveryFee).map((vehicle) => (
                <option key={vehicle} value={vehicle}>
                  {vehicle}
                </option>
              ))
            ) : (
              <>
                <option value="Truck">Truck</option>
                <option value="Dry Van">Dry Van</option>
                <option value="Flatbed">Flatbed</option>
              </>
            )}
          </select>
        </div>
      </div>
    </div>
  );

  const ComponentSection = ({ 
    title, 
    type,
    components: sectionComponents
  }: { 
    title: string; 
    type: keyof ComponentType;
    components: ComponentType[keyof ComponentType];
  }) => {
    const isStringer = type === 'stringers';
    const totalBoardFeet = sectionComponents.components.reduce((acc, comp) => acc + calculateBoardFeet(comp), 0);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Board Feet: {totalBoardFeet.toFixed(2)}
            </span>
            <button
              onClick={() => addComponent(type)}
              className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
              title={`Add ${title}`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <ShippingSelector
          type={type}
          shipping={sectionComponents.shipping}
          settings={settings}
        />

        <div className="space-y-4">
          {sectionComponents.components.map((comp) => (
            <ComponentRow
              key={comp.id}
              dimensions={comp}
              onUpdate={(field, value) => handleComponentChange(type, comp.id, field, value)}
              onRemove={() => removeComponent(type, comp.id)}
              isStringer={isStringer}
            />
          ))}
        </div>
      </div>
    );
  };

  const ShippingLocationsSection = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Locations</h3>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-700">Location Name</label>
          <input
            type="text"
            value={newLocation.name}
            onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Warehouse A"
          />
        </div>
        <div className="flex flex-col space-y-1 col-span-2">
          <label className="text-sm font-medium text-gray-700">Delivery Address</label>
          <input
            type="text"
            value={newLocation.address}
            onChange={(e) => setNewLocation(prev => ({ ...prev, address: e.target.value }))}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Enter delivery address"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleAddLocation}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            type="button"
          >
            Add Location
          </button>
        </div>
      </div>

      {shippingLocations.length > 0 && (
        <div className="space-y-2">
          {shippingLocations.map(location => (
            <div key={location.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{location.name}</div>
                <div className="text-sm text-gray-600">{location.address}</div>
                <div className="text-sm text-gray-500">Distance: {location.distance} miles</div>
              </div>
              <button
                onClick={() => handleRemoveLocation(location.id)}
                className="p-2 text-red-600 hover:text-red-800 transition-colors"
                type="button"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Advanced Pricing Calculator</h2>
        <div className="text-lg font-semibold text-blue-600">
          Total Board Feet: {totalBoardFeet.toFixed(2)}
        </div>
      </div>
      
      <ShippingLocationsSection />
      
      <div className="space-y-8">
        <ComponentSection
          title="Deck Boards"
          type="deckBoards"
          components={components.deckBoards}
        />
        
        <ComponentSection
          title="Lead Boards"
          type="leadBoards"
          components={components.leadBoards}
        />
        
        <ComponentSection
          title="Stringers"
          type="stringers"
          components={components.stringers}
        />
      </div>
    </div>
  );
} 