import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAnalytics } from '@/api/functions';
import { Loader2, AlertCircle, TrendingUp, DollarSign, Percent, BarChartHorizontal } from 'lucide-react';
import { toast } from 'sonner';

const AnalyticsStatCard = ({ title, value, change, icon: Icon, unit = '' }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}{unit}</div>
      {change && <p className="text-xs text-muted-foreground text-green-600">+{change}% from last month</p>}
    </CardContent>
  </Card>
);

export default function CalendarAnalyticsModal({ isOpen, onClose, propertyId, currentMonth }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && propertyId) {
      const fetchAnalytics = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
          const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split('T')[0];
          
          const { data } = await getAnalytics({ propertyId, startDate, endDate });

          if (data.success) {
            setAnalyticsData(data.data);
          } else {
            throw new Error(data.error || 'Failed to fetch analytics');
          }
        } catch (err) {
          setError(err.message);
          toast.error(`Analytics Error: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAnalytics();
    }
  }, [isOpen, propertyId, currentMonth]);

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChartHorizontal className="w-6 h-6 text-blue-600" />
            Performance Analytics: {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </DialogTitle>
          <DialogDescription>
            Key performance indicators for the selected month.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col justify-center items-center h-48 text-red-600 bg-red-50 p-4 rounded-lg">
              <AlertCircle className="w-12 h-12 mb-4" />
              <p className="font-semibold">Failed to load analytics</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : analyticsData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnalyticsStatCard
                title="Occupancy Rate"
                value={analyticsData.occupancyRate.value.toFixed(1)}
                unit="%"
                change={analyticsData.occupancyRate.change}
                icon={Percent}
              />
              <AnalyticsStatCard
                title="Average Daily Rate (ADR)"
                value={formatCurrency(analyticsData.avgDailyRate.value)}
                change={analyticsData.avgDailyRate.change}
                icon={DollarSign}
              />
              <AnalyticsStatCard
                title="Total Revenue"
                value={formatCurrency(analyticsData.totalRevenue.value)}
                change={analyticsData.totalRevenue.change}
                icon={TrendingUp}
              />
               <AnalyticsStatCard
                title="Revenue Opportunity"
                value={formatCurrency(analyticsData.revenueOpportunity.value)}
                icon={DollarSign}
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}