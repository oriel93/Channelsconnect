
import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Ban,
  Pencil,
  Save,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Individual calendar day component with proper status handling
function CalendarDay({ 
  day, 
  onUpdateDay, 
  onBlockDate, 
  onUnblockDate, 
  bulkEditMode, 
  selectedDates, 
  onDateSelect 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrice, setEditedPrice] = useState(day.price || 0);
  const [isSaving, setIsSaving] = useState(false);

  // Determine if the date is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to midnight for accurate date-only comparison
  // Parse date string as local time to avoid timezone issues when comparing
  const dayDate = new Date(day.date + 'T00:00:00'); 
  const isPast = dayDate < today;

  const handleSave = async () => {
    if (isPast) {
      toast.error("Cannot edit past dates.");
      setIsEditing(false);
      return;
    }
    if (day.status === 'booked') {
      toast.error("Cannot edit booked dates.");
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    await onUpdateDay(day.date, editedPrice, day.minimum_stay, day.notes);
    setIsSaving(false);
    setIsEditing(false);
    toast.success("Price updated successfully!");
  };

  const handleDayClick = () => {
    if (isPast) {
      toast.info("This date is in the past.");
      return;
    }
    if (day.status === 'booked') {
      const booking = day.booking;
      if (booking) {
        toast.info(`Booked by ${booking.guestName} (${booking.source || 'direct'})`);
      } else {
        toast.info("This date is booked and cannot be edited.");
      }
      return;
    }
    if (bulkEditMode) {
      onDateSelect(day.date);
    }
  };

  // Determine the actual status and styling
  const getStatusInfo = () => {
    // Past dates are always shown as inactive and grayed out
    if (isPast) {
      return {
        status: 'past',
        bgColor: 'bg-slate-50 border-slate-200',
        textColor: 'text-slate-400',
        icon: null, // No specific icon for past dates
        label: 'Past'
      };
    }

    if (day.status === 'booked' && !day.isAvailable) {
      return {
        status: 'booked',
        bgColor: 'bg-blue-100 border-blue-400',
        textColor: 'text-blue-800',
        icon: CalendarIcon,
        label: 'Booked'
      };
    }
    
    if (day.status === 'blocked' && !day.isAvailable) {
      return {
        status: 'blocked',
        bgColor: 'bg-gray-200 border-gray-300',
        textColor: 'text-gray-600',
        icon: AlertCircle,
        label: 'Blocked'
      };
    }
    
    // Default to available if isAvailable is true OR if status is 'available'
    if (day.isAvailable || day.status === 'available') {
      return {
        status: 'available',
        bgColor: 'bg-white border-gray-200 hover:bg-green-50',
        textColor: 'text-gray-800',
        icon: CheckCircle,
        label: 'Available'
      };
    }

    // Fallback for any other undefined status
    return {
      status: 'unavailable',
      bgColor: 'bg-gray-100 border-gray-200',
      textColor: 'text-gray-500',
      icon: AlertCircle,
      label: 'Unavailable'
    };
  };

  const statusInfo = getStatusInfo();
  
  return (
    <div
      className={`
        h-full p-2 flex flex-col justify-between relative rounded-lg border transition-all duration-100
        ${statusInfo.bgColor}
        ${bulkEditMode && !isPast ? 'cursor-pointer' : ''}
        ${selectedDates.includes(day.date) ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
        ${isPast ? 'cursor-not-allowed pointer-events-none opacity-70' : ''}
      `}
      onClick={handleDayClick}
    >
      {/* Date number and optional badges */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          <span className={`font-semibold text-sm ${statusInfo.textColor}`}>
            {new Date(day.date + 'T00:00:00').getDate()}
          </span>
          {statusInfo.status === 'booked' && day.booking?.source && (
            <span className="text-[9px] text-blue-700 font-medium capitalize">
              {day.booking.source}
            </span>
          )}
        </div>
        {day.isDynamicallyPriced && !isPast && statusInfo.status !== 'booked' && (
          <Badge variant="outline" className="text-[9px] bg-blue-100 text-blue-800 px-1 py-0 font-medium leading-none h-3.5">AI</Badge>
        )}
      </div>

      {/* Main price display or booking info */}
      <div className="flex-grow flex flex-col items-center justify-center">
        {statusInfo.status === 'booked' && day.booking ? (
          <>
            <span className="text-xs font-medium text-blue-700 truncate max-w-full px-1 text-center">
              {day.booking.guestName}
            </span>
            <span className="text-lg font-bold text-gray-800">${day.price || 0}</span>
          </>
        ) : (
          <span className="text-lg font-bold text-gray-800">${day.price || 0}</span>
        )}
      </div>

      {/* Popover for price editing - only for available dates */}
      {!isPast && statusInfo.status === 'available' && (
        <Popover open={isEditing} onOpenChange={setIsEditing}>
          <PopoverTrigger asChild>
            <button 
              className="absolute top-1 right-1 p-1 text-gray-400 hover:text-gray-700"
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditedPrice(day.price || 0); }}
            >
              <Pencil size={12} />
            </button>
          </PopoverTrigger>
          <PopoverContent onClick={(e) => e.stopPropagation()} className="w-56 p-3">
            <div className="space-y-3">
              <label className="text-sm font-medium block">Set Price for {new Date(day.date).toLocaleDateString()}</label>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">$</span>
                <Input 
                  type="number" 
                  value={editedPrice}
                  onChange={(e) => setEditedPrice(Number(e.target.value))}
                  className="flex-1 h-8"
                  min="0"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-8 w-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving || editedPrice === day.price} className="h-8 px-3">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
      
      {/* Booking info tooltip for booked dates */}
      {statusInfo.status === 'booked' && day.booking && (
        <div className="absolute top-1 right-1">
          <div className="group relative">
            <CalendarIcon size={12} className="text-blue-600" />
            <div className="absolute hidden group-hover:block right-0 top-full mt-1 p-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
              <div className="font-semibold">{day.booking.guestName}</div>
              <div>{new Date(day.booking.checkIn).toLocaleDateString()} - {new Date(day.booking.checkOut).toLocaleDateString()}</div>
              {day.booking.source && <div className="text-gray-300 capitalize">via {day.booking.source}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Status badge */}
      <div className="text-center">
        <Badge variant="outline" className={`text-xs ${statusInfo.textColor} px-1 py-0.5`}>
          {statusInfo.label}
        </Badge>
      </div>

      {/* Block/Unblock actions for non-bulk mode and non-past dates */}
      {!bulkEditMode && !isPast && statusInfo.status !== 'booked' && (
        <div className="absolute bottom-1 right-1">
          {statusInfo.status === 'available' ? (
            <Button 
              size="xs" 
              variant="ghost" 
              className="h-6 w-6 p-0" 
              onClick={(e) => { e.stopPropagation(); onBlockDate(day.date); toast.info("Date blocked."); }}
              title="Block date"
            >
              <Ban size={12} />
            </Button>
          ) : ( // Implies statusInfo.status === 'blocked'
            <Button 
              size="xs" 
              variant="ghost" 
              className="h-6 w-6 p-0" 
              onClick={(e) => { e.stopPropagation(); onUnblockDate(day.date); toast.info("Date unblocked."); }}
              title="Unblock date"
            >
              <CheckCircle size={12} />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Main calendar grid component
export default function EnhancedCalendarGrid({
  propertyId,
  currentMonth,
  bulkEditMode,
  selectedDates,
  onDateSelect,
  calendarData,
  isLoading,
  onUpdateDay,
  onBlockDate,
  onUnblockDate
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-600">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="mt-2 text-lg">Loading calendar...</span>
      </div>
    );
  }

  if (!calendarData || calendarData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <CalendarIcon className="w-12 h-12 mb-4" />
        <div>
          <h3 className="text-lg font-medium">No calendar data</h3>
          <p className="text-sm">Select a property to view its calendar</p>
        </div>
      </div>
    );
  }

  // Generate calendar grid
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

  const weeks = [];
  let currentDate = new Date(startDate);

  while (weeks.length < 6) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = calendarData.find(d => d.date === dateStr);
      
      if (dayData) {
        week.push(dayData);
      } else {
        // Create placeholder for dates outside our data range or for missing data
        week.push({
          date: dateStr,
          status: 'unavailable', // Explicitly mark as unavailable if no data
          isAvailable: false,
          price: 0,
          minimum_stay: 1,
          notes: '',
          source: 'placeholder',
          isDynamicallyPriced: false
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);
    
    // Break if we've gone past the current month and have at least 4 weeks
    // This prevents generating too many rows if the month starts late in the week
    if (currentDate.getMonth() !== currentMonth.getMonth() && weeks.length >= 4) {
      break;
    }
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate day counts - separate past, available, blocked, and booked
  const pastCount = calendarData.filter(d => d.isPast || d.status === 'past').length;
  const availableCount = calendarData.filter(d => d.isAvailable && !d.isPast && d.status !== 'past').length;
  const blockedCount = calendarData.filter(d => !d.isAvailable && !d.isPast && d.status !== 'past' && d.status === 'blocked').length;
  const bookedCount = calendarData.filter(d => d.status === 'booked').length;

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Calendar header with counts */}
      <div className="p-3 bg-gray-50 border-b flex justify-between items-center text-xs text-gray-600">
        <span className="font-semibold text-gray-700">Calendar Overview:</span>
        <span>{calendarData.length} total days</span>
        {pastCount > 0 && <span className="text-gray-500">{pastCount} past</span>}
        <span className="text-green-600 font-medium">{availableCount} available</span>
        {bookedCount > 0 && <span className="text-blue-600 font-medium">{bookedCount} booked</span>}
        {blockedCount > 0 && <span className="text-gray-600">{blockedCount} blocked</span>}
      </div>
      
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {weekdays.map(day => (
          <div key={day} className="p-3 text-center font-medium text-gray-700">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar body (grid of days) */}
      <div className="divide-y divide-gray-200">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 divide-x divide-gray-200 min-h-[120px]">
            {week.map((day, dayIndex) => (
              <div 
                key={`${weekIndex}-${dayIndex}`} 
                className={`
                  p-1
                  ${new Date(day.date).getMonth() !== currentMonth.getMonth() ? 'bg-gray-50 opacity-70' : ''}
                `}
              >
                <CalendarDay
                  day={day}
                  onUpdateDay={onUpdateDay}
                  onBlockDate={onBlockDate}
                  onUnblockDate={onUnblockDate}
                  bulkEditMode={bulkEditMode}
                  selectedDates={selectedDates}
                  onDateSelect={onDateSelect}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
