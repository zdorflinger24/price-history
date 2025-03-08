export interface Settings {
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
    painted: number;
    notched: number;
    heat_treated: number;
  };
  transportation_costs: {
    base_delivery_fee: {
      [key: string]: number;
    };
    per_mile_charge: number;
  };
  vehicle_dimensions: {
    [key: string]: {
      length: number;
      width: number;
      height: number;
      max_weight: number;
    };
  };
  lumber_processing_cost: number;
}

export interface Quote {
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
    type: string;
    distance: number;
  };
  calculations: {
    materials_cost: number;
    labor_cost: number;
    transportation_cost: number;
    total_cost: number;
    price_per_unit: number;
  };
} 