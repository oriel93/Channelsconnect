import React, { useState } from 'react';

export default function ProfessionalCalendarDay({ day, onDateClick, onPriceEdit, bulkEditMode }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempPrice, setTempPrice] = useState(day.entry.price);

  const handlePriceSubmit = (e) => {
    e.preventDefault();
    if (tempPrice !== day.entry.price) {
      onPriceEdit(day.date, tempPrice);
    }
    setIsEditing(false);
  };

  const handleDateClick = (e) => {
    if (!isEditing) {
      onDateClick(day.date, e.shiftKey);
    }
  };

  const getStatusColor = () => {
    switch (day.entry.status) {
      case 'booked': return '#3b82f6';
      case 'blocked': return '#6b7280';
      default: return day.isWeekend ? '#f0f9ff' : '#ffffff';
    }
  };

  const getBorderColor = () => {
    if (day.isSelected) return '#3b82f6';
    if (day.isToday) return '#10b981';
    return '#e5e7eb';
  };

  return (
    <div
      className="professional-calendar-day"
      style={{
        backgroundColor: getStatusColor(),
        borderColor: getBorderColor(),
        opacity: day.isCurrentMonth ? 1 : 0.4,
        cursor: isEditing ? 'default' : 'pointer'
      }}
      onClick={handleDateClick}
    >
      <div className="day-header">
        <div className="day-number">{day.dayNumber}</div>
        {day.entry.status !== 'available' && (
          <div className="status-indicator">
            {day.entry.status === 'booked' ? 'B' : 'X'}
          </div>
        )}
      </div>

      {day.entry.status === 'available' && (
        <div className="pricing-section">
          {isEditing ? (
            <form onSubmit={handlePriceSubmit} className="price-edit-form">
              <input
                type="number"
                value={tempPrice}
                onChange={(e) => setTempPrice(Number(e.target.value))}
                onBlur={() => setIsEditing(false)}
                className="price-input-edit"
                autoFocus
              />
            </form>
          ) : (
            <div
              className="main-price"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setTempPrice(day.entry.price);
              }}
            >
              ${day.entry.price}
            </div>
          )}

          {day.entry.market_price && (
            <div className="market-info">
              Market: ${day.entry.market_price}
            </div>
          )}

          {day.entry.pricing_rules && day.entry.pricing_rules.length > 0 && (
            <div className="pricing-rules">
              {day.entry.pricing_rules.slice(0, 1).map((rule, index) => (
                <span key={index} className="rule-badge">
                  {rule}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {day.entry.status === 'booked' && day.entry.booking_info && (
        <div className="booking-info">
          <div className="guest-name">{day.entry.booking_info.guest_name}</div>
          <div className="booking-source">{day.entry.booking_info.booking_source}</div>
        </div>
      )}

      <style jsx>{`
        .professional-calendar-day {
          width: 100%;
          min-height: 120px;
          max-height: 160px;
          padding: 8px;
          border: 2px solid;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
        }

        .professional-calendar-day:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .day-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .day-number {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }

        .status-indicator {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
        }

        .pricing-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .main-price {
          font-size: 20px;
          font-weight: 700;
          color: #059669;
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .main-price:hover {
          background-color: rgba(5, 150, 105, 0.1);
        }

        .price-edit-form {
          display: flex;
          width: 100%;
        }

        .price-input-edit {
          width: 100%;
          font-size: 18px;
          font-weight: 700;
          color: #059669;
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 4px;
          padding: 4px;
          text-align: center;
        }

        .price-input-edit:focus {
          outline: none;
          border-color: #1d4ed8;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }

        .market-info {
          font-size: 11px;
          color: #6b7280;
          font-weight: 500;
        }

        .pricing-rules {
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
        }

        .rule-badge {
          font-size: 9px;
          background: #dbeafe;
          color: #1e40af;
          padding: 1px 4px;
          border-radius: 3px;
          font-weight: 500;
        }

        .booking-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
        }

        .guest-name {
          font-size: 12px;
          font-weight: 600;
          color: white;
          margin-bottom: 2px;
        }

        .booking-source {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.8);
          text-transform: uppercase;
        }

        /* Responsive adjustments */
        @media (max-width: 1400px) {
          .professional-calendar-day {
            min-height: 100px;
            max-height: 140px;
            padding: 6px;
          }
          
          .main-price {
            font-size: 18px;
          }
          
          .day-number {
            font-size: 14px;
          }
        }

        @media (max-width: 1200px) {
          .professional-calendar-day {
            min-height: 90px;
            max-height: 120px;
            padding: 4px;
          }
          
          .main-price {
            font-size: 16px;
          }
          
          .day-number {
            font-size: 13px;
          }
          
          .market-info {
            font-size: 10px;
          }
        }

        @media (max-width: 992px) {
          .professional-calendar-day {
            min-height: 80px;
            max-height: 100px;
            padding: 3px;
          }
          
          .main-price {
            font-size: 14px;
          }
          
          .day-number {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}