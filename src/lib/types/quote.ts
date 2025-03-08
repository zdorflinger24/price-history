export interface CalculationResults {
  // Pricing Results
  totalCost: number;
  costPerMBF: number;
  walkawayPrice: number;
  pricePerBoardFoot: number;
  profitMargin25: number;
  profitMargin30: number;
  profitMargin35: number;
  transportationCost: number;
  totalCostWithTransport: number;
}

export interface PalletData {
  id: string;
  // Basic Info
  palletName: string;
  locationId: string;
  palletsPerTruck: string;
  transportationType: string;
  
  // Dimensions
  length: string;
  width: string;
  boardFeet: string;
  
  // Lumber Details
  lumberType: string;
  heatTreated: boolean;
  notched: boolean;
  painted: boolean;
  bands: boolean;
  buildIntricacy: string;

  // Results
  results: CalculationResults | null;
}

export interface ShippingLocation {
  id: string;
  name: string;
  address: string;
  distance: number;
} 