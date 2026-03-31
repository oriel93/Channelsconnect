import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown, ChevronUp, RefreshCw, Building2, BedDouble, DollarSign } from 'lucide-react';
import { pushAvailability, pushRates, syncBookings } from '@/api/channexClient';
import { toast } from 'sonner';

const CHANNEL_ICONS = {
  'booking.com': '🏨',
  airbnb: '🏠',
  expedia: '✈️',
  'hotels.com': '🏩',
  agoda: '🌏',
  vrbo: '🏡',
  tripadvisor: '🦉',
};

export default function ChannexPropertyGrid({ properties = [], apiKey, onRefresh }) {
  const [expandedId, setExpandedId] = useState(null);
  const [syncing, setSyncing] = useState({});

  const toggle = (id) => setExpandedId(expandedId === id ? null : id);

  const handleSyncARI = async (property) => {
    if (!apiKey) return toast.error('No Channex API key found.');
    setSyncing((p) => ({ ...p, [property.id]: 'ari' }));
    try {
      // Example: push a 30-day full availability update for each room type
      const today = new Date();
      const dateTo = new Date(today);
      dateTo.setDate(today.getDate() + 30);
      const fmt = (d) => d.toISOString().split('T')[0];

      const availUpdates = property.roomTypes.map((rt) => ({
        room_type_id: rt.id,
        date_from: fmt(today),
        date_to: fmt(dateTo),
        availability: rt.rooms || 1,
      }));

      await pushAvailability(apiKey, property.channexId, availUpdates);
      toast.success(`ARI synced for ${property.name}`);
    } catch (err) {
      toast.error(`ARI sync failed: ${err.message}`);
    } finally {
      setSyncing((p) => ({ ...p, [property.id]: null }));
    }
  };

  const handleSyncBookings = async () => {
    if (!apiKey) return toast.error('No Channex API key found.');
    setSyncing((p) => ({ ...p, bookings: true }));
    try {
      const bookings = await syncBookings(apiKey);
      if (bookings.length === 0) {
        toast.info('No new bookings to sync.');
      } else {
        toast.success(`Synced ${bookings.length} new booking${bookings.length > 1 ? 's' : ''}.`);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(`Booking sync failed: ${err.message}`);
    } finally {
      setSyncing((p) => ({ ...p, bookings: false }));
    }
  };

  if (!properties.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          No properties found in your Channex account. Create properties in Channex first, then refresh.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Global actions */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncBookings}
          disabled={syncing.bookings}
        >
          {syncing.bookings ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Sync New Bookings
        </Button>
      </div>

      {/* Property cards */}
      {properties.map((property) => {
        const isExpanded = expandedId === property.id;
        const isSyncingARI = syncing[property.id] === 'ari';
        const activeChannels = Object.entries(property.channels || {}).filter(([, v]) => v);

        return (
          <Card key={property.id} className="overflow-hidden">
            {/* Property header */}
            <div
              className="flex items-center p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
              onClick={() => toggle(property.id)}
            >
              <Building2 className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
              <div className="flex-grow min-w-0">
                <h4 className="font-semibold truncate">{property.name}</h4>
                <p className="text-sm text-gray-500 truncate">
                  {[property.city, property.country].filter(Boolean).join(', ') || property.address}
                </p>
              </div>
              {/* Active channel icons */}
              <div className="flex items-center gap-1 mx-3">
                {activeChannels.map(([ch]) => (
                  <span key={ch} title={ch} className="text-base">
                    {CHANNEL_ICONS[ch] || '🔗'}
                  </span>
                ))}
                {activeChannels.length === 0 && (
                  <Badge variant="secondary" className="text-xs">No channels</Badge>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <CardContent className="pt-4 space-y-4">
                {/* Room Types */}
                {property.roomTypes?.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
                      <BedDouble className="w-4 h-4" /> Room Types ({property.roomTypes.length})
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {property.roomTypes.map((rt) => (
                        <div key={rt.id} className="bg-gray-50 rounded p-2 text-sm">
                          <span className="font-medium">{rt.name}</span>
                          <span className="text-gray-500 ml-2">
                            {rt.rooms} room{rt.rooms !== 1 ? 's' : ''} · up to {rt.capacity} guests
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rate Plans */}
                {property.ratePlans?.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
                      <DollarSign className="w-4 h-4" /> Rate Plans ({property.ratePlans.length})
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {property.ratePlans.map((rp) => (
                        <div key={rp.id} className="bg-gray-50 rounded p-2 text-sm">
                          <span className="font-medium">{rp.name}</span>
                          <span className="text-gray-500 ml-2">{rp.currency}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Channels */}
                <div>
                  <h5 className="text-sm font-semibold text-gray-600 mb-2">Connected Channels</h5>
                  {activeChannels.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      No channels active yet. Connect channels in your{' '}
                      <a
                        href="https://app.channex.io"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline"
                      >
                        Channex dashboard
                      </a>
                      .
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {activeChannels.map(([ch]) => (
                        <Badge key={ch} className="bg-green-100 text-green-800 border-green-200">
                          {CHANNEL_ICONS[ch]} {ch}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSyncARI(property)}
                    disabled={isSyncingARI}
                  >
                    {isSyncingARI ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Push ARI to Channex
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
