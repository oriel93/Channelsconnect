/**
 * ListingDetail.jsx — Customer-facing property detail view
 *
 * RBAC rules enforced here:
 *   - Raw system IDs (beds24PropId, beds24RoomId, userId, externalId,
 *     latitude/longitude coordinates) are hidden from role='user'.
 *   - "Integration Details" card is admin-only.
 *   - reviewStatus is displayed as a friendly badge, never as a raw enum string.
 *   - isActive shown as "Live" / "Pending" (not the boolean).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import NewLoginRequired from '../components/auth/NewLoginRequired';
import AppLayout from '../components/app/AppLayout';
import { useAuth } from '@/lib/authContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Listing } from '@/api/entities';
import {
  Loader2, MapPin, Users, Bed, Bath, Calendar,
  Settings, Home, ArrowLeft, ShieldCheck, Plus,
  User, Clock, DollarSign, XCircle, BedDouble, Hash,
} from 'lucide-react';
import { api } from '@/lib/apiClient';
import AddManualBookingModal from '@/components/dashboard/channels/AddManualBookingModal';
import BookingDrawer from '@/components/dashboard/channels/BookingDrawer';

// ─── Status helpers ───────────────────────────────────────────────────────────

function ReviewBadge({ reviewStatus, isActive }) {
  if (reviewStatus === 'pending_admin_review') {
    return (
      <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-xs">
        ⏳ Pending Approval
      </Badge>
    );
  }
  if (reviewStatus === 'rejected') {
    return (
      <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs">
        ✗ Not Approved
      </Badge>
    );
  }
  if (reviewStatus === 'archived') {
    return (
      <Badge className="bg-slate-100 text-slate-600 border border-slate-200 text-xs">
        Archived
      </Badge>
    );
  }
  // approved or null
  return isActive ? (
    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs">
      🚀 Live
    </Badge>
  ) : (
    <Badge variant="secondary" className="text-xs">
      Inactive
    </Badge>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────

const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3">
    <div className="bg-slate-100 p-2 rounded-lg shrink-0">
      <Icon className="w-4 h-4 text-slate-600" />
    </div>
    <div className="min-w-0">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="font-medium text-slate-900 truncate">{value}</p>
    </div>
  </div>
);

// ─── Main content ─────────────────────────────────────────────────────────────

const ListingDetailContent = () => {
  const [listing, setListing]     = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState(null);
  const { isAdmin }               = useAuth();
  const location                  = useLocation();
  const listingId                 = new URLSearchParams(location.search).get('id');

  useEffect(() => {
    if (!listingId) {
      setError('No listing ID provided.');
      setIsLoading(false);
      return;
    }
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await Listing.findOne(listingId);
        setListing(data);
        document.title = `${data.title} | Channels Connect`;
      } catch (err) {
        console.error('Failed to fetch listing details', err);
        setError('Could not load listing details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [listingId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] bg-red-50 rounded-lg gap-4 p-8">
        <Home className="w-12 h-12 text-red-400" />
        <h3 className="text-xl font-semibold text-red-700">Something went wrong</h3>
        <p className="text-red-600 text-sm text-center">{error}</p>
        <Link to={createPageUrl('Listings')}>
          <Button variant="outline">Back to Listings</Button>
        </Link>
      </div>
    );
  }

  if (!listing) return null;

  const locationString = [listing.city, listing.state, listing.country].filter(Boolean).join(', ');

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Back */}
      <Link to={createPageUrl('Listings')} className="inline-flex items-center text-slate-500 hover:text-slate-900 text-sm gap-1.5">
        <ArrowLeft className="w-4 h-4" />
        Back to Properties
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Home className="w-7 h-7 text-slate-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 truncate">{listing.title}</h1>
              {locationString && (
                <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-sm">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{locationString}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <ReviewBadge reviewStatus={listing.reviewStatus} isActive={listing.isActive} />
                {listing.propertyType && (
                  <Badge variant="outline" className="text-xs capitalize">{listing.propertyType}</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailItem icon={Home}  label="Property Type" value={listing.propertyType || 'Not specified'} />
            <DetailItem icon={Users} label="Max Guests"    value={listing.maxGuests    || 'Not specified'} />
            <DetailItem icon={Bed}   label="Bedrooms"      value={listing.bedrooms     || 'Not specified'} />
            <DetailItem icon={Bath}  label="Bathrooms"     value={listing.bathrooms    || 'Not specified'} />
          </CardContent>
        </Card>

        {/* Room Types — the inventory-bearing sub-units (e.g. Twin Room, Double Room, King Suite). */}
        {Array.isArray(listing.roomTypes) && listing.roomTypes.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BedDouble className="w-4 h-4 text-indigo-500" />
                  Rooms
                  <Badge variant="outline" className="ml-2 text-xs font-normal">
                    {listing.roomTypes.length} type{listing.roomTypes.length === 1 ? '' : 's'}
                    {' · '}
                    {listing.roomTypes.reduce((sum, rt) => sum + (rt.quantity || 1), 0)} unit{listing.roomTypes.reduce((sum, rt) => sum + (rt.quantity || 1), 0) === 1 ? '' : 's'}
                  </Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {listing.roomTypes.map((rt) => (
                <div key={rt.id} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-slate-800 text-sm truncate">{rt.name}</p>
                        {rt.quantity > 1 && (
                          <Badge variant="outline" className="text-xs">×{rt.quantity}</Badge>
                        )}
                        {rt.channexRoomTypeId && (
                          <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700 bg-emerald-50">
                            Synced
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Sleeps {rt.maxGuests}
                        </span>
                        {rt.bedType && (
                          <span className="inline-flex items-center gap-1">
                            <Bed className="w-3 h-3" />
                            {rt.bedType}
                          </span>
                        )}
                      </div>
                      {rt.description && (
                        <p className="text-xs text-slate-500 mt-1.5">{rt.description}</p>
                      )}
                    </div>
                    {/* Admin: Channex IDs for debug / cert review */}
                    {isAdmin && (rt.channexRoomTypeId || rt.channexRatePlanId) && (
                      <div className="text-xs text-slate-400 font-mono space-y-0.5 text-right">
                        {rt.channexRoomTypeId && (
                          <div title="Channex room_type_id">rt: {rt.channexRoomTypeId.slice(0, 8)}…</div>
                        )}
                        {rt.channexRatePlanId && (
                          <div title="Channex rate_plan_id">rp: {rt.channexRatePlanId.slice(0, 8)}…</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Location — admin sees coordinates; user sees only address */}
        {listing.address && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-slate-700">{listing.address}</p>
              {listing.postalCode && <p className="text-slate-500">{listing.postalCode}</p>}
              {/* Coordinates — admin only */}
              {isAdmin && listing.latitude && listing.longitude && (
                <p className="text-xs text-slate-400 font-mono">
                  {listing.latitude}, {listing.longitude}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Management actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="w-4 h-4" />Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to={`${createPageUrl('PropertyList')}?listingId=${listing.id}`} className="block">
              <Button className="w-full justify-start gap-2" variant="outline">
                <Calendar className="w-4 h-4" />Open Calendar
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* ── Admin-only: Integration details ───────────────────────────────── */}
        {isAdmin && (listing.channexPropertyId || listing.channexRoomId || listing.userId) && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-amber-700">
                <ShieldCheck className="w-4 h-4" />
                Integration Details
                <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-[10px] ml-auto">
                  Admin Only
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {listing.channexPropertyId && (
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Property ID</p>
                  <p className="font-mono text-slate-800 text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200 break-all">
                    {listing.channexPropertyId}
                  </p>
                </div>
              )}
              {listing.channexRoomId && (
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Room ID</p>
                  <p className="font-mono text-slate-800 text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200 break-all">
                    {listing.channexRoomId}
                  </p>
                </div>
              )}
              {listing.userId && (
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Owner User ID</p>
                  <p className="font-mono text-slate-800 text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200 break-all">
                    {listing.userId}
                  </p>
                </div>
              )}
              {listing.reviewStatus && (
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Review Status</p>
                  <p className="font-mono text-xs text-slate-600">{listing.reviewStatus}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Reservations Section ─────────────────────────────────────────────
       * TASK 2 (Create) + TASK 3 (Modify / Cancel)
       * Shows all bookings for this listing with create/modify/cancel controls.
       */}
      <ReservationsSection listingId={listing.id} />

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stay Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs">Currency</p>
              <p className="font-medium text-slate-900">{listing.currency || 'USD'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Minimum Nights</p>
              <p className="font-medium text-slate-900">{listing.minNights || 1}</p>
            </div>
            {listing.maxNights && (
              <div>
                <p className="text-slate-500 text-xs">Maximum Nights</p>
                <p className="font-medium text-slate-900">{listing.maxNights}</p>
              </div>
            )}
            {listing.checkInTime && (
              <div>
                <p className="text-slate-500 text-xs">Check-in Time</p>
                <p className="font-medium text-slate-900">{listing.checkInTime}</p>
              </div>
            )}
            {listing.checkOutTime && (
              <div>
                <p className="text-slate-500 text-xs">Check-out Time</p>
                <p className="font-medium text-slate-900">{listing.checkOutTime}</p>
              </div>
            )}
            <div>
              <p className="text-slate-500 text-xs">Listed Since</p>
              <p className="font-medium text-slate-900">
                {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Reservations Section ──────────────────────────────────────────────────
/**
 * TASK 2 (Create) + TASK 3 (Modify / Cancel)
 * Displays all bookings for this listing with a
 * "Create Direct Booking" button and an interactive BookingDrawer.
 */
function ReservationsSection({ listingId }) {
  const [bookings, setBookings]           = useState([]);
  const [loading,  setLoading]            = useState(true);
  const [showCreate, setShowCreate]       = useState(false);
  const [selectedBooking, setSelected]    = useState(null);
  const [drawerOpen, setDrawerOpen]        = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.bookings.getByListingId(listingId);
      setBookings(res.data ?? res ?? []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (listingId) fetchBookings();
  }, [listingId, fetchBookings]);

  const openDrawer = (booking) => {
    setSelected(booking);
    setDrawerOpen(true);
  };

  const handleBookingUpdate = (updated) => {
    setBookings(prev =>
      prev.map(b => (b.id === updated.id ? updated : b)),
    );
    setSelected(updated);
  };

  const STATUS_COLORS = {
    confirmed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100    text-red-800',
    pending:   'bg-amber-100  text-amber-800',
    completed: 'bg-slate-100  text-slate-600',
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Reservations
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Direct Booking
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <p>No reservations for this property yet.</p>
              <p className="mt-1">Use "Create Direct Booking" above to add one.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {bookings.map(booking => (
                <div
                  key={booking.id}
                  onClick={() => openDrawer(booking)}
                  className="flex items-center gap-4 py-3.5 cursor-pointer hover:bg-slate-50 rounded-lg px-3 -mx-3 transition-colors"
                >
                  {/* Guest + status */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">
                      {booking.guestName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {booking.numGuests ?? 1} guest{booking.numGuests !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {/* Dates */}
                  <div className="text-xs text-slate-600 min-w-0 hidden sm:block">
                    <p className="truncate">
                      {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}
                    </p>
                    <p className="text-slate-400 mt-0.5">
                      {nightsCount(booking.checkIn, booking.checkOut)} nights
                    </p>
                  </div>
                  {/* Price */}
                  {booking.totalPrice && (
                    <div className="text-sm font-semibold text-slate-700 hidden md:block">
                      ${parseFloat(booking.totalPrice).toFixed(0)}
                    </div>
                  )}
                  {/* Status badge */}
                  <Badge
                    className={`${STATUS_COLORS[booking.status] ?? 'bg-slate-100 text-slate-600'} text-xs shrink-0`}
                  >
                    {booking.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* TASK 2 — Create Manual Booking modal */}
      <AddManualBookingModal
        open={showCreate}
        onOpenChange={setShowCreate}
        listingId={listingId}
        onSuccess={fetchBookings}
      />

      {/* TASK 3 — Modify / Cancel booking drawer */}
      <BookingDrawer
        booking={selectedBooking}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setSelected(null);
        }}
        onUpdate={handleBookingUpdate}
      />
    </>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function nightsCount(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  return Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function ListingDetail() {
  return (
    <NewLoginRequired>
      <AppLayout>
        <ListingDetailContent />
      </AppLayout>
    </NewLoginRequired>
  );
}
