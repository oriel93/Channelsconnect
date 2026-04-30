import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, DollarSign, User, CheckCircle, RefreshCw, AlertCircle, Download, Home } from 'lucide-react';
import { Booking } from '@/api/entities';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function BookingsManager({ listingId }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadBookings();
  }, [listingId]);

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = listingId ? { listingId } : {};
      const allBookings = await Booking.find(params);
      // Sort by check-in date descending (most recent first)
      const sortedBookings = (allBookings || []).sort((a, b) => {
        const dateA = new Date(a.checkIn || 0);
        const dateB = new Date(b.checkIn || 0);
        return dateB - dateA;
      });
      setBookings(sortedBookings);
    } catch (err) {
      console.error('Failed to load bookings:', err);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return null;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return nights || 1; // Minimum 1 night
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Bookings Yet</h3>
          <p className="text-gray-500">
            Bookings will appear here once guests book your properties.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bookings</h2>
          <p className="text-sm text-gray-600 mt-1">
            {bookings.length} total booking{bookings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadBookings} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {bookings.map((booking) => {
          const nights = calculateNights(booking.checkIn, booking.checkOut);
          const totalPrice = booking.totalPrice || booking.totalAmount || 0;

          return (
            <Card key={booking.id} className="border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
              <CardContent className="p-5">
                {/* Header Row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status || 'confirmed'}
                    </Badge>
                    {booking.bookingSource && (
                      <Badge variant="outline" className="capitalize text-xs">
                        {booking.bookingSource}
                      </Badge>
                    )}
                    {booking.listing && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        <Home className="w-3 h-3 mr-1" />
                        {booking.listing.title}
                      </Badge>
                    )}
                  </div>
                  {booking.externalId && (
                    <span className="text-xs text-gray-500 font-mono">
                      #{booking.externalId.replace('beds24_', '').replace('channex_', '')}
                    </span>
                  )}
                </div>

                {/* Guest & Dates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  {/* Guest Info */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-gray-900">
                        {booking.guestName || 'Guest'}
                      </span>
                    </div>
                    {booking.guestPhone && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-4 text-center">📞</span>
                        <span>{booking.guestPhone}</span>
                      </div>
                    )}
                    {booking.guestEmail && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-4 text-center">📧</span>
                        <span className="truncate">{booking.guestEmail}</span>
                      </div>
                    )}
                    {booking.numGuests && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-4 text-center">👥</span>
                        <span>
                          {booking.numGuests} guest{booking.numGuests !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Date Info */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                        </span>
                      </div>
                    </div>
                    {nights && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-4 text-center">🌙</span>
                        <span>{nights} night{nights !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes if present */}
                {booking.notes && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-gray-800">
                    <span className="font-semibold text-blue-900">Note: </span>
                    {booking.notes}
                  </div>
                )}

                {/* Price Footer */}
                {totalPrice > 0 && (
                  <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="text-2xl font-bold text-gray-900">
                        ${parseFloat(totalPrice).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      {nights && (
                        <span className="text-sm text-gray-500">
                          (${(parseFloat(totalPrice) / nights).toFixed(0)}/night)
                        </span>
                      )}
                    </div>
                    {booking.status?.toLowerCase() === 'confirmed' && (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
