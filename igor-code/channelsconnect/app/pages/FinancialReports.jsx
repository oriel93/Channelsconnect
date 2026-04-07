import React, { useState, useEffect, useCallback } from 'react';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import AppLayout from '../components/app/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar, 
  Download, 
  BarChart3, 
  PieChart,
  Home,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { api } from '@/lib/apiClient';

// Format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};

// Format percentage
const formatPercent = (value) => {
  return `${(value || 0).toFixed(1)}%`;
};

// Simple Bar Chart Component
const BarChart = ({ data, dataKey, labelKey, color = 'bg-blue-500', height = 200 }) => {
  if (!data || data.length === 0) return null;
  
  const maxValue = Math.max(...data.map(d => d[dataKey] || 0));
  
  return (
    <div className="flex items-end gap-2 justify-between" style={{ height }}>
      {data.map((item, index) => {
        const value = item[dataKey] || 0;
        const barHeight = maxValue > 0 ? (value / maxValue) * 100 : 0;
        return (
          <div key={index} className="flex flex-col items-center flex-1 min-w-0">
            <div className="w-full flex flex-col items-center justify-end" style={{ height: height - 40 }}>
              <span className="text-xs text-slate-600 mb-1 truncate">
                {typeof value === 'number' && value > 1000 
                  ? `${(value / 1000).toFixed(1)}k` 
                  : value.toFixed(0)}
              </span>
              <div 
                className={`w-full max-w-12 ${color} rounded-t transition-all duration-300`}
                style={{ height: `${barHeight}%`, minHeight: value > 0 ? 4 : 0 }}
              />
            </div>
            <span className="text-xs text-slate-500 mt-2 truncate max-w-full">
              {item[labelKey]?.slice(-5) || ''}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Progress Bar Component
const ProgressBar = ({ value, max, color = 'bg-blue-500' }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-slate-200 rounded-full h-2.5">
      <div 
        className={`h-2.5 rounded-full ${color} transition-all duration-300`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'text-blue-600' }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-slate-100`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span>{formatPercent(Math.abs(trendValue || trend))} vs previous period</span>
        </div>
      )}
    </CardContent>
  </Card>
);

// Revenue Report Component
const RevenueReport = ({ data, loading, dateRange }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, byMonth, byListing, bySource } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Revenue" 
          value={formatCurrency(summary.totalRevenue)}
          subtitle={`${summary.totalBookings} bookings`}
          icon={DollarSign}
          trend={summary.revenueChange}
          color="text-green-600"
        />
        <StatCard 
          title="Nights Booked" 
          value={summary.totalNightsBooked || 0}
          subtitle={`${summary.totalBookings} bookings`}
          icon={Calendar}
          color="text-blue-600"
        />
        <StatCard 
          title="Average Booking Value" 
          value={formatCurrency(summary.averageBookingValue)}
          subtitle={summary.totalNightsBooked > 0 ? `${formatCurrency(summary.totalRevenue / summary.totalNightsBooked)}/night` : ''}
          icon={TrendingUp}
          color="text-purple-600"
        />
        <StatCard 
          title="Previous Period" 
          value={formatCurrency(summary.previousPeriodRevenue)}
          subtitle={`${summary.previousPeriodBookings || 0} bookings`}
          icon={BarChart3}
          color="text-slate-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {byMonth && byMonth.length > 0 ? (
              <BarChart data={byMonth} dataKey="revenue" labelKey="month" color="bg-green-500" />
            ) : (
              <p className="text-center text-slate-500 py-8">No monthly data available</p>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            {bySource && bySource.length > 0 ? (
              <div className="space-y-4">
                {bySource.map((source, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium capitalize">{source.source}</span>
                      <span className="text-slate-600">
                        {formatCurrency(source.revenue)} • {source.bookings} bookings • {source.nights || 0} nights
                      </span>
                    </div>
                    <ProgressBar 
                      value={source.revenue} 
                      max={summary.totalRevenue}
                      color={index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : 'bg-purple-500'}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">No source data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Listing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue by Property</CardTitle>
        </CardHeader>
        <CardContent>
          {byListing && byListing.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Property</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Bookings</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Nights</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Revenue</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Avg/Night</th>
                  </tr>
                </thead>
                <tbody>
                  {byListing.map((listing, index) => (
                    <tr key={index} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{listing.listingName}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 text-slate-600">{listing.bookings}</td>
                      <td className="text-right py-3 px-2 text-slate-600">{listing.nights || 0}</td>
                      <td className="text-right py-3 px-2 font-medium text-green-600">{formatCurrency(listing.revenue)}</td>
                      <td className="text-right py-3 px-2 text-slate-600">
                        {formatCurrency(listing.nights > 0 ? listing.revenue / listing.nights : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">No property data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Occupancy Report Component
const OccupancyReport = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, byMonth, byListing } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Overall Occupancy" 
          value={formatPercent(summary.overallOccupancyRate)}
          subtitle={`${summary.totalListings || 1} properties • ${summary.daysInRange || 0} days`}
          icon={PieChart}
          color="text-blue-600"
        />
        <StatCard 
          title="Nights Booked" 
          value={summary.totalNightsBooked}
          subtitle={`of ${summary.totalNightsAvailable} available nights`}
          icon={Calendar}
          color="text-green-600"
        />
        <StatCard 
          title="Average Stay Length" 
          value={`${summary.averageStayLength?.toFixed(1) || 0} nights`}
          subtitle={`${summary.totalBookings || 0} total bookings`}
          icon={TrendingUp}
          color="text-purple-600"
        />
        <StatCard 
          title="Total Bookings" 
          value={summary.totalBookings || 0}
          subtitle={summary.totalNightsBooked > 0 && summary.totalBookings > 0 ? `${(summary.totalNightsBooked / summary.totalBookings).toFixed(1)} nights avg` : ''}
          icon={BarChart3}
          color="text-slate-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy by Month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Occupancy Rate by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {byMonth && byMonth.length > 0 ? (
              <BarChart data={byMonth} dataKey="occupancyRate" labelKey="month" color="bg-blue-500" />
            ) : (
              <p className="text-center text-slate-500 py-8">No monthly data available</p>
            )}
          </CardContent>
        </Card>

        {/* Nights Booked by Month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nights Booked by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {byMonth && byMonth.length > 0 ? (
              <BarChart data={byMonth} dataKey="nightsBooked" labelKey="month" color="bg-green-500" />
            ) : (
              <p className="text-center text-slate-500 py-8">No monthly data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Occupancy by Listing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Occupancy by Property</CardTitle>
        </CardHeader>
        <CardContent>
          {byListing && byListing.length > 0 ? (
            <div className="space-y-4">
              {byListing.map((listing, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <Home className="w-4 h-4 text-slate-400" />
                      {listing.listingName}
                    </span>
                    <span className="text-slate-600">
                      {formatPercent(listing.occupancyRate)} ({listing.nightsBooked} nights)
                    </span>
                  </div>
                  <ProgressBar 
                    value={listing.occupancyRate} 
                    max={100}
                    color={listing.occupancyRate >= 70 ? 'bg-green-500' : listing.occupancyRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">No property data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ADR Report Component
const ADRReport = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, byMonth, byListing, bySource } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Average Daily Rate" 
          value={formatCurrency(summary.overallADR)}
          subtitle={`${summary.totalBookings || 0} bookings`}
          icon={TrendingUp}
          color="text-blue-600"
        />
        <StatCard 
          title="RevPAR" 
          value={formatCurrency(summary.revPAR)}
          subtitle={`${formatPercent(summary.occupancyRate)} occupancy`}
          icon={DollarSign}
          color="text-green-600"
        />
        <StatCard 
          title="Total Nights Sold" 
          value={summary.totalNights || 0}
          subtitle={`of ${summary.totalAvailableNights || 0} available`}
          icon={Calendar}
          color="text-purple-600"
        />
        <StatCard 
          title="Total Revenue" 
          value={formatCurrency(summary.totalRevenue)}
          subtitle={`${summary.totalBookings || 0} bookings`}
          icon={BarChart3}
          color="text-slate-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ADR by Month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ADR by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {byMonth && byMonth.length > 0 ? (
              <BarChart data={byMonth} dataKey="adr" labelKey="month" color="bg-blue-500" />
            ) : (
              <p className="text-center text-slate-500 py-8">No monthly data available</p>
            )}
          </CardContent>
        </Card>

        {/* ADR by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ADR by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            {bySource && bySource.length > 0 ? (
              <div className="space-y-4">
                {bySource.map((source, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span className="font-medium capitalize">{source.source}</span>
                      <p className="text-xs text-slate-500">{source.bookings || 0} bookings • {source.nights || 0} nights • {formatCurrency(source.revenue || 0)} revenue</p>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(source.adr)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">No source data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ADR by Listing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ADR by Property</CardTitle>
        </CardHeader>
        <CardContent>
          {byListing && byListing.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Property</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Bookings</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Nights</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Revenue</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">ADR</th>
                  </tr>
                </thead>
                <tbody>
                  {byListing.map((listing, index) => {
                    return (
                      <tr key={index} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4 text-slate-400" />
                            <span className="font-medium">{listing.listingName}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-2 text-slate-600">{listing.bookings || 0}</td>
                        <td className="text-right py-3 px-2 text-slate-600">{listing.nights || 0}</td>
                        <td className="text-right py-3 px-2 text-slate-600">{formatCurrency(listing.revenue || 0)}</td>
                        <td className="text-right py-3 px-2 font-medium text-blue-600">{formatCurrency(listing.adr)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">No property data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Payout Status Report Component
const PayoutStatusReport = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, byStatus, bySource, recentBookings } = data;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" /> Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Completed Payouts" 
          value={formatCurrency(summary.completedPayouts)}
          subtitle={`${summary.confirmedCount} confirmed bookings`}
          icon={CheckCircle}
          color="text-green-600"
        />
        <StatCard 
          title="Upcoming Payouts" 
          value={formatCurrency(summary.upcomingPayouts)}
          subtitle="Future checkouts"
          icon={Clock}
          color="text-blue-600"
        />
        <StatCard 
          title="Pending Revenue" 
          value={formatCurrency(summary.pendingRevenue)}
          subtitle={`${summary.pendingCount} pending bookings`}
          icon={TrendingUp}
          color="text-yellow-600"
        />
        <StatCard 
          title="Cancelled" 
          value={formatCurrency(summary.cancelledRevenue)}
          subtitle={`${summary.cancelledCount} cancellations`}
          icon={XCircle}
          color="text-red-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payouts by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {byStatus && byStatus.length > 0 ? (
              <div className="space-y-4">
                {byStatus.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(item.status)}
                      <span className="text-sm text-slate-600">{item.count} bookings</span>
                    </div>
                    <span className="text-lg font-bold">{formatCurrency(item.revenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">No status data available</p>
            )}
          </CardContent>
        </Card>

        {/* Payouts by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            {bySource && bySource.length > 0 ? (
              <div className="space-y-4">
                {bySource.map((source, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium capitalize">{source.source}</span>
                      <span className="font-bold">{formatCurrency(source.confirmed + source.pending)}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="text-green-600">Confirmed: {formatCurrency(source.confirmed)}</span>
                      <span className="text-yellow-600">Pending: {formatCurrency(source.pending)}</span>
                      <span className="text-red-600">Cancelled: {formatCurrency(source.cancelled)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">No source data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBookings && recentBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Guest</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Property</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Dates</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Source</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Status</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((booking, index) => (
                    <tr key={index} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-3 px-2 font-medium">{booking.guestName}</td>
                      <td className="py-3 px-2 text-slate-600">{booking.listingName}</td>
                      <td className="py-3 px-2 text-slate-600 text-sm">
                        {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className="capitalize">{booking.source}</Badge>
                      </td>
                      <td className="py-3 px-2">{getStatusBadge(booking.status)}</td>
                      <td className="text-right py-3 px-2 font-medium">{formatCurrency(booking.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">No recent bookings</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default function FinancialReports() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('revenue');
  
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedProperty, setSelectedProperty] = useState('all');

  // Report data states
  const [revenueData, setRevenueData] = useState(null);
  const [occupancyData, setOccupancyData] = useState(null);
  const [adrData, setAdrData] = useState(null);
  const [payoutData, setPayoutData] = useState(null);

  useEffect(() => {
    document.title = "Financial Reports | Channels Connect";
    loadListings();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadReportData(activeTab);
    }
  }, [dateRange, selectedProperty, activeTab, loading]);

  const loadListings = async () => {
    try {
      const response = await api.listings.getAll();
      setListings(response.data || []);
    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReportData = useCallback(async (tab) => {
    setReportsLoading(true);
    
    const params = {
      startDate: dateRange.start,
      endDate: dateRange.end,
      ...(selectedProperty !== 'all' && { listingId: selectedProperty }),
    };

    try {
      switch (tab) {
        case 'revenue':
          const revenueRes = await api.reports.getRevenue(params);
          setRevenueData(revenueRes.data);
          break;
        case 'occupancy':
          const occupancyRes = await api.reports.getOccupancy(params);
          setOccupancyData(occupancyRes.data);
          break;
        case 'adr':
          const adrRes = await api.reports.getADR(params);
          setAdrData(adrRes.data);
          break;
        case 'payouts':
          const payoutRes = await api.reports.getPayouts(params);
          setPayoutData(payoutRes.data);
          break;
      }
    } catch (error) {
      console.error(`Failed to load ${tab} report:`, error);
    } finally {
      setReportsLoading(false);
    }
  }, [dateRange, selectedProperty]);

  const handleRefresh = () => {
    loadReportData(activeTab);
  };

  const handleExport = () => {
    // Simple CSV export for the current tab data
    let data = [];
    let filename = '';
    
    switch (activeTab) {
      case 'revenue':
        if (revenueData?.byListing) {
          data = revenueData.byListing;
          filename = 'revenue-report.csv';
        }
        break;
      case 'occupancy':
        if (occupancyData?.byListing) {
          data = occupancyData.byListing;
          filename = 'occupancy-report.csv';
        }
        break;
      case 'adr':
        if (adrData?.byListing) {
          data = adrData.byListing;
          filename = 'adr-report.csv';
        }
        break;
      case 'payouts':
        if (payoutData?.recentBookings) {
          data = payoutData.recentBookings;
          filename = 'payout-report.csv';
        }
        break;
    }

    if (data.length > 0) {
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).join(',')).join('\n');
      const csv = `${headers}\n${rows}`;
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <NewLoginRequired>
        <AppLayout>
          <div className="flex justify-center items-center h-screen">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          </div>
        </AppLayout>
      </NewLoginRequired>
    );
  }

  return (
    <NewLoginRequired>
      <AppLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Financial Reports</h1>
              <p className="text-slate-600 mt-1">Comprehensive revenue and performance analytics</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={reportsLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${reportsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Property</label>
                  <select
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Properties</option>
                    {listings.map(listing => (
                      <option key={listing.id} value={listing.id}>{listing.title || listing.name || `Property ${listing.id}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto">
              <TabsTrigger value="revenue" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">Revenue</span>
              </TabsTrigger>
              <TabsTrigger value="occupancy" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Occupancy</span>
              </TabsTrigger>
              <TabsTrigger value="adr" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">ADR</span>
              </TabsTrigger>
              <TabsTrigger value="payouts" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Payouts</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="revenue">
              <RevenueReport 
                data={revenueData}
                loading={reportsLoading}
                dateRange={dateRange}
              />
            </TabsContent>

            <TabsContent value="occupancy">
              <OccupancyReport
                data={occupancyData}
                loading={reportsLoading}
              />
            </TabsContent>

            <TabsContent value="adr">
              <ADRReport
                data={adrData}
                loading={reportsLoading}
              />
            </TabsContent>

            <TabsContent value="payouts">
              <PayoutStatusReport
                data={payoutData}
                loading={reportsLoading}
              />
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </NewLoginRequired>
  );
}
