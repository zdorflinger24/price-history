import { TextInputField } from '../inputs/TextInputField';
import { ComponentRow } from './ComponentRow';
import { Plus } from 'lucide-react';
import type { PalletComponents, ShippingLocation } from '@/lib/types/pallet';
import type { GlobalSettings } from '@/lib/types';

interface PalletComponentProps {
  pallet: PalletComponents;
  locations: ShippingLocation[];
  settings: GlobalSettings;
  onUpdate: (field: string, value: string | number) => void;
  onComponentChange: (
    componentType: keyof Pick<PalletComponents, 'deckBoards' | 'leadBoards' | 'stringers'>,
    componentId: string,
    field: string,
    value: number | string
  ) => void;
  onAddComponent: (type: keyof Pick<PalletComponents, 'deckBoards' | 'leadBoards' | 'stringers'>) => void;
  onRemoveComponent: (
    type: keyof Pick<PalletComponents, 'deckBoards' | 'leadBoards' | 'stringers'>,
    componentId: string
  ) => void;
  onRemove: () => void;
}

export function PalletComponent({
  pallet,
  locations,
  settings,
  onUpdate,
  onComponentChange,
  onAddComponent,
  onRemoveComponent,
  onRemove
}: PalletComponentProps) {
  const lumberTypes = Object.keys(settings.lumberPrices || {});

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Basic Info Section */}
      <div className="p-4">
        <TextInputField
          label="Pallet Name"
          value={pallet.name}
          onChange={(value) => onUpdate('name', value)}
          placeholder="Enter pallet name"
        />
      </div>

      {/* Location and Transportation Section */}
      <div className="border-t border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              value={pallet.locationId || ''}
              onChange={(e) => onUpdate('locationId', e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select location</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transportation Type</label>
            <select
              value={pallet.transportationType}
              onChange={(e) => onUpdate('transportationType', e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select type</option>
              {Object.keys(settings.transportationCosts?.baseDeliveryFee || {}).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Components Sections */}
      <div className="border-t border-gray-200">
        {/* Deck Boards */}
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Deck Boards</h3>
            <button
              onClick={() => onAddComponent('deckBoards')}
              className="inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-5 w-5 mr-1" />
              Add Board
            </button>
          </div>
          <div className="space-y-4">
            {pallet.deckBoards.map(board => (
              <ComponentRow
                key={board.id}
                dimensions={board}
                onUpdate={(field, value) => onComponentChange('deckBoards', board.id, field, value)}
                onRemove={() => onRemoveComponent('deckBoards', board.id)}
                isStringer={false}
                lumberTypes={lumberTypes}
              />
            ))}
          </div>
        </div>

        {/* Lead Boards */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Lead Boards</h3>
            <button
              onClick={() => onAddComponent('leadBoards')}
              className="inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-5 w-5 mr-1" />
              Add Board
            </button>
          </div>
          <div className="space-y-4">
            {pallet.leadBoards.map(board => (
              <ComponentRow
                key={board.id}
                dimensions={board}
                onUpdate={(field, value) => onComponentChange('leadBoards', board.id, field, value)}
                onRemove={() => onRemoveComponent('leadBoards', board.id)}
                isStringer={false}
                lumberTypes={lumberTypes}
              />
            ))}
          </div>
        </div>

        {/* Stringers */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Stringers</h3>
            <button
              onClick={() => onAddComponent('stringers')}
              className="inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-5 w-5 mr-1" />
              Add Stringer
            </button>
          </div>
          <div className="space-y-4">
            {pallet.stringers.map(stringer => (
              <ComponentRow
                key={stringer.id}
                dimensions={stringer}
                onUpdate={(field, value) => onComponentChange('stringers', stringer.id, field, value)}
                onRemove={() => onRemoveComponent('stringers', stringer.id)}
                isStringer={true}
                lumberTypes={lumberTypes}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Fastener Type */}
      <div className="border-t border-gray-200 p-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fastener Type</label>
          <select
            value={pallet.fastenerType}
            onChange={(e) => onUpdate('fastenerType', e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="Standard">Standard</option>
            <option value="Automatic">Automatic</option>
            <option value="Specialty">Specialty</option>
          </select>
        </div>
      </div>
    </div>
  );
} 