import { BoardDimensions, StringerDimensions } from '@/lib/types/pallet';
import { InputField } from '../inputs/InputField';
import { Trash2 } from 'lucide-react';

interface ComponentRowProps {
  dimensions: BoardDimensions | StringerDimensions;
  onUpdate: (field: string, value: number | string) => void;
  onRemove: () => void;
  isStringer: boolean;
  lumberTypes: string[];
}

export function ComponentRow({ dimensions, onUpdate, onRemove, isStringer, lumberTypes }: ComponentRowProps) {
  const isGreenPine = dimensions.lumberType === 'Green Pine';
  const isBoard = !isStringer;

  return (
    <div className="flex flex-col space-y-1 bg-white p-2">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
          <label className="text-sm font-medium text-gray-700">Lumber Type</label>
          <select
            value={dimensions.lumberType}
            onChange={(e) => onUpdate('lumberType', e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select type</option>
            {lumberTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={onRemove}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
} 