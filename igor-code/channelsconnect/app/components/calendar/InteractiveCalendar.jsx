import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  AlertCircle,
  Users,
  Clock,
  TrendingUp,
  Target,
  Settings,
  Zap,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { updateRate } from '@/api/functions';

const InteractiveCalendar = ({ listingId, events, onEventUpdate, pricingRules }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showBulkPricingModal, setShowBulkPricingModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    status: 'blocked',
    rate: '',
    guests: 1,
    notes: ''
  });

  // Pricing control states
  const [bulkPricingForm, setBulkPricingForm] = useState({
    startDate: '',
    endDate: '',
    rate: '',
    applyType: 'override' // 'override' or 'multiply'
  });
  const [selectedDates, setSelectedDates] = useState([]);
  const [pricingMode, setPricingMode] = useState(false);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [showPriceInput, setShowPriceInput] = useState(null);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(null); // Date string of the price being updated

  // Get calendar grid for current month
  const getCalendarDays = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    const endDate = new Date(lastDay);
    
    startDate.setDate(startDate.getDate() - startDate.getDay());
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  // Get event for specific date (with null check)
  const getEventForDate = useCallback((date) => {
    if (!date || !events) return null;
    
    const dateStr = date.toISOString().split('T')[0];
    return events.find(event => {
      const eventDate = event.start || event.date;
      return eventDate === dateStr;
    });
  }, [events]);

  // Get rate for specific date (with comprehensive null checks)
  const getRateForDate = useCallback((date) => {
    if (!date) return 0;
    
    const event = getEventForDate(date);
    if (event && event.rate) {
      return event.rate;
    }
    
    if (!pricingRules || pricingRules.length === 0) return 0;
    
    const dayOfWeek = date.getDay();
    const rule = pricingRules.find(rule => rule.day_of_week === dayOfWeek);
    return rule?.net_rate || 0;
  }, [pricingRules, getEventForDate]);

  const handleIndividualPriceUpdate = async (date, newRate) => {
    if (!date || !listingId) return;

    const dateStr = date.toISOString().split('T')[0];
    if (isNaN(newRate) || newRate < 0) {
      toast.error('Please enter a valid price.');
      setShowPriceInput(null);
      return;
    }
    
    setIsUpdatingPrice(dateStr);
    
    try {
      await updateRate({
        listing_id: listingId,
        date: dateStr,
        net_rate: newRate,
      });
      toast.success(`Rate for ${dateStr} updated to $${newRate}`);
      onEventUpdate();
    } catch (error) {
      toast.error(`Failed to update rate: ${error.message}`);
    } finally {
      setIsUpdatingPrice(null);
      setShowPriceInput(null);
    }
  };

  // ... (keep all other existing functions like getPricingStats, handleDateClick, etc.)
  const getPricingStats = useCallback(() => {
    // ...
  }, [getCalendarDays, currentDate, getRateForDate]);
  
  const handleDateClick = (date) => {
    // ...
  };

  const handleSaveEvent = async () => {
    // ...
  };

  const handleDeleteEvent = async () => {
    // ...
  };
  
  const navigateMonth = (direction) => {
    // ...
  };
  
  const calendarDays = getCalendarDays();
  const pricingStats = getPricingStats();

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Interactive Calendar</CardTitle>
          <div className="flex items-center gap-4">
            <Button 
              variant={pricingMode ? "default" : "outline"} 
              onClick={() => {
                setPricingMode(!pricingMode);
                setSelectedDates([]);
              }}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {pricingMode ? 'Exit' : 'Bulk Price Edit'}
            </Button>
            <Button variant="outline" onClick={navigateMonth.bind(null, -1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-lg font-semibold w-32 text-center">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            <Button variant="outline" onClick={navigateMonth.bind(null, 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-7 text-center text-sm font-semibold text-gray-500 border-b pb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date) => {
            const dateStr = date.toISOString().split('T')[0];
            const event = getEventForDate(date);
            const rate = getRateForDate(date);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isPast = date < new Date().setHours(0,0,0,0);
            const isSelected = selectedDates.includes(dateStr);
            const isUpdating = isUpdatingPrice === dateStr;
            const isEditingPrice = showPriceInput === date;

            return (
              <div
                key={dateStr}
                onClick={() => handleDateClick(date)}
                className={`
                  h-28 rounded-md p-2 flex flex-col justify-between transition-all
                  ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                  ${isToday ? 'border-2 border-blue-500' : 'border'}
                  ${isPast ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                  ${isSelected ? 'ring-2 ring-blue-500 bg-blue-100' : ''}
                  ${!isPast && 'hover:bg-gray-100'}
                `}
              >
                <span className="font-medium">{date.getDate()}</span>
                <div 
                  className="flex-1 text-center font-bold text-lg"
                  onDoubleClick={() => !isPast && !isUpdating && setShowPriceInput(date)}
                >
                  {isUpdating ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    </div>
                  ) : isEditingPrice ? (
                    <Input
                      type="number"
                      defaultValue={rate}
                      autoFocus
                      className="h-8 text-center"
                      onBlur={(e) => handleIndividualPriceUpdate(date, parseFloat(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleIndividualPriceUpdate(date, parseFloat(e.target.value));
                        if (e.key === 'Escape') setShowPriceInput(null);
                      }}
                    />
                  ) : (
                    event ? (
                      <Badge variant="destructive" className="w-full justify-center">Blocked</Badge>
                    ) : (
                      <span className={rate > 0 ? 'text-green-600' : 'text-gray-400'}>${rate}</span>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      {/* ... (keep existing Dialogs for event and bulk pricing) ... */}
    </Card>
  );
};

export default InteractiveCalendar;