import React, { useState, useEffect } from 'react';
import { BlockedDate } from '@/api/entities';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ listingId, source }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [blockedDates, setBlockedDates] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBlockedDates = async () => {
      if (!listingId) return;
      setIsLoading(true);
      try {
        const blocks = await BlockedDate.filter({ listing_id: listingId, source: source });
        setBlockedDates(new Set(blocks.map(b => b.date)));
      } catch (error) {
        console.error("Failed to fetch blocked dates:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBlockedDates();
  }, [listingId, source]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayOfMonth = getDay(startOfMonth(currentMonth));
  const paddingDays = Array(firstDayOfMonth).fill(null);
  const calendarGrid = [...paddingDays, ...daysInMonth];

  const changeMonth = (amount) => {
    setCurrentMonth(current => addMonths(current, amount));
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-bold text-slate-800">{format(currentMonth, 'MMMM yyyy')}</h2>
        <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {dayNames.map(day => (
            <div key={day} className="text-center font-semibold text-slate-600 text-sm py-2">{day}</div>
          ))}
          {calendarGrid.map((day, index) => {
            if (!day) return <div key={`pad-${index}`} className="border rounded-md min-h-[60px] bg-slate-50"></div>;
            
            const dateStr = format(day, 'yyyy-MM-dd');
            const isBlocked = blockedDates.has(dateStr);
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={dateStr}
                className={`border rounded-md min-h-[60px] p-2 text-sm ${
                  isBlocked ? 'bg-red-100 text-red-800' : 'bg-white'
                } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className={`font-semibold ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>{format(day, 'd')}</div>
                {isBlocked && <div className="text-xs mt-1">Blocked</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}