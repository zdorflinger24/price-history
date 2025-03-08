import type { CalculationResults } from '@/lib/types/quote';

interface PalletResultsProps {
  results: CalculationResults;
}

export function PalletResults({ results }: PalletResultsProps) {
  return (
    <div className="border-t border-gray-200">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Results</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pricing Results */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Pricing</h4>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Cost:</span>
              <span className="font-medium">${results.totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cost per MBF:</span>
              <span className="font-medium">${results.costPerMBF.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Walkaway Price:</span>
              <span className="font-medium text-blue-600">${results.walkawayPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Price per Board Foot:</span>
              <span className="font-medium">${results.pricePerBoardFoot.toFixed(2)}</span>
            </div>
          </div>

          {/* Profit Margins */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Profit Margins</h4>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">25% Margin:</span>
              <span className="font-medium">${results.profitMargin25.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">30% Margin:</span>
              <span className="font-medium">${results.profitMargin30.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">35% Margin:</span>
              <span className="font-medium">${results.profitMargin35.toFixed(2)}</span>
            </div>
          </div>

          {/* Transportation */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Transportation</h4>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Transportation Cost:</span>
              <span className="font-medium">${results.transportationCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total with Transport:</span>
              <span className="font-medium">${results.totalCostWithTransport.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 