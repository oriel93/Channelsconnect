import React, { useMemo } from 'react';
import { 
  Calendar, DollarSign, TrendingUp, Target, AlertTriangle, 
  Lock, Info, BarChart3
} from 'lucide-react';
import { IndustryStandardAnalytics } from './IndustryStandardAnalytics';

export default function BlockIntelligentAnalyticsBar({
  calendarData,
  isLoading = false
}) {
  
  const analytics = useMemo(() => {
    return IndustryStandardAnalytics.calculateAccurateMetrics(calendarData);
  }, [calendarData]);
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  const getPerformanceColor = (value, type) => {
    if (type === 'occupancy') {
      if (value === 0) return 'text-red-300';
      if (value < 30) return 'text-yellow-300';
      if (value < 70) return 'text-blue-300';
      return 'text-green-300';
    }
    
    if (type === 'utilization') {
      if (value < 20) return 'text-green-300';  // Low utilization = more availability
      if (value < 50) return 'text-yellow-300';
      return 'text-red-300'; // High utilization = less availability
    }
    
    if (type === 'revenue') {
      if (value === 0) return 'text-red-300';
      if (value < 1000) return 'text-yellow-300';
      return 'text-green-300';
    }
    
    return 'text-white';
  };
  
  if (isLoading) {
    return (
      <div className="analytics-metrics-bar bg-gradient-to-r from-blue-500 to-purple-600 p-4">
        <div className="flex justify-around">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse bg-white bg-opacity-20 rounded h-16 w-32"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="analytics-metrics-bar bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
      <div className="flex justify-around items-center">
        
        {/* Industry-Standard Occupancy Rate */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Calendar size={20} />
            <span className="text-sm font-medium opacity-90">Occupancy</span>
          </div>
          <div className={`text-3xl font-bold ${getPerformanceColor(analytics.occupancyRate.value, 'occupancy')}`}>
            {analytics.occupancyRate.value.toFixed(1)}%
          </div>
          <div className="text-xs opacity-75">
            {analytics.occupancyRate.context}
          </div>
        </div>

        {/* Calendar Utilization (responds to blocking) */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <BarChart3 size={20} />
            <span className="text-sm font-medium opacity-90">Calendar Use</span>
          </div>
          <div className={`text-3xl font-bold ${getPerformanceColor(analytics.calendarUtilization.value, 'utilization')}`}>
            {analytics.calendarUtilization.value.toFixed(1)}%
          </div>
          <div className="text-xs opacity-75">
            {analytics.calendarUtilization.context}
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
          <div className="text-xs opacity-75">
            {analytics.avgDailyRate.context}
          </div>
        </div>
        
        {/* Monthly Revenue */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <TrendingUp size={20} />
            <span className="text-sm font-medium opacity-90">Monthly Revenue</span>
          </div>
          <div className={`text-3xl font-bold ${getPerformanceColor(analytics.monthlyRevenue.value, 'revenue')}`}>
            {formatCurrency(analytics.monthlyRevenue.value)}
          </div>
          <div className="text-xs opacity-75">
            {analytics.monthlyRevenue.context}
          </div>
          {analytics.breakdown.lostRevenue > 0 && (
            <div className="text-xs opacity-60 text-red-200 mt-1">
              -{formatCurrency(analytics.breakdown.lostRevenue)} lost to blocks
            </div>
          )}
        </div>
        
        {/* Revenue Opportunity */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Target size={20} />
            <span className="text-sm font-medium opacity-90">Revenue Gap</span>
          </div>
          <div className="text-3xl font-bold text-green-300">
            {formatCurrency(analytics.revenueOpportunity.value)}
          </div>
          <div className="text-xs opacity-75">
            {analytics.revenueOpportunity.context}
          </div>
        </div>
        
      </div>
      
      {/* Intelligent Status Messages */}
      <div className="mt-3 flex flex-col gap-2">
        {/* Zero bookings alert */}
        {analytics.breakdown.bookedDays === 0 && analytics.breakdown.marketableDays > 0 && (
          <div className="flex items-center justify-center gap-2 text-yellow-200 text-sm font-medium">
            <AlertTriangle size={16} />
            <span>URGENT: Zero bookings this month - Immediate marketing and pricing action required</span>
          </div>
        )}
        
        {/* Blocked days impact */}
        {analytics.breakdown.blockedDays > 0 && (
          <div className="flex items-center justify-center gap-2 text-blue-200 text-xs">
            <Info size={14} />
            <span>
              {analytics.breakdown.blockedDays} days blocked • 
              {formatCurrency(analytics.breakdown.lostRevenue)} potential revenue unavailable • 
              Occupancy calculated from {analytics.breakdown.marketableDays} marketable days
            </span>
          </div>
        )}
      </div>
    </div>
  );
}