import { supabase } from './supabase';
import type { Settings, Quote } from './supabase';
import type { GlobalSettings, QuoteData } from '@/lib/types';

// Convert database settings to application format
export const convertToAppSettings = (settings: Settings): GlobalSettings => {
  return {
    lumberPrices: settings.lumber_prices,
    buildIntricacyCosts: settings.build_intricacy_costs,
    additionalCosts: settings.additional_costs,
    transportationCosts: settings.transportation_costs,
    vehicleDimensions: settings.vehicle_dimensions,
    fastenerCosts: settings.fastener_costs,
    lumberProcessingCost: settings.lumber_processing_cost
  };
};

// Convert application settings to database format
export const convertToDatabaseSettings = (settings: GlobalSettings): Omit<Settings, 'id' | 'created_at' | 'updated_at'> => {
  return {
    lumber_prices: settings.lumberPrices,
    build_intricacy_costs: settings.buildIntricacyCosts,
    additional_costs: settings.additionalCosts,
    transportation_costs: settings.transportationCosts,
    vehicle_dimensions: settings.vehicleDimensions,
    fastener_costs: settings.fastenerCosts,
    lumber_processing_cost: settings.lumberProcessingCost
  };
};

// Convert application quote to database format
export const convertToDatabaseQuote = (quote: QuoteData): Omit<Quote, 'id' | 'created_at' | 'updated_at'> => {
  return {
    customer_name: quote.customerName,
    date: quote.date.toISOString(),
    dimensions: quote.dimensions,
    quantity: quote.quantity,
    lumber_type: quote.lumberType,
    build_intricacy: quote.buildIntricacy,
    additional_options: quote.additionalOptions,
    transportation: quote.transportation,
    calculations: quote.calculations,
    timestamp: new Date().toISOString()
  };
};

// Convert database quote to application format
export const convertToAppQuote = (quote: Quote): QuoteData => {
  return {
    customerName: quote.customer_name,
    date: new Date(quote.date),
    dimensions: quote.dimensions,
    quantity: quote.quantity,
    lumberType: quote.lumber_type,
    buildIntricacy: quote.build_intricacy,
    additionalOptions: quote.additional_options,
    transportation: quote.transportation,
    calculations: quote.calculations,
    timestamp: new Date(quote.timestamp)
  };
};

// Settings functions
export const getSettings = async (): Promise<GlobalSettings | null> => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error fetching settings:', error);
    return null;
  }
  
  return data ? convertToAppSettings(data as Settings) : null;
};

export const saveSettings = async (settings: GlobalSettings): Promise<boolean> => {
  const supabaseSettings = convertToDatabaseSettings(settings);
  
  const { error } = await supabase
    .from('settings')
    .insert([supabaseSettings]);
  
  if (error) {
    console.error('Error saving settings:', error);
    return false;
  }
  
  return true;
};

export const updateSettings = async (id: string, settings: GlobalSettings): Promise<boolean> => {
  const supabaseSettings = convertToDatabaseSettings(settings);
  
  const { error } = await supabase
    .from('settings')
    .update(supabaseSettings)
    .eq('id', id);
  
  if (error) {
    console.error('Error updating settings:', error);
    return false;
  }
  
  return true;
};

// Quote functions
export const getQuotes = async (): Promise<QuoteData[]> => {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching quotes:', error);
    return [];
  }
  
  return data ? data.map(quote => convertToAppQuote(quote as Quote)) : [];
};

export const saveQuote = async (quote: QuoteData): Promise<string | null> => {
  const supabaseQuote = convertToDatabaseQuote(quote);
  
  const { data, error } = await supabase
    .from('quotes')
    .insert([supabaseQuote])
    .select();
  
  if (error) {
    console.error('Error saving quote:', error);
    return null;
  }
  
  return data && data.length > 0 ? data[0].id : null;
};

export const updateQuote = async (id: string, quote: QuoteData): Promise<boolean> => {
  const supabaseQuote = convertToDatabaseQuote(quote);
  
  const { error } = await supabase
    .from('quotes')
    .update(supabaseQuote)
    .eq('id', id);
  
  if (error) {
    console.error('Error updating quote:', error);
    return false;
  }
  
  return true;
};

export const deleteQuote = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting quote:', error);
    return false;
  }
  
  return true;
}; 