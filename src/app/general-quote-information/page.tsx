'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/lib/contexts/FirebaseContext';
import { Plus, Trash2 } from 'lucide-react';

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

export default function QuotesPage() {
  const { db } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState<ShippingLocation[]>([]);
  const [newLocation, setNewLocation] = useState({ 
    name: '', 
    address: '', 
    distance: '' 
  });
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteInfo, setQuoteInfo] = useState({
    salesPerson: '',
    customerName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: ''
  });

  useEffect(() => {
    const loadLocations = async () => {
      if (!db) {
        setError('Database connection not available');
        setLoading(false);
        return;
      }

      try {
        // Load locations from Firebase (implement in next iteration)
        setLoading(false);
      } catch (err) {
        setError('Error loading locations');
        setLoading(false);
      }
    };

    loadLocations();
  }, [db]);

  const handleAddLocation = async () => {
    if (!newLocation.name.trim() || !newLocation.address.trim() || !newLocation.distance) return;

    try {
      const location: ShippingLocation = {
        id: generateId(),
        name: newLocation.name.trim(),
        address: newLocation.address.trim(),
        distance: Number(newLocation.distance)
      };

      const updatedLocations = [...locations, location];
      setLocations(updatedLocations);
      setNewLocation({ name: '', address: '', distance: '' });
      localStorage.setItem('shippingLocations', JSON.stringify(updatedLocations));
    } catch (error) {
      console.error('Error adding location:', error);
    }
  };

  const handleRemoveLocation = (locationId: string) => {
    // Check if location is used in any quotes before removing
    const isUsed = quotes.some(quote => quote.location.id === locationId);
    if (isUsed) {
      alert('Cannot remove location as it is used in existing quotes');
      return;
    }

    const updatedLocations = locations.filter(loc => loc.id !== locationId);
    setLocations(updatedLocations);
    localStorage.setItem('shippingLocations', JSON.stringify(updatedLocations));
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

  return (
    <div className="space-y-8">
      {/* Quote Information Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quote Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">Salesperson <span className="text-red-500">*</span></label>
            <select name="salesperson" value={quoteInfo.salesPerson} onChange={(e) => setQuoteInfo(prev => ({ ...prev, salesPerson: e.target.value }))} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
              <option value="" disabled>Please select a salesperson</option>
              <option value="John Doe">John Doe</option>
              <option value="Jane Smith">Jane Smith</option>
              {/* Add more salesperson options as needed */}
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">Customer Name</label>
            <input
              type="text"
              value={quoteInfo.customerName}
              onChange={(e) => setQuoteInfo(prev => ({ ...prev, customerName: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter customer name"
            />
          </div>
        </div>
      </div>

      {/* Add Location Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Shipping Location</h2>
        <div className="grid grid-cols-5 gap-4">
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
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">Distance (miles)</label>
            <input
              type="number"
              value={newLocation.distance}
              onChange={(e) => setNewLocation(prev => ({ ...prev, distance: e.target.value }))}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Enter distance"
              min="0"
              step="1"
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
      </div>

      {/* Locations List */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping Locations</h2>
        {locations.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No shipping locations added yet.</p>
        ) : (
          <div className="space-y-4">
            {locations.map(location => (
              <div key={location.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
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
    </div>
  );
} 