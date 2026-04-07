
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon, TrendingUp, Settings, BarChart3, Filter,
  ChevronLeft, ChevronRight, Download, Upload, Zap,
  AlertCircle, CheckCircle, Clock, Lock, Wrench, Star
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// The outline changes the component used from ProfessionalCalendarDay to EnhancedCalendarDay.
// To ensure the file remains functional, we assume ProfessionalCalendarDay is effectively
// renamed/enhanced to EnhancedCalendarDay, requiring an update to its import.
import EnhancedCalendarDay from './ProfessionalCalendarDay';

export default function IndustryLeadingCalendar({ selectedListingId, listings = [] }) {
  const [selectedProperty, setSelectedProperty] = useState(selectedListingId);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [viewMode, setViewMode] = useState('single');
  const [showAdvancedControls, setShowAdvancedControls] = useState(true);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [hoverDate, setHoverDate] = useState(null);
  const [calendarData, setCalendarData] = useState({});

  // Mock performance data - in real implementation, fetch from API
  const performanceMetrics = {
    occupancyRate: 78.5,
    occupancyChange: 5.2,
    avgDailyRate: 247,
    rateChange: 12.3,
    monthlyRevenue: 18450,
    revenueChange: 8.7,
    revenueOpportunity: 5230
  };

  // Enhanced calendar grid with real-time updates
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const weeks = [];
    const current = new Date(startDate);

    for (let week = 0; week < 6; week++) {
      const days = [];
      for (let day = 0; day < 7; day++) {
        const dateString = current.toISOString().split('T')[0];
        const isCurrentMonth = current.getMonth() === currentDate.getMonth();
        const isToday = current.toDateString() === new Date().toDateString();
        const isWeekend = current.getDay() === 0 || current.getDay() === 6;

        // Enhanced calendar entry data with inline editing support
        const mockEntry = {
          id: `entry-${dateString}`,
          property_id: selectedProperty,
          date: dateString,
          status: Math.random() > 0.7 ? 'booked' : Math.random() > 0.8 ? 'blocked' : 'available',
          price: Math.floor(Math.random() * 200) + 150,
          base_price: 200,
          calculated_price: Math.floor(Math.random() * 250) + 180,
          minimum_stay: isWeekend ? 2 : 1,
          occupancy_rate: Math.random() * 100,
          market_price: Math.floor(Math.random() * 220) + 170,
          price_change_percentage: (Math.random() - 0.5) * 20,
          pricing_rules: isWeekend ? ['weekend-premium'] : [],
          sync_status: Math.random() > 0.95 ? 'error' : 'synced',
          is_override: Math.random() > 0.9,
          last_updated: new Date().toISOString(),
          booking_info: Math.random() > 0.7 ? {
            guest_name: 'John Smith',
            guest_email: 'john@example.com',
            booking_source: ['Airbnb', 'Booking.com', 'VRBO'][Math.floor(Math.random() * 3)]
          } : null
        };

        days.push({
          date: dateString,
          dayNumber: current.getDate(),
          isCurrentMonth,
          isToday,
          isWeekend,
          isSelected: selectedDates.has(dateString),
          isHovered: hoverDate === dateString,
          entry: mockEntry
        });

        current.setDate(current.getDate() + 1);
      }
      weeks.push(days);
    }

    return weeks;
  }, [currentDate, selectedDates, hoverDate, selectedProperty]);

  const handleDateClick = useCallback((date, shiftKey = false) => {
    if (bulkEditMode || shiftKey) {
      const newSelection = new Set(selectedDates);
      if (newSelection.has(date)) {
        newSelection.delete(date);
      } else {
        newSelection.add(date);
      }
      setSelectedDates(newSelection);
    } else {
      setSelectedDates(new Set([date]));
    }
  }, [selectedDates, bulkEditMode]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value, showSign = true) => {
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className="industry-leading-calendar">
      {/* Advanced Header */}
      <div className="calendar-header">
        <div className="header-left">
          <div className="property-selector">
            <select
              value={selectedProperty || ''}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="property-select"
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
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="nav-button"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="current-month">
              <h2>{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
              <span className="month-stats">31 days • 23 available • 8 booked</span>
            </div>

            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="nav-button"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="header-right">
          <div className="view-controls">
            <button
              className={`view-button ${viewMode === 'single' ? 'active' : ''}`}
              onClick={() => setViewMode('single')}
            >
              Single Property
            </button>
            <button
              className={`view-button ${viewMode === 'multi' ? 'active' : ''}`}
              onClick={() => setViewMode('multi')}
            >
              Multi Property
            </button>
          </div>

          <div className="action-buttons">
            <button
              className={`bulk-edit-button ${bulkEditMode ? 'active' : ''}`}
              onClick={() => setBulkEditMode(!bulkEditMode)}
            >
              <Filter size={16} />
              Bulk Edit
            </button>
            <button className="analytics-button">
              <BarChart3 size={16} />
              Analytics
            </button>
            <button className="settings-button">
              <Settings size={16} />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Performance Analytics Bar */}
      <div className="analytics-bar">
        <div className="metric">
          <div className="metric-value">{formatPercentage(performanceMetrics.occupancyRate, false)}</div>
          <div className="metric-label">Occupancy Rate</div>
          <div className="metric-change positive">{formatPercentage(performanceMetrics.occupancyChange)}</div>
        </div>
        <div className="metric">
          <div className="metric-value">{formatCurrency(performanceMetrics.avgDailyRate)}</div>
          <div className="metric-label">Avg Daily Rate</div>
          <div className="metric-change positive">{formatPercentage(performanceMetrics.rateChange)}</div>
        </div>
        <div className="metric">
          <div className="metric-value">{formatCurrency(performanceMetrics.monthlyRevenue)}</div>
          <div className="metric-label">Monthly Revenue</div>
          <div className="metric-change positive">{formatPercentage(performanceMetrics.revenueChange)}</div>
        </div>
        <div className="metric">
          <div className="metric-value">{formatCurrency(performanceMetrics.revenueOpportunity)}</div>
          <div className="metric-label">Revenue Opportunity</div>
          <div className="metric-change neutral">Available</div>
        </div>
      </div>

      <div className="calendar-body">
        {showAdvancedControls && (
          <div className="advanced-sidebar">
            <div className="sidebar-section">
              <h3>Pricing Intelligence</h3>
              <div className="pricing-controls">
                <div className="base-price">
                  <label>Base Price</label>
                  <input type="number" defaultValue="200" className="price-input" />
                </div>
                <div className="dynamic-pricing">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Dynamic Pricing
                  </label>
                </div>
                <div className="pricing-rules">
                  <h4>Active Rules</h4>
                  <div className="rule-item">
                    <span className="rule-name">Weekend Premium</span>
                    <span className="rule-value">+25%</span>
                  </div>
                  <div className="rule-item">
                    <span className="rule-name">Last Minute</span>
                    <span className="rule-value">-15%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sidebar-section">
              <h3>Sync Status</h3>
              <div className="sync-status">
                <div className="sync-item">
                  <CheckCircle size={16} className="sync-icon success" />
                  <span>Airbnb</span>
                  <span className="sync-time">2 min ago</span>
                </div>
                <div className="sync-item">
                  <CheckCircle size={16} className="sync-icon success" />
                  <span>Booking.com</span>
                  <span className="sync-time">5 min ago</span>
                </div>
                <div className="sync-item">
                  <AlertCircle size={16} className="sync-icon error" />
                  <span>VRBO</span>
                  <span className="sync-time">Error</span>
                </div>
              </div>
            </div>

            <div className="sidebar-section">
              <h3>Recent Activity</h3>
              <div className="activity-log">
                <div className="activity-item">
                  <span className="activity-time">2:30 PM</span>
                  <span className="activity-desc">Price updated for Jul 15-20</span>
                </div>
                <div className="activity-item">
                  <span className="activity-time">1:45 PM</span>
                  <span className="activity-desc">New booking from Airbnb</span>
                </div>
                <div className="activity-item">
                  <span className="activity-time">12:15 PM</span>
                  <span className="activity-desc">Bulk block applied</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Calendar Grid */}
        <div className="calendar-grid">
          {/* Day Headers */}
          <div className="calendar-headers">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="header-day">{day}</div>
            ))}
          </div>

          {/* Enhanced Calendar Days with Inline Editing */}
          <div className="calendar-days">
            {calendarGrid.map((week, weekIndex) => (
              <div key={weekIndex} className="calendar-week">
                {week.map((day) => (
                  <EnhancedCalendarDay
                    key={day.date}
                    day={day}
                    onDateClick={handleDateClick}
                    onDateHover={setHoverDate}
                    bulkEditMode={bulkEditMode}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Operations Panel */}
      <AnimatePresence>
        {selectedDates.size > 0 && (
          <motion.div
            className="bulk-operations-panel"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            <div className="bulk-panel-content">
              <div className="selection-info">
                <span className="selected-count">{selectedDates.size} dates selected</span>
                <button
                  className="clear-selection"
                  onClick={() => setSelectedDates(new Set())}
                >
                  Clear
                </button>
              </div>

              <div className="bulk-actions">
                <button className="bulk-action-btn primary">
                  <TrendingUp size={16} />
                  Update Prices
                </button>
                <button className="bulk-action-btn secondary">
                  <Lock size={16} />
                  Block Dates
                </button>
                <button className="bulk-action-btn secondary">
                  <CheckCircle size={16} />
                  Make Available
                </button>
                <button className="bulk-action-btn secondary">
                  <Wrench size={16} />
                  Maintenance
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .industry-leading-calendar {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1e293b;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 32px;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .property-select {
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          font-size: 14px;
          font-weight: 500;
          min-width: 200px;
          transition: all 0.2s ease;
        }

        .property-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .date-navigation {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .nav-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #64748b;
        }

        .nav-button:hover {
          background: #f8fafc;
          border-color: #3b82f6;
          color: #3b82f6;
          transform: translateY(-1px);
        }

        .current-month h2 {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 4px 0;
          color: #1e293b;
        }

        .month-stats {
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .view-controls {
          display: flex;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }

        .view-button {
          padding: 10px 16px;
          border: none;
          background: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          color: #64748b;
        }

        .view-button.active {
          background: #3b82f6;
          color: white;
        }

        .view-button:hover:not(.active) {
          background: #f8fafc;
          color: #3b82f6;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
        }

        .bulk-edit-button,
        .analytics-button,
        .settings-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          color: #64748b;
        }

        .bulk-edit-button.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .bulk-edit-button:hover,
        .analytics-button:hover,
        .settings-button:hover {
          background: #f8fafc;
          border-color: #3b82f6;
          color: #3b82f6;
          transform: translateY(-1px);
        }

        .analytics-bar {
          display: flex;
          justify-content: space-around;
          padding: 24px 32px;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 24px;
        }

        .metric {
          text-align: center;
          padding: 0 20px;
        }

        .metric-value {
          font-size: 32px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1;
          margin-bottom: 4px;
        }

        .metric-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .metric-change {
          font-size: 12px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .metric-change.positive {
          color: #059669;
          background: #ecfdf5;
        }

        .metric-change.negative {
          color: #dc2626;
          background: #fef2f2;
        }

        .metric-change.neutral {
          color: #64748b;
          background: #f1f5f9;
        }

        .calendar-body {
          display: flex;
          flex: 1;
          gap: 24px;
          padding: 0 32px 32px;
          overflow: hidden;
        }

        .advanced-sidebar {
          width: 320px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          padding: 24px;
          overflow-y: auto;
        }

        .sidebar-section {
          margin-bottom: 32px;
        }

        .sidebar-section h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 16px;
        }

        .sidebar-section h4 {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
        }

        .pricing-controls {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .base-price label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .price-input {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .price-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .dynamic-pricing label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
        }

        .rule-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 6px;
          margin-bottom: 8px;
        }

        .rule-name {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .rule-value {
          font-size: 14px;
          font-weight: 600;
          color: #059669;
        }

        .sync-status {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sync-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: #f8fafc;
          border-radius: 6px;
        }

        .sync-icon.success {
          color: #059669;
        }

        .sync-icon.error {
          color: #dc2626;
        }

        .sync-time {
          margin-left: auto;
          font-size: 12px;
          color: #64748b;
        }

        .activity-log {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .activity-item {
          display: flex;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .activity-time {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          min-width: 60px;
        }

        .activity-desc {
          font-size: 12px;
          color: #374151;
          font-weight: 500;
        }

        .calendar-grid {
          flex: 1;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .calendar-headers {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .header-day {
          padding: 16px 12px;
          text-align: center;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .calendar-days {
          display: flex;
          flex-direction: column;
        }

        .calendar-week {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          border-bottom: 1px solid #f1f5f9;
        }

        .calendar-week:last-child {
          border-bottom: none;
        }

        .bulk-operations-panel {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          padding: 20px 24px;
          z-index: 1000;
          border: 1px solid #e5e7eb;
          min-width: 600px;
        }

        .bulk-panel-content {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .selection-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .selected-count {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
        }

        .clear-selection {
          font-size: 12px;
          color: #64748b;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
          transition: color 0.2s ease;
        }

        .clear-selection:hover {
          color: #374151;
        }

        .bulk-actions {
          display: flex;
          gap: 12px;
        }

        .bulk-action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          color: #374151;
        }

        .bulk-action-btn.primary {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-color: #3b82f6;
        }

        .bulk-action-btn.primary:hover {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .bulk-action-btn.secondary:hover {
          background: #f8fafc;
          border-color: #3b82f6;
          color: #3b82f6;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
