/**
 * BookingDrawer.jsx
 *
 * TASK 3 — Modify & Cancel Booking
 *
 * Location: Reservations list — click on any booking row to open the drawer.
 *
 * Provides:
 *   - Edit Dates: PATCH /api/bookings/:id (with date-change inventory logic)
 *   - Cancel Booking: PATCH /api/bookings/:id/cancel (restores inventory)
 */

import { useState } from 'react';
import {
  X, Calendar, User, Phone, Mail, DollarSign, Clock,
  AlertTriangle, Loader2, Users,
} from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
  DrawerDescription, DrawerFooter, DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS = {
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-red-100    text-red-800    border-red-200',
  pending:   'bg-amber-100  text-amber-800  border-amber-200',
  completed: 'bg-slate-100  text-slate-600  border-slate-200',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function nights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  return Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
}

function formatDateForInput(date) {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className='flex items-center gap-3'>
      <Icon className='w-4 h-4 text-slate-400 shrink-0' />
      <div className='min-w-0 flex-1'>
        <span className='text-slate-500 text-xs'>{label}</span>
        <p className='text-slate-800 font-medium text-sm truncate'>{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function BookingDrawer({ booking, open, onOpenChange, onUpdate }) {
  if (!booking) return null;

  const [editingDates,      setEditingDates]      = useState(false);
  const [editCheckIn,       setEditCheckIn]       = useState('');
  const [editCheckOut,      setEditCheckOut]      = useState('');
  const [editLoading,       setEditLoading]       = useState(false);
  const [editError,         setEditError]         = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelLoading,     setCancelLoading]     = useState(false);

  const startEdit = () => {
    setEditCheckIn(formatDateForInput(booking.checkIn));
    setEditCheckOut(formatDateForInput(booking.checkOut));
    setEditingDates(true);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingDates(false);
    setEditError(null);
  };

  const saveDateChanges = async () => {
    if (!editCheckIn || !editCheckOut) {
      setEditError('Both check-in and check-out dates are required.'); return;
    }
    if (new Date(editCheckOut) <= new Date(editCheckIn)) {
      setEditError('Check-out must be after check-in.'); return;
    }
    setEditLoading(true);
    setEditError(null);

    try {
      const res = await api.bookings.update(booking.id, {
        checkIn:  editCheckIn,
        checkOut: editCheckOut,
      });

      toast.success(
        `Booking dates updated: ${editCheckIn} → ${editCheckOut}. ` +
        'Availability updated and synced.',
      );

      setEditingDates(false);
      onUpdate?.(res.data ?? res);
      onOpenChange(false);
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to update booking.';
      setEditError(msg);
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      const res = await api.bookings.cancel(booking.id);

      toast.success(
        `Booking cancelled. Inventory for ` +
        `${formatDate(booking.checkIn)} → ${formatDate(booking.checkOut)} has been restored. ` +
        'All channels have been notified of the cancellation.',
      );

      setShowCancelConfirm(false);
      onUpdate?.(res.data ?? res);
      onOpenChange(false);
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to cancel booking.';
      toast.error(msg);
    } finally {
      setCancelLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const statusColor = STATUS_COLORS[booking.status] ?? 'bg-slate-100';
  const stayNights  = nights(booking.checkIn, booking.checkOut);
  const stayLabel   = `${stayNights} night${stayNights !== 1 ? 's' : ''}`;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className='max-w-md mx-auto'>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <DrawerHeader className='border-b px-6 py-4'>
          <div className='flex items-start justify-between'>
            <div>
              <DrawerTitle className='text-lg font-semibold'>
                Booking #{booking.id}
              </DrawerTitle>
              <DrawerDescription className='mt-0.5'>
                {booking.listing?.title ?? `Listing #${booking.listingId}`}
              </DrawerDescription>
            </div>
            <Badge className={statusColor}>
              {booking.status}
            </Badge>
          </div>
        </DrawerHeader>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className='px-6 py-5 space-y-5'>

          {/* Guest info */}
          <div className='space-y-3'>
            <h3 className='text-sm font-semibold text-slate-700 flex items-center gap-2'>
              <User className='w-4 h-4' /> Guest Details
            </h3>
            <div className='bg-slate-50 rounded-lg p-4 space-y-2 text-sm'>
              <DetailRow icon={User}  label='Name'    value={booking.guestName} />
              {booking.guestEmail && (
                <DetailRow icon={Mail}  label='Email'   value={booking.guestEmail} />
              )}
              {booking.guestPhone && (
                <DetailRow icon={Phone} label='Phone'   value={booking.guestPhone} />
              )}
              <DetailRow
                icon={Users}
                label='Guests'
                value={String(booking.numGuests ?? '—')}
              />
            </div>
          </div>

          {/* Dates — edit mode */}
          {editingDates ? (
            <div className='space-y-3'>
              <h3 className='text-sm font-semibold text-slate-700 flex items-center gap-2'>
                <Calendar className='w-4 h-4' /> Edit Dates
              </h3>
              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1'>
                  <Label htmlFor='editCheckIn'>New Check-in</Label>
                  <Input
                    id='editCheckIn'
                    type='date'
                    value={editCheckIn}
                    onChange={e => setEditCheckIn(e.target.value)}
                    min={today}
                  />
                </div>
                <div className='space-y-1'>
                  <Label htmlFor='editCheckOut'>New Check-out</Label>
                  <Input
                    id='editCheckOut'
                    type='date'
                    value={editCheckOut}
                    onChange={e => setEditCheckOut(e.target.value)}
                    min={editCheckIn || today}
                  />
                </div>
              </div>

              {editError && (
                <div className='bg-red-50 border border-red-200 rounded-lg px-3 py-2'>
                  <p className='text-sm text-red-700'>{editError}</p>
                </div>
              )}

              <div className='flex gap-2 pt-1'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={cancelEdit}
                  disabled={editLoading}
                >
                  Cancel
                </Button>
                <Button
                  size='sm'
                  onClick={saveDateChanges}
                  disabled={editLoading}
                  className='bg-blue-600 hover:bg-blue-700 text-white'
                >
                  {editLoading ? (
                    <><Loader2 className='w-3.5 h-3.5 animate-spin mr-1.5' /> Saving…</>
                  ) : (
                    'Save Dates'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Dates — read mode */
            <div className='space-y-3'>
              <h3 className='text-sm font-semibold text-slate-700 flex items-center gap-2'>
                <Calendar className='w-4 h-4' /> Stay Details
              </h3>
              <div className='bg-slate-50 rounded-lg p-4 space-y-2 text-sm'>
                <DetailRow
                  icon={Calendar}
                  label='Check-in'
                  value={formatDate(booking.checkIn)}
                />
                <DetailRow
                  icon={Calendar}
                  label='Check-out'
                  value={formatDate(booking.checkOut)}
                />
                <DetailRow
                  icon={Clock}
                  label='Duration'
                  value={stayLabel}
                />
                <DetailRow
                  icon={DollarSign}
                  label='Total Price'
                  value={
                    booking.totalPrice
                      ? `$${parseFloat(booking.totalPrice).toFixed(2)}`
                      : '—'
                  }
                />
              </div>

              {booking.status !== 'cancelled' && (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={startEdit}
                  className='w-full mt-1'
                >
                  <Calendar className='w-4 h-4 mr-2' />
                  Edit Dates
                </Button>
              )}
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className='space-y-1.5'>
              <h3 className='text-sm font-semibold text-slate-700'>Notes</h3>
              <p className='text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-3 whitespace-pre-wrap'>
                {booking.notes}
              </p>
            </div>
          )}

          {/* Booking meta */}
          <div className='text-xs text-slate-400 border-t pt-4 space-y-1'>
            {booking.bookingSource && (
              <p>
                Source: <span className='font-medium text-slate-600'>{booking.bookingSource}</span>
              </p>
            )}
            {booking.externalId && (
              <p>
                External ID: <span className='font-mono'>{booking.externalId}</span>
              </p>
            )}
            <p>Created: {new Date(booking.createdAt).toLocaleString()}</p>
          </div>
        </div>

        {/* ── Footer actions ─────────────────────────────────────────────── */}
        <DrawerFooter className='border-t px-6 py-4 gap-2'>
          {booking.status !== 'cancelled' ? (
            showCancelConfirm ? (
              <div className='flex flex-col gap-3 w-full'>
                <div className='flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-3'>
                  <AlertTriangle className='w-4 h-4 shrink-0 mt-0.5' />
                  <span>
                    This will cancel the booking and restore all nights
                    ({formatDate(booking.checkIn)} → {formatDate(booking.checkOut)})
                    to all connected channels.
                  </span>
                </div>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={cancelLoading}
                    className='flex-1'
                  >
                    Keep Booking
                  </Button>
                  <Button
                    size='sm'
                    onClick={handleCancel}
                    disabled={cancelLoading}
                    className='flex-1 bg-red-600 hover:bg-red-700 text-white'
                  >
                    {cancelLoading ? (
                      <><Loader2 className='w-3.5 h-3.5 animate-spin mr-1.5' /> Cancelling…</>
                    ) : (
                      'Confirm Cancel'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className='flex gap-2 w-full'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => onOpenChange(false)}
                  className='flex-1'
                >
                  Close
                </Button>
                <Button
                  size='sm'
                  variant='destructive'
                  onClick={() => setShowCancelConfirm(true)}
                  className='flex-1'
                >
                  Cancel Booking
                </Button>
              </div>
            )
          ) : (
            <Button
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
              className='w-full'
            >
              Close
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}