
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Settings, BarChart3, Filter, Download, Upload, CheckCircle, Loader2, Target } from 'lucide-react';
import BlockIntelligentAnalyticsBar from './BlockIntelligentAnalyticsBar';
import EnhancedCalendarGrid from './EnhancedCalendarGrid';
import { getDashboardCalendarData } from '@/api/functions';
import { updateRate } from '@/api/functions';
import { blockDate } from '@/api/functions';
import { toast } from 'sonner';
import { Listing } from '@/api/entities';
import CalendarAnalyticsModal from './CalendarAnalyticsModal';
import PricingSettingsModal from './PricingSettingsModal';
import BulkOperationsPanel from './BulkOperationsPanel';

export default function OptimizedCalendarLayout({ selectedListingId, listings = [], lastSyncTimestamp }) {
  const [selectedProperty, setSelectedProperty] = useState(selectedListingId);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [rawCalendarData, setRawCalendarData] = useState([]);
  const [processedCalendarData, setProcessedCalendarData] = useState([]);
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
      setBaseRate(selectedListing.default_net_rate || 0);
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

  // CRITICAL FIX: Debounced fetch to prevent rate limiting
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
        const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        const { data } = await getDashboardCalendarData({
          listingId: selectedProperty,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        });
        
        if (data.success) {
          setRawCalendarData(data.data);
        } else {
          toast.error("Failed to load calendar data.");
          setRawCalendarData([]);
        }
      } catch (error) {
        if (error.message.includes('Rate limit')) {
          toast.error("Please wait a moment before making changes.");
        } else {
          toast.error("An error occurred while fetching calendar data.");
        }
        console.error(error);
        setRawCalendarData([]);
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce
  }, [selectedProperty, currentMonth]);

  // Only fetch when property, month, or a sync event occurs
  useEffect(() => {
    fetchCalendarDataDebounced();

    return () => {
      if (fetchTimeout.current) {
        clearTimeout(fetchTimeout.current);
      }
    };
  }, [selectedProperty, currentMonth, lastSyncTimestamp, fetchCalendarDataDebounced]);

  // CRITICAL FIX: Separate pricing calculations from data fetching
  useEffect(() => {
    if (!rawCalendarData || rawCalendarData.length === 0) {
      setProcessedCalendarData([]);
      return;
    }

    const processed = rawCalendarData.map(day => {
      if (day.status === 'available') {
        const newPrice = applyDynamicPricing(baseRate, day.date);
        return {
          ...day,
          price: newPrice,
          isDynamicallyPriced: isDynamicPricingEnabled && newPrice !== baseRate,
        };
      }
      return { ...day, isDynamicallyPriced: false };
    });
    setProcessedCalendarData(processed);
  }, [rawCalendarData, baseRate, isDynamicPricingEnabled, pricingRules, applyDynamicPricing]);

  const handleBaseRateUpdate = useCallback(async (newRate) => {
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
  }, [selectedProperty, listings]);

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    const selectedListing = listings.find(l => l.id === selectedProperty);
    if (selectedProperty && selectedListing && selectedListing.default_net_rate !== undefined && baseRate !== selectedListing.default_net_rate) {
        setIsSavingBaseRate(true);
        debounceTimeout.current = setTimeout(() => {
            handleBaseRateUpdate(baseRate);
        }, 1000);
    } else if (selectedListing && baseRate === selectedListing.default_net_rate) {
        setIsSavingBaseRate(false);
    }
    return () => clearTimeout(debounceTimeout.current);
  }, [baseRate, selectedProperty, listings, handleBaseRateUpdate]);

  const handlePriceUpdate = async (date, price, minimumStay, notes) => {
    if (!selectedProperty) {
      toast.error("No property selected for update.");
      return;
    }
    try {
      const { data } = await updateRate({ listingId: selectedProperty, date, rate: price, minimumStay, notes });
      if (data.success) {
        setProcessedCalendarData(prevData =>
          prevData.map(day =>
            day.date === date ? { ...day, price, minimum_stay: minimumStay, notes, isDynamicallyPriced: false } : day
          )
        );
        toast.success(`Successfully updated ${date}`);
      } else {
        throw new Error(data.error || 'Failed to update rate');
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
    const originalData = [...processedCalendarData];
    try {
      if (action === 'block') {
        setProcessedCalendarData(prev => prev.map(day => day.date === date ? { ...day, status: 'blocked', isAvailable: false, source: 'manual' } : day));
      } else {
        setProcessedCalendarData(prev => prev.map(day => {
          if (day.date === date) {
            return { 
                ...day, 
                status: 'available', 
                isAvailable: true, 
                source: 'default',
                price: applyDynamicPricing(baseRate, day.date),
                isDynamicallyPriced: isDynamicPricingEnabled && applyDynamicPricing(baseRate, day.date) !== baseRate
            };
          }
          return day;
        }));
      }
      const { data } = await blockDate({ listing_id: selectedProperty, date, action });
      if (!data.success) throw new Error(data.error || `Failed to ${action} date`);
      toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)}ed ${date}`);
    } catch (err) {
      toast.error(`${action.charAt(0).toUpperCase() + action.slice(1)} failed: ${err.message}`);
      setProcessedCalendarData(originalData);
    }
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonthDate = new Date(prev.getFullYear(), prev.getMonth() + direction, 1);
      const today = new Date();
      const firstOfCurrentActualMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return newMonthDate < firstOfCurrentActualMonth ? prev : newMonthDate;
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

  const selectedListing = listings.find(l => l.id === selectedProperty);
  const today = new Date();
  const firstDayOfCurrentActualMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstDayOfDisplayedMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const isBackButtonDisabled = firstDayOfDisplayedMonth <= firstDayOfCurrentActualMonth;

  return (
    <div className="optimized-calendar-layout">
      <header className="app-header">
        <div className="top-control-section">
          <div className="main-controls-row">
            <div className="property-selector-group">
              <select 
                value={selectedProperty || ''} 
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="property-selector"
              >
                <option value="">Select Property</option>
                {listings.map(listing => (
                  <option key={listing.id} value={listing.id}>
                    {listing.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="date-navigation">
              <button 
                className="nav-btn" 
                onClick={() => navigateMonth(-1)}
                disabled={isBackButtonDisabled}
                style={{ cursor: isBackButtonDisabled ? 'not-allowed' : 'pointer', opacity: isBackButtonDisabled ? 0.5 : 1 }}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="current-period">
                <h3>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                <span className="period-stats">{processedCalendarData.filter(d=>d.isAvailable).length} available nights</span>
              </div>
              <button className="nav-btn" onClick={() => navigateMonth(1)}>
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="action-buttons">
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
            </div>
          </div>
        </div>
        
        <div className="pricing-controls-row">
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
        </div>
        
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
          justify-content: space-between;
          gap: 16px;
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
          gap: 12px;
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
