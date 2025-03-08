'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/supabaseClient';

interface ShippingLocation {
  id: string;
  name: string;
  address: string;
  distance: number;
}

interface Quote {
  id: string;
  salesPerson: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  location: ShippingLocation;
  vehicleType: 'Truck' | 'Dry Van' | 'Flatbed';
  palletDetails: {
    deckBoards: any[];
    leadBoards: any[];
    stringers: any[];
  };
  totalBoardFeet: number;
  createdAt: Date;
}

const generateId = (() => {
  let id = 0;
  return () => {
    id += 1;
    return `id-${id}`;
  };
})();

export default function GeneralQuoteInformation() {
  const [locations, setLocations] = useState<ShippingLocation[]>([]);
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: '', address: '', distance: '' });
  const [error, setError] = useState('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteInfo, setQuoteInfo] = useState({
    salesPerson: '',
    customerName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: ''
  });

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

  const handleAddLocation = async () => {
    if (!newLocation.name || !newLocation.address || !newLocation.distance) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('shipping_locations')
        .insert([{
          name: newLocation.name,
          address: newLocation.address,
          distance: parseFloat(newLocation.distance)
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding location:', error);
        setError('Failed to add shipping location');
        return;
      }

      if (data) {
        setLocations(prev => [...prev, data]);
        setIsAddLocationModalOpen(false);
        setNewLocation({ name: '', address: '', distance: '' });
        setError('');
      }
    } catch (error) {
      console.error('Error adding location:', error);
      setError('Failed to add shipping location');
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shipping_locations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting location:', error);
        setError('Failed to delete shipping location');
        return;
      }

      setLocations(prev => prev.filter(location => location.id !== id));
      setError('');
    } catch (error) {
      console.error('Error deleting location:', error);
      setError('Failed to delete shipping location');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Shipping Locations</h2>
        <button
          onClick={() => setIsAddLocationModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {locations.map((location) => (
          <div
            key={location.id}
            className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{location.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{location.address}</p>
                <p className="mt-1 text-sm text-gray-500">{location.distance} miles</p>
              </div>
              <button
                onClick={() => handleDeleteLocation(location.id)}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isAddLocationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Location</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, address: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="distance" className="block text-sm font-medium text-gray-700">
                  Distance (miles)
                </label>
                <input
                  type="number"
                  id="distance"
                  value={newLocation.distance}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, distance: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsAddLocationModalOpen(false);
                  setNewLocation({ name: '', address: '', distance: '' });
                  setError('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLocation}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 