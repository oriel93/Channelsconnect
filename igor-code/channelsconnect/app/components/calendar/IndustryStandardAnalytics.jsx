export class IndustryStandardAnalytics {

  static calculateAccurateMetrics(calendarData) {
    if (!calendarData || calendarData.length === 0) {
      return this.getEmptyMetrics();
    }

    // Get today's date string for comparison
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Separate past and future/current days
    const pastDays = calendarData.filter(day => day.date < todayStr || day.status === 'past' || day.isPast);
    const futureDays = calendarData.filter(day => day.date >= todayStr && day.status !== 'past' && !day.isPast);

    // Categorize FUTURE days by business impact (past days are not actionable)
    const totalDays = calendarData.length;
    const totalFutureDays = futureDays.length;

    const bookedDays = futureDays.filter(day => day.status === 'booked');
    const availableDays = futureDays.filter(day => day.status === 'available');
    const blockedAndMaintenanceDays = futureDays.filter(day => ['blocked', 'maintenance', 'owner_block'].includes(day.status));

    // CRITICAL: Marketable days = FUTURE days that could potentially generate revenue
    const marketableDays = totalFutureDays - blockedAndMaintenanceDays.length;

    // INDUSTRY STANDARD: Occupancy = Booked / Marketable Days (future only)
    const occupancyRate = marketableDays > 0
      ? (bookedDays.length / marketableDays) * 100
      : 0;

    // Calendar Utilization: how much of future calendar is unavailable
    const calendarUtilization = totalFutureDays > 0
      ? ((bookedDays.length + blockedAndMaintenanceDays.length) / totalFutureDays) * 100
      : 0;

    const availabilityRate = totalFutureDays > 0
      ? (availableDays.length / totalFutureDays) * 100
      : 0;

    // Average daily rate - use available days with actual prices from API
    // Filter out days with $0 price (likely defaults, not real data)
    const daysWithPrice = availableDays.filter(day => day.price && day.price > 0);
    const avgDailyRate = bookedDays.length > 0
      ? bookedDays.reduce((sum, day) => sum + (day.price || 0), 0) / bookedDays.length
      : daysWithPrice.length > 0
        ? daysWithPrice.reduce((sum, day) => sum + day.price, 0) / daysWithPrice.length
        : 0;

    // Revenue calculations (future days only)
    const confirmedRevenue = bookedDays.reduce((sum, day) => sum + (day.price || 0), 0);
    const potentialRevenue = availableDays.reduce((sum, day) => sum + (day.price || 0), 0);
    const lostRevenue = blockedAndMaintenanceDays.reduce((sum, day) => sum + (day.price || avgDailyRate || 200), 0);

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
          : daysWithPrice.length > 0
            ? `From ${daysWithPrice.length} priced days`
            : 'No pricing data'
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
        context: `${bookedDays.length + blockedAndMaintenanceDays.length} of ${totalFutureDays} days unavailable`
      },
      availabilityRate: {
        value: Math.round(availabilityRate * 10) / 10,
        context: `${availableDays.length} of ${totalFutureDays} days available for booking`
      },

      breakdown: {
        totalDays,
        totalFutureDays,
        pastDays: pastDays.length,
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