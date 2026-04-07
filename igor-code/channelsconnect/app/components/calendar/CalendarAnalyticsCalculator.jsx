export class CalendarAnalyticsCalculator {
  
  static calculateMetricsFromCalendarData(calendarData) {
    if (!calendarData || calendarData.length === 0) {
      return {
        occupancyRate: { value: 0, change: 0, trend: 'neutral' },
        avgDailyRate: { value: 0, change: 0, trend: 'neutral' },
        monthlyRevenue: { value: 0, change: 0, trend: 'neutral' },
        revenueOpportunity: { value: 0, status: 'No Data' }
      };
    }

    const totalDays = calendarData.length;
    const bookedDays = calendarData.filter(day => day.status === 'booked');
    const availableDays = calendarData.filter(day => day.status === 'available');
    
    // Calculate occupancy rate
    const occupancyRate = totalDays > 0 ? (bookedDays.length / totalDays) * 100 : 0;
    
    // Calculate average daily rate (from booked days only, fallback to available days average)
    const avgDailyRate = bookedDays.length > 0 
      ? bookedDays.reduce((sum, day) => sum + day.price, 0) / bookedDays.length
      : availableDays.length > 0
        ? availableDays.reduce((sum, day) => sum + day.price, 0) / availableDays.length
        : 0;
    
    // Calculate total revenue (booked days only)
    const totalRevenue = bookedDays.reduce((sum, day) => sum + day.price, 0);
    
    // Calculate revenue opportunity (available days)
    const revenueOpportunity = availableDays.reduce((sum, day) => sum + day.price, 0);
    
    return {
      occupancyRate: {
        value: Math.round(occupancyRate * 10) / 10,
        change: 0, // No mock change data
        trend: 'neutral'
      },
      avgDailyRate: {
        value: Math.round(avgDailyRate),
        change: 0, // No mock change data
        trend: 'neutral'
      },
      monthlyRevenue: {
        value: Math.round(totalRevenue),
        change: 0, // No mock change data
        trend: 'neutral'
      },
      revenueOpportunity: {
        value: Math.round(revenueOpportunity),
        status: revenueOpportunity > 0 ? 'Available' : 'Maximized'
      },
      breakdown: {
        totalDays,
        bookedDays: bookedDays.length,
        availableDays: availableDays.length,
        blockedDays: calendarData.filter(day => day.status === 'blocked').length
      }
    };
  }

  static generateSampleCalendarData(propertyId, month) {
    const data = [];
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // CRITICAL: All days start as 'available' - no fake bookings
      let status = 'available';
      
      const basePrice = 200;
      const weekendPremium = isWeekend ? 1.25 : 1;
      const dynamicAdjustment = 0.85 + (Math.random() * 0.3); // ±15% variation
      const price = Math.round(basePrice * weekendPremium * dynamicAdjustment);
      
      data.push({
        id: `entry-${dateString}`,
        propertyId: propertyId,
        date: dateString,
        status, // All available - reflects reality of zero bookings
        price,
        basePrice: basePrice,
        marketPrice: price + Math.floor(Math.random() * 40) - 20,
        minimumStay: isWeekend ? 2 : 1,
        isAvailable: status === 'available',
        dayNumber: day,
        isPast: date < new Date()
      });
    }
    
    return data;
  }
}