
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Settings, BarChart3, Filter, Download, Upload, CheckCircle, Loader2, Target, CalendarDays } from 'lucide-react';
import BlockIntelligentAnalyticsBar from './BlockIntelligentAnalyticsBar';
import EnhancedCalendarGrid from './EnhancedCalendarGrid';
import { getDashboardCalendarData } from '@/api/functions';
import { updateRate } from '@/api/functions';
import { blockDate } from '@/api/functions';
import { toast } from 'sonner';
import { Listing, Booking } from '@/api/entities';
import { api } from '@/lib/apiClient';
import CalendarAnalyticsModal from './CalendarAnalyticsModal';
import PricingSettingsModal from './PricingSettingsModal';
import BulkOperationsPanel from './BulkOperationsPanel';

// Helper function to generate empty calendar for a month (timezone-safe)
function generateEmptyCalendar(year, month, daysInMonth, baseRate) {
  const allDates = [];
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isPastDate = dateStr < todayStr;

    allDates.push({
      date: dateStr,
      price: baseRate || 0,
      status: isPastDate ? 'past' : 'available',
      isAvailable: !isPastDate,
      isPast: isPastDate,
      minimum_stay: 1,
      source: isPastDate ? 'past' : 'default',
    });
  }
  return allDates;
}

export default function OptimizedCalendarLayout({ selectedListingId, listings = [], lastSyncTimestamp }) {
  const [selectedProperty, setSelectedProperty] = useState(selectedListingId);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [rawCalendarData, setRawCalendarData] = useState([]);
  const [processedCalendarData, setProcessedCalendarData] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [baseRate, setBaseRate] = useState(0);
  const [isSavingBaseRate, setIsSavingBaseRate] = useState(false);
  const debounceTimeout = useRef(null);
  const fetchTimeout = useRef(null);
  const [isDynamicPricingEnabled, setIsDynamicPricingEnabled] = useState(true);
  const [pricingRules, setPricingRules] = useState({
    weekendMultiplier: 1.25,
    holidayMultiplier: 1.40,
    lastMinuteDiscount: 0.15,
    advanceBookingDiscount: 0.10,
  });

  useEffect(() => {
    setSelectedProperty(selectedListingId);
  }, [selectedListingId]);

  useEffect(() => {
    const selectedListing = listings.find(l => l.id === selectedProperty);
    if (selectedListing) {
      setBaseRate(selectedListing.basePrice || selectedListing.default_net_rate || 0);
    }
  }, [selectedProperty, listings]);

  const getEasterDate = useCallback((year) => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = Math.floor((h + l - 7 * m + 114) / 31);
    const p = (h + l - 7 * m + 114) % 31;
    return new Date(year, n - 1, p + 1);
  }, []);

  const getHolidays = useCallback((year) => {
    const holidays = [];
    holidays.push(`${year}-01-01`); // New Year's Day
    holidays.push(`${year}-07-04`); // Independence Day
    holidays.push(`${year}-11-11`); // Veterans Day
    holidays.push(`${year}-12-25`); // Christmas Day
    holidays.push(`${year}-10-31`); // Halloween
    holidays.push(`${year}-12-31`); // New Year's Eve
    
    // Calculate moveable holidays
    let mlkDay = new Date(year, 0, 1);
    let mondayCount = 0;
    while (mondayCount < 3) {
      if (mlkDay.getDay() === 1) mondayCount++;
      if (mondayCount < 3) mlkDay.setDate(mlkDay.getDate() + 1);
    }
    holidays.push(mlkDay.toISOString().split('T')[0]);
    
    let presidentsDay = new Date(year, 1, 1);
    mondayCount = 0;
    while (mondayCount < 3) {
      if (presidentsDay.getDay() === 1) mondayCount++;
      if (mondayCount < 3) presidentsDay.setDate(presidentsDay.getDate() + 1);
    }
    holidays.push(presidentsDay.toISOString().split('T')[0]);
    
    let memorialDay = new Date(year, 4, 31);
    while (memorialDay.getDay() !== 1) {
      memorialDay.setDate(memorialDay.getDate() - 1);
    }
    holidays.push(memorialDay.toISOString().split('T')[0]);
    
    let laborDay = new Date(year, 8, 1);
    while (laborDay.getDay() !== 1) {
      laborDay.setDate(laborDay.getDate() + 1);
    }
    holidays.push(laborDay.toISOString().split('T')[0]);
    
    let thanksgiving = new Date(year, 10, 1);
    let thursdayCount = 0;
    while (thursdayCount < 4) {
      if (thanksgiving.getDay() === 4) thursdayCount++;
      if (thursdayCount < 4) thanksgiving.setDate(thanksgiving.getDate() + 1);
    }
    holidays.push(thanksgiving.toISOString().split('T')[0]);
    
    const easter = getEasterDate(year);
    holidays.push(easter.toISOString().split('T')[0]);
    
    return holidays;
  }, [getEasterDate]);

  const isHoliday = useCallback((dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const year = date.getFullYear();
    const holidays = getHolidays(year);
    return holidays.includes(dateStr);
  }, [getHolidays]);

  const isLastMinute = useCallback((dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  }, []);

  const isAdvanceBooking = useCallback((dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 30;
  }, []);

  const applyDynamicPricing = useCallback((basePrice, date) => {
    if (!isDynamicPricingEnabled || !basePrice) return basePrice;
    
    let adjustedPrice = basePrice;
    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const holidayCheck = isHoliday(date);
    
    if (holidayCheck) {
      adjustedPrice = Math.round(basePrice * pricingRules.holidayMultiplier);
    } else if (isWeekend) {
      adjustedPrice = Math.round(basePrice * pricingRules.weekendMultiplier);
    }
    
    if (isLastMinute(date)) {
      adjustedPrice = Math.round(adjustedPrice * (1 - pricingRules.lastMinuteDiscount));
    } else if (isAdvanceBooking(date)) {
      adjustedPrice = Math.round(adjustedPrice * (1 - pricingRules.advanceBookingDiscount));
    }
    
    return Math.max(adjustedPrice, Math.round(basePrice * 0.5));
  }, [isDynamicPricingEnabled, pricingRules, isHoliday, isLastMinute, isAdvanceBooking]);

  // Fetch bookings for the selected property
  const fetchBookings = useCallback(async () => {
    if (!selectedProperty) {
      setBookings([]);
      return;
    }

    try {
      const allBookings = await Booking.find({ listingId: selectedProperty });
      // Filter out cancelled bookings
      const activeBookings = (allBookings || []).filter(
        b => b.status?.toLowerCase() !== 'cancelled'
      );
      setBookings(activeBookings);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      setBookings([]);
    }
  }, [selectedProperty]);

  // Fetch calendar data from Channex API if listing has beds24RoomId
  const fetchCalendarDataDebounced = useCallback(async () => {
    if (!selectedProperty) {
      setRawCalendarData([]);
      setIsLoading(false);
      return;
    }

    // Clear any existing timeout
    if (fetchTimeout.current) {
      clearTimeout(fetchTimeout.current);
    }

    setIsLoading(true);
    
    // Debounce the actual fetch
    fetchTimeout.current = setTimeout(async () => {
      try {
        // Use UTC dates to avoid timezone issues
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        // First day of month
        const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        
        // Last day of month - calculate days in month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
        
        // Find the selected listing to check if it has Channex integration
        const selectedListing = listings.find(l => l.id === selectedProperty);
        
        // Log selected listing info
        console.log('Selected listing:', selectedListing?.id, 'beds24RoomId:', selectedListing?.beds24RoomId);
        
        if (selectedListing?.beds24RoomId) {
          // Fetch from cached calendar data (not directly from Channex)
          console.log('Fetching cached calendar for listing:', selectedListing.id);
          const response = await api.calendar.getRates({
            listingId: selectedListing.id,
            startDate: startDateStr,
            endDate: endDateStr,
          });
          
          console.log('Cached calendar response:', response);
          
          // Transform cached rates to calendar format
          const cachedRates = response?.data || [];
          
          if (Array.isArray(cachedRates) && cachedRates.length > 0) {
            console.log(`Found ${cachedRates.length} cached calendar entries`);
            
            // Build a map of date -> calendar entry from cached rates
            const dateMap = new Map();
            for (const rate of cachedRates) {
              const dateStr = new Date(rate.date).toISOString().split('T')[0];
              
              // Get numAvail from cache (preferred) or derive from available field
              const numAvail = rate.numAvail !== undefined && rate.numAvail !== null 
                ? rate.numAvail 
                : (rate.available !== undefined ? (rate.available ? 1 : 0) : null);
              
              // Get override from cache (preferred) or derive from availability
              const override = rate.override !== undefined && rate.override !== null
                ? rate.override
                : (numAvail !== null && numAvail === 0 ? 'closed' : 'none');
              
              dateMap.set(dateStr, {
                price: parseFloat(rate.price) || 0,
                numAvail: numAvail ?? null,
                minStay: rate.minStay || 1,
                maxStay: rate.maxStay || 365,
                override: override || 'none',
              });
            }
            
            console.log('DateMap size:', dateMap.size, 'Sample entries:', Array.from(dateMap.entries()).slice(0, 3));
            
            // Generate all dates for the month and map Channex data
            const allDates = [];
            const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
            const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
            const currentDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));
            const lastDate = new Date(Date.UTC(endYear, endMonth - 1, endDay));

            // Get today's date for past day detection
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            while (currentDate <= lastDate) {
              const dateStr = currentDate.toISOString().split('T')[0];
              const cacheEntry = dateMap.get(dateStr);
              const isPastDate = dateStr < todayStr;

              // Check if date is blocked - check both numAvail and override
              const isBlocked = cacheEntry && (
                cacheEntry.numAvail === 0 || 
                cacheEntry.override === 'closed'
              );

              // Debug logging for blocked dates
              if (isBlocked && !isPastDate) {
                console.log(`Blocked date detected: ${dateStr}`, {
                  numAvail: cacheEntry?.numAvail,
                  override: cacheEntry?.override,
                });
              }

              // Determine status based on past/future and API data
              let status = 'available';
              let isAvailable = true;

              if (isPastDate) {
                status = 'past';
                isAvailable = false;
              } else if (isBlocked) {
                status = 'blocked';
                isAvailable = false;
              }

              allDates.push({
                date: dateStr,
                price: cacheEntry?.price || baseRate || 0,
                status,
                isAvailable,
                isPast: isPastDate,
                minimum_stay: cacheEntry?.minStay || 1,
                maximum_stay: cacheEntry?.maxStay || 365,
                source: cacheEntry ? 'cache' : (isPastDate ? 'past' : 'default'),
              });

              currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }
            
            console.log('Generated calendar data:', allDates.slice(0, 5));
            setRawCalendarData(allDates);
          } else {
            console.log('No cached calendar data found');
            // No cache data, generate empty calendar
            const allDates = generateEmptyCalendar(year, month, daysInMonth, baseRate);
            setRawCalendarData(allDates);
          }
        } else {
          // Fallback to local dashboard calendar data
        const { data } = await getDashboardCalendarData({
          listingId: selectedProperty,
            startDate: startDateStr,
            endDate: endDateStr,
        });
        
          if (data?.success) {
            setRawCalendarData(data.data || []);
        } else {
            // Generate empty calendar data
            const allDates = generateEmptyCalendar(year, month, daysInMonth, baseRate);
            setRawCalendarData(allDates);
          }
        }
      } catch (error) {
        console.error('Calendar fetch error:', error);
        if (error.message?.includes('Rate limit')) {
          toast.error("Please wait a moment before making changes.");
        } else {
          // Generate fallback empty calendar on error
          const allDates = generateEmptyCalendar(year, month, daysInMonth, baseRate);
          setRawCalendarData(allDates);
        }
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce
  }, [selectedProperty, currentMonth, listings, baseRate]);

  // Fetch bookings when property changes
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings, selectedProperty, lastSyncTimestamp]);

  // Only fetch when property, month, or a sync event occurs
  useEffect(() => {
    fetchCalendarDataDebounced();
    
    return () => {
      if (fetchTimeout.current) {
        clearTimeout(fetchTimeout.current);
      }
    };
  }, [selectedProperty, currentMonth, lastSyncTimestamp]);

  // CRITICAL FIX: Separate pricing calculations from data fetching
  // Preserve Channex prices, only apply dynamic pricing to days without external prices
  // Also mark dates with bookings as 'booked'
  useEffect(() => {
    if (!rawCalendarData || rawCalendarData.length === 0) {
      setProcessedCalendarData([]);
      return;
    }

    // Create a map of dates with bookings
    const bookingsByDate = new Map();
    bookings.forEach(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      // Mark each date in the booking range
      const currentDate = new Date(checkIn);
      while (currentDate < checkOut) {
        const dateStr = currentDate.toISOString().split('T')[0];
        bookingsByDate.set(dateStr, booking);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    const processed = rawCalendarData.map(day => {
      // Check if this date has a booking
      const booking = bookingsByDate.get(day.date);
      
      if (booking) {
        // Mark as booked - cannot be edited or unblocked
        return {
          ...day,
          status: 'booked',
          isAvailable: false,
          booking: {
            id: booking.id,
            guestName: booking.guestName,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            source: booking.bookingSource,
          },
          isDynamicallyPriced: false,
        };
      }
      
      if (day.status === 'available') {
        // If day has a price from Channex, use it as the base
        // Only apply local dynamic pricing if no external price exists
        const hasExternalPrice = day.source === 'cache' && day.price > 0;
        const effectiveBaseRate = hasExternalPrice ? day.price : baseRate;
        
        // Apply dynamic pricing adjustments on top of the effective base rate
        const newPrice = hasExternalPrice 
          ? day.price  // Keep cached price as-is
          : applyDynamicPricing(baseRate, day.date);
        
        return {
          ...day,
          price: newPrice,
          isDynamicallyPriced: !hasExternalPrice && isDynamicPricingEnabled && newPrice !== baseRate,
        };
      }
      return { ...day, isDynamicallyPriced: false };
    });
    setProcessedCalendarData(processed);
  }, [rawCalendarData, baseRate, isDynamicPricingEnabled, pricingRules, applyDynamicPricing, bookings]);

  const handleBaseRateUpdate = async (newRate) => {
    if (!selectedProperty) return;
    setIsSavingBaseRate(true);
    try {
      const currentListing = listings.find(l => l.id === selectedProperty);
      if (!currentListing) throw new Error('Listing not found');
      await Listing.update(selectedProperty, { 
        default_net_rate: newRate,
        timezone: currentListing.timezone || 'UTC'
      });
      toast.success('Base rate updated!');
    } catch (error) {
      toast.error('Failed to update base rate.');
      console.error(error);
    } finally {
      setIsSavingBaseRate(false);
    }
  };

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    const selectedListing = listings.find(l => l.id === selectedProperty);
    if (selectedProperty && selectedListing && baseRate !== selectedListing.default_net_rate) {
        setIsSavingBaseRate(true);
        debounceTimeout.current = setTimeout(() => {
            handleBaseRateUpdate(baseRate);
        }, 1000);
    } else if (selectedListing && baseRate === selectedListing.default_net_rate) {
        setIsSavingBaseRate(false);
    }
    return () => clearTimeout(debounceTimeout.current);
  }, [baseRate, selectedProperty, listings]);

  const handlePriceUpdate = async (date, price, minimumStay, notes) => {
    if (!selectedProperty) {
      toast.error("No property selected for update.");
      return;
    }
    
    const selectedListing = listings.find(l => l.id === selectedProperty);
    
    try {
      // If listing has Beds24 roomId, update via Channex API
      if (selectedListing?.beds24RoomId) {
        // Use calendar rate update endpoint which updates Channex and refreshes cache
        const response = await api.calendar.updateRate({
          listingId: selectedListing.id,
          date,
          price: price || 0,
          minStay: minimumStay || 1,
          available: true,
        });
        
        if (response.data?.success) {
          // Refresh calendar data after update
          fetchCalendarDataDebounced();
          toast.success(`Successfully updated ${date}`);
        } else {
          throw new Error('Failed to update rate');
        }
      } else {
        // Fallback to local database update
        const { data } = await updateRate({ 
          listingId: selectedProperty, 
          date, 
          price: price || 0,
          minStay: minimumStay 
        });
      if (data.success) {
        setProcessedCalendarData(prevData =>
          prevData.map(day =>
              day.date === date ? { ...day, price, minimum_stay: minimumStay, isDynamicallyPriced: false } : day
          )
        );
        toast.success(`Successfully updated ${date}`);
      } else {
        throw new Error(data.error || 'Failed to update rate');
        }
      }
    } catch (err) {
      toast.error(`Update failed: ${err.message}`);
    }
  };

  const handleBlockUnblock = async (date, action) => {
    if (!selectedProperty) {
      toast.error(`No property selected for ${action}.`);
      return;
    }
    
    const selectedListing = listings.find(l => l.id === selectedProperty);
    const originalData = [...processedCalendarData];
    
    // Optimistic update
      if (action === 'block') {
        setProcessedCalendarData(prev => prev.map(day => day.date === date ? { ...day, status: 'blocked', isAvailable: false, source: 'manual' } : day));
      } else {
        setProcessedCalendarData(prev => prev.map(day => {
          if (day.date === date) {
            // For unblock, preserve the original price from rawCalendarData
            const originalDay = rawCalendarData.find(d => d.date === date);
            const originalPrice = originalDay?.price || day.price || baseRate || 0;
            
            return { 
                ...day, 
                status: 'available', 
                isAvailable: true, 
                source: originalDay?.source || 'default',
                price: originalPrice,
                isDynamicallyPriced: false, // Don't apply dynamic pricing when unblocking
            };
          }
          return day;
        }));
      }
    
    try {
      if (action === 'block') {
        // Use blockDate endpoint which syncs with Channex if needed
        const { data } = await blockDate({ 
          listingId: selectedProperty, 
          date, 
          reason: 'Manual block' 
        });
        if (!data || !data.id) throw new Error('Failed to block date');
        
        toast.success(`Blocked ${date}`);
      } else {
        // Use unblockDate endpoint which syncs with Channex if needed
        const response = await api.calendar.unblockDate({
          listingId: selectedProperty,
          date,
        });
        
        toast.success(`Unblocked ${date}`);
      }
      
      // Wait a moment for cache to update, then refresh calendar data immediately
      setTimeout(() => {
        // Clear debounce timeout and fetch immediately
        if (fetchTimeout.current) {
          clearTimeout(fetchTimeout.current);
        }
        fetchCalendarDataDebounced();
      }, 300);
    } catch (err) {
      toast.error(`${action.charAt(0).toUpperCase() + action.slice(1)} failed: ${err.message}`);
      setProcessedCalendarData(originalData);
    }
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      return new Date(prev.getFullYear(), prev.getMonth() + direction, 1);
    });
  };

  const handleDynamicPricingToggle = (enabled) => {
    setIsDynamicPricingEnabled(enabled);
    toast.success(`Dynamic pricing ${enabled ? 'enabled' : 'disabled'}.`);
  };

  const handleDateSelect = (date) => {
    setSelectedDates(prev => 
      prev.includes(date) 
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  const handleBulkComplete = () => {
    fetchCalendarDataDebounced();
    setSelectedDates([]);
    setShowBulkPanel(false);
  };

  const toggleBulkMode = () => {
    setBulkEditMode(!bulkEditMode);
    if (!bulkEditMode) { // If turning ON bulkEditMode
      setSelectedDates([]);
    }
    setShowBulkPanel(false); // Always close panel when toggling mode
  };

  const openBulkPanel = () => {
    if (selectedDates.length === 0) {
      toast.error('Please select dates first by clicking on them');
      return;
    }
    setShowBulkPanel(true);
  };

  return (
    <div className="optimized-calendar-layout">
      <header className="app-header">
        <div className="top-control-section">
          <div className="main-controls-row">
            <div className="property-selector-group">
              <select
                value={selectedProperty || ''}
                onChange={(e) => setSelectedProperty(Number(e.target.value) || e.target.value)}
                className="property-selector"
              >
                <option value="">Select Property</option>
                {listings.map(listing => (
                  <option key={listing.id} value={listing.id}>
                    {listing.title || listing.name || `Property ${listing.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="date-navigation">
              <button
                className="nav-btn"
                onClick={() => navigateMonth(-1)}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="current-period">
                <h3>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                <span className="period-stats">{processedCalendarData.filter(d => d.isAvailable && !d.isPast && d.status !== 'past').length} available nights</span>
              </div>
              <button className="nav-btn" onClick={() => navigateMonth(1)}>
                <ChevronRight size={16} />
              </button>
            </div>
            {/* <div className="action-buttons">
              <button 
                className={`action-btn ${bulkEditMode ? 'active' : ''}`} 
                onClick={toggleBulkMode}
              >
                <Filter size={14} />
                {bulkEditMode ? `Bulk (${selectedDates.length})` : 'Bulk'}
              </button>
              {bulkEditMode && selectedDates.length > 0 && (
                <button 
                  className="action-btn bulk-actions-btn" 
                  onClick={openBulkPanel}
                >
                  <Target size={14} />
                  Actions
                </button>
              )}
              <button className="action-btn" onClick={() => setIsAnalyticsOpen(true)}>
                <BarChart3 size={14} />
                Analytics
              </button>
              <button className="action-btn" onClick={() => setIsSettingsOpen(true)}>
                <Settings size={14} />
                Settings
              </button>
            </div> */}
          </div>
        </div>
        
        {/* <div className="pricing-controls-row">
          <div className="base-rate-section">
            <label>Base Rate:</label>
            <input 
              type="number" 
              value={baseRate}
              onChange={(e) => setBaseRate(Number(e.target.value))}
              className="base-rate-input" 
            />
            {isSavingBaseRate && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
            {!isSavingBaseRate && selectedListing && selectedListing.default_net_rate === baseRate && baseRate !== 0 && <CheckCircle className="w-4 h-4 text-green-500" />}
          </div>
          
          <div className="dynamic-toggle-section">
            <label className="dynamic-checkbox">
              <input 
                type="checkbox" 
                checked={isDynamicPricingEnabled}
                onChange={(e) => handleDynamicPricingToggle(e.target.checked)}
              />
              Dynamic Pricing
            </label>
          </div>
          
          {isDynamicPricingEnabled && (
            <div className="pricing-sliders-horizontal">
              <div className="slider-group">
                <label>Weekend +{Math.round((pricingRules.weekendMultiplier - 1) * 100)}%</label>
                <input
                  type="range"
                  min="1"
                  max="2"
                  step="0.05"
                  value={pricingRules.weekendMultiplier}
                  onChange={(e) => setPricingRules(prev => ({...prev, weekendMultiplier: parseFloat(e.target.value)}))}
                  className="pricing-slider"
                />
              </div>
              
              <div className="slider-group">
                <label>Holiday +{Math.round((pricingRules.holidayMultiplier - 1) * 100)}%</label>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={pricingRules.holidayMultiplier}
                  onChange={(e) => setPricingRules(prev => ({...prev, holidayMultiplier: parseFloat(e.target.value)}))}
                  className="pricing-slider"
                />
              </div>
              
              <div className="slider-group">
                <label>Last Min -{Math.round(pricingRules.lastMinuteDiscount * 100)}%</label>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={pricingRules.lastMinuteDiscount}
                  onChange={(e) => setPricingRules(prev => ({...prev, lastMinuteDiscount: parseFloat(e.target.value)}))}
                  className="pricing-slider"
                />
              </div>
              
              <div className="slider-group">
                <label>Advance -{Math.round(pricingRules.advanceBookingDiscount * 100)}%</label>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={pricingRules.advanceBookingDiscount}
                  onChange={(e) => setPricingRules(prev => ({...prev, advanceBookingDiscount: parseFloat(e.target.value)}))}
                  className="pricing-slider"
                />
              </div>
            </div>
          )}
        </div> */}
        
        <BlockIntelligentAnalyticsBar calendarData={processedCalendarData} isLoading={isLoading} />
      </header>
      
      <main className="calendar-main-area">
        <div className="calendar-container">
          <EnhancedCalendarGrid
            propertyId={selectedProperty}
            currentMonth={currentMonth}
            bulkEditMode={bulkEditMode}
            selectedDates={selectedDates}
            onDateSelect={handleDateSelect}
            calendarData={processedCalendarData}
            isLoading={isLoading}
            onUpdateDay={handlePriceUpdate}
            onBlockDate={(date) => handleBlockUnblock(date, 'block')}
            onUnblockDate={(date) => handleBlockUnblock(date, 'unblock')}
          />
        </div>
      </main>
      
      <CalendarAnalyticsModal 
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        propertyId={selectedProperty}
        currentMonth={currentMonth}
      />
      
      <PricingSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        pricingRules={pricingRules}
        onSave={setPricingRules}
      />

      <BulkOperationsPanel
        isOpen={showBulkPanel}
        onClose={() => setShowBulkPanel(false)}
        listingId={selectedProperty}
        calendarData={processedCalendarData}
        selectedDates={selectedDates}
        onDateSelect={handleDateSelect}
        onBulkComplete={handleBulkComplete}
      />

      <style jsx>{`
        .optimized-calendar-layout {
          /* Removed height and flex properties to restore natural sizing */
        }
        
        .app-header {
          flex-shrink: 0;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 16px;
        }
        
        .top-control-section {
          margin-bottom: 16px;
        }
        
        .main-controls-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .property-selector-group {
          flex-shrink: 0;
        }

        .property-selector {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          min-width: 200px;
        }

        .date-navigation {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex: 1;
        }
        
        .nav-btn {
          padding: 8px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .nav-btn:hover:not(:disabled) {
          background: #f1f5f9;
        }
        
        .current-period h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .period-stats {
          font-size: 12px;
          color: #64748b;
        }
        
        .action-buttons {
          display: flex;
          gap: 8px;
        }
        
        .action-btn {
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .action-btn:hover {
          background: #f1f5f9;
        }
        
        .action-btn.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        
        .pricing-controls-row {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 12px 0;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 16px;
        }
        
        .base-rate-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .base-rate-input {
          width: 80px;
          padding: 6px 8px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
        }
        
        .dynamic-toggle-section {
          display: flex;
          align-items: center;
        }
        
        .dynamic-checkbox {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        
        .pricing-sliders-horizontal {
          display: flex;
          gap: 20px;
          flex: 1;
        }
        
        .slider-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-width: 120px;
        }
        
        .slider-group label {
          font-size: 11px;
          font-weight: 500;
          color: #475569;
          text-align: center;
        }
        
        .pricing-slider {
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: #e2e8f0;
          outline: none;
          cursor: pointer;
        }
        
        .pricing-slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .calendar-main-area {
          padding-top: 16px;
        }
        
        .calendar-container {
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: white;
        }

        .bulk-actions-btn {
          background: #10b981 !important;
          color: white !important;
          border-color: #10b981 !important;
        }
        
        .bulk-actions-btn:hover {
          background: #059669 !important;
        }
      `}</style>
    </div>
  );
}
