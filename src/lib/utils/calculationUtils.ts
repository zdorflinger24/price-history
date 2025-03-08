import type { GlobalSettings } from '@/lib/types';
import type { BoardDimensions, StringerDimensions, PalletComponents } from '@/lib/types/pallet';

export const calculateBoardFeet = (dimensions: BoardDimensions | StringerDimensions) => {
  const { count, width, length } = dimensions;
  const thickness = dimensions.type === 'board' ? dimensions.thickness : dimensions.height;
  
  if (!count || !width || !length || !thickness) {
    return 0;
  }
  
  return Number((count * thickness * width * length / 144).toFixed(2));
};

export const calculatePalletBoardFeet = (pallet: PalletComponents) => {
  const deckBoardFeet = pallet.deckBoards.reduce((acc, board) => acc + calculateBoardFeet(board), 0);
  const leadBoardFeet = pallet.leadBoards.reduce((acc, board) => acc + calculateBoardFeet(board), 0);
  const stringerBoardFeet = pallet.stringers.reduce((acc, stringer) => acc + calculateBoardFeet(stringer), 0);
  return Number((deckBoardFeet + leadBoardFeet + stringerBoardFeet).toFixed(2));
};

export const calculateLumberPrice = (pallets: PalletComponents[], settings: GlobalSettings) => {
  if (!settings?.lumberPrices) return 0;
  
  return pallets.reduce((totalPrice, pallet) => {
    let palletPrice = 0;
    
    // Calculate price for deck boards
    pallet.deckBoards.forEach(board => {
      const lumberType = board.lumberType || 'Recycled';
      const boardFeet = calculateBoardFeet(board);
      const pricePerMBF = settings.lumberPrices[lumberType]?.c || 350;
      palletPrice += boardFeet * pricePerMBF / 1000;
    });
    
    // Calculate price for lead boards
    pallet.leadBoards.forEach(board => {
      const lumberType = board.lumberType || 'Recycled';
      const boardFeet = calculateBoardFeet(board);
      const pricePerMBF = settings.lumberPrices[lumberType]?.c || 350;
      palletPrice += boardFeet * pricePerMBF / 1000;
    });
    
    // Calculate price for stringers
    pallet.stringers.forEach(stringer => {
      const lumberType = stringer.lumberType || 'Recycled';
      const boardFeet = calculateBoardFeet(stringer);
      const pricePerMBF = settings.lumberPrices[lumberType]?.c || 350;
      palletPrice += boardFeet * pricePerMBF / 1000;
    });
    
    return totalPrice + palletPrice;
  }, 0);
};

export const calculateAdditionalOptionsCost = (
  settings: GlobalSettings,
  { painted, notched, heatTreated, bands }: { painted: boolean; notched: boolean; heatTreated: boolean; bands: boolean }
) => {
  if (!settings) return 0;
  
  const paintedCost = settings.additionalCosts?.painted || 0.75;
  const notchedCost = settings.additionalCosts?.notched || 0.85;
  const heatTreatedCost = settings.additionalCosts?.heatTreated || 1;
  const bandsCost = 0.25;
  
  let additionalCost = 0;
  if (painted) additionalCost += paintedCost;
  if (notched) additionalCost += notchedCost;
  if (heatTreated) additionalCost += heatTreatedCost;
  if (bands) additionalCost += bandsCost;
  
  return additionalCost;
};

export const calculateFastenerCost = (settings: GlobalSettings, fastenerType: string) => {
  if (!settings?.fastenerCosts) return 0;
  
  switch (fastenerType.toLowerCase()) {
    case 'standard':
      return settings.fastenerCosts.standard || 0.0046;
    case 'automatic':
      return settings.fastenerCosts.automatic || 0.0065;
    case 'specialty':
      return settings.fastenerCosts.specialty || 0.01;
    default:
      return 0;
  }
}; 