import { useState } from 'react';
import { TextInputField } from '../inputs/TextInputField';
import { InputField } from '../inputs/InputField';
import type { ShippingLocation } from '@/lib/types/pallet';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (location: Omit<ShippingLocation, 'id'>) => void;
}

export function LocationModal({ isOpen, onClose, onAdd }: LocationModalProps) {
  const [newLocation, setNewLocation] = useState({ name: '', address: '', distance: 0 });
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!newLocation.name || !newLocation.address || !newLocation.distance) {
      setError('Please fill in all fields');
      return;
    }

    onAdd(newLocation);
    setNewLocation({ name: '', address: '', distance: 0 });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Location</h3>
        <div className="space-y-4">
          <TextInputField
            label="Name"
            value={newLocation.name}
            onChange={(value) => setNewLocation(prev => ({ ...prev, name: value }))}
            placeholder="Enter location name"
          />
          <TextInputField
            label="Address"
            value={newLocation.address}
            onChange={(value) => setNewLocation(prev => ({ ...prev, address: value }))}
            placeholder="Enter address"
          />
          <InputField
            label="Distance (miles)"
            value={newLocation.distance}
            onChange={(value) => setNewLocation(prev => ({ ...prev, distance: value }))}
            isCount={false}
          />
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
} 