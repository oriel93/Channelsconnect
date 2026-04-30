import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  DollarSign, 
  Ban, 
  Unlock, 
  MousePointer,
  CheckSquare,
  Square,
  TrendingUp,
  TrendingDown,
  Percent,
  Loader2,
  AlertCircle,
  Target,
  Filter,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { bulkUpdateRates } from '@/api/functions';
import { bulkBlockDates } from '@/api/functions';
import { bulkUnblockDates } from '@/api/functions';
import { api } from '@/lib/apiClient';

export default function BulkOperationsPanel({ 
  isOpen, 
  onClose, 
  listingId, 
  calendarData, 
  selectedDates, 
  onDateSelect, 
  onBulkComplete 
}) {
  const [activeTab, setActiveTab] = useState('pricing');
  const [bulkPriceAction, setBulkPriceAction] = useState('set');
  const [bulkPriceValue, setBulkPriceValue] = useState('');
  const [minStay, setMinStay] = useState(1);
  const [maxStay, setMaxStay] = useState('');
  const [stopSell, setStopSell] = useState(false);
  const [closedToArrival, setClosedToArrival] = useState(false);
  const [closedToDeparture, setClosedToDeparture] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectionMode, setSelectionMode] = useState('manual'); // manual, weekends, available, blocked
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [priceFilter, setPriceFilter] = useState({ min: '', max: '' });

  const availableDates = calendarData.filter(day => day.isAvailable && day.status === 'available');
  const blockedDates = calendarData.filter(day => !day.isAvailable || day.status === 'blocked');
  const selectedCount = selectedDates.length;
  const selectedTotal = selectedDates.reduce((sum, date) => {
    const dayData = calendarData.find(d => d.date === date);
    return sum + (dayData?.price || 0);
  }, 0);

  // Smart selection functions
  const selectWeekends = () => {
    const weekendDates = calendarData.filter(day => {
      const date = new Date(day.date + 'T00:00:00');
      const dayOfWeek = date.getDay();
      return (dayOfWeek === 0 || dayOfWeek === 6) && day.isAvailable;
    }).map(day => day.date);
    
    weekendDates.forEach(date => onDateSelect(date));
    toast.success(`Selected ${weekendDates.length} weekend dates`);
  };

  const selectAvailable = () => {
    const availableDates = calendarData.filter(day => day.isAvailable && day.status === 'available').map(day => day.date);
    availableDates.forEach(date => onDateSelect(date));
    toast.success(`Selected ${availableDates.length} available dates`);
  };

  const selectBlocked = () => {
    const blockedDates = calendarData.filter(day => !day.isAvailable || day.status === 'blocked').map(day => day.date);
    blockedDates.forEach(date => onDateSelect(date));
    toast.success(`Selected ${blockedDates.length} blocked dates`);
  };

  const selectByPriceRange = () => {
    if (!priceFilter.min && !priceFilter.max) {
      toast.error('Please enter a price range');
      return;
    }
    
    const min = parseFloat(priceFilter.min) || 0;
    const max = parseFloat(priceFilter.max) || Infinity;
    
    const matchingDates = calendarData.filter(day => {
      const price = day.price || 0;
      return price >= min && price <= max && day.isAvailable;
    }).map(day => day.date);
    
    matchingDates.forEach(date => onDateSelect(date));
    toast.success(`Selected ${matchingDates.length} dates in price range $${min}-$${max}`);
  };

  const selectDateRange = () => {
    if (!dateRange.start || !dateRange.end) {
      toast.error('Please select both start and end dates');
      return;
    }
    
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    const rangeDates = calendarData.filter(day => {
      const date = new Date(day.date);
      return date >= start && date <= end && day.isAvailable;
    }).map(day => day.date);
    
    rangeDates.forEach(date => onDateSelect(date));
    toast.success(`Selected ${rangeDates.length} dates in range`);
  };

  const clearSelection = () => {
    selectedDates.forEach(date => onDateSelect(date));
    toast.success('Selection cleared');
  };

  // Bulk operations
  const handleBulkPricing = async () => {
    if (selectedDates.length === 0) {
      toast.error('Please select dates first');
      return;
    }

    const hasRestriction = stopSell || closedToArrival || closedToDeparture || maxStay;
    if (!bulkPriceValue && !hasRestriction) {
      toast.error('Enter a price or select at least one restriction');
      return;
    }

    setIsProcessing(true);
    try {
      // Sort selected dates so we can derive a contiguous range
      const sorted = [...selectedDates].sort();
      const startDate = sorted[0];
      const endDate = sorted[sorted.length - 1];

      // Use calendar.bulkUpdateRates → ChannexSyncService.applyChange() per date
      // which drains into a single batched Channex API call.
      const payload = {
        listingId,
        startDate,
        endDate,
        ...(bulkPriceValue ? { price: parseFloat(bulkPriceValue) } : {}),
        minStay: minStay || 1,
        ...(maxStay ? { maxStay: parseInt(maxStay, 10) } : {}),
        ...(stopSell ? { stopSell } : {}),
        ...(closedToArrival ? { closedToArrival } : {}),
        ...(closedToDeparture ? { closedToDeparture } : {}),
      };

      const response = await api.calendar.bulkUpdateRates(payload);
      const ok = response?.data?.success ?? response?.success;
      if (!ok) throw new Error(response?.data?.message || 'Bulk update failed');

      toast.success(`Updated ${selectedDates.length} date(s) — syncing to Channex…`);
      onBulkComplete();
      clearSelection();
    } catch (error) {
      toast.error(`Bulk update failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkBlock = async () => {
    if (selectedDates.length === 0) {
      toast.error('Please select dates first');
      return;
    }

    setIsProcessing(true);
    try {
      const { data } = await bulkBlockDates({
        listingId,
        dates: selectedDates
      });

      if (data.success) {
        toast.success(`Successfully blocked ${data.blocked} dates`);
        onBulkComplete();
        clearSelection();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(`Bulk blocking failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkUnblock = async () => {
    if (selectedDates.length === 0) {
      toast.error('Please select dates first');
      return;
    }

    setIsProcessing(true);
    try {
      const { data } = await bulkUnblockDates({
        listingId,
        dates: selectedDates
      });

      if (data.success) {
        toast.success(`Successfully unblocked ${data.unblocked} dates`);
        onBulkComplete();
        clearSelection();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(`Bulk unblocking failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bulk-operations-panel">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Bulk Operations
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selection Summary */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Selected Dates</span>
              <Badge variant="outline">{selectedCount} dates</Badge>
            </div>
            {selectedCount > 0 && (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Total Current Value: ${selectedTotal.toFixed(2)}</span>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear All
                </Button>
              </div>
            )}
          </div>

          {/* Smart Selection Tools */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <MousePointer className="w-4 h-4" />
              Smart Selection
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={selectWeekends}>
                <Calendar className="w-4 h-4 mr-2" />
                Weekends
              </Button>
              <Button variant="outline" size="sm" onClick={selectAvailable}>
                <CheckSquare className="w-4 h-4 mr-2" />
                Available
              </Button>
              <Button variant="outline" size="sm" onClick={selectBlocked}>
                <Square className="w-4 h-4 mr-2" />
                Blocked
              </Button>
              <Button variant="outline" size="sm" onClick={() => {}}>
                <Filter className="w-4 h-4 mr-2" />
                Custom
              </Button>
            </div>

            {/* Date Range Selection */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={selectDateRange} className="w-full">
              Select Date Range
            </Button>

            {/* Price Range Selection */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="min-price">Min Price</Label>
                <Input
                  id="min-price"
                  type="number"
                  placeholder="$0"
                  value={priceFilter.min}
                  onChange={(e) => setPriceFilter(prev => ({ ...prev, min: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="max-price">Max Price</Label>
                <Input
                  id="max-price"
                  type="number"
                  placeholder="$999"
                  value={priceFilter.max}
                  onChange={(e) => setPriceFilter(prev => ({ ...prev, max: e.target.value }))}
                />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={selectByPriceRange} className="w-full">
              Select by Price Range
            </Button>
          </div>

          <Separator />

          {/* Bulk Operations */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="blocking">Blocking</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
            </TabsList>

            <TabsContent value="pricing" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="price-action">Price Action</Label>
                  <Select value={bulkPriceAction} onValueChange={setBulkPriceAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="set">Set Price To</SelectItem>
                      <SelectItem value="increase">Increase Price By</SelectItem>
                      <SelectItem value="decrease">Decrease Price By</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="price-value">
                    {bulkPriceAction === 'set' ? 'New Price' : 'Amount'}
                  </Label>
                  <Input
                    id="price-value"
                    type="number"
                    placeholder="Enter amount"
                    value={bulkPriceValue}
                    onChange={(e) => setBulkPriceValue(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleBulkPricing} 
                  disabled={isProcessing || selectedCount === 0}
                  className="w-full"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  Update {selectedCount} Prices
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="blocking" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={handleBulkBlock} 
                    disabled={isProcessing || selectedCount === 0}
                    variant="destructive"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Ban className="w-4 h-4 mr-2" />
                    )}
                    Block {selectedCount} Dates
                  </Button>
                  <Button 
                    onClick={handleBulkUnblock} 
                    disabled={isProcessing || selectedCount === 0}
                    variant="outline"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Unlock className="w-4 h-4 mr-2" />
                    )}
                    Unblock {selectedCount} Dates
                  </Button>
                </div>
                <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Blocking dates will prevent new bookings but won't affect existing reservations.
                </div>
              </div>
            </TabsContent>

            <TabsContent value="availability" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="min-stay">Min Stay (nights)</Label>
                    <Input
                      id="min-stay"
                      type="number"
                      min="1"
                      value={minStay}
                      onChange={(e) => setMinStay(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-stay">Max Stay (nights, optional)</Label>
                    <Input
                      id="max-stay"
                      type="number"
                      min="1"
                      placeholder="none"
                      value={maxStay}
                      onChange={(e) => setMaxStay(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 border rounded-md p-3 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Restrictions</p>
                  {[['stopSell', stopSell, setStopSell, 'Stop Sell (close dates)'],
                    ['closedToArrival', closedToArrival, setClosedToArrival, 'Closed to Arrival'],
                    ['closedToDeparture', closedToDeparture, setClosedToDeparture, 'Closed to Departure']
                  ].map(([key, val, setter, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={e => setter(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>

                <Button
                  onClick={handleBulkPricing}
                  disabled={isProcessing || selectedCount === 0}
                  className="w-full"
                >
                  {isProcessing ? <><span className="animate-spin mr-2">⏳</span>Updating…</> : <><Calendar className="w-4 h-4 mr-2" />Apply to {selectedCount} Date(s)</>}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <style jsx>{`
        .bulk-operations-panel {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
      `}</style>
    </div>
  );
}