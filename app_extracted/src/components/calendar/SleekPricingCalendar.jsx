
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Check, 
  X, 
  Ban,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

// **DEFINITIVE FIX** Calendar cell with properly visible input
function SleekCalendarCell({ 
  date, 
  dayData, 
  isEditing, 
  editValue, 
  onStartEdit, 
  onSave, 
  onCancel, 
  onValueChange, 
  onToggleBlock,
  inputRef 
}) {
  const isPast = date < new Date();
  const dateStr = date.toISOString().split('T')[0];

  const getCellStyle = () => {
    if (isPast) return 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-60';
    if (isEditing) return 'bg-white border-2 border-blue-500 shadow-lg ring-2 ring-blue-100 z-10 relative';
    if (!dayData.isAvailable) return 'bg-red-50 border-red-200 hover:bg-red-100';
    if (dayData.price > 0) return 'bg-green-50 border-green-200 hover:bg-green-100 hover:shadow-md';
    return 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300';
  };

  const getPriceColor = () => {
    if (!dayData.isAvailable) return 'text-red-500 line-through';
    if (dayData.price > 0) return 'text-green-700 font-bold';
    return 'text-gray-500';
  };

  return (
    <div
      className={`
        h-24 border cursor-pointer transition-all duration-200 p-2
        flex flex-col justify-between
        ${getCellStyle()}
      `}
      onClick={() => {
        if (!isPast && !isEditing) {
          onStartEdit(dateStr, dayData.price);
        }
      }}
    >
      {/* Date number and status indicators */}
      <div className="flex justify-between items-start">
        <span className="text-sm font-semibold text-gray-700">
          {date.getDate()}
        </span>
        <div className="flex space-x-1">
          {!dayData.isAvailable && <Ban className="w-4 h-4 text-red-500" />}
          {dayData.demandLevel === 'high' && <TrendingUp className="w-4 h-4 text-green-500" />}
          {dayData.demandLevel === 'low' && <TrendingDown className="w-4 h-4 text-red-500" />}
        </div>
      </div>

      {/* **DEFINITIVE FIX** - Visible price input */}
      <div className="flex-1 flex items-center justify-center">
        {isEditing ? (
          <div className="flex items-center space-x-2 w-full">
            {/* Dollar sign OUTSIDE input */}
            <span className="text-xl font-bold text-gray-600 flex-shrink-0">$</span>
            
            {/* **CRITICAL FIX** - Input with explicit width and left alignment */}
            <input
              ref={inputRef}
              type="number"
              value={editValue}
              onChange={(e) => onValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSave();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancel();
                }
              }}
              className="bg-white border-2 border-blue-500 rounded-md focus:ring-2 focus:ring-blue-300 focus:border-blue-600 shadow-lg"
              placeholder="0"
              min="0"
              step="1"
              onClick={(e) => e.stopPropagation()}
              style={{
                // **KEY FIXES** - These ensure visibility
                minWidth: '80px',          // Minimum width for visibility
                maxWidth: '100px',         // Maximum width to fit in cell
                height: '40px',            // Adequate height
                fontSize: '18px',          // Large enough font
                fontWeight: '700',         // Bold text
                color: '#000000',          // Black text for contrast
                backgroundColor: '#ffffff', // White background
                textAlign: 'left',         // LEFT alignment - crucial for seeing typed numbers
                padding: '0 8px',          // Comfortable padding
                border: '2px solid #3b82f6', // Clear border
                borderRadius: '6px'        // Rounded corners
              }}
            />
            
            {/* Save/Cancel buttons */}
            <div className="flex space-x-1 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSave();
                }}
                className="h-10 w-10 bg-green-600 hover:bg-green-700 text-white rounded flex items-center justify-center"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
                className="h-10 w-10 bg-red-100 hover:bg-red-200 text-red-600 rounded flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center w-full">
            {dayData.price > 0 ? (
              <div className={`text-lg font-bold ${getPriceColor()}`}>
                ${dayData.price}
              </div>
            ) : (
              <div className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
                {!dayData.isAvailable ? (
                  <span className="text-red-500 font-medium">Blocked</span>
                ) : (
                  <span>Click to set price</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick block/unblock button */}
      {!isPast && !isEditing && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onToggleBlock(dateStr);
            }}
          >
            {dayData.isAvailable ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </Button>
        </div>
      )}
    </div>
  );
}

// Main calendar component with enhanced header
export default function SleekPricingCalendar({ 
  listingId, 
  calendarData, 
  onUpdatePrice, 
  onToggleBlock,
  isLoading = false 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingDate, setEditingDate] = useState(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);

  const formatDate = (date) => date.toISOString().split('T')[0];
  
  const getDayData = (date) => {
    const dateStr = formatDate(date);
    return calendarData[dateStr] || {
      date: dateStr,
      price: 0,
      isAvailable: true,
      demandLevel: 'normal'
    };
  };

  // Enhanced editing with better focus management
  const handleStartEdit = (dateStr, currentPrice) => {
    setEditingDate(dateStr);
    setEditValue(currentPrice > 0 ? currentPrice.toString() : '');
    
    // Ensure input gets focus and is visible
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
        // Scroll into view if needed
        inputRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }, 100);
  };

  // Enhanced save with better validation
  const handleSave = async () => {
    if (!editValue.trim()) {
      toast.error('Please enter a price');
      return;
    }

    const price = parseFloat(editValue);
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid price (minimum $0)');
      return;
    }

    const dateStr = editingDate;
    setEditingDate(null);
    setEditValue('');
    
    await onUpdatePrice(dateStr, price);
  };

  const handleCancel = () => {
    setEditingDate(null);
    setEditValue('');
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-2xl font-bold min-w-[250px] text-center">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        {isLoading && (
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-sm text-gray-600 font-medium">Updating prices...</span>
          </div>
        )}
      </div>

      {/* Enhanced Instructions */}
      <div className="text-center text-sm bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center justify-center space-x-2 text-blue-700">
          <DollarSign className="w-5 h-5" />
          <span className="font-semibold">
            Click any date to edit price instantly
          </span>
        </div>
        <div className="mt-2 text-blue-600">
          Press <kbd className="px-2 py-1 bg-white rounded border">Enter</kbd> to save • 
          Press <kbd className="px-2 py-1 bg-white rounded border">Escape</kbd> to cancel
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border shadow-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-4 text-center text-sm font-bold text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days with better spacing */}
        <div className="grid grid-cols-7 gap-0">
          {days.map((date, index) => {
            if (!date) {
              return <div key={index} className="h-24 bg-gray-50 border-r border-b"></div>;
            }

            const dateStr = formatDate(date);
            const dayData = getDayData(date);
            const isEditing = editingDate === dateStr;

            return (
              <SleekCalendarCell
                key={dateStr}
                date={date}
                dayData={dayData}
                isEditing={isEditing}
                editValue={editValue}
                onStartEdit={handleStartEdit}
                onSave={handleSave}
                onCancel={handleCancel}
                onValueChange={setEditValue}
                onToggleBlock={onToggleBlock}
                inputRef={inputRef}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 text-sm justify-center bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-50 border-2 border-green-200 rounded"></div>
          <span className="font-medium">Has Price</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-50 border-2 border-red-200 rounded"></div>
          <span className="font-medium">Blocked</span>
        </div>
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="font-medium">High Demand</span>
        </div>
        <div className="flex items-center space-x-2">
          <TrendingDown className="w-4 h-4 text-red-500" />
          <span className="font-medium">Low Demand</span>
        </div>
      </div>
    </div>
  );
}
