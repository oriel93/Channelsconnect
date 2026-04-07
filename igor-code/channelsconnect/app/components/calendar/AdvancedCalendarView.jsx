
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Check, 
  X,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar as CalendarIcon,
  BedDouble,
  Home,
  Sun,
  Moon
} from 'lucide-react';
import { toast } from 'sonner';

function CalendarDayCell({ 
  day, 
  dayData, 
  isSelected,
  isEditing,
  editValue,
  onStartEdit,
  onSave,
  onCancel,
  onValueChange,
  onToggleBlock,
  inputRef 
}) {
  const isPast = day.date < new Date(new Date().setHours(0,0,0,0));

  const getStatusIcon = (status) => {
    const icons = {
      available: <Sun className="w-3 h-3 text-green-500" />,
      blocked: <Lock className="w-3 h-3 text-gray-500" />,
      booked: <BedDouble className="w-3 h-3 text-blue-500" />,
      maintenance: <Home className="w-3 h-3 text-purple-500" />,
    };
    return icons[status] || null;
  };
  
  const getCellStyle = () => {
    if (isPast && !isEditing) return 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-70';
    if (isSelected) return 'bg-blue-100 border-2 border-blue-400 ring-2 ring-blue-200 z-10';
    if (isEditing) return 'bg-white border-2 border-blue-500 shadow-lg ring-2 ring-blue-100 z-20 relative';
    if (!dayData.isAvailable) {
        if (dayData.status === 'booked') return 'bg-blue-50 border-blue-200';
        return 'bg-red-50 border-red-200';
    }
    return 'bg-white hover:bg-gray-50';
  };
  
  return (
    <div 
      className={`h-28 border border-gray-200 p-1.5 flex flex-col justify-between transition-all duration-150 ${getCellStyle()}`}
      onClick={() => {
        if (!isPast && day.isInMonth) {
            onStartEdit(dayData.date, dayData.price);
        }
      }}
    >
      <div className="flex justify-between items-start">
        <span className={`text-xs font-semibold ${day.isInMonth ? 'text-gray-800' : 'text-gray-400'}`}>
          {day.date.getDate()}
        </span>
        {dayData && getStatusIcon(dayData.status)}
      </div>
      
      <div className="flex-1 flex items-center justify-center text-center">
        {isEditing ? (
            <div className="w-full">
              <div className="relative">
                <DollarSign className="w-3 h-3 absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  type="number"
                  value={editValue}
                  onChange={(e) => onValueChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSave()}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-center p-1 pl-5 text-sm rounded-md border-blue-400 border"
                />
              </div>
              <div className="flex justify-center items-center gap-1 mt-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); onSave()}}><Check className="w-4 h-4 text-green-600"/></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); onCancel()}}><X className="w-4 h-4 text-red-600"/></Button>
              </div>
            </div>
        ) : day.isInMonth && dayData && (
          <div className="w-full">
            <p className={`font-bold text-sm ${dayData.isAvailable ? 'text-gray-800' : 'text-gray-500 line-through'}`}>
              ${dayData.price}
            </p>
            {dayData.minimum_stay > 1 && (
              <Badge variant="outline" className="text-xs mt-1 py-0 px-1">
                <Moon className="w-2.5 h-2.5 mr-1"/>{dayData.minimum_stay}
              </Badge>
            )}
             {dayData.status === 'booked' && dayData.booking_info && (
               <p className="text-xs text-blue-600 truncate">{dayData.booking_info.guest_name}</p>
             )}
          </div>
        )}
      </div>
    </div>
  );
}


export default function AdvancedCalendarView({
  calendarData,
  onPriceUpdate,
  onDateToggle, // Not used directly in this component, but passed for potential future use
  selectedDates, // Not used directly, but good for consistency
  onDateSelect, // Not used directly
  bulkMode, // Not used directly
  isLoading
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingDate, setEditingDate] = useState(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);

  const handleStartEdit = useCallback((dateStr, currentPrice) => {
    setEditingDate(dateStr);
    setEditValue(currentPrice || '');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSave = useCallback(async () => {
    const price = parseFloat(editValue);
    if (!isNaN(price) && price >= 0) {
      await onPriceUpdate(editingDate, price);
    }
    setEditingDate(null);
  }, [editingDate, editValue, onPriceUpdate]);

  const handleCancel = useCallback(() => {
    setEditingDate(null);
  }, []);
  
  const generateMonthDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Days from previous month
    for (let i = 0; i < firstDay.getDay(); i++) {
        const prevMonthDay = new Date(year, month, i - firstDay.getDay() + 1);
        days.push({ date: prevMonthDay, isInMonth: false });
    }
    
    // Days in current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push({ date: new Date(year, month, i), isInMonth: true });
    }

    // Days from next month to fill grid
    const remaining = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remaining; i++) {
        const nextMonthDay = new Date(year, month + 1, i);
        days.push({ date: nextMonthDay, isInMonth: false });
    }
    return days;
  };
  
  const days = generateMonthDays(currentMonth);
  const calendarDataMap = useMemo(() => {
    const map = new Map();
    for(const data of Object.values(calendarData)) {
      map.set(data.date, data);
    }
    return map;
  }, [calendarData]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>
             <ChevronLeft className="w-4 h-4" />
           </Button>
           <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>
             <ChevronRight className="w-4 h-4" />
           </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-t border-l rounded-t-lg">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-xs font-bold text-gray-600 bg-gray-50 border-b border-r">
              {day}
            </div>
          ))}
          {days.map((day, index) => {
             const dateStr = day.date.toISOString().split('T')[0];
             const dayData = calendarDataMap.get(dateStr);
             return (
                 <CalendarDayCell 
                     key={index}
                     day={day}
                     dayData={dayData}
                     isEditing={editingDate === dateStr}
                     editValue={editValue}
                     onStartEdit={handleStartEdit}
                     onSave={handleSave}
                     onCancel={handleCancel}
                     onValueChange={setEditValue}
                     onToggleBlock={() => {}} // Placeholder
                     inputRef={inputRef}
                 />
             );
          })}
      </div>
    </div>
  );
}
