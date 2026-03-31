import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Check, 
  X, 
  Ban,
  Pencil,
  Flag,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function EnhancedPricingCalendar({ 
  calendarData, 
  onUpdatePrice, 
  onToggleBlock,
  isLoading = false 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingDate, setEditingDate] = useState(null);
  const [tempPrice, setTempPrice] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingDate && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingDate]);

  const formatDate = (date) => date.toISOString().split('T')[0];
  
  const getDayData = (date) => {
    const dateStr = formatDate(date);
    return calendarData[dateStr] || {
      date: dateStr,
      price: 0,
      isAvailable: true,
      isManuallyOverridden: false,
      demandLevel: 'normal'
    };
  };

  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const getDemandColor = (demandLevel, isAvailable) => {
    if (!isAvailable) return 'bg-red-50 text-red-700/80';
    switch (demandLevel) {
      case 'low': return 'bg-gray-50';
      case 'normal': return 'bg-blue-50';
      case 'high': return 'bg-green-50';
      default: return 'bg-white';
    }
  };

  const handleCellDoubleClick = (date, event) => {
    event.stopPropagation();
    if (isPastDate(date)) return;
    
    const dateStr = formatDate(date);
    const dayData = getDayData(date);
    
    setEditingDate(dateStr);
    setTempPrice(dayData.price > 0 ? dayData.price.toString() : '');
  };

  const handlePriceSave = async (dateStr) => {
    const price = parseFloat(tempPrice);
    
    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setEditingDate(null);
    setTempPrice('');
    await onUpdatePrice(dateStr, price);
  };
  
  const handlePriceCancel = () => {
    setEditingDate(null);
    setTempPrice('');
  }

  const handleKeyPress = (event, dateStr) => {
    if (event.key === 'Enter') {
      handlePriceSave(dateStr);
    } else if (event.key === 'Escape') {
      handlePriceCancel();
    }
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
      newMonth.setDate(1); // Avoid issues with end of month
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[180px] text-center">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-xs font-semibold text-gray-600 uppercase">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((date, index) => {
            if (!date) {
              return <div key={index} className="h-24 border-r border-b bg-gray-50 last:border-r-0"></div>;
            }

            const dateStr = formatDate(date);
            const dayData = getDayData(date);
            const isPast = isPastDate(date);
            const isEditing = editingDate === dateStr;
            const demandColor = getDemandColor(dayData.demandLevel, dayData.isAvailable);

            return (
              <div
                key={dateStr}
                className={`h-24 border-r border-b last:border-r-0 cursor-pointer relative transition-all duration-150 p-1.5 flex flex-col justify-between ${demandColor} ${isPast ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md hover:z-10 hover:scale-105'}`}
                onDoubleClick={(e) => handleCellDoubleClick(date, e)}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-medium text-gray-700">{date.getDate()}</span>
                  <div className="flex space-x-1">
                    {!dayData.isAvailable && <Ban className="w-3 h-3 text-red-500" title="Blocked" />}
                    {dayData.isManuallyOverridden && <Pencil className="w-3 h-3 text-purple-600" title="Manual Override" />}
                  </div>
                </div>

                <div className="flex items-center justify-center flex-grow">
                  {isEditing ? (
                    <div className="flex items-center space-x-1 w-full z-20">
                      <Input
                        ref={inputRef}
                        type="number"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, dateStr)}
                        className="w-full h-7 text-xs text-center shadow-md"
                        placeholder="$"
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handlePriceSave(dateStr)}><Check className="w-3.5 h-3.5 text-green-600"/></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handlePriceCancel}><X className="w-3.5 h-3.5 text-red-600"/></Button>
                    </div>
                  ) : (
                    <div className={`text-center font-bold text-sm py-1 rounded-md w-full ${!dayData.isAvailable ? 'text-red-600 line-through' : 'text-gray-800'}`}>
                      {dayData.price > 0 ? `$${dayData.price}` : <span className="text-xs font-normal text-gray-400">{dayData.isAvailable ? 'Set Price' : ''}</span>}
                    </div>
                  )}
                </div>
                 <div className="h-4"></div>
              </div>
            );
          })}
        </div>
      </div>
      
       <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600 justify-center items-center mt-2">
        <span className="font-semibold">Demand:</span>
        <div className="flex items-center space-x-1"><div className="w-3 h-3 bg-gray-50 border rounded-sm"></div><span>Low</span></div>
        <div className="flex items-center space-x-1"><div className="w-3 h-3 bg-blue-50 border rounded-sm"></div><span>Normal</span></div>
        <div className="flex items-center space-x-1"><div className="w-3 h-3 bg-green-50 border rounded-sm"></div><span>High</span></div>
        <div className="flex items-center space-x-1"><div className="w-3 h-3 bg-red-50 border rounded-sm"></div><span>Blocked</span></div>
        <div className="flex items-center space-x-1"><Pencil className="w-3 h-3 text-purple-600"/><span>Manual</span></div>
      </div>
    </div>
  );
}