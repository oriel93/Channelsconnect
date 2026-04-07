import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar as CalendarIcon, 
  DollarSign, 
  TrendingUp, 
  Settings, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// Import backend functions
import { getDashboardCalendarData } from '@/api/functions';
import { updateRate } from '@/api/functions';
import { blockDate } from '@/api/functions';
import { bulkUpdateRates } from '@/api/functions';
import { bulkBlockDates } from '@/api/functions';
import { bulkUnblockDates } from '@/api/functions';

// Import our entities
import { Listing } from '@/api/entities';
import { PricingRule } from '@/api/entities';
import { CalendarAuditLog } from '@/api/entities';

// Import calendar components
import AdvancedCalendarView from './AdvancedCalendarView';
// import PricingEngine from './PricingEngine'; // Not built yet
import SyncManager from './SyncManager';
import BulkOperations from './BulkOperations';

export default function CalendarManager({ selectedListingId, onListingChange }) {
  // Core state management
  const [calendarData, setCalendarData] = useState({});
  const [pricingRules, setPricingRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');

  // Advanced features state
  const [bulkOperationMode, setBulkOperationMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

  // Performance optimization - for now, we'll fetch a fixed range
  const [currentDateRange, setCurrentDateRange] = useState({
    start: new Date(new Date().setDate(1)),
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 3, 0) // ~3 months
  });

  // Fetch all data for the calendar
  const fetchCalendarData = useCallback(async () => {
    if (!selectedListingId) return;
    
    setIsLoading(true);
    try {
      const startDate = currentDateRange.start.toISOString().split('T')[0];
      const endDate = currentDateRange.end.toISOString().split('T')[0];

      const { data, error } = await getDashboardCalendarData({
        listingId: selectedListingId,
        startDate,
        endDate
      });

      if (error || !data.success) {
        throw new Error(error?.details || 'Failed to fetch calendar data.');
      }
      
      const calendarMap = data.data.reduce((acc, entry) => {
        acc[entry.date] = entry;
        return acc;
      }, {});
      setCalendarData(calendarMap);
      
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId, currentDateRange]);

  useEffect(() => {
    if (selectedListingId) {
      fetchCalendarData();
    }
  }, [selectedListingId, fetchCalendarData]);


  const handlePriceUpdate = useCallback(async (dateStr, newPrice) => {
    if (!selectedListingId) return;
    
    // Optimistic update
    const originalPrice = calendarData[dateStr]?.price;
    setCalendarData(prev => ({
        ...prev,
        [dateStr]: { ...prev[dateStr], price: newPrice, source: 'manual_rate' }
    }));
    
    try {
        await updateRate({ listing_id: selectedListingId, date: dateStr, net_rate: newPrice });
        toast.success(`Price for ${dateStr} updated to $${newPrice}`);
    } catch (error) {
        toast.error(`Failed to update price for ${dateStr}.`);
        setCalendarData(prev => ({
            ...prev,
            [dateStr]: { ...prev[dateStr], price: originalPrice }
        }));
    }
  }, [selectedListingId, calendarData]);


  const handleBulkOperation = useCallback(async (operation, params) => {
    if (selectedDates.length === 0) return;
    
    setIsLoading(true);
    let promise;
    switch(operation) {
        case 'updatePrice':
            promise = bulkUpdateRates({ 
                listingId: selectedListingId, 
                dates: selectedDates, 
                price: params.price, 
                action: 'set' 
            });
            break;
        case 'block':
            promise = bulkBlockDates({ listingId: selectedListingId, dates: selectedDates });
            break;
        case 'unblock':
            promise = bulkUnblockDates({ listingId: selectedListingId, dates: selectedDates });
            break;
        default:
            promise = Promise.resolve();
    }

    try {
        await promise;
        toast.success(`Bulk operation '${operation}' completed for ${selectedDates.length} dates.`);
        setSelectedDates([]);
        await fetchCalendarData(); // Refresh data after bulk operation
    } catch (error) {
      toast.error(`Bulk operation failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId, selectedDates, fetchCalendarData]);


  // Performance metrics
  const calendarMetrics = useMemo(() => {
    const dataValues = Object.values(calendarData);
    if (dataValues.length === 0) return { availableDates: 0, blockedDates: 0, avgPrice: 0 };

    const availableDates = dataValues.filter(d => d.isAvailable).length;
    const prices = dataValues.filter(d => d.isAvailable && d.price > 0).map(d => d.price);
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    
    return {
      availableDates,
      blockedDates: dataValues.length - availableDates,
      avgPrice: Math.round(avgPrice),
    };
  }, [calendarData]);

  if (isLoading && Object.keys(calendarData).length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Loading calendar data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-6 h-6" />
              Advanced Calendar Manager
            </CardTitle>
            <div className="flex items-center gap-2">
               <Badge variant="outline">{calendarMetrics.availableDates} days available</Badge>
               <Badge variant="outline">${calendarMetrics.avgPrice} avg. rate</Badge>
               <Button variant="ghost" size="icon" onClick={fetchCalendarData} disabled={isLoading}><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /></Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="sync">Sync Manager</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <AdvancedCalendarView
            calendarData={calendarData}
            onPriceUpdate={handlePriceUpdate}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <SyncManager
            listingId={selectedListingId}
            onSyncComplete={fetchCalendarData}
          />
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <BulkOperations
            selectedDates={selectedDates}
            onBulkOperation={handleBulkOperation}
            onClearSelection={() => setSelectedDates([])}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}