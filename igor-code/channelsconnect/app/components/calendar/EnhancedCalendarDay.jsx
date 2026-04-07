import React, { useState, useCallback } from 'react';
import { MoreHorizontal, Edit3 } from 'lucide-react';

export default function EnhancedCalendarDay({ dayData, onUpdateDay, onBlockDate, onUnblockDate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrice, setEditPrice] = useState(dayData.price || 0);
  const [showMenu, setShowMenu] = useState(false);

  const dayNumber = new Date(dayData.date).getDate();
  const isBlocked = dayData.status === 'blocked' || !dayData.isAvailable;
  const isBooked = dayData.status === 'booked';
  const isDynamicallyPriced = dayData.isDynamicallyPriced;

  const handleSave = useCallback(() => {
    onUpdateDay(dayData.date, editPrice, dayData.minimum_stay || 1, dayData.notes || '');
    setIsEditing(false);
  }, [dayData.date, editPrice, dayData.minimum_stay, dayData.notes, onUpdateDay]);

  const handleBlock = useCallback(() => {
    onBlockDate(dayData.date);
    setShowMenu(false);
  }, [dayData.date, onBlockDate]);

  const handleUnblock = useCallback(() => {
    onUnblockDate(dayData.date);
    setShowMenu(false);
  }, [dayData.date, onUnblockDate]);

  const handleMenuClick = useCallback((e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  }, [showMenu]);

  const dayStyle = {
    backgroundColor: isBlocked ? '#fef2f2' : isBooked ? '#f0fdf4' : '#ffffff',
    border: '1px solid #e5e7eb',
    padding: '8px',
    minHeight: '80px',
    position: 'relative',
    cursor: 'pointer'
  };

  return (
    <div style={dayStyle} className="calendar-day-simple">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontWeight: '600', fontSize: '14px' }}>{dayNumber}</span>
        <button 
          onClick={handleMenuClick}
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: '2px', 
            cursor: 'pointer',
            opacity: '0.7'
          }}
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {showMenu && (
        <div style={{
          position: 'absolute',
          top: '30px',
          right: '8px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 10,
          minWidth: '100px'
        }}>
          {!isBooked && (
            <>
              <button 
                onClick={() => { setIsEditing(true); setShowMenu(false); }}
                style={{ 
                  display: 'block', 
                  width: '100%', 
                  padding: '6px 10px', 
                  border: 'none', 
                  background: 'none', 
                  textAlign: 'left',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Edit Price
              </button>
              {isBlocked ? (
                <button 
                  onClick={handleUnblock}
                  style={{ 
                    display: 'block', 
                    width: '100%', 
                    padding: '6px 10px', 
                    border: 'none', 
                    background: 'none', 
                    textAlign: 'left',
                    fontSize: '12px',
                    cursor: 'pointer',
                    color: '#10b981'
                  }}
                >
                  Unblock
                </button>
              ) : (
                <button 
                  onClick={handleBlock}
                  style={{ 
                    display: 'block', 
                    width: '100%', 
                    padding: '6px 10px', 
                    border: 'none', 
                    background: 'none', 
                    textAlign: 'left',
                    fontSize: '12px',
                    cursor: 'pointer',
                    color: '#ef4444'
                  }}
                >
                  Block
                </button>
              )}
            </>
          )}
        </div>
      )}

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input
            type="number"
            value={editPrice}
            onChange={(e) => setEditPrice(Number(e.target.value))}
            style={{ 
              padding: '4px', 
              border: '1px solid #d1d5db', 
              borderRadius: '4px',
              fontSize: '12px'
            }}
          />
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={handleSave}
              style={{ 
                padding: '4px 8px', 
                backgroundColor: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Save
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              style={{ 
                padding: '4px 8px', 
                backgroundColor: '#f3f4f6', 
                color: '#6b7280', 
                border: 'none', 
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{
            padding: '2px 6px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: '500',
            color: 'white',
            textAlign: 'center',
            backgroundColor: isBooked ? '#10b981' : isBlocked ? '#ef4444' : '#3b82f6',
            marginBottom: '4px'
          }}>
            {isBooked ? 'Booked' : isBlocked ? 'Blocked' : 'Available'}
          </div>
          
          {!isBooked && !isBlocked && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: '600', fontSize: '14px' }}>${dayData.price || 0}</span>
              {isDynamicallyPriced && (
                <span style={{
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  padding: '1px 4px',
                  borderRadius: '4px',
                  fontSize: '8px',
                  fontWeight: '600'
                }}>
                  AI
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}