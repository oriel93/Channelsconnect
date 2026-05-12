import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2,
  Calendar,
  DollarSign,
  User,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Home,
  Plus,
  Pencil,
  X,
  CheckCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

// ─── helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (amount, currency = 'USD') => {
  const num = parseFloat(amount) || 0;
  const code = currency.toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${code} ${num.toLocaleString()}`;
  }
};

const formatDate = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const nightsBetween = (a, b) => {
  if (!a || !b) return null;
  const diff = Math.abs(new Date(b) - new Date(a));
  return Math.ceil(diff / 86400000) || 1;
};

const statusColor = (s) => {
  switch (s?.toLowerCase()) {
    case 'confirmed':  return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'cancelled':  return 'bg-red-100 text-red-800 border-red-200';
    default:           return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const todayStr = () => new Date().toISOString().split('T')[0];
const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

// ─── Empty form state ─────────────────────────────────────────────────────────

const emptyForm = (listingId) => ({
  listingId: listingId ?? '',
  guestName: '',
  guestEmail: '',
  guestPhone: '',
  checkIn: todayStr(),
  checkOut: tomorrowStr(),
  numGuests: 1,
  totalPrice: '',
  status: 'confirmed',
  bookingSource: 'direct',
  notes: '',
});

// ─── SyncBadge ────────────────────────────────────────────────────────────────

function SyncBadge({ syncing }) {
  if (syncing === null) return null;
  if (syncing)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
        <Loader2 className="w-3 h-3 animate-spin" />
        Syncing channels…
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
      <CheckCheck className="w-3 h-3" />
      Channels updated
    </span>
  );
}

// ─── BookingForm dialog ───────────────────────────────────────────────────────

function BookingFormDialog({ open, onClose, onSaved, editBooking, listingId }) {
  const [form, setForm] = useState(emptyForm(listingId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editBooking) {
      setForm({
        listingId: editBooking.listingId ?? listingId ?? '',
        guestName: editBooking.guestName ?? '',
        guestEmail: editBooking.guestEmail ?? '',
        guestPhone: editBooking.guestPhone ?? '',
        checkIn: editBooking.checkIn
          ? new Date(editBooking.checkIn).toISOString().split('T')[0]
          : todayStr(),
        checkOut: editBooking.checkOut
          ? new Date(editBooking.checkOut).toISOString().split('T')[0]
          : tomorrowStr(),
        numGuests: editBooking.numGuests ?? 1,
        totalPrice: editBooking.totalPrice ?? '',
        status: editBooking.status ?? 'confirmed',
        bookingSource: editBooking.bookingSource ?? 'direct',
        notes: editBooking.notes ?? '',
      });
    } else {
      setForm(emptyForm(listingId));
    }
  }, [editBooking, listingId, open]);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.guestName || !form.checkIn || !form.checkOut || !form.listingId) {
      toast.error('Please fill in all required fields.');
      return;
    }
    if (new Date(form.checkOut) <= new Date(form.checkIn)) {
      toast.error('Check-out must be after check-in.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        listingId: Number(form.listingId),
        numGuests: Number(form.numGuests) || 1,
        totalPrice: parseFloat(form.totalPrice) || 0,
      };
      if (editBooking) {
        await api.bookings.update(editBooking.id, payload);
        toast.success('Booking updated — syncing availability to channels…');
      } else {
        await api.bookings.create(payload);
        toast.success('Booking created — syncing availability to channels…');
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      if (status === 401) {
        toast.error('Your session has expired. Please log in again.');
        setTimeout(() => { window.location.href = '/Login'; }, 1500);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to save booking.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editBooking ? 'Edit Booking' : 'New Booking'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {/* Guest Name */}
          <div className="col-span-2">
            <Label>Guest Name *</Label>
            <Input
              value={form.guestName}
              onChange={set('guestName')}
              placeholder="John Smith"
            />
          </div>

          {/* Email / Phone */}
          <div>
            <Label>Email</Label>
            <Input
              value={form.guestEmail}
              onChange={set('guestEmail')}
              placeholder="guest@example.com"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={form.guestPhone}
              onChange={set('guestPhone')}
              placeholder="+1 555 000 0000"
            />
          </div>

          {/* Dates */}
          <div>
            <Label>Check-In *</Label>
            <Input type="date" value={form.checkIn} onChange={set('checkIn')} />
          </div>
          <div>
            <Label>Check-Out *</Label>
            <Input
              type="date"
              value={form.checkOut}
              onChange={set('checkOut')}
            />
          </div>

          {/* Guests / Price */}
          <div>
            <Label>Guests</Label>
            <Input
              type="number"
              min={1}
              value={form.numGuests}
              onChange={set('numGuests')}
            />
          </div>
          <div>
            <Label>Total Price (USD)</Label>
            <Input
              type="number"
              min={0}
              value={form.totalPrice}
              onChange={set('totalPrice')}
              placeholder="0"
            />
          </div>

          {/* Source / Status */}
          <div>
            <Label>Source</Label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={form.bookingSource}
              onChange={set('bookingSource')}
            >
              <option value="direct">Direct</option>
              <option value="booking.com">Booking.com</option>
              <option value="airbnb">Airbnb</option>
              <option value="expedia">Expedia</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <Label>Status</Label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={form.status}
              onChange={set('status')}
            >
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={set('notes')}
              placeholder="Optional notes…"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded-md">
          <Wifi className="w-3 h-3" />
          Saving will automatically update availability in all connected channels for the booked dates.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {editBooking ? 'Save Changes' : 'Create Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── CancelDialog ─────────────────────────────────────────────────────────────

function CancelDialog({ open, booking, onClose, onCancelled }) {
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    try {
      await api.bookings.cancel(booking.id);
      toast.success('Booking cancelled — dates re-opened in channels…');
      onCancelled();
      onClose();
    } catch (err) {
      toast.error('Failed to cancel booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel Booking?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          Cancel booking for <strong>{booking?.guestName}</strong> (
          {formatDate(booking?.checkIn)} → {formatDate(booking?.checkOut)})?
          <br />
          <br />
          The blocked dates will be re-opened in channels automatically.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Keep Booking
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Yes, Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── BookingsManager (main export) ───────────────────────────────────────────

export default function BookingsManager({ listingId }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dialog state
  const [showForm, setShowForm] = useState(false);
  const [editBooking, setEditBooking] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  // Full Sync state
  const [fullSyncing, setFullSyncing] = useState(false);
  const [fullSyncResult, setFullSyncResult] = useState(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = listingId ? `?listingId=${listingId}` : '';
      const { data } = await api.bookings.getAll(listingId);
      const sorted = (data || []).sort(
        (a, b) => new Date(b.checkIn || 0) - new Date(a.checkIn || 0),
      );
      setBookings(sorted);
    } catch (err) {
      console.error('Failed to load bookings:', err);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    loadBookings();
    const iv = setInterval(loadBookings, 30000);
    return () => clearInterval(iv);
  }, [loadBookings]);

  const handleFullSync = async () => {
    setFullSyncing(true);
    setFullSyncResult(null);
    try {
      const { data } = await api.connect.startSync();
      setFullSyncResult({ ok: true, syncLogId: data?.data?.syncLogId });
      toast.success('Full sync started — updating all channels with ARI data.');
    } catch (err) {
      const msg =
        err?.response?.data?.message || 'Full sync failed. Check API logs.';
      setFullSyncResult({ ok: false, msg });
      toast.error(msg);
    } finally {
      setFullSyncing(false);
    }
  };

  if (loading && bookings.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bookings</h2>
          <p className="text-sm text-gray-600 mt-1">
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} —
            availability syncs automatically to channels on every change.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Full Sync button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFullSync}
            disabled={fullSyncing}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            {fullSyncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wifi className="w-4 h-4 mr-2" />
            )}
            Full Sync to Channels
          </Button>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={loadBookings}
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          {/* New Booking */}
          <Button
            size="sm"
            onClick={() => {
              setEditBooking(null);
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Full Sync result banner */}
      {fullSyncResult && (
        <Alert
          variant={fullSyncResult.ok ? 'default' : 'destructive'}
          className="mb-2"
        >
          {fullSyncResult.ok ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {fullSyncResult.ok
              ? `Full sync in progress (log #${fullSyncResult.syncLogId ?? '—'}). All channels will be updated with 500-day ARI.`
              : fullSyncResult.msg}
          </AlertDescription>
        </Alert>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Empty state */}
      {!error && bookings.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Bookings Yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first booking — availability will sync to channels
              automatically.
            </p>
            <Button
              onClick={() => {
                setEditBooking(null);
                setShowForm(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Booking
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Booking list */}
      <div className="space-y-3">
        {bookings.map((booking) => {
          const nights = nightsBetween(booking.checkIn, booking.checkOut);
          const total = parseFloat(booking.totalPrice || booking.totalAmount || 0);
          const isCancelled = booking.status?.toLowerCase() === 'cancelled';

          return (
            <Card
              key={booking.id}
              className={`border transition-all ${
                isCancelled
                  ? 'border-red-100 opacity-70'
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              <CardContent className="p-5">
                {/* Top row */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={statusColor(booking.status)}>
                      {booking.status || 'confirmed'}
                    </Badge>
                    {booking.bookingSource && (
                      <Badge
                        variant="outline"
                        className="capitalize text-xs"
                      >
                        {booking.bookingSource}
                      </Badge>
                    )}
                    {booking.listing && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                      >
                        <Home className="w-3 h-3 mr-1" />
                        {booking.listing.title}
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  {!isCancelled && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          setEditBooking(booking);
                          setShowForm(true);
                        }}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-red-600 hover:bg-red-50"
                        onClick={() => setCancelTarget(booking)}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {/* Guest + Dates grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-semibold text-gray-900">
                        {booking.guestName || 'Guest'}
                      </span>
                    </div>
                    {booking.guestEmail && (
                      <p className="text-xs text-gray-500 pl-6">
                        {booking.guestEmail}
                      </p>
                    )}
                    {booking.guestPhone && (
                      <p className="text-xs text-gray-500 pl-6">
                        {booking.guestPhone}
                      </p>
                    )}
                    {booking.numGuests && (
                      <p className="text-xs text-gray-500 pl-6">
                        👥 {booking.numGuests} guest
                        {booking.numGuests !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(booking.checkIn)} →{' '}
                        {formatDate(booking.checkOut)}
                      </span>
                    </div>
                    {nights && (
                      <p className="text-xs text-gray-500 pl-6">
                        🌙 {nights} night{nights !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {booking.notes && (
                  <div className="mb-3 p-2.5 bg-blue-50 border border-blue-100 rounded text-xs text-gray-800">
                    <span className="font-semibold text-blue-900">Note: </span>
                    {booking.notes}
                  </div>
                )}

                {/* Channel sync status */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    {total > 0 ? (
                      <>
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-xl font-bold text-gray-900">
                          {formatCurrency(total, booking.currency)}
                        </span>
                        {nights && (
                          <span className="text-xs text-gray-500">
                            ({formatCurrency(total / nights, booking.currency)}/night)
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">No price recorded</span>
                    )}
                  </div>

                  {/* Channel sync status */}
                  {!isCancelled ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <Wifi className="w-3 h-3" />
                      Dates synced to channels
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <WifiOff className="w-3 h-3" />
                      Dates freed in channels
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialogs */}
      <BookingFormDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={loadBookings}
        editBooking={editBooking}
        listingId={listingId}
      />

      {cancelTarget && (
        <CancelDialog
          open={!!cancelTarget}
          booking={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCancelled={loadBookings}
        />
      )}
    </div>
  );
}
