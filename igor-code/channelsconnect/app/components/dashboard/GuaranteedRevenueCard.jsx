import React from 'react';
import { Shield, TrendingUp } from 'lucide-react';

export default function GuaranteedRevenueCard({ vacantNights, guaranteedRevenue, isLoading }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (isLoading) {
    return (
      <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-6 bg-green-200 rounded mb-3 w-3/4"></div>
            <div className="h-4 bg-green-100 rounded mb-4 w-full"></div>
            <div className="flex space-x-4">
              <div className="h-4 bg-green-100 rounded w-32"></div>
              <div className="h-4 bg-green-100 rounded w-40"></div>
            </div>
          </div>
          <div className="w-16 h-16 bg-green-200 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-green-900 mb-2">
            Your Guaranteed Revenue Protection
          </h2>
          {vacantNights > 0 ? (
            <p className="text-green-700 mb-4 max-w-lg">
              We're actively promoting {vacantNights.toLocaleString()} vacant nights across new channels,
              with guaranteed minimum revenue of {formatCurrency(guaranteedRevenue)}
            </p>
          ) : (
            <p className="text-green-700 mb-4 max-w-lg">
              Your properties are fully booked! Add more listings or extend your availability to activate guaranteed revenue protection.
            </p>
          )}
          <div className="flex space-x-4">
            <div className="text-sm">
              <span className="font-medium">Protected Nights:</span> {vacantNights.toLocaleString()}
            </div>
            <div className="text-sm">
              <span className="font-medium">Guaranteed Amount:</span> {formatCurrency(guaranteedRevenue)}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <Shield className="w-16 h-16 text-green-600 opacity-80 flex-shrink-0" />
          {guaranteedRevenue > 0 && (
            <div className="text-xs text-green-600 mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Active
            </div>
          )}
        </div>
      </div>
    </div>
  );
}