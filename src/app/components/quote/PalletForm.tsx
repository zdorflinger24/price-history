import { useState } from 'react';
import type { PalletData, ShippingLocation } from '@/lib/types/quote';
import type { GlobalSettings } from '@/lib/types';

interface PalletFormProps {
  pallet: PalletData;
  locations: ShippingLocation[];
  settings: GlobalSettings;
  onUpdate: (palletId: string, field: string, value: string | boolean) => void;
  onRemove: () => void;
}

export function PalletForm({ pallet, locations, settings, onUpdate, onRemove }: PalletFormProps) {
  return (
    <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pallet Name
          </label>
          <input
            type="text"
            name="palletName"
            placeholder="Enter pallet name"
            value={pallet.palletName}
            onChange={(e) => onUpdate(pallet.id, 'palletName', e.target.value)}
            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location <span className="text-red-500">*</span>
          </label>
          <select
            name="locationId"
            value={pallet.locationId}
            onChange={(e) => onUpdate(pallet.id, 'locationId', e.target.value)}
            className={`w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
              !pallet.locationId ? 'text-gray-500' : 'text-gray-900'
            }`}
            required
          >
            <option value="">Select location</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </div>

        {/* Transportation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transportation Type <span className="text-red-500">*</span>
          </label>
          <select
            name="transportationType"
            value={pallet.transportationType}
            onChange={(e) => onUpdate(pallet.id, 'transportationType', e.target.value)}
            className={`w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
              !pallet.transportationType ? 'text-gray-500' : 'text-gray-900'
            }`}
            required
          >
            <option value="">Select type</option>
            {Object.keys(settings.transportationCosts.baseDeliveryFee).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Pallets Per Truck */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pallets Per Truck <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="palletsPerTruck"
            placeholder="Enter number of pallets"
            value={pallet.palletsPerTruck}
            onChange={(e) => onUpdate(pallet.id, 'palletsPerTruck', e.target.value)}
            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
            min="1"
          />
        </div>

        {/* Dimensions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Length (inches) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="length"
            placeholder="Enter length"
            value={pallet.length}
            onChange={(e) => onUpdate(pallet.id, 'length', e.target.value)}
            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
            min="0"
            step="0.125"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Width (inches) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="width"
            placeholder="Enter width"
            value={pallet.width}
            onChange={(e) => onUpdate(pallet.id, 'width', e.target.value)}
            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
            min="0"
            step="0.125"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Board Feet <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="boardFeet"
            placeholder="Enter board feet"
            value={pallet.boardFeet}
            onChange={(e) => onUpdate(pallet.id, 'boardFeet', e.target.value)}
            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
            min="0"
            step="0.01"
          />
        </div>

        {/* Lumber Details */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lumber Type <span className="text-red-500">*</span>
          </label>
          <select
            name="lumberType"
            value={pallet.lumberType}
            onChange={(e) => onUpdate(pallet.id, 'lumberType', e.target.value)}
            className={`w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
              !pallet.lumberType ? 'text-gray-500' : 'text-gray-900'
            }`}
            required
          >
            <option value="">Select type</option>
            {Object.keys(settings.lumberPrices).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Build Intricacy <span className="text-red-500">*</span>
          </label>
          <select
            name="buildIntricacy"
            value={pallet.buildIntricacy}
            onChange={(e) => onUpdate(pallet.id, 'buildIntricacy', e.target.value)}
            className={`w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
              !pallet.buildIntricacy ? 'text-gray-500' : 'text-gray-900'
            }`}
            required
          >
            <option value="">Select build complexity</option>
            {Object.keys(settings.buildIntricacyCosts).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Additional Options */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Options
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="heatTreated"
                checked={pallet.heatTreated}
                onChange={(e) => onUpdate(pallet.id, 'heatTreated', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Heat Treated</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="notched"
                checked={pallet.notched}
                onChange={(e) => onUpdate(pallet.id, 'notched', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Notched</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="painted"
                checked={pallet.painted}
                onChange={(e) => onUpdate(pallet.id, 'painted', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Painted</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="bands"
                checked={pallet.bands}
                onChange={(e) => onUpdate(pallet.id, 'bands', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Bands</span>
            </label>
          </div>
        </div>
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
} 