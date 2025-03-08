import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for Supabase tables
export type Settings = {
  id: string;
  created_at: string;
  updated_at: string;
  lumber_prices: {
    [key: string]: {
      a: number;
      b: number;
      c: number;
    };
  };
  build_intricacy_costs: {
    [key: string]: number;
  };
  additional_costs: {
    [key: string]: number;
  };
  transportation_costs: {
    baseDeliveryFee: {
      [key: string]: number;
    };
    perMileCharge: number;
  };
  vehicle_dimensions: {
    [key: string]: {
      length: number;
      width: number;
      height: number;
      maxWeight: number;
    };
  };
  fastener_costs?: {
    standard: number;
    automatic: number;
    specialty: number;
  };
  lumber_processing_cost?: number;
};

export type Quote = {
  id: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  date: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  quantity: number;
  lumber_type: string;
  build_intricacy: string;
  additional_options: string[];
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
  timestamp: string;
}; 