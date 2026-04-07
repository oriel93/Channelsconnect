import React, { useState, useRef } from 'react';
import { Calendar, Upload, Download, DollarSign, TrendingUp, Settings, Plus, Trash2 } from 'lucide-react';

const PricingManagementSystem = () => {
  const [properties, setProperties] = useState([
    { id: 1, name: 'Beach House', basePrice: 150, currency: 'USD' }
  ]);
  const [selectedProperty, setSelectedProperty] = useState(1);
  const [pricing, setPricing] = useState({});
  const [blockedDates, setBlockedDates] = useState([]);
  const [seasonalRules, setSeasonalRules] = useState([]);
  const [calendarData, setCalendarData] = useState('');
  const fileInputRef = useRef(null);

  // Inline styles for consistent appearance
  const styles = {
    container: {
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '24px',
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    },
    header: {
      borderBottom: '1px solid #e5e7eb',
      padding: '24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    headerTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#111827',
      margin: 0
    },
    select: {
      padding: '8px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: 'white'
    },
    mainGrid: {
      display: 'grid',
      gridTemplateColumns: '3fr 1fr',
      gap: '24px',
      padding: '24px'
    },
    calendarCard: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px'
    },
    calendarHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    },
    calendarTitle: {
      fontSize: '18px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: 0
    },
    buttonGroup: {
      display: 'flex',
      gap: '8px'
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '8px 12px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    buttonGreen: {
      backgroundColor: '#059669',
      color: 'white'
    },
    buttonBlue: {
      backgroundColor: '#2563eb',
      color: 'white'
    },
    calendarGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '8px'
    },
    dayHeader: {
      textAlign: 'center',
      fontWeight: '600',
      padding: '8px',
      color: '#6b7280',
      fontSize: '14px'
    },
    dayCell: {
      position: 'relative',
      border: '1px solid #e5e7eb',
      borderRadius: '4px',
      padding: '8px',
      minHeight: '80px',
      backgroundColor: 'white'
    },
    dayCellBlocked: {
      backgroundColor: '#fee2e2',
      borderColor: '#fca5a5'
    },
    dayCellCustomPrice: {
      borderColor: '#93c5fd'
    },
    dayNumber: {
      fontSize: '14px',
      color: '#374751'
    },
    dayNumberToday: {
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#2563eb'
    },
    priceInput: {
      width: '100%',
      fontSize: '12px',
      marginTop: '4px',
      padding: '2px 4px',
      border: '1px solid #d1d5db',
      borderRadius: '4px'
    },
    blockButton: {
      position: 'absolute',
      top: '4px',
      right: '4px',
      padding: '2px 4px',
      fontSize: '10px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      color: 'white'
    },
    blockButtonRed: {
      backgroundColor: '#dc2626'
    },
    blockButtonGreen: {
      backgroundColor: '#16a34a'
    },
    sidebar: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    },
    sidebarCard: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px'
    },
    sidebarTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      marginBottom: '4px',
      color: '#374751'
    },
    formGroup: {
      marginBottom: '12px'
    },
    ruleCard: {
      padding: '12px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      marginBottom: '12px'
    },
    ruleHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px'
    },
    ruleInput: {
      width: '100%',
      padding: '4px 8px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '12px',
      marginBottom: '8px'
    },
    statsGrid: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    statRow: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '14px'
    },
    hiddenInput: {
      display: 'none'
    }
  };

  // Generate calendar
  const generateCalendar = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  const calendarDays = generateCalendar();
  const currentProperty = properties.find(p => p.id === selectedProperty);

  // Get price
  const getPriceForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const customPrice = pricing[dateStr];
    return customPrice !== null && customPrice !== undefined ? customPrice : (currentProperty?.basePrice || 100);
  };

  // Set price
  const setPriceForDate = (date, price) => {
    const dateStr = date.toISOString().split('T')[0];
    const numericPrice = price === '' ? null : parseFloat(price);
    setPricing(prev => ({
      ...prev,
      [dateStr]: numericPrice
    }));
  };

  // Toggle block
  const toggleBlockedDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    setBlockedDates((prev) =>
      prev.includes(dateStr)
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  // Generate iCal
  const generateICalContent = () => {
    const property = currentProperty;
    let icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Pricing Manager//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${property.name} Pricing
X-WR-CALDESC:Pricing calendar for ${property.name}
`;

    Object.entries(pricing).forEach(([dateStr, price]) => {
      const date = new Date(dateStr);
      const dateId = dateStr.replace(/-/g, '');
      icalContent += `BEGIN:VEVENT
UID:price-${dateId}@pricingmanager.com
DTSTART;VALUE=DATE:${dateId}
DTEND;VALUE=DATE:${dateId}
SUMMARY:$${price} - ${property.name}
DESCRIPTION:Daily rate: $${price} ${property.currency}
END:VEVENT
`;
    });

    icalContent += 'END:VCALENDAR';
    return icalContent;
  };

  // Export iCal
  const exportICal = () => {
    const content = generateICalContent();
    const blob = new Blob([content], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProperty.name.toLowerCase().replace(/\s+/g, '-')}-pricing.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import iCal
  const importICal = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        setCalendarData(content);
        const events = content.split('BEGIN:VEVENT');
        const newPricing = { ...pricing };

        events.forEach(event => {
          const dtMatch = event.match(/DTSTART;VALUE=DATE:(\d{8})/);
          const summaryMatch = event.match(/SUMMARY:\$(\d+(?:\.\d{2})?)/);
          if (dtMatch && summaryMatch) {
            const dateStr = dtMatch[1];
            const price = parseFloat(summaryMatch[1]);
            const formattedDate = `${dateStr.substr(0,4)}-${dateStr.substr(4,2)}-${dateStr.substr(6,2)}`;
            newPricing[formattedDate] = price;
          }
        });
        setPricing(newPricing);
      };
      reader.readAsText(file);
    }
  };

  // Add seasonal rule
  const addSeasonalRule = () => {
    const newRule = {
      id: Date.now(),
      name: 'New Season',
      startDate: '',
      endDate: '',
      multiplier: 1.2,
      active: true
    };
    setSeasonalRules([...seasonalRules, newRule]);
  };

  // Apply seasonal rules
  const applySeasonalRules = () => {
    const newPricing = { ...pricing };
    seasonalRules.forEach(rule => {
      if (!rule.active || !rule.startDate || !rule.endDate) return;
      const start = new Date(rule.startDate);
      const end = new Date(rule.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const basePrice = currentProperty.basePrice;
        newPricing[dateStr] = Math.round(basePrice * rule.multiplier);
      }
    });
    setPricing(newPricing);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <DollarSign size={32} color="#2563eb" />
            <h1 style={styles.title}>Pricing Manager</h1>
          </div>
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(parseInt(e.target.value))}
            style={styles.select}
          >
            {properties.map(property => (
              <option key={property.id} value={property.id}>{property.name}</option>
            ))}
          </select>
        </div>

        <div style={styles.mainGrid}>
          {/* Calendar */}
          <div style={styles.calendarCard}>
            <div style={styles.calendarHeader}>
              <h2 style={styles.calendarTitle}>
                <Calendar size={20} />
                Pricing Calendar
              </h2>
              <div style={styles.buttonGroup}>
                <input
                  type="file"
                  accept=".ics"
                  onChange={importICal}
                  ref={fileInputRef}
                  style={styles.hiddenInput}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{...styles.button, ...styles.buttonGreen}}
                >
                  <Upload size={16} />
                  Import iCal
                </button>
                <button
                  onClick={exportICal}
                  style={{...styles.button, ...styles.buttonBlue}}
                >
                  <Download size={16} />
                  Export iCal
                </button>
              </div>
            </div>

            <div style={styles.calendarGrid}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
                <div key={day} style={styles.dayHeader}>{day}</div>
              ))}

              {calendarDays.map(date => {
                const dateStr = date.toISOString().split('T')[0];
                const price = getPriceForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                const isBlocked = blockedDates.includes(dateStr);
                const hasCustomPrice = pricing[dateStr] !== null && pricing[dateStr] !== undefined;

                let cellStyle = {...styles.dayCell};
                if (isBlocked) cellStyle = {...cellStyle, ...styles.dayCellBlocked};
                else if (hasCustomPrice) cellStyle = {...cellStyle, ...styles.dayCellCustomPrice};

                return (
                  <div key={dateStr} style={cellStyle}>
                    <div style={isToday ? styles.dayNumberToday : styles.dayNumber}>
                      {date.getDate()}
                    </div>
                    {isBlocked ? (
                      <div style={{fontSize: '12px', color: '#dc2626', marginTop: '4px'}}>Blocked</div>
                    ) : (
                      <input
                        type="number"
                        value={price || ''}
                        onChange={(e) => setPriceForDate(date, e.target.value)}
                        onBlur={(e) => {
                          if (e.target.value !== '') {
                            setPriceForDate(date, e.target.value);
                          }
                        }}
                        style={styles.priceInput}
                        placeholder="Price"
                        min="0"
                        step="0.01"
                      />
                    )}
                    <button
                      onClick={() => toggleBlockedDate(date)}
                      style={{
                        ...styles.blockButton,
                        ...(isBlocked ? styles.blockButtonGreen : styles.blockButtonRed)
                      }}
                    >
                      {isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls Panel */}
          <div style={styles.sidebar}>
            {/* Property Settings */}
            <div style={styles.sidebarCard}>
              <h3 style={styles.sidebarTitle}>
                <Settings size={20} />
                Property Settings
              </h3>
              <div style={styles.formGroup}>
                <label style={styles.label}>Base Price</label>
                <input
                  type="number"
                  value={currentProperty?.basePrice || 0}
                  onChange={(e) => {
                    const newProperties = properties.map(p =>
                      p.id === selectedProperty
                        ? { ...p, basePrice: parseFloat(e.target.value) }
                        : p
                    );
                    setProperties(newProperties);
                  }}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Currency</label>
                <select
                  value={currentProperty?.currency || 'USD'}
                  onChange={(e) => {
                    const newProperties = properties.map(p =>
                      p.id === selectedProperty
                        ? { ...p, currency: e.target.value }
                        : p
                    );
                    setProperties(newProperties);
                  }}
                  style={styles.input}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            {/* Seasonal Rules */}
            <div style={styles.sidebarCard}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                <h3 style={{...styles.sidebarTitle, marginBottom: 0}}>
                  <TrendingUp size={20} />
                  Seasonal Rules
                </h3>
                <button
                  onClick={addSeasonalRule}
                  style={{...styles.button, ...styles.buttonBlue, padding: '4px 8px'}}
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>
              
              <div>
                {seasonalRules.map(rule => (
                  <div key={rule.id} style={styles.ruleCard}>
                    <div style={styles.ruleHeader}>
                      <input
                        type="text"
                        value={rule.name}
                        onChange={(e) => {
                          const newRules = seasonalRules.map(r =>
                            r.id === rule.id ? { ...r, name: e.target.value } : r
                          );
                          setSeasonalRules(newRules);
                        }}
                        style={{fontSize: '14px', fontWeight: '500', backgroundColor: 'transparent', border: 'none', outline: 'none'}}
                      />
                      <button
                        onClick={() => {
                          setSeasonalRules(seasonalRules.filter(r => r.id !== rule.id));
                        }}
                        style={{color: '#dc2626', backgroundColor: 'transparent', border: 'none', cursor: 'pointer'}}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div>
                      <input
                        type="date"
                        value={rule.startDate}
                        onChange={(e) => {
                          const newRules = seasonalRules.map(r =>
                            r.id === rule.id ? { ...r, startDate: e.target.value } : r
                          );
                          setSeasonalRules(newRules);
                        }}
                        style={styles.ruleInput}
                      />
                      <input
                        type="date"
                        value={rule.endDate}
                        onChange={(e) => {
                          const newRules = seasonalRules.map(r =>
                            r.id === rule.id ? { ...r, endDate: e.target.value } : r
                          );
                          setSeasonalRules(newRules);
                        }}
                        style={styles.ruleInput}
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={rule.multiplier}
                        onChange={(e) => {
                          const newRules = seasonalRules.map(r =>
                            r.id === rule.id ? { ...r, multiplier: parseFloat(e.target.value) } : r
                          );
                          setSeasonalRules(newRules);
                        }}
                        style={{...styles.ruleInput, marginBottom: 0}}
                        placeholder="Multiplier (e.g., 1.5)"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {seasonalRules.length > 0 && (
                <button
                  onClick={applySeasonalRules}
                  style={{...styles.button, ...styles.buttonGreen, width: '100%', justifyContent: 'center', marginTop: '12px'}}
                >
                  Apply Rules
                </button>
              )}
            </div>

            {/* Stats */}
            <div style={styles.sidebarCard}>
              <h3 style={styles.sidebarTitle}>Quick Stats</h3>
              <div style={styles.statsGrid}>
                <div style={styles.statRow}>
                  <span>Base Price:</span>
                  <span style={{fontWeight: '500'}}>${currentProperty?.basePrice}</span>
                </div>
                <div style={styles.statRow}>
                  <span>Custom Prices:</span>
                  <span style={{fontWeight: '500'}}>{Object.keys(pricing).length}</span>
                </div>
                <div style={styles.statRow}>
                  <span>Blocked Dates:</span>
                  <span style={{fontWeight: '500'}}>{blockedDates.length}</span>
                </div>
                <div style={styles.statRow}>
                  <span>Avg Price:</span>
                  <span style={{fontWeight: '500'}}>
                    ${Object.keys(pricing).length > 0 
                      ? Math.round(Object.values(pricing).reduce((a, b) => a + b, 0) / Object.values(pricing).length)
                      : currentProperty?.basePrice}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingManagementSystem;