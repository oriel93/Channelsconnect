import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Target } from 'lucide-react';
import { CalendarAnalyticsCalculator } from './CalendarAnalyticsCalculator';

export default function RealTimeAnalyticsBar({ calendarData, isLoading = false }) {
  
  // Calculate analytics from calendar data in real-time
  const analytics = useMemo(() => {
    return CalendarAnalyticsCalculator.calculateMetricsFromCalendarData(calendarData);
  }, [calendarData]);
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'positive':
        return <TrendingUp size={16} className="text-green-400" />;
      case 'negative':
        return <TrendingDown size={16} className="text-red-400" />;
      default:
        return <Calendar size={16} className="text-gray-400" />;
    }
  };
  
  if (isLoading) {
    return (
      <div className="analytics-metrics-bar bg-gradient-to-r from-blue-500 to-purple-600 p-4">
        <div className="flex justify-around">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse bg-white bg-opacity-20 rounded h-16 w-32"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="analytics-metrics-bar bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
      <div className="flex justify-around items-center">
        
        {/* Occupancy Rate */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Calendar size={20} />
            <span className="text-sm font-medium opacity-90">Occupancy</span>
          </div>
          <div className="text-3xl font-bold">
            {analytics.occupancyRate.value.toFixed(1)}%
          </div>
          <div className="flex items-center justify-center gap-1 text-sm">
            {getTrendIcon(analytics.occupancyRate.trend)}
            <span>+{analytics.occupancyRate.change}%</span>
          </div>
        </div>
        
        {/* Average Daily Rate */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <DollarSign size={20} />
            <span className="text-sm font-medium opacity-90">Avg Daily Rate</span>
          </div>
          <div className="text-3xl font-bold">
            {formatCurrency(analytics.avgDailyRate.value)}
          </div>
          <div className="flex items-center justify-center gap-1 text-sm">
            {getTrendIcon(analytics.avgDailyRate.trend)}
            <span>+{analytics.avgDailyRate.change}%</span>
          </div>
        </div>
        
        {/* Monthly Revenue */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <TrendingUp size={20} />
            <span className="text-sm font-medium opacity-90">Monthly Revenue</span>
          </div>
          <div className="text-3xl font-bold">
            {formatCurrency(analytics.monthlyRevenue.value)}
          </div>
          <div className="flex items-center justify-center gap-1 text-sm">
            {getTrendIcon(analytics.monthlyRevenue.trend)}
            <span>+{analytics.monthlyRevenue.change}%</span>
          </div>
        </div>
        
        {/* Revenue Opportunity */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Target size={20} />
            <span className="text-sm font-medium opacity-90">Revenue Gap</span>
          </div>
          <div className="text-3xl font-bold">
            {formatCurrency(analytics.revenueOpportunity.value)}
          </div>
          <div className="text-sm">
            {analytics.revenueOpportunity.status}
          </div>
        </div>
        
      </div>
    </div>
  );
}