export class IndustryStandardAnalytics {
  
  static calculateAccurateMetrics(calendarData) {
    if (!calendarData || calendarData.length === 0) {
      return this.getEmptyMetrics();
    }

    // Categorize days by business impact
    const totalDays = calendarData.length;
    const bookedDays = calendarData.filter(day => day.status === 'booked');
    const availableDays = calendarData.filter(day => day.status === 'available');
    const blockedAndMaintenanceDays = calendarData.filter(day => ['blocked', 'maintenance', 'owner_block'].includes(day.status));
    
    // CRITICAL: Marketable days = days that could potentially generate revenue
    const marketableDays = totalDays - blockedAndMaintenanceDays.length;
    
    // INDUSTRY STANDARD: Occupancy = Booked / Marketable Days
    const occupancyRate = marketableDays > 0 
      ? (bookedDays.length / marketableDays) * 100 
      : 0;

    // ADDITIONAL UTILIZATION METRICS for immediate feedback
    const calendarUtilization = totalDays > 0 
      ? ((bookedDays.length + blockedAndMaintenanceDays.length) / totalDays) * 100 
      : 0;
    
    const availabilityRate = totalDays > 0 
      ? (availableDays.length / totalDays) * 100 
      : 0;
    
    // Average daily rate from actual bookings or base price if no bookings
    const avgDailyRate = bookedDays.length > 0 
      ? bookedDays.reduce((sum, day) => sum + (day.price || 0), 0) / bookedDays.length
      : availableDays.length > 0
        ? availableDays.reduce((sum, day) => sum + (day.price || 0), 0) / availableDays.length
        : 0;
    
    // Revenue calculations
    const confirmedRevenue = bookedDays.reduce((sum, day) => sum + (day.price || 0), 0);
    const potentialRevenue = availableDays.reduce((sum, day) => sum + (day.price || 0), 0);
    const lostRevenue = blockedAndMaintenanceDays.reduce((sum, day) => sum + (day.price || 200), 0);
    
    return {
      // Industry Standard Metrics
      occupancyRate: {
        value: Math.round(occupancyRate * 10) / 10,
        change: 0,
        trend: 'neutral',
        context: `${bookedDays.length} of ${marketableDays} marketable days`
      },
      avgDailyRate: {
        value: Math.round(avgDailyRate),
        change: 0,
        trend: 'neutral',
        context: bookedDays.length > 0 
          ? `From ${bookedDays.length} bookings`
          : 'Base price (no bookings)'
      },
      monthlyRevenue: {
        value: Math.round(confirmedRevenue),
        change: 0,
        trend: 'neutral',
        context: confirmedRevenue === 0 
          ? 'No confirmed bookings'
          : `${bookedDays.length} bookings confirmed`
      },
      revenueOpportunity: {
        value: Math.round(potentialRevenue),
        status: potentialRevenue > 0 ? 'Available' : 'No Opportunity',
        context: `${availableDays.length} days available`
      },

      // Enhanced Utilization Metrics (for immediate blocking feedback)
      calendarUtilization: {
        value: Math.round(calendarUtilization * 10) / 10,
        context: `${bookedDays.length + blockedAndMaintenanceDays.length} of ${totalDays} days unavailable`
      },
      availabilityRate: {
        value: Math.round(availabilityRate * 10) / 10,
        context: `${availableDays.length} of ${totalDays} days available for booking`
      },

      breakdown: {
        totalDays,
        marketableDays,
        bookedDays: bookedDays.length,
        availableDays: availableDays.length,
        blockedDays: blockedAndMaintenanceDays.length,
        lostRevenue: Math.round(lostRevenue)
      }
    };
  }
  
  static getEmptyMetrics() {
    return {
      occupancyRate: { value: 0, change: 0, trend: 'neutral', context: 'No data' },
      avgDailyRate: { value: 0, change: 0, trend: 'neutral', context: 'No data' },
      monthlyRevenue: { value: 0, change: 0, trend: 'neutral', context: 'No data' },
      revenueOpportunity: { value: 0, status: 'No Data', context: 'No data' },
      calendarUtilization: { value: 0, context: 'No data' },
      availabilityRate: { value: 0, context: 'No data' },
      breakdown: {
        totalDays: 0, marketableDays: 0, bookedDays: 0, 
        availableDays: 0, blockedDays: 0, lostRevenue: 0
      }
    };
  }
}