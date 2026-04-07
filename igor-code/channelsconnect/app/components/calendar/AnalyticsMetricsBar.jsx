
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users } from 'lucide-react';
import { getAnalytics } from '@/api/functions';

export default function AnalyticsMetricsBar({ propertyId }) {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (propertyId) {
      fetchAnalytics();
    }
  }, [propertyId]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(1); // First day of current month
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1, 0); // Last day of current month

      const { data } = await getAnalytics({
        propertyId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      if (data && data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Set fallback data on error
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (!propertyId) {
    return (
      <div className="analytics-bar">
        <div className="analytics-placeholder">
          Select a property to view analytics
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="analytics-bar">
        <div className="loading-metrics">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="metric-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  // Safe data extraction with fallbacks
  const getMetricValue = (metric, defaultValue = 0) => {
    if (!analytics || !metric) return { value: defaultValue, change: 0, trend: 'neutral' };
    return {
      value: metric.value || defaultValue,
      change: metric.change || 0,
      trend: (metric.change || 0) >= 0 ? 'up' : 'down'
    };
  };

  const occupancyRate = getMetricValue(analytics?.occupancyRate, 0);
  const avgDailyRate = getMetricValue(analytics?.avgDailyRate, 0);
  const monthlyRevenue = getMetricValue(analytics?.totalRevenue || analytics?.monthlyRevenue, 0);
  const revenueOpportunity = getMetricValue(analytics?.revenueOpportunity, 0);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  const formatPercentage = (value) => {
    const numValue = Number(value) || 0;
    return `${numValue >= 0 ? '+' : ''}${numValue.toFixed(1)}%`;
  };

  return (
    <div className="analytics-bar">
      <div className="metric-card">
        <div className="metric-icon">
          <Calendar size={16} />
        </div>
        <div className="metric-content">
          <div className="metric-label">Occupancy</div>
          <div className="metric-value">{(occupancyRate.value || 0).toFixed(1)}%</div>
          <div className={`metric-trend ${occupancyRate.trend}`}>
            {occupancyRate.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {formatPercentage(occupancyRate.change)}
          </div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon">
          <DollarSign size={16} />
        </div>
        <div className="metric-content">
          <div className="metric-label">Avg Daily Rate</div>
          <div className="metric-value">${avgDailyRate.value || 0}</div>
          <div className={`metric-trend ${avgDailyRate.trend}`}>
            {avgDailyRate.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {formatPercentage(avgDailyRate.change)}
          </div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon">
          <TrendingUp size={16} />
        </div>
        <div className="metric-content">
          <div className="metric-label">Monthly Revenue</div>
          <div className="metric-value">{formatCurrency(monthlyRevenue.value)}</div>
          <div className={`metric-trend ${monthlyRevenue.trend}`}>
            {monthlyRevenue.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {formatPercentage(monthlyRevenue.change)}
          </div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon">
          <Users size={16} />
        </div>
        <div className="metric-content">
          <div className="metric-label">Revenue Gap</div>
          <div className="metric-value">{formatCurrency(revenueOpportunity.value)}</div>
          <div className={`metric-trend ${revenueOpportunity.change >= 0 ? 'up' : 'down'}`}>
            {revenueOpportunity.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {formatPercentage(revenueOpportunity.change)}
          </div>
        </div>
      </div>

      <style jsx>{`
        .analytics-bar {
          display: flex;
          gap: 12px;
          padding: 8px 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-bottom: 1px solid #e2e8f0;
          overflow-x: auto;
          flex-shrink: 0;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        .loading-metrics {
          display: flex;
          gap: 12px;
          width: 100%;
          min-width: max-content;
        }

        .metric-skeleton {
          height: 60px;
          width: 120px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          animation: pulse 2s infinite;
          flex-shrink: 0;
        }

        .analytics-placeholder {
          color: rgba(255, 255, 255, 0.8);
          text-align: center;
          padding: 20px;
          font-size: 14px;
          width: 100%;
        }

        .metric-card {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 8px 12px;
          min-width: 140px;
          flex-shrink: 0;
          box-sizing: border-box;
        }

        .metric-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: white;
          flex-shrink: 0;
        }

        .metric-content {
          flex: 1;
          min-width: 0;
        }

        .metric-value {
          font-size: 16px;
          font-weight: 700;
          color: white;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .metric-label {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.8);
          font-weight: 500;
          margin-bottom: 2px;
          white-space: nowrap;
        }

        .metric-trend {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 10px;
          font-weight: 600;
        }

        .metric-trend.up {
          color: #10b981;
        }

        .metric-trend.down {
          color: #ef4444;
        }

        .metric-trend.neutral {
          color: rgba(255, 255, 255, 0.6);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 768px) {
          .analytics-bar {
            padding: 6px 8px;
            gap: 8px;
          }
          
          .metric-card {
            min-width: 120px;
            padding: 6px 8px;
          }
          
          .metric-value {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
