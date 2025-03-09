"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { FiInfo } from "react-icons/fi";
import { CalculatorIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";


interface CustomerInfo {
  name: string;
  address: string;
}

interface PalletQuote {
  id: string;
  name: string;
  piecework: number | null;
  fuelFreight: number | null;
  profitMargin: number;
  services: {
    heatTreated: boolean;
    stamped: boolean;
    painted: boolean;
    binded: boolean;
    notched: boolean;
  };
  lumberDimensions: {
    id: string;
    type: string;
    thickness: number;
    width: number;
    length: number;
    quantity: number;
    woodType: string;
    boardFeet?: number;
  }[];
}


export default function PalletCalculator() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    address: ""
  });

  const [pallets, setPallets] = useState<PalletQuote[]>([{
    id: "1",
    name: "",
    piecework: null,
    fuelFreight: null,
    profitMargin: 30,
    services: {
      heatTreated: false,
      stamped: false,
      painted: false,
      binded: false,
      notched: false
    },
    lumberDimensions: [
      { id: "1", type: "Stringers", thickness: 0, width: 0, length: 0, quantity: 0, woodType: "SYP" },
      { id: "2", type: "Top Deck", thickness: 0, width: 0, length: 0, quantity: 0, woodType: "SYP" },
      { id: "3", type: "Top Lead Deck", thickness: 0, width: 0, length: 0, quantity: 0, woodType: "SYP" },
      { id: "4", type: "Bottom Deck", thickness: 0, width: 0, length: 0, quantity: 0, woodType: "SYP" },
      { id: "5", type: "Bottom Lead Deck", thickness: 0, width: 0, length: 0, quantity: 0, woodType: "SYP" }
    ]
  }]);

  const [calculatedValues, setCalculatedValues] = useState<{[key: string]: {
    breakEvenPrice: number | null;
    profit: number | null;
    suggestedPrice: number | null;
    lumberCost: number | null;
    nailCost: number | null;
    overheadCost: number | null;
    pieceworkCost: number | null;
    fuelFreightCost: number | null;
    servicesCost: number;
  }}>({
    "1": {
      breakEvenPrice: null,
      profit: null,
      suggestedPrice: null,
      lumberCost: null,
      nailCost: null,
      overheadCost: null,
      pieceworkCost: null,
      fuelFreightCost: null,
      servicesCost: 0
    }
  });

  const [nailPrice, setNailPrice] = useState(0.0078);
  const [overhead, setOverhead] = useState(1.50);
  const [lumberTypes, setLumberTypes] = useState([
    { id: "1", name: "SYP", pricePerBoardFoot: 0.400 },
    { id: "2", name: "Green Pine", pricePerBoardFoot: 0.550 },
    { id: "3", name: "Recycled", pricePerBoardFoot: 0.150 }
  ]);
  const [servicePrices, setServicePrices] = useState({
    heatTreated: 1.50,
    stamped: 0.25,
    painted: 2.00,
    binded: 0.75,
    notched: 0.50
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedOverhead = localStorage.getItem('overhead');
    const savedNailPrice = localStorage.getItem('nailPrice');
    const savedLumberTypes = localStorage.getItem('lumberTypes');
    const savedServicePrices = localStorage.getItem('servicePrices');
    
    if (savedOverhead) {
      setOverhead(Number(savedOverhead));
    }
    if (savedNailPrice) {
      setNailPrice(Number(savedNailPrice));
    }
    if (savedLumberTypes) {
      const loadedLumberTypes = JSON.parse(savedLumberTypes);
      // Update any old "Southern Yellow Pine" references to "SYP"
      setLumberTypes(loadedLumberTypes.map((type: any) => ({
        id: type.id,
        name: type.name === "Southern Yellow Pine" ? "SYP" : type.name,
        pricePerBoardFoot: type.pricePerMBF / 1000
      })));
    }
    if (savedServicePrices) {
      setServicePrices(JSON.parse(savedServicePrices));
    }

    // Force update localStorage with current values to ensure "SYP" is saved
    localStorage.setItem('lumberTypes', JSON.stringify([
      { id: "1", name: "SYP", pricePerMBF: 400 },
      { id: "2", name: "Green Pine", pricePerMBF: 550 },
      { id: "3", name: "Recycled", pricePerMBF: 150 }
    ]));

    // Listen for settings updates
    const handleSettingsUpdate = () => {
      const updatedOverhead = localStorage.getItem('overhead');
      const updatedNailPrice = localStorage.getItem('nailPrice');
      const updatedLumberTypes = localStorage.getItem('lumberTypes');
      const updatedServicePrices = localStorage.getItem('servicePrices');
      
      if (updatedOverhead) {
        setOverhead(Number(updatedOverhead));
      }
      if (updatedNailPrice) {
        setNailPrice(Number(updatedNailPrice));
      }
      if (updatedLumberTypes) {
        const loadedLumberTypes = JSON.parse(updatedLumberTypes);
        setLumberTypes(loadedLumberTypes.map((type: any) => ({
          id: type.id,
          name: type.name === "Southern Yellow Pine" ? "SYP" : type.name,
          pricePerBoardFoot: type.pricePerMBF / 1000
        })));
      }
      if (updatedServicePrices) {
        setServicePrices(JSON.parse(updatedServicePrices));
      }
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  // Add automatic calculation effect
  useEffect(() => {
    calculateAll();
  }, [pallets, nailPrice, overhead]);

  const handleServiceToggle = (palletId: string, service: keyof PalletQuote["services"]) => {
    setPallets(prev => prev.map(pallet => {
      if (pallet.id === palletId) {
        return {
          ...pallet,
          services: {
            ...pallet.services,
            [service]: !pallet.services[service]
          }
        };
      }
      return pallet;
    }));
  };

  const calculateBoardFeet = (item: PalletQuote['lumberDimensions'][0]) => {
    return (item.thickness * item.width * item.length * item.quantity) / 144;
  };

  const handleLumberDimensionChange = (palletId: string, itemId: string, field: keyof Omit<PalletQuote['lumberDimensions'][0], 'id' | 'type'>, value: any) => {
    setPallets(prev => prev.map(pallet => {
      if (pallet.id === palletId) {
        return {
          ...pallet,
          lumberDimensions: pallet.lumberDimensions.map(item => {
            if (item.id === itemId) {
              const updatedItem = { ...item, [field]: value };
              return {
                ...updatedItem,
                boardFeet: calculateBoardFeet(updatedItem)
              };
            }
            return item;
          })
        };
      }
      return pallet;
    }));
  };

  const calculateNailCount = () => {
    // Get total deck boards (both top and bottom)
    const deckBoards = pallets.reduce((total, pallet) => {
      return total + pallet.lumberDimensions.reduce((total, item) => {
        if (item.type.includes('Deck')) {
          return total + item.quantity;
        }
        return total;
      }, 0);
    }, 0);

    // Get number of stringers
    const stringers = pallets.reduce((total, pallet) => {
      const stringer = pallet.lumberDimensions.find(item => item.type === 'Stringers');
      return total + (stringer?.quantity || 0);
    }, 0);

    // Each deck board needs 2 nails per stringer
    return deckBoards * stringers * 2;
  };

  const calculateServicesCost = () => {
    return pallets.reduce((total, pallet) => {
      return total + Object.entries(pallet.services).reduce((total, [service, isSelected]) => {
        if (!isSelected) return total;
        return total + (servicePrices[service as keyof typeof servicePrices] || 0);
      }, 0);
    }, 0);
  };

  const calculateAll = () => {
    const newCalculatedValues: typeof calculatedValues = {};
    
    pallets.forEach(pallet => {
      // Calculate nail cost for this pallet
      const deckBoards = pallet.lumberDimensions.reduce((total, item) => {
        if (item.type.includes('Deck')) {
          return total + item.quantity;
        }
        return total;
      }, 0);
      
      const stringer = pallet.lumberDimensions.find(item => item.type === 'Stringers');
      const stringerCount = stringer?.quantity || 0;
      
      const nailCount = deckBoards * stringerCount * 2;
      const nailCost = nailCount * nailPrice;

      // Calculate services cost for this pallet
      const servicesCost = Object.entries(pallet.services).reduce((total, [service, isSelected]) => {
        if (!isSelected) return total;
        return total + (servicePrices[service as keyof typeof servicePrices] || 0);
      }, 0);

      // Calculate lumber cost for this pallet
      const lumberCost = pallet.lumberDimensions.reduce((subtotal, item) => {
        const lumberType = lumberTypes.find(type => type.name === item.woodType);
        if (!lumberType) return subtotal;
        const cost = (item.boardFeet || 0) * lumberType.pricePerBoardFoot;
        return subtotal + cost;
      }, 0);
      
      // Calculate break even price for this pallet
      const breakEvenPrice = pallet.piecework !== null && pallet.fuelFreight !== null
        ? overhead + pallet.fuelFreight + pallet.piecework + nailCost + lumberCost + servicesCost
        : null;
      
      // Calculate profit for this pallet
      const profit = breakEvenPrice !== null ? (breakEvenPrice * pallet.profitMargin) / 100 : null;
      
      // Calculate suggested price for this pallet
      const suggestedPrice = breakEvenPrice !== null && profit !== null ? breakEvenPrice + profit : null;

      newCalculatedValues[pallet.id] = {
        breakEvenPrice,
        profit,
        suggestedPrice,
        lumberCost,
        nailCost,
        overheadCost: overhead,
        pieceworkCost: pallet.piecework,
        fuelFreightCost: pallet.fuelFreight,
        servicesCost
      };
    });

    setCalculatedValues(newCalculatedValues);
  };

  const calculateLumberCost = () => {
    return pallets.reduce((total, pallet) => {
      return total + pallet.lumberDimensions.reduce((subtotal, item) => {
        // Find the lumber type price
        const lumberType = lumberTypes.find(type => type.name === item.woodType);
        if (!lumberType) return subtotal;
        
        // Calculate cost: board feet * price per board foot
        const cost = (item.boardFeet || 0) * lumberType.pricePerBoardFoot;
        
        return subtotal + cost;
      }, 0);
    }, 0);
  };

  const calculateBreakEvenPrice = (nailCost: number, servicesCost: number) => {
    if (pallets[0].piecework === null || pallets[0].fuelFreight === null) {
      return null;
    }
    
    // Calculate lumber cost
    const lumberCost = calculateLumberCost();
    
    return overhead + pallets[0].fuelFreight + pallets[0].piecework + nailCost + lumberCost + servicesCost;
  };

  const calculateProfit = (breakEvenPrice: number | null) => {
    if (breakEvenPrice === null) return null;
    return (breakEvenPrice * pallets[0].profitMargin) / 100;
  };

  const calculateSuggestedPrice = (breakEvenPrice: number | null, profit: number | null) => {
    if (breakEvenPrice === null || profit === null) return null;
    return breakEvenPrice + profit;
  };

  const addNewPallet = () => {
    const newId = (pallets.length + 1).toString();
    setPallets(prev => [...prev, {
      id: newId,
      name: "",
      piecework: null,
      fuelFreight: null,
      profitMargin: 30,
      services: {
        heatTreated: false,
        stamped: false,
        painted: false,
        binded: false,
        notched: false
      },
      lumberDimensions: [
        { id: "1", type: "Stringers", thickness: 0, width: 0, length: 0, quantity: 0, woodType: "SYP" },
        { id: "2", type: "Top Deck", thickness: 0, width: 0, length: 0, quantity: 0, woodType: "SYP" },
        { id: "3", type: "Top Lead Deck", thickness: 0, width: 0, length: 0, quantity: 0, woodType: "SYP" },
        { id: "4", type: "Bottom Deck", thickness: 0, width: 0, length: 0, quantity: 0, woodType: "SYP" },
        { id: "5", type: "Bottom Lead Deck", thickness: 0, width: 0, length: 0, quantity: 0, woodType: "SYP" }
      ]
    }]);
    setCalculatedValues(prev => ({
      ...prev,
      [newId]: {
        breakEvenPrice: null,
        profit: null,
        suggestedPrice: null,
        lumberCost: null,
        nailCost: null,
        overheadCost: null,
        pieceworkCost: null,
        fuelFreightCost: null,
        servicesCost: 0
      }
    }));
  };

  const removePallet = (id: string) => {
    setPallets(prev => prev.filter(p => p.id !== id));
    setCalculatedValues(prev => {
      const newValues = { ...prev };
      delete newValues[id];
      return newValues;
    });
  };

  const updatePallet = (id: string, updates: Partial<PalletQuote>) => {
    setPallets(prev => prev.map(pallet => 
      pallet.id === id ? { ...pallet, ...updates } : pallet
    ));
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-gray-50">
      <header className="w-full max-w-[90vw] flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <CalculatorIcon className="w-8 h-8 text-blue-900" />
          <h1 className="text-3xl font-bold text-blue-900">Pallet Price Calculator</h1>
        </div>
        <Link href="/settings" className="p-2 text-blue-600 hover:text-blue-800 transition-colors">
          <Cog6ToothIcon className="w-6 h-6" />
        </Link>
      </header>

      <div className="w-full max-w-[90vw] space-y-8">
        {/* Customer Information */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 w-[1000px]">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Customer Name</label>
              <input
                type="text"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter customer name"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Customer Address</label>
              <input
                type="text"
                value={customerInfo.address}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter customer address"
              />
            </div>
          </div>
        </div>

        {/* Horizontal Scrolling Pallets Container */}
        <div className="relative w-[90vw]">
          <div className="overflow-x-auto pb-4 hide-scrollbar">
            <div className="flex gap-6" style={{ minWidth: 'min-content' }}>
              {/* Pallets */}
              {pallets.map((pallet, index) => (
                <div 
                  key={pallet.id} 
                  className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6 relative flex-none w-[1000px]"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div className="absolute right-4 top-4 flex items-center gap-2">
                    {pallets.length > 1 && (
                      <button
                        onClick={() => removePallet(pallet.id)}
                        className="p-2 text-red-600 hover:text-red-800 transition-colors"
                        title="Remove Pallet"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  <h2 className="text-xl font-semibold text-blue-900 mb-4 flex items-center gap-2">
                    {pallet.name || `Pallet ${index + 1}`}
                  </h2>

                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Pallet Name</label>
                        <input
                          type="text"
                          value={pallet.name}
                          onChange={(e) => updatePallet(pallet.id, { name: e.target.value })}
                          className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Enter pallet name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Piecework ($)</label>
                        <input
                          type="number"
                          value={pallet.piecework ?? ""}
                          onChange={(e) => updatePallet(pallet.id, { piecework: e.target.value ? Number(e.target.value) : null })}
                          className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Enter piecework cost"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 flex items-center">
                          Fuel/Freight ($)
                          <div className="relative ml-1 group">
                            <FiInfo className="w-4 h-4 text-blue-500 cursor-help" />
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 w-80 bg-white p-3 rounded-lg shadow-lg border border-gray-200 hidden group-hover:block z-10">
                              <p className="text-sm text-gray-600">
                                To calculate freight cost:<br/>
                                1. Determine round trip time in hours<br/>
                                2. Multiply hours by $125<br/>
                                3. Divide by number of pallets per truck<br/><br/>
                                Example: 30min away = 1hr round trip<br/>
                                $125 × 1hr = $125<br/>
                                If truck fits 600 pallets: $125 ÷ 600 = $0.21 per pallet
                              </p>
                            </div>
                          </div>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <input
                            type="number"
                            value={pallet.fuelFreight ?? ""}
                            onChange={(e) => updatePallet(pallet.id, { fuelFreight: e.target.value ? Number(e.target.value) : null })}
                            className="w-full p-2.5 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="Enter fuel/freight cost"
                            step="0.01"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Lumber Dimensions Table */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <h2 className="text-xl font-semibold text-blue-900 mb-4">Lumber Dimensions</h2>
                      <div className="overflow-x-auto">
                        <table className="w-full table-fixed">
                          <thead>
                            <tr>
                              <th className="w-[20%] px-4 py-3 text-left bg-blue-50 text-blue-900 font-semibold rounded-tl-lg">Type</th>
                              <th className="w-[12%] px-4 py-3 text-center bg-blue-50 text-blue-900 font-semibold">Thickness</th>
                              <th className="w-[12%] px-4 py-3 text-center bg-blue-50 text-blue-900 font-semibold">Width</th>
                              <th className="w-[12%] px-4 py-3 text-center bg-blue-50 text-blue-900 font-semibold">Length</th>
                              <th className="w-[12%] px-4 py-3 text-center bg-blue-50 text-blue-900 font-semibold">Quantity</th>
                              <th className="w-[20%] px-4 py-3 text-center bg-blue-50 text-blue-900 font-semibold">Wood Type</th>
                              <th className="w-[12%] px-4 py-3 text-center bg-blue-50 text-blue-900 font-semibold rounded-tr-lg">Board Feet</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {pallet.lumberDimensions.map((item, index) => (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900">{item.type}</td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="number"
                                    value={item.thickness || ""}
                                    onChange={(e) => handleLumberDimensionChange(pallet.id, item.id, 'thickness', Number(e.target.value))}
                                    className="w-20 p-1.5 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="number"
                                    value={item.width || ""}
                                    onChange={(e) => handleLumberDimensionChange(pallet.id, item.id, 'width', Number(e.target.value))}
                                    className="w-20 p-1.5 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="number"
                                    value={item.length || ""}
                                    onChange={(e) => handleLumberDimensionChange(pallet.id, item.id, 'length', Number(e.target.value))}
                                    className="w-20 p-1.5 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="number"
                                    value={item.quantity || ""}
                                    onChange={(e) => handleLumberDimensionChange(pallet.id, item.id, 'quantity', Number(e.target.value))}
                                    className="w-20 p-1.5 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex justify-center">
                                    <select
                                      value={item.woodType}
                                      onChange={(e) => handleLumberDimensionChange(pallet.id, item.id, 'woodType', e.target.value)}
                                      className="w-full max-w-[200px] p-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                                    >
                                      {lumberTypes.map(type => (
                                        <option key={type.id} value={type.name} className="py-1">
                                          {type.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center text-gray-600">
                                  {item.boardFeet?.toFixed(2) || '-'}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-blue-50">
                              <td colSpan={6} className="px-4 py-3 text-right font-semibold text-blue-900">Total Board Feet:</td>
                              <td className="px-4 py-3 text-center font-semibold text-blue-900">
                                {pallet.lumberDimensions.reduce((total, item) => total + (item.boardFeet || 0), 0).toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Services */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <h2 className="text-xl font-semibold text-blue-900 mb-4">Additional Services</h2>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                        {Object.entries(pallet.services).map(([service, checked]) => {
                          const serviceInfo = {
                            heatTreated: {
                              cost: servicePrices.heatTreated,
                              info: `Heat treatment required when running kiln for pallet sales. Cost: $${servicePrices.heatTreated.toFixed(2)} per pallet`
                            },
                            stamped: {
                              cost: servicePrices.stamped,
                              info: `Required for SYP pallets per ISPM-15 regulations. Cost: $${servicePrices.stamped.toFixed(2)} per pallet`
                            },
                            painted: {
                              cost: servicePrices.painted,
                              info: `Spray painting of stringers or numbers as required. Cost: $${servicePrices.painted.toFixed(2)} per pallet`
                            },
                            binded: {
                              cost: servicePrices.binded,
                              info: `Strapping pallets together prior to shipping. Cost: $${servicePrices.binded.toFixed(2)} per pallet`
                            },
                            notched: {
                              cost: servicePrices.notched,
                              info: `Notching required for four-way entry when using new stringers (disregard for recycled). Cost: $${servicePrices.notched.toFixed(2)} per pallet`
                            }
                          };

                          return (
                            <div key={service} className="flex items-center space-x-3 group">
                              <input
                                type="checkbox"
                                id={`${pallet.id}-${service}`}
                                checked={checked}
                                onChange={() => handleServiceToggle(pallet.id, service as keyof PalletQuote["services"])}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor={`${pallet.id}-${service}`} className="text-gray-700 capitalize select-none flex items-center">
                                {service.replace(/([A-Z])/g, ' $1').trim()}
                                <div className="relative ml-1">
                                  <FiInfo className="w-4 h-4 text-blue-500 cursor-help" />
                                  <div className="absolute left-5 top-1/2 -translate-y-1/2 w-64 bg-white p-3 rounded-lg shadow-lg border border-gray-200 hidden group-hover:block z-10">
                                    <p className="text-sm text-gray-600">
                                      {serviceInfo[service as keyof typeof serviceInfo].info}
                                    </p>
                                  </div>
                                </div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Calculate Section */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-end justify-between gap-6">
                        <div className="flex-1 max-w-xs space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Desired Profit Margin (%)</label>
                          <input
                            type="number"
                            value={pallet.profitMargin}
                            onChange={(e) => updatePallet(pallet.id, { profitMargin: Number(e.target.value) })}
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="Enter desired margin"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Price Breakdown - Only shown when calculated */}
                    {calculatedValues[pallet.id]?.suggestedPrice !== null && (
                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-xl font-semibold text-blue-900 mb-4">Price Breakdown</h2>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-x-8 text-sm">
                            <div className="space-y-2">
                              <div className="flex justify-between py-1">
                                <span className="font-medium text-gray-600">Material Costs:</span>
                              </div>
                              <div className="flex justify-between py-1 pl-4">
                                <span className="text-gray-600">Lumber Cost:</span>
                                <span className="text-gray-900">${calculatedValues[pallet.id]?.lumberCost?.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between py-1 pl-4">
                                <span className="text-gray-600">Nail Cost ({calculateNailCount()} nails @ ${nailPrice.toFixed(4)}/ea):</span>
                                <span className="text-gray-900">${calculatedValues[pallet.id]?.nailCost?.toFixed(2)}</span>
                              </div>

                              <div className="flex justify-between py-1">
                                <span className="font-medium text-gray-600">Labor & Operating Costs:</span>
                              </div>
                              <div className="flex justify-between py-1 pl-4">
                                <span className="text-gray-600">Overhead:</span>
                                <span className="text-gray-900">${overhead.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between py-1 pl-4">
                                <span className="text-gray-600">Piecework:</span>
                                <span className="text-gray-900">${pallet.piecework?.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between py-1 pl-4">
                                <span className="text-gray-600">Fuel/Freight:</span>
                                <span className="text-gray-900">${pallet.fuelFreight?.toFixed(2)}</span>
                              </div>

                              {calculatedValues[pallet.id]?.servicesCost > 0 && (
                                <>
                                  <div className="flex justify-between py-1">
                                    <span className="font-medium text-gray-600">Additional Services:</span>
                                  </div>
                                  {Object.entries(pallet.services).map(([service, isSelected]) => (
                                    isSelected && (
                                      <div key={service} className="flex justify-between py-1 pl-4">
                                        <span className="text-gray-600">{service.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                        <span className="text-gray-900">
                                          ${(service === 'heatTreated' ? servicePrices.heatTreated :
                                             service === 'stamped' ? servicePrices.stamped :
                                             service === 'painted' ? servicePrices.painted :
                                             service === 'binded' ? servicePrices.binded :
                                             service === 'notched' ? servicePrices.notched : 0).toFixed(2)}
                                        </span>
                                      </div>
                                    )
                                  ))}
                                </>
                              )}

                              <div className="flex justify-between py-1 border-t border-gray-200 mt-2">
                                <span className="font-medium text-gray-800">Break Even Price:</span>
                                <span className="font-medium text-gray-900">${calculatedValues[pallet.id]?.breakEvenPrice?.toFixed(2)}</span>
                              </div>

                              <div className="flex justify-between py-1">
                                <span className="text-gray-600">Profit ({pallet.profitMargin}%):</span>
                                <span className="text-gray-900">${calculatedValues[pallet.id]?.profit?.toFixed(2)}</span>
                              </div>

                              <div className="flex justify-between py-2 border-t border-gray-200 mt-2">
                                <span className="font-semibold text-lg text-blue-900">Final Price:</span>
                                <span className="font-bold text-lg text-blue-900">${calculatedValues[pallet.id]?.suggestedPrice?.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Add New Pallet Button - Now part of the horizontal scroll */}
              <button
                onClick={addNewPallet}
                className="flex-none w-[120px] h-[120px] p-4 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 hover:border-blue-500 hover:text-blue-800 transition-colors flex flex-col items-center justify-center gap-2 bg-white"
                style={{ scrollSnapAlign: 'start' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Pallet
              </button>
            </div>
          </div>

          {/* Scroll Indicators */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-gradient-to-r from-gray-50 to-transparent w-8 h-full pointer-events-none opacity-75 z-10" style={{ left: '-8px' }} />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-gradient-to-l from-gray-50 to-transparent w-8 h-full pointer-events-none opacity-75 z-10" style={{ right: '-8px' }} />
        </div>

        {/* Total Quote Summary */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Quote Summary</h2>
          <div className="space-y-4">
            {pallets.map((pallet, index) => {
              const values = calculatedValues[pallet.id];
              return (
                <div key={pallet.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                  <span className="font-medium">{pallet.name || `Pallet ${index + 1}`}</span>
                  <span className="font-bold text-blue-900">
                    {values?.suggestedPrice !== null 
                      ? `$${values.suggestedPrice.toFixed(2)}`
                      : 'Incomplete'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
