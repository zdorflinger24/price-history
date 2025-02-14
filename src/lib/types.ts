export interface LumberPrice {
  a: number;
  b: number;
  c: number;
}

export interface VehicleDimensions {
  length: number;
  width: number;
  height: number;
  maxWeight: number;
}

export interface GlobalSettings {
  lumberPrices: {
    [key: string]: LumberPrice;
  };
  buildIntricacyCosts: {
    [key: string]: number;
  };
  additionalCosts: {
    [key: string]: number;
  };
  transportationCosts: {
    baseDeliveryFee: {
      [key: string]: number;
    };
    perMileCharge: number;
  };
  vehicleDimensions: {
    [key: string]: VehicleDimensions;
  };
}

export interface QuoteData {
  customerName: string;
  date: Date;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  quantity: number;
  lumberType: string;
  buildIntricacy: string;
  additionalOptions: string[];
  transportation: {
    distance: number;
    requiresDelivery: boolean;
  };
  calculations: {
    boardFootage: number;
    materialCost: number;
    laborCost: number;
    additionalCosts: number;
    transportationCost: number;
    totalCost: number;
    pricePerUnit: number;
  };
  globalPricingRef: string;
  timestamp: Date;
} 