export interface BoardDimensions {
  id: string;
  count: number;
  thickness: number;
  width: number;
  length: number;
  type: 'board';
  lumberType: string;
}

export interface StringerDimensions {
  id: string;
  count: number;
  width: number;
  height: number;
  length: number;
  type: 'stringer';
  lumberType: string;
}

export interface PalletComponents {
  id: string;
  name: string;
  locationId: string | null;
  transportationType: string;
  palletsPerTruck: number;
  deckBoards: BoardDimensions[];
  leadBoards: BoardDimensions[];
  stringers: StringerDimensions[];
  fastenerType: string;
  results: any | null;
}

export interface ShippingLocation {
  id: string;
  name: string;
  address: string;
  distance: number;
} 